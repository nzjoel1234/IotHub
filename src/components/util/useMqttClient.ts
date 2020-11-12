import * as React from 'react';
import MQTT from 'async-mqtt';
import { Signer } from 'aws-amplify';
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

  const signedUriRef = React.useRef<string>();
  const [signedUri, setSignedUri] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!credentials) {
      setSignedUri(null);
      return;
    }

    const {
      accessKeyId: access_key,
      secretAccessKey: secret_key,
      sessionToken: session_token,
    } = credentials;

    const uri = 'wss://a3ifeswmcxw4rt-ats.iot.us-east-1.amazonaws.com/mqtt';
    const serviceInfo = {
      service: 'iotdevicegateway',
      region: 'us-east-1',
    };

    setSignedUri(signedUriRef.current = Signer.signUrl(
      uri,
      { access_key, secret_key, session_token },
      serviceInfo
    ));
  }, [credentials]);

  const [client, setClient] = React.useState<MQTT.AsyncClient | null>(null);
  const [messages$] = React.useState(new Subject<IMessage>());

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
    if (!!client || !signedUri) {
      return;
    }
    MQTT.connectAsync(signedUri, {
      clientId: Math.random().toString(36).substring(7),
      transformWsUrl: url => signedUriRef.current || url,
    })
      .then(onConnected)
      .catch(e => console.error('mqtt failed to connect', e));
  }, [client, signedUri, onConnected]);

  return React.useMemo<MqttClient | null>(() => !client ? null : ({
    publish: (topic, message) => client
      .publish(topic, message)
      .then(() => console.log('mqtt.tx', topic, message)),
    subscribe: topic => client.subscribe(topic),
    unsubscribe: topic => client.unsubscribe(topic),
    messages$,
  }), [client, messages$]);
}

export default useMqttClient;
