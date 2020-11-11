import * as React from 'react';
import classNames from 'classnames';

import { useTimeout } from 'components/util';

import {
  IProgramConfiguration,
  IQueuedZone,
  IReceivedShadow,
  ISprinklerConfiguration,
  ISprinklerProps,
  IStatus,
} from './models';
import ConfirmStartModal from './ConfirmStartModal';
import useSprinklerClient from './useSprinklerClient';

interface IQueuedZoneTagProps {
  queuedZone: IQueuedZone;
  config?: ISprinklerConfiguration;
  pending?: boolean;
}

const QueuedZoneTag = ({
  queuedZone: {
    zoneId,
    duration,
  },
  config,
  pending,
}: IQueuedZoneTagProps) => {
  const zone = config?.zones[zoneId];
  const label = zone?.name || `Zone ${zoneId}`;
  return (
    <div className="control">
      <div className="tags has-addons">
        <span className={classNames("tag", pending ? "is-info" : "is-success")}>
          {label}
        </span>
        <span className="tag">
          {`${Math.round(duration.as('minutes'))} mins`}
        </span>
      </div>
    </div>
  );
}

export function Sprinkler({ sprinklerId }: ISprinklerProps) {

  const requestStatusTimeout = useTimeout();
  const disconnectedTimeout = useTimeout();

  const [status, setStatus] = React.useState<IStatus | null | undefined>(undefined);
  const [shadowState, setShadowState] = React.useState<IReceivedShadow | null>(null);

  const client = useSprinklerClient(sprinklerId);

  React.useEffect(() => {
    if (!client) {
      return;
    }
    client.status$.subscribe(status => {
      disconnectedTimeout.stop();
      setStatus(status);
      requestStatusTimeout.start(client.requestStatus, (status.active.length || status.pending.length) ? 5000 : 60000);
    });
    client.shadow$.subscribe(setShadowState);
    client.requestStatus();
    client.requestShadow();
  }, [client, requestStatusTimeout, disconnectedTimeout]);

  const offline = status === null || client === null;

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
          className={offline ? 'has-text-danger' : 'has-text-success'}
          style={{ marginBottom: '1.5em' }}
          onClick={() => client?.requestStatus()}
        >
          {offline
            ? <b><i className="fa fa-times" />&nbsp;OFFLINE</b>
            : !!status
              ? <b><i className="fa fa-check" />&nbsp;ONLINE</b>
              : <b><i className="fa fa-circle-notch fa-spin" />&nbsp;CONNECTING</b>
          }
        </span>
      </div>

      {!!(status?.active?.length || status?.pending?.length) && (
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1 }}>
            <table>
              <tbody>
                {!!status?.active?.length && (
                  <tr style={{ paddingBottom: '1em' }}>
                    <th style={{ paddingRight: '1em' }}>ACTIVE</th>
                    <td>
                      <div className="field is-grouped is-grouped-multiline" style={{ paddingBottom: '1em' }}>
                        {status.active?.map((i, index) => (
                          <QueuedZoneTag
                            key={index}
                            queuedZone={i}
                            config={desiredConfig}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                {!!status?.pending?.length && (
                  <tr style={{ paddingBottom: '1em' }}>
                    <th style={{ paddingRight: '1em' }}>PENDING</th>
                    <td>
                      <div className="field is-grouped is-grouped-multiline" style={{ paddingBottom: '1em' }}>
                        {status.pending?.map((i, index) => (
                          <QueuedZoneTag
                            key={index}
                            queuedZone={i}
                            config={desiredConfig}
                            pending
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div>
            <button className="button is-danger" onClick={() => setConfirmingStop(true)}>
              <i className="fa fa-stop" />
            </button>
          </div>
        </div>
      )}
      {desiredConfig ? (
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
      ) : null
      }
    </div >
  );
}

export default Sprinkler;
