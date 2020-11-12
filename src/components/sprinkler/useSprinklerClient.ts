import * as React from 'react';
import { Observable } from 'rxjs';
import * as $ from 'rxjs/operators';
import { DateTime, Duration } from 'luxon';
import { map, keyBy, mapValues, pickBy, keys } from 'lodash';

import { useMqttClient } from 'components/util';

import { IProgramConfiguration, IReceivedShadow, IReceivedStatus, ISprinklerConfiguration, IStatus } from './models';

export interface ISprinklerClient {
  requestStatus: () => Promise<any>;
  requestShadow: () => Promise<any>;
  updateConfig: (config: ISprinklerConfiguration) => Promise<any>;
  queueZones: (durationByZoneId: { [zoneId: number]: Duration }) => Promise<any>;
  queueProgram: (program: IProgramConfiguration) => Promise<any>;
  stopZones: (zoneIds?: number[]) => Promise<any>;
  status$: Observable<IStatus>;
  shadow$: Observable<IReceivedShadow>;
}

export function useSprinklerClient(deviceId: string) {
  const client = useMqttClient();
  const [sprinklerClient, setSprinklerClient] = React.useState<ISprinklerClient | null>(null);

  React.useEffect(() => {
    if (!client) {
      setSprinklerClient(null);
      return () => { };
    }

    const topics = {
      status: {
        request: `sprinkler/${deviceId}/status/request`,
        reported: `sprinkler/${deviceId}/status/report`,
      },
      shadow: {
        request: `$aws/things/${deviceId}/shadow/get`,
        update: `$aws/things/${deviceId}/shadow/update`,
        reported: `$aws/things/${deviceId}/shadow/get/accepted`,
        updated: `$aws/things/${deviceId}/shadow/update/accepted`,
      },
      zones: {
        queue: `sprinkler/${deviceId}/zones/queue`,
        stop: `sprinkler/${deviceId}/zones/stop`,
      }
    };

    const requestStatus = () =>
      client.publish(topics.status.request, '');

    const requestShadow = () =>
      client.publish(topics.shadow.request, '');

    const updateConfig = (config: ISprinklerConfiguration) =>
      client.publish(topics.shadow.update,
        JSON.stringify({ state: { desired: config } }));

    const queueZones = (durationByZoneId: { [zoneId: number]: Duration }) => {
      const nonZeroItems = pickBy(durationByZoneId || {}, d => d >= Duration.fromObject({ seconds: 1 }))
      if (!keys(nonZeroItems).length) {
        return Promise.resolve();
      }
      const zoneItems = map(nonZeroItems, (duration, id) =>
        `${id}:${Math.round(duration.as('seconds'))}`);
      return client.publish(topics.zones.queue,
        `{${zoneItems.join(',')}}`);
    }

    const queueProgram = (program: IProgramConfiguration) =>
      !program ? Promise.resolve() :
        queueZones(mapValues(keyBy(program.zones, z => z.id),
          i => Duration.fromObject({ seconds: i.duration })));

    const stopZones = (zoneIds?: number[]) =>
      client.publish(topics.zones.stop,
        zoneIds ? JSON.stringify(zoneIds) : '');

    const status$ = client.messages$.pipe(
      $.filter(m => m.topic === topics.status.reported),
      $.map(({ message }) => JSON.parse(message) as IReceivedStatus),
      $.map(({ active, pending }): IStatus => {
        const time = DateTime.local();
        return {
          time,
          active: active.map(([zoneId, seconds]) => ({ zoneId, expiry: time.plus({ seconds }) })),
          pending: pending.map(([zoneId, seconds]) => ({ zoneId, duration: Duration.fromObject({ seconds }) })),
        };
      }));

    const shadow$ = client.messages$.pipe(
      $.filter(m => m.topic === topics.shadow.reported),
      $.map(({ message }) => JSON.parse(message) as IReceivedShadow));

    const subscription = client.messages$.pipe(
      $.filter(m => m.topic === topics.shadow.updated),
    )
      .subscribe(requestShadow);

    const subscriptions = [
      topics.shadow.reported,
      topics.status.reported,
      topics.shadow.updated,
    ];

    client
      .subscribe(subscriptions)
      .then(() =>
        setSprinklerClient({
          requestStatus,
          requestShadow: () => requestShadow(),
          updateConfig,
          queueZones,
          queueProgram,
          stopZones,
          status$,
          shadow$,
        }));

    return () => {
      subscription?.unsubscribe();
      client.unsubscribe(subscriptions);
    };
  }, [client, deviceId]);

  return sprinklerClient;
}

export default useSprinklerClient;
