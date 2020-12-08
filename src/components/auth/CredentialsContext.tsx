import * as React from 'react';
import { Auth, Hub } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';
import { DateTime } from 'luxon';

import { useNow } from 'components/util';

interface ICredentialState {
  credentials?: ICredentials | null;
  expires: DateTime;
}

export const CredentialsContext = React.createContext<ICredentials | null | undefined>(undefined);

export const MockCredentialsContext = React.createContext<ICredentials | null | undefined>({
  _isMock: true
} as any);

export const CredentialsProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [{ credentials, expires }, setCredentials] =
    React.useState<ICredentialState>({ expires: DateTime.local() });

  React.useEffect(() => {
    console.log('credentials', {
      credentials,
      expires: expires.toJSDate(),
    });
  }, [credentials, expires]);

  const updateAuthState = React.useCallback(async () => {
    console.log('updateAuthState');
    const retryExpiry = DateTime.local().plus({ seconds: 20 });
    try {
      const session = await Auth.currentSession();
      const credentials = await Auth.currentCredentials();
      setCredentials({
        credentials: credentials?.authenticated ? credentials : null,
        expires: credentials?.authenticated ? DateTime.fromMillis(session.getIdToken().getExpiration() * 1000) : retryExpiry,
      });
    } catch (e) {
      console.error('updateAuthState', e);
      setCredentials({
        credentials: null,
        expires: retryExpiry,
      });
    }
  }, []);

  React.useEffect(() => {
    Hub.listen('auth', updateAuthState);
    return () => {
      Hub.remove('auth', updateAuthState);
    }
  }, [updateAuthState]);

  const now = useNow();
  const lastExpiryRef = React.useRef<DateTime>();
  React.useEffect(() => {
    if (lastExpiryRef.current !== expires && expires <= now) {
      lastExpiryRef.current = expires;
      updateAuthState();
    }
  }, [updateAuthState, expires, now]);

  return (
    <CredentialsContext.Provider value={credentials}>
      <>{children}</>
    </CredentialsContext.Provider>
  );
};

export default CredentialsContext;
