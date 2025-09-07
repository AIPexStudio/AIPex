import React, { useState, useEffect } from "react"
import "~/style.css"

import { Thread } from "~/lib/components/assistant-ui/thread"
import { AIPexRuntimeProvider } from "~/lib/components/assistant-ui/runtime-provider"
import { AuthProvider, useAuth } from "~/lib/components/auth-provider"
import { LoginButton } from "~/lib/components/login-button"
import { UserProfile } from "~/lib/components/user-profile"

const AIChatSidebarAssistantUI = () => {
  const [showSettings, setShowSettings] = useState(false)
  const { authState } = useAuth()
  
  const [aiHost, setAiHost] = useState("")
  const [aiToken, setAiToken] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")

  // Listen for settings open event from Thread component
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true);
    };

    window.addEventListener('open-aipex-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-aipex-settings', handleOpenSettings);
    };
  }, []);

  // Load AI settings initially
  useEffect(() => {
    const loadAISettings = async () => {
      try {
        const storage = new (await import("@plasmohq/storage")).Storage()
        const [hostValue, tokenValue, modelValue] = await Promise.all([
          storage.get("aiHost"),
          storage.get("aiToken"),
          storage.get("aiModel")
        ])
        setAiHost(hostValue || "https://api.deepseek.com/chat/completions")
        setAiToken(tokenValue || "")
        setAiModel(modelValue || "deepseek-chat")
      } catch (e) {
        console.error("Failed to load AI settings", e)
      }
    }
    loadAISettings()
  }, [])

  const handleSaveAISettings = async () => {
    setIsSaving(true)
    try {
      const storage = new (await import("@plasmohq/storage")).Storage()
      await Promise.all([
        storage.set("aiHost", aiHost),
        storage.set("aiToken", aiToken),
        storage.set("aiModel", aiModel)
      ])
      // Show success feedback
      setSaveStatus("Settings saved successfully!")
      setTimeout(() => setSaveStatus(""), 1500)
      console.log("AI settings saved")
    } catch (e) {
      console.error("Error saving AI settings:", e)
      // Show error feedback
      setSaveStatus("Error saving settings")
      setTimeout(() => setSaveStatus(""), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 w-full h-full bg-white flex flex-col border-t border-gray-200 font-sans text-gray-900">
      {/* Header */}
      <div className="relative px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left side - Settings button */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11.983 1.588a1 1 0 00-1.966 0l-.078.46a7.97 7.97 0 00-1.357.563l-.42-.243a1 1 0 00-1.366.366l-.983 1.703a1 1 0 00.366 1.366l.42.243c-.124.44-.214.9-.264 1.372l-.46.078a1 1 0 000 1.966l.46.078c.05.472.14.932.264 1.372l-.42.243a1 1 0 00-.366 1.366l.983 1.703a1 1 0 001.366.366l.42-.243c.425.242.88.44 1.357.563l.078.46a1 1 0 001.966 0l.078-.46c.472-.05.932-.14 1.372-.264l.243.42a1 1 0 001.366.366l1.703-.983a1 1 0 00.366-1.366l-.243-.42c.242-.425.44-.88.563-1.357l.46-.078a1 1 0 000-1.966l-.46-.078a7.97 7.97 0 00-.563-1.357l.243-.42a1 1 0 00-.366-1.366l-1.703-.983a1 1 0 00-1.366.366l-.243.42a7.97 7.97 0 00-1.372-.264l-.078-.46zM10 13a3 3 0 110-6 3 3 0 010 6z" />
            </svg>
          </button>

          {/* Center - Title */}
          <h2 className="text-xl font-bold text-gray-900">AI Chat</h2>

          {/* Right side - Auth and New Chat */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                // Dispatch event to clear all messages
                window.dispatchEvent(new CustomEvent('clear-aipex-messages'));
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              title="New Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            
            {/* Auth Section */}
            {authState.isAuthenticated ? (
              <UserProfile />
            ) : (
              <LoginButton className="text-sm px-3 py-1" />
            )}
          </div>
        </div>
      </div>
      
      {/* Main chat interface - always visible */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AIPexRuntimeProvider>
          <Thread />
        </AIPexRuntimeProvider>
      </div>

      {/* Settings Modal - floating overlay */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out hover:shadow-3xl" style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          }}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                <p className="text-sm text-gray-600">AI configuration</p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6">
              {/* AI Configuration */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">AI Host</label>
                  <input
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    value={aiHost}
                    onChange={(e) => setAiHost(e.target.value)}
                    placeholder="https://api.deepseek.com/chat/completions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">AI Token</label>
                  <input
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    type="password"
                    value={aiToken}
                    onChange={(e) => setAiToken(e.target.value)}
                    placeholder="Enter your API token"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">AI Model</label>
                  <input
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="deepseek-chat"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveAISettings}
                    disabled={isSaving}
                    className={`px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${isSaving ? 'bg-gray-300 disabled:cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'}`}
                  >{isSaving ? 'Saving...' : 'Save Settings'}</button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >Cancel</button>
                </div>
                {saveStatus && (
                  <div className={`text-sm mt-2 ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                    {saveStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const AIChatSidebarWithAuth = () => {
  return (
    <AuthProvider>
      <AIChatSidebarAssistantUI />
    </AuthProvider>
  )
}

export default AIChatSidebarWithAuth
