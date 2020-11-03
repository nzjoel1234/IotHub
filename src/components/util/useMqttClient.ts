import * as React from 'react';
import { Client, Message } from 'paho-mqtt'
import { Signer } from 'aws-amplify';

import CredentialsContext from 'components/auth/CredentialsContext';

export type MqttMessageCallback = (topic: string, message: string) => void;

export type MqttClient = {
  publish: (topic: string, message: string) => Promise<any>;
  subscribe: (topic: string) => Promise<any>;
  onMessageReceived: (handler: MqttMessageCallback) => void;
}

export function useMqttClient(): MqttClient | null {

  const credentials = React.useContext(CredentialsContext);

  const [clientInterface, setClientInterface] = React.useState<MqttClient | null>(null);

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

  const [connectedClient, setConnectedClient] = React.useState<Client>();
  const lastSignedEndpoint = React.useRef<string | null>();

  React.useEffect(() => {
    if (connectedClient?.isConnected() && !!signedEndpoint && lastSignedEndpoint.current === signedEndpoint) {
      return;
    }

    lastSignedEndpoint.current = signedEndpoint;
    setConnectedClient(undefined);
    if (!signedEndpoint) {
      return;
    }

    const clientId = Math.random().toString(36).substring(7);
    const client = new Client(signedEndpoint, clientId);

    client.onConnectionLost = (...p) => {
      setConnectedClient(undefined);
    }

    client.onMessageDelivered = ({ destinationName, payloadString }) => {
      console.log('tx', destinationName, payloadString);
    }

    client.connect({
      onSuccess: (...p) => {
        setConnectedClient(client);
      },
    });
  }, [signedEndpoint, connectedClient]);

  React.useEffect(() => {
    return !connectedClient
      ? () => { }
      : () => {
        connectedClient.onConnectionLost = () => null;
        connectedClient.onMessageArrived = () => null;
        if (connectedClient.isConnected()) {
          connectedClient.disconnect();
        }
      }
  }, [connectedClient]);

  const messageReceivedCallback = React.useRef<MqttMessageCallback>();

  React.useEffect(
    () => {
      messageReceivedCallback.current = undefined;
      if (!connectedClient?.isConnected()) {
        setClientInterface(null);
        return;
      }
      const clientInterface: MqttClient = {
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
        onMessageReceived: handler => messageReceivedCallback.current = handler,
      };
      connectedClient.onMessageArrived = ({ destinationName, payloadString }) => {
        console.log('rx', destinationName, payloadString);
        messageReceivedCallback.current && messageReceivedCallback.current(destinationName, payloadString);
      }
      setClientInterface(clientInterface);
    },
    [connectedClient]);

  return clientInterface;
}

export default useMqttClient;
