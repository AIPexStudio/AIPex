import React, { useState } from 'react'
import { useAuth } from './auth-provider'

interface LoginButtonProps {
  className?: string
}

export const LoginButton: React.FC<LoginButtonProps> = ({ className = "" }) => {
  const { login, refreshAuth } = useAuth()
  const [isManualSync, setIsManualSync] = useState(false)

  const handleLogin = async () => {
    await login()
  }

  const handleManualSync = async () => {
    setIsManualSync(true)
    try {
      await refreshAuth()
    } finally {
      setIsManualSync(false)
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      <button
        onClick={handleLogin}
        className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        Sign In
      </button>
      
      <button
        onClick={handleManualSync}
        disabled={isManualSync}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
        title="If you've already logged in on the website, click this to sync"
      >
        {isManualSync ? 'Syncing...' : 'Already logged in? Sync here'}
      </button>
    </div>
  )
}

