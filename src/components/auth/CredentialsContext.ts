import * as React from 'react';
import { ICredentials } from '@aws-amplify/core';

export const CredentialsContext = React.createContext<ICredentials | undefined>(undefined);
export default CredentialsContext;