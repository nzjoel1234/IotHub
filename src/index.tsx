import React from 'react';
import ReactDOM from 'react-dom';
import Amplify from 'aws-amplify';

import App from './components/App';

import amplifyConfig from './amplifyConfig';

import './App.sass';

Amplify.configure(amplifyConfig);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
