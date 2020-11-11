import * as React from 'react';
import { Client, Message } from 'paho-mqtt'
import { Signer } from 'aws-amplify';
import { Observable, Subject } from 'rxjs';

import { useCredentials } from 'components/auth';

interface IMessage {
  topic: string;
  message: string;
}

export type MqttClient = {
  publish: (topic: string, message: string) => Promise<any>;
  subscribe: (topic: string) => Promise<any>;
  messages$: Observable<IMessage>;
}

export function useMqttClient(): MqttClient | null | undefined {

  const credentials = useCredentials();

  const signedEndpoint = React.useMemo(() => {
    if (!credentials) {
      return null;
    }

    const {
      accessKeyId: access_key,
      secretAccessKey: secret_key,
      sessionToken: session_token,
    } = credentials;

    const endpoint = 'wss://a3ifeswmcxw4rt-ats.iot.us-east-1.amazonaws.com/mqtt';
    const serviceInfo = {
      service: 'iotdevicegateway',
      region: 'us-east-1',
    };

    return Signer.signUrl(
      endpoint,
      { access_key, secret_key, session_token },
      serviceInfo
    );
  }, [credentials]);

  const [connectedClient, setConnectedClient] = React.useState<Client | null>();
  const lastSignedEndpoint = React.useRef<string | null>();

  React.useEffect(() => {
    if (connectedClient?.isConnected() && !!signedEndpoint && lastSignedEndpoint.current === signedEndpoint) {
      return;
    }

    lastSignedEndpoint.current = signedEndpoint;
    if (!signedEndpoint) {
      return;
    }

    const clientId = Math.random().toString(36).substring(7);
    const client = new Client(signedEndpoint, clientId);

    client.onConnectionLost = (...p) => {
      console.error('connectionLost', p);
      setConnectedClient(null);
    }

    client.onMessageDelivered = ({ destinationName, payloadString }) => {
      console.log('tx', destinationName, payloadString);
    }

    client.connect({
      onSuccess: () => setConnectedClient(client),
      onFailure: (...p) => {
        console.error('connectionFailed', p);
        setConnectedClient(null);
      }
    });
  }, [signedEndpoint, connectedClient]);

  const [result, setResult] = React.useState<MqttClient | null | undefined>();

  React.useEffect(() => {
    console.log({ connectedClient });
    if (!connectedClient?.isConnected()) {
      setResult(connectedClient === undefined ? undefined : null);
      return () => { };
    }

    const messages$ = new Subject<IMessage>();
    messages$.subscribe(({ topic, message }) =>
      console.log('rx', topic, message));

    connectedClient.onMessageArrived = ({ destinationName, payloadString }) =>
      messages$.next({
        topic: destinationName,
        message: payloadString,
      });

    setResult({
      publish: (topic, message) => new Promise((resolve, reject) => {
        const mqttMessage = new Message(message);
        mqttMessage.destinationName = topic;
        try {
          connectedClient.send(mqttMessage);
          resolve();
        } catch (e) {
          reject(e);
        }
      }),
      subscribe: (topic) => new Promise((resolve, reject) => {
        try {
          connectedClient.subscribe(topic, {
            onSuccess: () => resolve(),
            onFailure: e => reject(e),
          });
        } catch (e) {
          reject(e);
        }
      }),
      messages$,
    });

    return () => {
      messages$.complete();
      connectedClient.onConnectionLost = () => null;
      connectedClient.onMessageArrived = () => null;
      if (connectedClient.isConnected()) {
        connectedClient.disconnect();
      }
    };
  }, [connectedClient]);

  return result;
}

export default useMqttClient;
