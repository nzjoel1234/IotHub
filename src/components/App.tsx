import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import { AuthenticatedZone } from 'components/auth';
import { Sprinkler } from 'components/sprinkler';
import NavBar from 'components/NavBar';

import '@fortawesome/fontawesome-free/css/all.css';
import { LoginStateChanging } from 'components/auth';

function App() {
  return (
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
            <NavBar />
            <div className="container px-2">
              <Sprinkler sprinklerId="sprinkler-1" />
            </div>
          </AuthenticatedZone>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
