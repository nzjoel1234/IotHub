import * as React from 'react';

import useTimeout from 'components/util/useTimeout';

import { IReceivedShadowState, IReceivedStatus, ISprinklerConfiguration, ISprinklerProps, IStatus } from './models';
import SprinklerConfigurationForm from 'components/sprinkler/SprinklerConfigurationForm';
import { useMqttClient, MqttMessageCallback } from 'components/util/useMqttClient';
import classNames from 'classnames';

interface RenderAsJsonProps {
  title?: string;
  data?: any;
}

function RenderJson({ title, data }: RenderAsJsonProps) {
  return !data ? null : (
    <>
      {!!title && (<h3>{title}</h3>)}
      <pre style={{ textAlign: "left", color: 'grey' }}>
        {JSON.stringify(data, null, '  ')}
      </pre>
    </>
  );
}

export function Sprinkler({ sprinklerId }: ISprinklerProps) {

  const requestTimeout = useTimeout();
  const disconnectedTimeout = useTimeout();

  const [status, setStatus] = React.useState<IStatus | null | undefined>(undefined);
  const [shadowState, setShadowState] = React.useState<IReceivedShadowState | null>(null);

  const client = useMqttClient();

  const requestStatus = React.useCallback(() => {
    if (!client) {
      return;
    }
    requestTimeout.stop();
    disconnectedTimeout.start(() => {
      setStatus(null);
      requestTimeout.start(requestStatus, 60000);
    }, 5000);
    client.publish(`sprinkler/${sprinklerId}/status/request`, '');
  }, [client, sprinklerId, requestTimeout, disconnectedTimeout]);

  const onStatusReceived = React.useCallback(
    ({ active, pending }: IReceivedStatus) => {
      disconnectedTimeout.stop();
      setStatus({
        active: active.map(([zoneId, secondsRemaining]) => ({ zoneId, secondsRemaining })),
        pending: pending.map(([zoneId, secondsRemaining]) => ({ zoneId, secondsRemaining })),
      });
      requestTimeout.start(requestStatus, !!active.length ? 5000 : 60000);
    }, [disconnectedTimeout, requestTimeout, requestStatus]);

  const requestShadow = React.useCallback(
    () => {
      if (!client) {
        return;
      }
      client.publish(`$aws/things/${sprinklerId}/shadow/get`, '');
    }, [client, sprinklerId]);

  const onShadowReceived = React.useCallback(
    (shadowState: IReceivedShadowState) => {
      console.log('Shadow State Received:', shadowState);
      setShadowState(shadowState);
    }, []);

  const onMessageReceived = React.useCallback<MqttMessageCallback>(
    (topic, message) => {
      switch (topic) {
        case `sprinkler/${sprinklerId}/status/report`:
          onStatusReceived(JSON.parse(message));
          break;
        case `$aws/things/${sprinklerId}/shadow/get/accepted`:
          onShadowReceived(JSON.parse(message));
          break;
        case `$aws/things/${sprinklerId}/shadow/update/accepted`:
          requestShadow();
          break;
      }
    }, [sprinklerId, onStatusReceived, onShadowReceived, requestShadow]);

  React.useEffect(() => {
    if (!client) {
      return;
    }
    client.onMessageReceived(onMessageReceived);
    client.subscribe(`sprinkler/${sprinklerId}/status/report`)
      .then(requestStatus);
    Promise.all([
      client.subscribe(`$aws/things/${sprinklerId}/shadow/update/accepted`),
      client.subscribe(`$aws/things/${sprinklerId}/shadow/get/accepted`),
    ])
      .then(requestShadow);
    return () => {
      requestTimeout.stop();
    }
  }, [client, sprinklerId, onMessageReceived, requestStatus, requestShadow, requestTimeout]);

  const updateDesiredShadow = React.useCallback(
    (config: ISprinklerConfiguration) =>
      client && client.publish(`$aws/things/${sprinklerId}/shadow/update`, JSON.stringify({
        state: {
          desired: config,
        },
      })),
    [sprinklerId, client]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title is-uppercase">{sprinklerId}</h1>
        <span
          className={classNames(
            status === null ? 'has-text-danger' : 'has-text-success',
          )}>
          {!!status
            ? <>Online &#x2714;</>
            : status === null
              ? <>Offline &#x2718;</>
              : <span className="icon"><i className="fa fa-circle-notch fa-spin" /></span>
          }
        </span>
      </div>

      {shadowState && shadowState.state && shadowState.state.desired && (
        <SprinklerConfigurationForm
          config={shadowState.state.desired}
          onSubmit={updateDesiredShadow}
        />
      )}
      <RenderJson title="Status" data={status} />
      <RenderJson title="Shadow" data={shadowState && shadowState.state} />
    </div >
  );
}

export default Sprinkler;
