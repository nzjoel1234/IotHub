import * as React from 'react';
import { Observable } from 'rxjs';
import $ from 'rxjs/operators';

import { useMqttClient } from 'components/util/useMqttClient';

import { IReceivedShadow, IReceivedStatus, IStatus } from './models';

interface ISprinklerClient {
  requestStatus: () => Promise<any>;
  requestShadow: () => Promise<any>;
  status$: Observable<IStatus>;
  shadow$: Observable<IReceivedShadow>;
}

interface IOptions {
  deviceId: string;
}

export function useSprinklerClient({
  deviceId,
}: IOptions) {

  const client = useMqttClient();

  const requestStatus = React.useCallback(
    () => client
      ? client.publish(`sprinkler/${deviceId}/status/request`, '')
      : Promise.reject('Client not connected'),
    [client, deviceId]);

  const requestShadow = React.useCallback(
    () => client
      ? client.publish(`$aws/things/${deviceId}/shadow/get`, '')
      : Promise.reject('Client not connected'),
    [client, deviceId]);

  const statusReportedTopic = `sprinkler/${deviceId}/status/report`;
  const shadowReportedTopic = `$aws/things/${deviceId}/shadow/get/accepted`;
  const updateAcceptedTopic = `$aws/things/${deviceId}/shadow/update/accepted`;

  const status$ = client?.messages$.pipe(
    $.filter(i => i.topic === statusReportedTopic),
    $.map(({ message }) => JSON.parse(message) as IReceivedStatus),
    $.map(({ active, pending }) => ({
      active: active.map(([zoneId, secondsRemaining]) => ({ zoneId, secondsRemaining })),
      pending: pending.map(([zoneId, secondsRemaining]) => ({ zoneId, secondsRemaining })),
    })),
  ) ?? new Observable();

  const shadow$ = client?.messages$.pipe(
    $.filter(i => i.topic === shadowReportedTopic),
    $.map(({ message }) => JSON.parse(message) as IReceivedShadow),
  ) ?? new Observable();

  client?.messages$.pipe(
    $.filter(i =>
      i.topic === shadowReportedTopic ||
      i.topic === updateAcceptedTopic),
  )?.forEach(() => requestShadow());

  const [sprinklerClient, setSprinklerClient] =
    React.useState<ISprinklerClient>();

  React.useEffect(() => {
    Promise.all([
      client?.subscribe(statusReportedTopic),
      client?.subscribe(shadowReportedTopic),
      client?.subscribe(updateAcceptedTopic),
    ]).then(() => setSprinklerClient({
      requestStatus,
      requestShadow,
      status$,
      shadow$,
    }))
  }, [client]);

  return sprinklerClient;
}

export default useSprinklerClient;
