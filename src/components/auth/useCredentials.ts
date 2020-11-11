import * as React from 'react';
import { Auth, Hub } from 'aws-amplify';
import { ICredentials } from '@aws-amplify/core';

export function useCredentials() {
  const [credentials, setCredentials] = React.useState<ICredentials | null>();
  React.useEffect(() => {
    const updateAuthState = () =>
      Auth.currentCredentials()
        .then(c => setCredentials(c?.authenticated ? c : null))
        .catch(e => setCredentials(null));
    Hub.listen('auth', updateAuthState);
    updateAuthState();
    return () => {
      Hub.remove('auth', updateAuthState);
    }
  }, []);
  return credentials;
}

export default useCredentials;
