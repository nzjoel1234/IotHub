import React from 'react';
import { map } from 'lodash';

import amplifyConfig from 'amplifyConfig';

import {
  CredentialsContext as RealCredentialsContext,
  MockCredentialsContext,
} from './CredentialsContext';
const CredentialsContext = process?.env?.REACT_APP_MOCK_CLIENT === 'true'
? MockCredentialsContext : RealCredentialsContext

const loginUrl = `https://${amplifyConfig.Auth.oauth.domain}/login?${map({
  'client_id': amplifyConfig.Auth.userPoolWebClientId,
  'response_type': amplifyConfig.Auth.oauth.responseType,
  'scope': amplifyConfig.Auth.oauth.scope.join('+'),
  'redirect_uri': amplifyConfig.Auth.oauth.redirectSignIn,
}, (v, k) => `${k}=${v}`).join('&')}`;

export function AuthenticatedZone({ children }: any) {
  const credentials = React.useContext(CredentialsContext);

  return credentials === undefined ? (
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
        <i className="fas fa-circle-notch fa-spin" />
      </span>
    </div>
  ) : !credentials
      ? (
        <section className="hero">
          <div className="hero-body">
            <div className="container">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img className="mx-2" src="/logo128.png" alt="brand" />
                <div className="mx-2" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h1 className="title">IOT Hub</h1>
                  <a className="button is-success" href={loginUrl}>LOGIN</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )
      : <>{children}</>;
}

export default AuthenticatedZone;
