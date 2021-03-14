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
import ProgramConfigurationModal from './ProgramConfigurationModal';
import useSprinklerClient from './useSprinklerClient';
import useSprinklerClientMock from './useSprinklerClient.mock'
import { scheduleSummary } from './scheduleHelpers';

const useClient = process?.env?.REACT_APP_MOCK_CLIENT === 'true'
  ? useSprinklerClientMock
  : useSprinklerClient

const offlineTimeoutDuration = Duration.fromObject({ seconds: 3 });
const activeRequestStatusPeriod = Duration.fromObject({ seconds: 10 });
const inactiveRequestStatusPeriod = Duration.fromObject({ seconds: 60 });
const randomRequestStatusWindow = Duration.fromObject({ seconds: 5 });

export function Sprinkler({ sprinklerId }: ISprinklerProps) {

  const pageVisible = usePageVisibility();
  const pageVisibleRef = React.useRef(pageVisible);
  pageVisibleRef.current = pageVisible;

  const now = useNow();
  const client = useClient(sprinklerId);
  const statusTimer = useTimeout();
  const reconnectTimer = useTimeout();

  const [status, setStatus] = React.useState<IStatus>();
  const [shadowState, setShadowState] = React.useState<IReceivedShadow | null>(null);
  const [nextStatusDue, setNextStatusDue] = React.useState<DateTime>();

  const offline = !!nextStatusDue && nextStatusDue <= now;
  const online = !offline && !!status;
  const offlineRef = React.useRef(offline);
  offlineRef.current = offline;
  const reconnectBackoffMillisRef = React.useRef(0);

  const onReconnectTimerExpired = React.useCallback(() => {
    if (!offlineRef.current) {
      return;
    }
    console.log('onReconnectTimerExpired', reconnectBackoffMillisRef.current);
    client?.requestStatus();
    reconnectBackoffMillisRef.current = Math.min(60000, Math.max(1000, reconnectBackoffMillisRef.current * 1.5));
    reconnectTimer.start(
      onReconnectTimerExpired,
      Duration.fromMillis(reconnectBackoffMillisRef.current));
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
    reconnectBackoffMillisRef.current = 0;
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
  const [editingProgramId, setEditingProgramId] = React.useState<number>();

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
      {!!desiredConfig && editingProgramId != null && (
        <ProgramConfigurationModal
          config={desiredConfig}
          programId={editingProgramId}
          updateConfig={config => client ? client?.updateConfig(config) : Promise.reject('Client not available')}
          onClose={() => setEditingProgramId(undefined)}
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
            ? <b><i className="fas fa-times" />&nbsp;OFFLINE</b>
            : online
              ? <b><i className="fas fa-check" />&nbsp;ONLINE</b>
              : <b><i className="fas fa-circle-notch fa-spin" />&nbsp;CONNECTING</b>
          }
        </span>
      </div>

      <SprinklerStatus
        configuration={desiredConfig}
        status={status}
        onStop={() => setConfirmingStop(true)}
      />

      {!!desiredConfig && (
        <>
          <h2 className="subtitle">PROGRAMS</h2>
          {desiredConfig.programs?.map((program, index) => (
            <div key={index} className="box" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>
                {program.name}
                <small style={{ marginLeft: 10 }}>
                  <a role="button" onClick={() => setEditingProgramId(index)}>
                    <i className="fas fa-edit" /> Edit
                  </a>
                </small>
              </span>
              {!!program.schedules?.length && (
                <span
                  style={{
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 20,
                  }}
                >
                  <small className="is-hidden-mobile">
                    {program.schedules.map((schedule, index) => (
                      <div key={index}><em>{scheduleSummary(schedule)}</em></div>
                    ))}
                  </small>
                  <i className="fas fa-clock" style={{ marginLeft: 10 }} />
                </span>
              )}
              <button
                className="button is-success"
                onClick={() => setConfirmingProgram(program)}
              >
                <i className="fas fa-play" />
              </button>
            </div>
          ))}
          {!!desiredConfig.zones.length && (
            <div className="box" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}><em>Custom Program</em></span>
              <button
                className="button is-success"
                onClick={() => setConfirmingZoneIds(desiredConfig.zones.map((_, index) => index))}
              >
                <i className="fas fa-play" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Sprinkler;
