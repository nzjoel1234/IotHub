import React from 'react';

import { AuthenticatedZone } from 'components/auth/AuthenticatedZone';
import Sprinkler from 'components/sprinkler/Sprinkler';

import '@fortawesome/fontawesome-free/css/all.css';
import NavBar from 'components/NavBar';

function App() {
  return (
    <AuthenticatedZone>
      <NavBar />
      <div className="container">
        <Sprinkler sprinklerId="sprinkler-1" />
      </div>
    </AuthenticatedZone>
  );
}

export default App;
