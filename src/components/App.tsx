import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import {
  AuthenticatedZone,
  LoginStateChanging,
  CredentialsProvider,
} from 'components/auth';
import { Sprinkler } from 'components/sprinkler';
import NavBar from 'components/NavBar';

import '@fortawesome/fontawesome-free/css/all.css';
import { MqttContextProvider } from 'components/util';

function App() {
  return (
    <CredentialsProvider>
      <Router>
        <Switch>
          <Route path="/login">
            <LoginStateChanging waitingFor="login" />
          </Route>
          <Route path="/logout">
            <LoginStateChanging waitingFor="logout" />
          </Route>
          <Route>
            <AuthenticatedZone>
              <MqttContextProvider>
                <NavBar />
                <div className="container px-2">
                  <Sprinkler sprinklerId="sprinkler-1" />
                </div>
              </MqttContextProvider>
            </AuthenticatedZone>
          </Route>
        </Switch>
      </Router>
    </CredentialsProvider>
  );
}

export default App;
