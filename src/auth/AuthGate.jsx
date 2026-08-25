import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { InteractionRequiredAuthError, InteractionStatus } from '@azure/msal-browser'
import { useMsal } from '@azure/msal-react'
import { runtimeConfig, validateRuntimeConfig } from '../config/runtime'
import { graphTokenRequest, loginRequest } from './msal'

const AuthContext = createContext({
  mode: 'demo',
  user: null,
  authorized: true,
  getAccessToken: async () => '',
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

function Screen({ title, children, action }) {
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f4f5f7',padding:24,fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{width:'min(440px,100%)',background:'#fff',border:'1px solid #e3e6ea',borderRadius:14,padding:32,boxShadow:'0 14px 40px rgba(17,24,39,.08)'}}>
        <div style={{fontSize:12,fontWeight:800,letterSpacing:'.14em',color:'#d92d20',marginBottom:10}}>WATCHGUARD MIGRATION HUB</div>
        <h1 style={{fontSize:26,margin:'0 0 12px',color:'#172033'}}>{title}</h1>
        <div style={{fontSize:14,lineHeight:1.65,color:'#5b6472'}}>{children}</div>
        {action}
      </div>
    </div>
  )
}

function DemoAuth({ children }) {
  const value = useMemo(() => ({
    mode: 'demo',
    user: { name: 'Demo User', username: 'demo@local' },
    authorized: true,
    getAccessToken: async () => '',
    signOut: async () => {},
  }), [])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function EntraAuth({ children }) {
  const { instance, accounts, inProgress } = useMsal()
  const account = accounts[0] || null
  const configErrors = validateRuntimeConfig()
  const claims = account?.idTokenClaims || {}
  const groups = Array.isArray(claims.groups) ? claims.groups : []
  const requiredGroup = runtimeConfig.entra.allowedGroupId
  const groupOverage = Boolean(claims.hasgroups || claims?._claim_names?.groups)
  const authorized = Boolean(account) && (!requiredGroup || groups.includes(requiredGroup))

  const signIn = useCallback(() => instance.loginRedirect(loginRequest), [instance])
  const signOut = useCallback(() => account ? instance.logoutRedirect({ account }) : Promise.resolve(), [account, instance])

  const getAccessToken = useCallback(async () => {
    if (!account) throw new Error('A signed-in Microsoft account is required.')
    const request = { ...graphTokenRequest, account }
    try {
      const response = await instance.acquireTokenSilent(request)
      return response.accessToken
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect(request)
      }
      throw error
    }
  }, [account, instance])

  const value = useMemo(() => ({
    mode: 'entra',
    user: account ? {
      name: account.name || account.username,
      username: account.username,
      homeAccountId: account.homeAccountId,
      localAccountId: account.localAccountId,
    } : null,
    authorized,
    getAccessToken,
    signOut,
  }), [account, authorized, getAccessToken, signOut])

  if (configErrors.length) {
    return <Screen title="Production configuration incomplete"><ul>{configErrors.map(x => <li key={x}>{x}</li>)}</ul></Screen>
  }

  if (!account) {
    return <Screen title="Sign in to continue" action={<button onClick={signIn} disabled={inProgress !== InteractionStatus.None} style={{marginTop:20,width:'100%',border:0,borderRadius:8,padding:'12px 16px',background:'#d92d20',color:'#fff',fontWeight:800,cursor:'pointer'}}>Sign in with Microsoft</button>}>
      Use your Dolos Microsoft 365 account to access the Migration Hub.
    </Screen>
  }

  if (!authorized) {
    return <Screen title="Access not granted" action={<button onClick={signOut} style={{marginTop:20,border:'1px solid #d5d9df',borderRadius:8,padding:'10px 14px',background:'#fff',fontWeight:700,cursor:'pointer'}}>Sign out</button>}>
      {groupOverage
        ? 'Your Microsoft token contains a group-overage marker. The production configuration will need a Microsoft Graph fallback check for this account before access can be evaluated.'
        : 'Your account is authenticated, but it is not a member of the Microsoft 365 security group allowed to use the Migration Hub.'}
    </Screen>
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default function AuthGate({ children }) {
  if (runtimeConfig.authMode !== 'entra') return <DemoAuth>{children}</DemoAuth>
  return <EntraAuth>{children}</EntraAuth>
}
