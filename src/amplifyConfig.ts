const isDevelopment = process?.env?.NODE_ENV === 'development';

const domain = isDevelopment ? 'localhost' : 'iot.nzjoel.net';
const rootUrl = isDevelopment ? `http://${domain}:3000` : `https://${domain}`;

export const amplifyConfig = {
  Auth: {
    // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
    identityPoolId: 'us-east-1:03efd3db-3ad2-4947-90b9-ba59c1d7b893',

    // REQUIRED - Amazon Cognito Region
    region: 'us-east-1',

    // OPTIONAL - Amazon Cognito Federated Identity Pool Region 
    // Required only if it's different from Amazon Cognito Region
    // identityPoolRegion: 'XX-XXXX-X',

    // OPTIONAL - Amazon Cognito User Pool ID
    userPoolId: 'us-east-1_MBUlZ8M8A',

    // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
    userPoolWebClientId: '6s05l7if139nbna4gg9nsbcgou',

    // OPTIONAL - Enforce user authentication prior to accessing AWS resources or not
    // mandatorySignIn: false,

    // OPTIONAL - Configuration for cookie storage
    // Note: if the secure flag is set to true, then the cookie transmission requires a secure protocol
    cookieStorage: {
      // REQUIRED - Cookie domain (only required if cookieStorage is provided)
      domain,
      path: '/',
      expires: 365,
      // OPTIONAL - See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
      // sameSite: "strict" | "lax",
      // OPTIONAL - Cookie secure flag
      // Either true or false, indicating if the cookie transmission requires a secure protocol (https).
      secure: !isDevelopment,
    },

    // OPTIONAL - customized storage object
    // storage: MyStorage,

    // OPTIONAL - Manually set the authentication flow type. Default is 'USER_SRP_AUTH'
    // authenticationFlowType: 'USER_PASSWORD_AUTH',

    // OPTIONAL - Manually set key value pairs that can be passed to Cognito Lambda Triggers
    // clientMetadata: { myCustomKey: 'myCustomValue' },

    //OPTIONAL - Hosted UI configuration
    oauth: {
      domain: 'auth.nzjoel.net',
      scope: ['email', 'profile', 'openid', 'aws.cognito.signin.user.admin'],
      redirectSignIn: `${rootUrl}/login`,
      redirectSignOut: `${rootUrl}/logout`,
      responseType: 'code' // or 'token', note that REFRESH token will only be generated when the responseType is code
    }
  }
};

export default amplifyConfig;
