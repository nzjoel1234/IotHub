import * as React from 'react';
import { DateTime, Duration } from 'luxon';
import classNames from 'classnames';

import { useNow, usePageVisibility, useTimeout } from 'components/util';

import {
  IProgramConfiguration,
  IReceivedShadow,
  ISprinklerProps,
  IStatus,
} from './models';
import ConfirmStartModal from './ConfirmStartModal';
import SprinklerStatus from './SprinklerStatus';
import useSprinklerClient from './useSprinklerClient';

const offlineTimeoutDuration = Duration.fromObject({ seconds: 3 });
const activeRequestStatusPeriod = Duration.fromObject({ seconds: 10 });
const inactiveRequestStatusPeriod = Duration.fromObject({ seconds: 60 });
const randomRequestStatusWindow = Duration.fromObject({ seconds: 5 });

export function Sprinkler({ sprinklerId }: ISprinklerProps) {

  const pageVisible = usePageVisibility();
  const pageVisibleRef = React.useRef(pageVisible);
  pageVisibleRef.current = pageVisible;

  const now = useNow();
  const client = useSprinklerClient(sprinklerId);
  const statusTimer = useTimeout();
  const reconnectTimer = useTimeout();

  const [status, setStatus] = React.useState<IStatus>();
  const [shadowState, setShadowState] = React.useState<IReceivedShadow | null>(null);
  const [nextStatusDue, setNextStatusDue] = React.useState<DateTime>();

  const offline = !!nextStatusDue && nextStatusDue <= now;
  const online = !offline && !!status;
  const offlineRef = React.useRef(offline);
  offlineRef.current = offline;
  const reconnectBackoffCountRef = React.useRef(0);

  const onReconnectTimerExpired = React.useCallback(() => {
    console.log('onReconnectTimerExpired', offlineRef.current, reconnectBackoffCountRef.current);
    if (!offlineRef.current) {
      return;
    }
    client?.requestStatus();
    reconnectBackoffCountRef.current++;
    reconnectTimer.start(
      onReconnectTimerExpired,
      Duration.fromMillis(reconnectBackoffCountRef.current * 1000));
  }, [client, reconnectTimer]);

  const reconnect = !!(pageVisible && client && offline);
  const [reconnecting, setReconnecting] = React.useState(false);

  React.useEffect(() => {
    if (online) {
      client?.requestShadow();
    }
  }, [client, online]);

  React.useEffect(() => {
    setReconnecting(reconnect);
    if (!reconnect) {
      reconnectTimer.stop();
      return;
    }
    reconnectBackoffCountRef.current = 0;
    onReconnectTimerExpired();
  }, [reconnect, reconnectTimer, onReconnectTimerExpired]);

  React.useEffect(() => {
    if (!client) {
      return;
    }
    client.status$.subscribe(status => {
      statusTimer.stop();
      const isActive = !!status.active.length || !!status.pending.length;
      const requestNextStatusIn = (isActive ? activeRequestStatusPeriod : inactiveRequestStatusPeriod)
        .plus({ milliseconds: Math.round((Math.random() - 0.5) * randomRequestStatusWindow.as('milliseconds')) });
      setNextStatusDue(DateTime.local().plus(requestNextStatusIn).plus(offlineTimeoutDuration));
      setStatus(status);
      statusTimer.start(
        () => pageVisibleRef.current && client.requestStatus(),
        requestNextStatusIn);
    });
    client.shadow$.subscribe(setShadowState);
    setNextStatusDue(DateTime.local().plus(offlineTimeoutDuration));
    client.requestStatus();
  }, [client, statusTimer]);

  const [confirmingProgram, setConfirmingProgram] = React.useState<IProgramConfiguration>();
  const [confirmingZoneIds, setConfirmingZoneIds] = React.useState<number[]>();
  const [confirmingStop, setConfirmingStop] = React.useState(false);

  const onConfirmationDone = React.useCallback(() => {
    setConfirmingProgram(undefined);
    setConfirmingZoneIds(undefined);
    setConfirmingStop(false);
  }, []);

  const desiredConfig = shadowState?.state?.desired;

  return (
    <div>
      {client && (
        <ConfirmStartModal
          client={client}
          stop={confirmingStop}
          program={confirmingProgram}
          zoneIds={confirmingZoneIds}
          configuration={desiredConfig}
          onDone={onConfirmationDone}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 className="title is-uppercase" style={{ flex: 1 }}>{sprinklerId}</h1>
        <span
          className={classNames("is-clickable", (offline && !reconnecting) ? 'has-text-danger' : 'has-text-success')}
          style={{
            marginBottom: '1.5em',
            WebkitUserSelect: 'none', /* Safari */
            MozUserSelect: 'none', /* Firefox */
            msUserSelect: 'none', /* IE10+/Edge */
            userSelect: 'none', /* Standard */
          }}
          onClick={() => client?.requestStatus()}
        >
          {(offline && !reconnecting)
            ? <b><i className="fa fa-times" />&nbsp;OFFLINE</b>
            : online
              ? <b><i className="fa fa-check" />&nbsp;ONLINE</b>
              : <b><i className="fa fa-circle-notch fa-spin" />&nbsp;CONNECTING</b>
          }
        </span>
      </div>

      <SprinklerStatus
        configuration={desiredConfig}
        status={status}
        onStop={() => setConfirmingStop(true)}
      />

      {!desiredConfig ? null : (
        <div className="columns">
          <div className="column">
            <h2 className="subtitle">PROGRAMS</h2>
            {desiredConfig.programs?.map((program, index) => (
              <div key={index} className="box" style={{ display: 'flex', alignItems: 'center' }}>
                <p style={{ flex: 1 }}>{program.name}</p>
                <button
                  className="button is-success"
                  onClick={() => setConfirmingProgram(program)}
                >
                  <i className="fa fa-play" />
                </button>
              </div>
            ))}
            {!!desiredConfig.zones.length && (
              <div className="box" style={{ display: 'flex', alignItems: 'center' }}>
                <p style={{ flex: 1 }}><em>Custom Program</em></p>
                <button
                  className="button is-success"
                  onClick={() => setConfirmingZoneIds(desiredConfig.zones.map((_, index) => index))}
                >
                  <i className="fa fa-play" />
                </button>
              </div>
            )}
          </div>
          <div className="column">
            <h2 className="subtitle">ZONES</h2>
            {desiredConfig.zones?.map(({ name, group }, index) => (
              <div key={index} className="box" style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ flex: 1 }}>{name}</span>
                <small className="has-text-grey mx-2">{group}</small>
                <button className="button is-success" onClick={() => setConfirmingZoneIds([index])}>
                  <i className="fa fa-play" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sprinkler;
