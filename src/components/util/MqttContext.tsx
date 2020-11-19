import * as React from 'react';
import MQTT from 'async-mqtt';
import { Signer } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';
import { Observable, Subject } from 'rxjs';

import { CredentialsContext } from 'components/auth';
import { useNow } from 'components/util';
import { DateTime, Duration } from 'luxon';

interface IMessage {
  topic: string;
  message: string;
}

export enum MqttConnectionState {
  Connecting,
  Connected,
  Disconnecting,
  Disconnected,
}

export type MqttClient = {
  publish: (topic: string, message: string) => Promise<any>;
  subscribe: (topic: string | string[]) => Promise<any>;
  unsubscribe: (topic: string | string[]) => Promise<any>;
  messages$: Observable<IMessage>;
}

const logState = (client: MQTT.AsyncClient | null) =>
  console.log('mqttClientState',
    client?.disconnected ? 'disconnected'
      : client?.disconnecting ? 'disconnecting'
        : client?.reconnecting ? 'reconnecting'
          : client?.connected ? 'connected'
            : 'unknown');

const getSignedUri = (credentials: ICredentials | null | undefined) => {
  if (!credentials) {
    return null;
  }

  const {
    accessKeyId: access_key,
    secretAccessKey: secret_key,
    sessionToken: session_token,
  } = credentials;

  return Signer.signUrl(
    'wss://a3ifeswmcxw4rt-ats.iot.us-east-1.amazonaws.com/mqtt',
    {
      access_key,
      secret_key,
      session_token
    },
    {
      service: 'iotdevicegateway',
      region: 'us-east-1',
    }
  );
};

export const MqttContext = React.createContext<MqttClient | null | undefined>(undefined);

export const MqttContextProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [client, setClient] = React.useState<MqttClient | null>(null);

  const credentials = React.useContext(CredentialsContext);
  const credentialsRef = React.useRef(credentials);
  credentialsRef.current = credentials;

  const now = useNow(Duration.fromObject({ seconds: client ? 0 : 1 }));
  const [nextAttempt, setNextAttempt] = React.useState(now);
  const connectingRef = React.useRef(false);

  React.useEffect(() => {
    if (client || !credentials || nextAttempt > now || connectingRef.current) {
      return;
    }
    const signedUri = getSignedUri(credentials);
    if (!signedUri) {
      return;
    }
    connectingRef.current = true
    Promise.resolve()
      .then(() => MQTT.connectAsync(signedUri, {
        clientId: 'iot-hub-' + Math.random().toString(36).substring(7),
        transformWsUrl: url => getSignedUri(credentialsRef.current) || url,
      }))
      .then(client => {
        const messages$ = new Subject<IMessage>();
        messages$.subscribe(({ topic, message }) =>
          console.log('mqtt.rx', topic, message));
        client.on('message', (topic, payload) => {
          messages$.next({
            topic,
            message: payload.toString(),
          });
        });
        client.on('error', error => {
          console.error('mqtt', error);
          logState(client);
        });
        logState(client);
        setClient({
          publish: (topic, message) => {
            logState(client);
            return (client.disconnected ? client.reconnect() : client)
              .publish(topic, message)
              .then(() => console.log('mqtt.tx', topic, message))
              .catch(e => console.error('mqtt.tx', e));
          },
          subscribe: topic => client.subscribe(topic),
          unsubscribe: topic => client.unsubscribe(topic),
          messages$,
        });
      })
      .catch(e => console.error('mqtt failed to connect', e))
      .finally(() => {
        connectingRef.current = false;
        setNextAttempt(DateTime.local().plus({ seconds: 20 }));
      });
  }, [client, credentials, nextAttempt, now]);

  return (
    <MqttContext.Provider value={client}>
      <>{children}</>
    </MqttContext.Provider>
  );
}

export default MqttContext;
