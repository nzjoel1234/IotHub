import * as React from 'react';
import MQTT from 'async-mqtt';
import { Signer } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';
import { Observable, Subject } from 'rxjs';

import { useCredentials } from 'components/auth';

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

export function useMqttClient() {
  const credentials = useCredentials();
  const credentialsRef = React.useRef(credentials);
  credentialsRef.current = credentials;
  const [client, setClient] = React.useState<MQTT.AsyncClient | null>(null);
  const [messages$] = React.useState(new Subject<IMessage>());

  const getSignedUri = React.useCallback((credentials: ICredentials | null | undefined) => {
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
  }, []);

  React.useEffect(() => {
    const sub = messages$.subscribe(({ topic, message }) =>
      console.log('mqtt.rx', topic, message));
    return () => sub.unsubscribe();
  }, [messages$]);

  const onConnected = React.useCallback((client: MQTT.AsyncClient) => {
    client.on('message', (topic, payload) => {
      messages$.next({
        topic,
        message: payload.toString(),
      });
    });
    setClient(client);
  }, [messages$]);

  React.useEffect(() => {
    if (!!client) {
      return;
    }
    const signedUri = getSignedUri(credentials);
    if (!signedUri) {
      return;
    }
    MQTT.connectAsync(signedUri, {
      clientId: Math.random().toString(36).substring(7),
      transformWsUrl: url => getSignedUri(credentialsRef.current) || url,
    })
      .then(onConnected)
      .catch(e => console.error('mqtt failed to connect', e));
  }, [client, credentials, getSignedUri, onConnected]);

  const logState = React.useCallback(
    (client: MQTT.AsyncClient | null) => console.log('mqttClientState',
      client?.disconnected ? 'disconnected'
        : client?.disconnecting ? 'disconnecting'
          : client?.reconnecting ? 'reconnecting'
            : client?.connected ? 'connected'
              : 'unkown'),
    []);

  return React.useMemo<MqttClient | null>(() => {
    client?.on('error', error => {
      console.error('mqtt', error);
      logState(client);
    });
    logState(client);
    return !client ? null : ({
      publish: (topic, message) => {
        logState(client);
        return (client.disconnected ? client.reconnect() : client)
          .publish(topic, message)
          .then(() => console.log('mqtt.tx', topic, message));
      },
      subscribe: topic => client.subscribe(topic),
      unsubscribe: topic => client.unsubscribe(topic),
      messages$,
    });
  }, [client, logState, messages$]);
}

export default useMqttClient;
