import * as React from 'react';
import classNames from 'classnames';
import { Duration } from 'luxon';

import { useNow } from 'components/util';

import { ISprinklerConfiguration, IStatus } from './models';

const getZoneName = (zoneId: number, config: ISprinklerConfiguration | undefined) =>
  config?.zones[zoneId]?.name || `Zone ${zoneId}`

interface IQueuedZoneTagProps {
  zoneName: string;
  remaining: Duration;
  pending?: boolean;
}

const QueuedZoneTag = ({
  zoneName,
  remaining,
  pending,
}: IQueuedZoneTagProps) => (
  <div className="control">
    <div className="tags has-addons">
      <span className={classNames("tag", pending ? "is-info" : "is-success")}>
        {zoneName}
      </span>
      <span className="tag">
        {`${Math.round(remaining.as('minutes'))} mins`}
      </span>
    </div>
  </div>
);

interface IProps {
  status: IStatus | undefined;
  configuration: ISprinklerConfiguration | undefined;
  onStop: () => void;
}

export const SprinklerStatus = ({
  status,
  configuration,
  onStop,
}: IProps) => {
  const now = useNow();
  return !(status?.active.length || status?.pending.length) ? null : (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <table>
          <tbody>
            {!!status.active.length && (
              <tr style={{ paddingBottom: '1em' }}>
                <th style={{ paddingRight: '1em' }}>ACTIVE</th>
                <td>
                  <div className="field is-grouped is-grouped-multiline" style={{ paddingBottom: '1em' }}>
                    {status.active?.map((i, index) => (
                      <QueuedZoneTag
                        key={index}
                        zoneName={getZoneName(i.zoneId, configuration)}
                        remaining={i.expiry.diff(now)}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            )}
            {!!status.pending.length && (
              <tr style={{ paddingBottom: '1em' }}>
                <th style={{ paddingRight: '1em' }}>PENDING</th>
                <td>
                  <div className="field is-grouped is-grouped-multiline" style={{ paddingBottom: '1em' }}>
                    {status.pending?.map((i, index) => (
                      <QueuedZoneTag
                        key={index}
                        pending
                        zoneName={getZoneName(i.zoneId, configuration)}
                        remaining={i.duration}
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
        <button className="button is-danger" onClick={onStop}>
          <i className="fas fa-stop" />
        </button>
      </div>
    </div>
  );
}

export default SprinklerStatus;
