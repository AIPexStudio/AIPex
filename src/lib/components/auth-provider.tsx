import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, AuthState, User } from '../auth-service'

interface AuthContextType {
  authState: AuthState
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  })
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuth = async () => {
    try {
      const newAuthState = await authService.checkAuthStatus()
      setAuthState(newAuthState)
    } catch (error) {
      console.error('Failed to refresh auth state:', error)
    }
  }

  const login = async () => {
    try {
      await authService.login()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setAuthState({ isAuthenticated: false, user: null, token: null })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  useEffect(() => {
    // 初始检查认证状态
    refreshAuth().finally(() => setIsLoading(false))

    // 监听认证状态变化
    const handleAuthStateChange = () => {
      refreshAuth()
    }

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'AUTH_STATE_CHANGED') {
        handleAuthStateChange()
      }
    })

    return () => {
      chrome.runtime.onMessage.removeListener(handleAuthStateChange)
    }
  }, [])

  const value: AuthContextType = {
    authState,
    login,
    logout,
    refreshAuth
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

