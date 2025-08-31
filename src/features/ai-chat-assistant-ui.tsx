import React, { useState, useEffect } from "react"
import "~/style.css"

import { Thread } from "~/lib/components/assistant-ui/thread"
import { AIPexRuntimeProvider } from "~/lib/components/assistant-ui/runtime-provider"

const AIChatSidebarAssistantUI = () => {
  const [showSettings, setShowSettings] = useState(false)
  
  const [aiHost, setAiHost] = useState("")
  const [aiToken, setAiToken] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [isSaving, setIsSaving] = useState(false)

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
      console.log("AI settings saved")
    } catch (e) {
      console.error("Error saving AI settings:", e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 w-full h-full bg-white flex flex-col border-t border-gray-200 font-sans text-gray-900">
      {/* Header */}
      <div className="relative px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">AI Chat</h2>
        </div>
        <button
          onClick={() => {
            // Dispatch event to clear all messages
            window.dispatchEvent(new CustomEvent('clear-aipex-messages'));
          }}
          className="absolute right-4 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          title="New Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        <button
          onClick={() => setShowSettings(s => !s)}
          className="absolute left-4 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11.983 1.588a1 1 0 00-1.966 0l-.078.46a7.97 7.97 0 00-1.357.563l-.42-.243a1 1 0 00-1.366.366l-.983 1.703a1 1 0 00.366 1.366l.42.243c-.124.44-.214.9-.264 1.372l-.46.078a1 1 0 000 1.966l.46.078c.05.472.14.932.264 1.372l-.42.243a1 1 0 00-.366 1.366l.983 1.703a1 1 0 001.366.366l.42-.243c.425.242.88.44 1.357.563l.078.46a1 1 0 001.966 0l.078-.46c.472-.05.932-.14 1.372-.264l.243.42a1 1 0 001.366.366l1.703-.983a1 1 0 00.366-1.366l-.243-.42c.242-.425.44-.88.563-1.357l.46-.078a1 1 0 000-1.966l-.46-.078a7.97 7.97 0 00-.563-1.357l.243-.42a1 1 0 00-.366-1.366l-1.703-.983a1 1 0 00-1.366.366l-.243.42a7.97 7.97 0 00-1.372-.264l-.078-.46zM10 13a3 3 0 110-6 3 3 0 010 6z" />
          </svg>
        </button>
      </div>
      
      {showSettings ? (
        // Settings view
        <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-slate-50">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
              <p className="text-sm text-gray-600">AI configuration</p>
            </div>

            {/* AI Configuration */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="text-base font-semibold text-gray-900">AI Configuration</div>
                <div className="text-sm text-gray-600">Configure AI host, token and model</div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">AI Host</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                    value={aiHost}
                    onChange={(e) => setAiHost(e.target.value)}
                    placeholder="https://api.deepseek.com/chat/completions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">AI Token</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                    type="password"
                    value={aiToken}
                    onChange={(e) => setAiToken(e.target.value)}
                    placeholder="Enter your API token"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">AI Model</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="deepseek-chat"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveAISettings}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-lg text-white font-semibold ${isSaving ? 'bg-gray-300 disabled:cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >{isSaving ? 'Saving...' : 'Save Settings'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Main chat interface using assistant-ui
        <div className="flex-1 min-h-0 flex flex-col">
          <AIPexRuntimeProvider>
            <Thread />
          </AIPexRuntimeProvider>
        </div>
      )}
    </div>
  )
}

export default AIChatSidebarAssistantUI
