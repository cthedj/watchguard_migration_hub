const env = import.meta.env

const splitScopes = value => String(value || '')
  .split(/\s+/)
  .map(x => x.trim())
  .filter(Boolean)

const defaultRedirect = typeof window === 'undefined'
  ? ''
  : `${window.location.origin}${import.meta.env.BASE_URL || '/'}`

export const runtimeConfig = {
  appEnv: env.VITE_APP_ENV || (env.PROD ? 'production' : 'development'),
  authMode: env.VITE_AUTH_MODE || 'demo',
  dataProvider: env.VITE_DATA_PROVIDER || 'local',
  entra: {
    tenantId: env.VITE_ENTRA_TENANT_ID || '',
    clientId: env.VITE_ENTRA_CLIENT_ID || '',
    allowedGroupId: env.VITE_ENTRA_ALLOWED_GROUP_ID || '',
    redirectUri: env.VITE_ENTRA_REDIRECT_URI || defaultRedirect,
  },
  graph: {
    siteId: env.VITE_GRAPH_SITE_ID || '',
    migrationsListId: env.VITE_GRAPH_MIGRATIONS_LIST_ID || '',
    accountsListId: env.VITE_GRAPH_ACCOUNTS_LIST_ID || '',
    activityListId: env.VITE_GRAPH_ACTIVITY_LIST_ID || '',
    tasksListId: env.VITE_GRAPH_TASKS_LIST_ID || '',
    scopes: splitScopes(env.VITE_GRAPH_SCOPES || 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Sites.ReadWrite.All'),
  },
}

export function validateRuntimeConfig() {
  const errors = []

  if (runtimeConfig.authMode === 'entra') {
    if (!runtimeConfig.entra.tenantId) errors.push('VITE_ENTRA_TENANT_ID is required when Entra authentication is enabled.')
    if (!runtimeConfig.entra.clientId) errors.push('VITE_ENTRA_CLIENT_ID is required when Entra authentication is enabled.')
    if (!runtimeConfig.entra.redirectUri) errors.push('VITE_ENTRA_REDIRECT_URI is required when Entra authentication is enabled.')
  }

  if (runtimeConfig.dataProvider === 'sharepoint') {
    if (!runtimeConfig.graph.siteId) errors.push('VITE_GRAPH_SITE_ID is required when the SharePoint data provider is enabled.')
    if (!runtimeConfig.graph.migrationsListId) errors.push('VITE_GRAPH_MIGRATIONS_LIST_ID is required when the SharePoint data provider is enabled.')
    if (!runtimeConfig.graph.accountsListId) errors.push('VITE_GRAPH_ACCOUNTS_LIST_ID is required when the SharePoint data provider is enabled.')
    if (!runtimeConfig.graph.activityListId) errors.push('VITE_GRAPH_ACTIVITY_LIST_ID is required when the SharePoint data provider is enabled.')
  }

  return errors
}

export const isDemoMode = runtimeConfig.authMode !== 'entra'
export const isSharedDataMode = runtimeConfig.dataProvider === 'sharepoint'
