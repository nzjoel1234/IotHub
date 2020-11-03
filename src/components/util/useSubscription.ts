import * as React from 'react';
import { PubSub } from 'aws-amplify';

interface IUseSubscriptionOptions {
  topic: string | string[];
  onMessageReceived: (message: any) => void;
  onError?: (error: any) => void;
  onUnsubscribed?: () => void;
}

export function useSubscription({
  topic,
  onMessageReceived,
  onError = () => null,
  onUnsubscribed = () => null,
}: IUseSubscriptionOptions) {
  React.useEffect(
    () => {
      const subscription = PubSub
        .subscribe(topic)
        .subscribe({
          next: (message) => {
            console.log('messageReceived', message.value);
            onMessageReceived(message.value);
          },
          error: error => onError && onError(error),
        });
      return () => {
        subscription.unsubscribe();
        onUnsubscribed && onUnsubscribed();
      };
    }, [topic, onMessageReceived, onError, onUnsubscribed]);
}

export default useSubscription;
