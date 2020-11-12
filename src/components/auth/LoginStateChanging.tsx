import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { Auth } from 'aws-amplify';

import useCredentials from 'components/auth/useCredentials';
import { useNow } from 'components/util';
import { Duration } from 'luxon';

interface IProps {
  waitingFor: 'login' | 'logout';
}

export const LoginStateChanging = ({ waitingFor }: IProps) => {
  const credentials = useCredentials();
  const now = useNow();
  const [expiryTime] = React.useState(now.plus(Duration.fromObject({ seconds: 5 })));

  React.useEffect(() => {
    if (waitingFor === 'logout') {
      Auth.signOut();
    }
  }, [waitingFor]);

  return ((now > expiryTime) || (credentials !== undefined && (!!credentials === (waitingFor === 'login'))))
    ? <Redirect to="" />
    : (
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
    );
}

export default LoginStateChanging;
