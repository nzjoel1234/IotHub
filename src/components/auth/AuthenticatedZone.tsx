import React from 'react';
import { ICredentials } from '@aws-amplify/core';
import { Auth, Hub } from 'aws-amplify';

import { LoginForm, ILoginFormData } from './LoginForm';
import CredentialsContext from './CredentialsContext';

export function AuthenticatedZone({ children }: React.PropsWithChildren<{}>) {

  const [loggedIn, setLoggedIn] = React.useState<boolean>();
  const [credentials, setCredentials] = React.useState<ICredentials>();

  const updateAuthState = React.useCallback(() => {
    Auth.currentCredentials()
      .then(setCredentials);
    Auth.currentSession()
      .then(() => setLoggedIn(true))
      .catch(() => setLoggedIn(false));
  }, []);

  React.useEffect(() => {
    Hub.listen('auth', data => {
      console.log(data);
      updateAuthState();
    });
    updateAuthState();
  }, [updateAuthState])

  const login = React.useCallback((credentials: ILoginFormData) => {
    return (Auth.signIn(credentials)
      .then(() => null)
      .catch(e => e.message)).then(i => { console.log(i); return i; });
  }, []);

  return loggedIn === undefined
    ? (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 100,
      }}>
        <span className="icon">
          <i className="fa fa-circle-notch fa-spin" />
        </span>
      </div>
    )
    : !loggedIn
      ? < LoginForm login={login} />
      : (
        <CredentialsContext.Provider value={credentials}>
          {children}
        </CredentialsContext.Provider>
      );
}

export default AuthenticatedZone;
