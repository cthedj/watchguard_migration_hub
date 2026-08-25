import { PublicClientApplication } from '@azure/msal-browser'
import { runtimeConfig } from '../config/runtime'

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'https://graph.microsoft.com/User.Read'],
}

export const graphTokenRequest = {
  scopes: runtimeConfig.graph.scopes,
}

export const msalInstance = runtimeConfig.authMode === 'entra'
  ? new PublicClientApplication({
      auth: {
        clientId: runtimeConfig.entra.clientId,
        authority: `https://login.microsoftonline.com/${runtimeConfig.entra.tenantId}`,
        redirectUri: runtimeConfig.entra.redirectUri,
        postLogoutRedirectUri: runtimeConfig.entra.redirectUri,
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      },
    })
  : null
