import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  redirectUri: window.location.origin,
  clientId: '60093986641-p0v6tvfduba26h75m1vee0hohgcfpafu.apps.googleusercontent.com', // User needs to replace this
  responseType: 'id_token token',
  strictDiscoveryDocumentValidation: false,
  scope: 'openid profile email',
  showDebugInformation: true,
};
