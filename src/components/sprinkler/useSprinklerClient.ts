import * as React from 'react';

import useMqttClient from 'components/util/useMqttClient';

import { IReceivedStatus, IStatus } from './models';

interface ISprinklerClient {
}

interface IOptions {
  deviceId: string;
  onStatusReceived?: (state: IStatus, client: ISprinklerClient) => void;
  onShadowReceived?: (state: IStatus, client: ISprinklerClient) => void;
}

export function useSprinklerClient({
  deviceId,
  onStatusReceived = () => null,
}: IOptions) {
  const client = useMqttClient();

  const requestStatus = React.useCallback(
    () => client && client.publish(`sprinkler/${deviceId}/status/request`, ''),
    [client, deviceId]);

  const requestShadow = React.useCallback(
    () => client && client.publish(`$aws/things/${deviceId}/shadow/get`, ''),
    [client, deviceId]);

  const onShadowReceived = React.useCallback(
    (shadowState: IReceivedShadowState) => {
      console.log('Shadow State Received:', shadowState);
      setShadowState(shadowState);
    }, []);

  const onMessageReceived = React.useCallback<MqttMessageCallback>(
    (topic, message) => {
      switch (topic) {
        case `sprinkler/${deviceId}/status/report`:
          const status = JSON.parse(message) as IReceivedStatus;
          onStatusReceived({
            active: active.map(([zoneId, secondsRemaining]) => ({ zoneId, secondsRemaining })),
            pending: pending.map(([zoneId, secondsRemaining]) => ({ zoneId, secondsRemaining })),
          });
          break;
        case `$aws/things/${deviceId}/shadow/get/accepted`:
          onShadowReceived(JSON.parse(message));
          break;
        case `$aws/things/${deviceId}/shadow/update/accepted`:
          requestShadow();
          break;
      }
    }, [deviceId, onStatusReceived, onShadowReceived, requestShadow]);

  React.useEffect(() => {
    if (!client) {
      return;
    }
    client.onMessageReceived(onMessageReceived);
    client.subscribe(`sprinkler/${deviceId}/status/report`)
      .then(requestStatus);
    Promise.all([
      client.subscribe(`$aws/things/${deviceId}/shadow/update/accepted`),
      client.subscribe(`$aws/things/${deviceId}/shadow/get/accepted`),
    ])
      .then(requestShadow);
    return () => {
      requestTimeout.stop();
    }
  }, [client, deviceId, onMessageReceived, requestStatus, requestShadow, requestTimeout]);

  const updateDesiredShadow = React.useCallback(
    (config: ISprinklerConfiguration) =>
      client && client.publish(`$aws/things/${deviceId}/shadow/update`, JSON.stringify({
        state: {
          desired: config,
        },
      })),
    [deviceId, client]);

}

export default useSprinklerClient;
