import useCredentials from 'components/auth/useCredentials';
import { useTimeout } from 'components/util';
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { Auth } from 'aws-amplify';

interface IProps {
  waitingFor: 'login' | 'logout';
}

export const LoginStateChanging = ({ waitingFor }: IProps) => {
  const timeout = useTimeout();
  const credentials = useCredentials();
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (waitingFor === 'logout') {
      Auth.signOut();
    }
    timeout.start(() => setTimedOut(true), 2000);
  }, [waitingFor, timeout]);

  return timedOut || (!!credentials === (waitingFor === 'login'))
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
