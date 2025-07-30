import React, { useEffect, useState } from "react"
import "~style.css"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

function IndexPopup() {
  const [shortcut, setShortcut] = useState("Not set")
  const [activeTab, setActiveTab] = useState<"organize" | "command" | "config">("organize")
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [organizeStatus, setOrganizeStatus] = useState("")
  const [organizeSteps, setOrganizeSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [operationType, setOperationType] = useState<"organize" | "ungroup" | null>(null)
  const [message, setMessage] = useState("")
  const [showUngroupOption, setShowUngroupOption] = useState(false)
  const [aiHost, setAiHost] = useState("")
  const [aiToken, setAiToken] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
    // Load shortcut
    if (chrome?.commands) {
      chrome.commands.getAll(function (commands) {
        const openaipexCommand = commands.find(
          (command) => command.name === "open-aipex"
        )
        if (openaipexCommand) {
          setShortcut(openaipexCommand.shortcut || "Not set")
        }
      })
    }

    // Load AI settings
    const loadAISettings = async () => {
      try {
        const [hostValue, tokenValue, modelValue] = await Promise.all([
      storage.get("aiHost"),
      storage.get("aiToken"),
          storage.get("aiModel")
        ])
        
        setAiHost(hostValue || "https://api.openai.com/v1/chat/completions")
        setAiToken(tokenValue || "")
        setAiModel(modelValue || "gpt-3.5-turbo")
      } catch (error) {
        console.error("Error loading AI settings:", error)
      }
    }

    loadAISettings()

    // Listen for completion messages from background script
    const handleMessage = (message: any) => {
      if (message.request === "organize-tabs-complete") {
        setIsOrganizing(false)
        setOperationType(null)
        if (message.success) {
          setOrganizeStatus("Tabs organized successfully!")
          setOrganizeSteps(prev => [...prev, message.message])
          setMessage("Your tabs have been organized into groups using AI")
        } else {
          setOrganizeStatus("Failed to organize tabs")
          setOrganizeSteps(prev => [...prev, `Error: ${message.message}`])
          setMessage("Error organizing tabs. Please try again.")
        }
        setTimeout(() => setMessage(""), 3000)
      } else if (message.request === "ungroup-tabs-complete") {
        setIsOrganizing(false)
        setOperationType(null)
        if (message.success) {
          setOrganizeStatus("Tabs ungrouped successfully!")
          setOrganizeSteps(prev => [...prev, message.message])
          setMessage("All tab groups have been removed")
        } else {
          setOrganizeStatus("Failed to ungroup tabs")
          setOrganizeSteps(prev => [...prev, `Error: ${message.message}`])
          setMessage("Error ungrouping tabs. Please try again.")
        }
        setTimeout(() => setMessage(""), 3000)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  const handleOrganizeTabs = async () => {
    setIsOrganizing(true)
    setCurrentStep(0)
    setOrganizeSteps([])
    setOperationType("organize")
    setOrganizeStatus("Starting tab organization...")
    
    try {
      // Check if AI token is available
      const aiToken = await storage.get("aiToken")
      if (!aiToken) {
        setOrganizeStatus("AI token not configured")
        setMessage("Please configure your AI token in settings first")
        setTimeout(() => setMessage(""), 3000)
        setIsOrganizing(false)
        setOperationType(null)
        return
      }

      // Get all tabs
      setOrganizeStatus("Getting all open tabs...")
      setOrganizeSteps(prev => [...prev, "Getting all open tabs"])
      setCurrentStep(1)
      
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const validTabs = tabs.filter(tab => tab.url)
      
      if (validTabs.length === 0) {
        setOrganizeStatus("No tabs found to organize")
        setMessage("No open tabs found to organize")
        setTimeout(() => setMessage(""), 3000)
        setIsOrganizing(false)
        setOperationType(null)
        return
      }

      // Show tab info
      setOrganizeStatus(`Found ${validTabs.length} tabs to organize...`)
      setOrganizeSteps(prev => [...prev, `Found ${validTabs.length} tabs to analyze`])
      setCurrentStep(2)
      
      // Show sample tabs
      const tabDetails = validTabs.slice(0, 5).map(tab => {
        const hostname = tab.url ? new URL(tab.url).hostname : "unknown"
        return `${tab.title} (${hostname})`
      })
      
      if (validTabs.length > 5) {
        tabDetails.push(`... and ${validTabs.length - 5} more tabs`)
      }
      
      setOrganizeSteps(prev => [...prev, "Sample tabs:", ...tabDetails])
      setCurrentStep(3)

      // Send to background script
      setOrganizeStatus("Organizing tabs with AI...")
      setOrganizeSteps(prev => [...prev, "Sending to AI for classification"])
      setCurrentStep(4)
      
      // Send message to background script - completion will be handled by message listener
      chrome.runtime.sendMessage({ request: "organize-tabs" })
      
    } catch (error) {
      console.error("Error in handleOrganizeTabs:", error)
      setOrganizeStatus("Error occurred")
      setOrganizeSteps(prev => [...prev, `Error: ${error.message}`])
      setMessage("An error occurred while organizing tabs")
      setTimeout(() => setMessage(""), 3000)
      setIsOrganizing(false)
      setOperationType(null)
    }
  }

  const handleShortcutClick = () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" }, () => {
      setMessage("Please set the new shortcut in the Chrome Extensions Shortcuts page.")
      setTimeout(() => setMessage(""), 3000)
    })
  }

  const handleQuickOrganize = () => {
    setActiveTab("organize")
    handleOrganizeTabs()
  }

  const handleUngroupTabs = async () => {
    setIsOrganizing(true)
    setCurrentStep(0)
    setOrganizeSteps([])
    setOperationType("ungroup")
    setOrganizeStatus("Starting tab ungrouping...")
    
    try {
      // Get current groups
      setOrganizeStatus("Finding existing tab groups...")
      setOrganizeSteps(prev => [...prev, "Finding existing tab groups"])
      setCurrentStep(1)
      
      const currentWindow = await chrome.windows.getCurrent()
      const groups = await chrome.tabGroups.query({ windowId: currentWindow.id })
      
      if (groups.length === 0) {
        setOrganizeStatus("No groups found")
        setOrganizeSteps(prev => [...prev, "No tab groups found to ungroup"])
        setMessage("No tab groups found to ungroup")
        setTimeout(() => setMessage(""), 3000)
        setIsOrganizing(false)
        setOperationType(null)
        return
      }

      // Show group info
      setOrganizeStatus(`Found ${groups.length} groups to ungroup...`)
      setOrganizeSteps(prev => [...prev, `Found ${groups.length} tab groups`])
      setCurrentStep(2)
      
      const groupDetails = groups.slice(0, 3).map(group => 
        `"${group.title || 'Untitled'}" (${group.id})`
      )
      
      if (groups.length > 3) {
        groupDetails.push(`... and ${groups.length - 3} more groups`)
      }
      
      setOrganizeSteps(prev => [...prev, "Groups to ungroup:", ...groupDetails])
      setCurrentStep(3)

      // Ungroup tabs
      setOrganizeStatus("Ungrouping tabs...")
      setOrganizeSteps(prev => [...prev, "Removing tab groups"])
      setCurrentStep(4)
      
      // Send message to background script - completion will be handled by message listener
      chrome.runtime.sendMessage({ request: "ungroup-tabs" })
      
    } catch (error) {
      console.error("Error in handleUngroupTabs:", error)
      setOrganizeStatus("Error occurred")
      setOrganizeSteps(prev => [...prev, `Error: ${error.message}`])
      setMessage("An error occurred while ungrouping tabs")
      setTimeout(() => setMessage(""), 3000)
      setIsOrganizing(false)
      setOperationType(null)
    }
  }

  const handleSaveAISettings = async () => {
    setIsSaving(true)
    try {
      await Promise.all([
        storage.set("aiHost", aiHost),
        storage.set("aiToken", aiToken),
        storage.set("aiModel", aiModel)
      ])
      setMessage("AI settings saved successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      console.error("Error saving AI settings:", error)
      setMessage("Error saving AI settings. Please try again.")
      setTimeout(() => setMessage(""), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ width: "360px", backgroundColor: "white", color: "black", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: "-0.025em" }}>AIpex</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setActiveTab("organize")}
            style={{
              padding: "8px 12px",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.15s",
              backgroundColor: activeTab === "organize" ? "black" : "#f3f4f6",
              color: activeTab === "organize" ? "white" : "#374151",
              border: "none",
              cursor: "pointer"
            }}
          >
            Organize
          </button>
          <button
            onClick={() => setActiveTab("command")}
            style={{
              padding: "8px 12px",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.15s",
              backgroundColor: activeTab === "command" ? "black" : "#f3f4f6",
              color: activeTab === "command" ? "white" : "#374151",
              border: "none",
              cursor: "pointer"
            }}
          >
            Command
          </button>
          <button
            onClick={() => setActiveTab("config")}
            style={{
              padding: "8px 12px",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.15s",
              backgroundColor: activeTab === "config" ? "black" : "#f3f4f6",
              color: activeTab === "config" ? "white" : "#374151",
              border: "none",
              cursor: "pointer"
            }}
          >
            Config
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px" }}>
        {activeTab === "organize" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Quick Organize Section */}
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Organize Your Tabs</h2>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
                Automatically group your open tabs using AI
              </p>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <button
                  onClick={handleOrganizeTabs}
                  disabled={isOrganizing}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    fontWeight: "600",
                    transition: "all 0.15s",
                    backgroundColor: isOrganizing ? "#d1d5db" : "black",
                    color: isOrganizing ? "#6b7280" : "white",
                    border: "none",
                    cursor: isOrganizing ? "not-allowed" : "pointer",
                    fontSize: "14px"
                  }}
                >
                  {isOrganizing ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <div style={{ width: "16px", height: "16px", border: "2px solid white", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                      <span>Organizing...</span>
                    </div>
                  ) : (
                    "Organize"
                  )}
                </button>
                
                <button
                  onClick={handleUngroupTabs}
                  disabled={isOrganizing}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    fontWeight: "600",
                    transition: "all 0.15s",
                    backgroundColor: isOrganizing ? "#d1d5db" : "#ef4444",
                    color: isOrganizing ? "#6b7280" : "white",
                    border: "none",
                    cursor: isOrganizing ? "not-allowed" : "pointer",
                    fontSize: "14px"
                  }}
                >
                  {isOrganizing ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <div style={{ width: "16px", height: "16px", border: "2px solid white", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                      <span>Ungrouping...</span>
                    </div>
                  ) : (
                    "Ungroup"
                  )}
                </button>
              </div>
              
              {organizeStatus && (
                <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "12px" }}>{organizeStatus}</p>
              )}
              
              {/* Progress Steps */}
              {isOrganizing && organizeSteps.length > 0 && (
                <div style={{ marginTop: "16px", backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#111827" }}>
                    Progress ({currentStep}/{operationType === "ungroup" ? 4 : 4})
                  </h4>
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {organizeSteps.map((step, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          display: "flex", 
                          alignItems: "flex-start", 
                          gap: "8px", 
                          marginBottom: "8px",
                          fontSize: "13px",
                          color: step.startsWith("Error:") ? "#dc2626" : 
                                 step.startsWith("Successfully") ? "#059669" : "#6b7280"
                        }}
                      >
                        <div style={{ 
                          width: "6px", 
                          height: "6px", 
                          backgroundColor: step.startsWith("Error:") ? "#dc2626" : 
                                           step.startsWith("Successfully") ? "#059669" : "#3b82f6", 
                          borderRadius: "50%", 
                          marginTop: "6px", 
                          flexShrink: 0 
                        }}></div>
                        <span style={{ 
                          fontFamily: step.includes("Sample tabs:") || step.includes("(") ? "monospace" : "inherit",
                          fontSize: step.includes("Sample tabs:") || step.includes("(") ? "11px" : "13px"
                        }}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Features List */}
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ fontWeight: "600", marginBottom: "12px", fontSize: "14px" }}>What this does:</h3>
              <ul style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "#6b7280" }}>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "black", borderRadius: "50%", marginTop: "8px", flexShrink: 0 }}></div>
                  <span>Analyzes all your open tabs using AI</span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "black", borderRadius: "50%", marginTop: "8px", flexShrink: 0 }}></div>
                  <span>Groups them by category (Social, Work, Shopping, etc.)</span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "black", borderRadius: "50%", marginTop: "8px", flexShrink: 0 }}></div>
                  <span>Creates tab groups with descriptive names</span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", backgroundColor: "black", borderRadius: "50%", marginTop: "8px", flexShrink: 0 }}></div>
                  <span>Requires OpenAI API token in settings</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "command" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Command Panel Section */}
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Command Panel</h2>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
                Access AIpex from anywhere with a keyboard shortcut
              </p>
            </div>

            {/* Current Shortcut */}
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "12px", color: "#111827" }}>
                Current Shortcut
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <kbd style={{ padding: "8px 12px", backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", fontFamily: "monospace" }}>
                  {shortcut}
                </kbd>
                <button
                  onClick={handleShortcutClick}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "black",
                    color: "white",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.15s",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Change
                </button>
              </div>
            </div>

            {/* Available Commands */}
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ fontWeight: "600", marginBottom: "12px", fontSize: "14px" }}>Available Commands:</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#374151" }}>Search tabs</span>
                  <code style={{ backgroundColor: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>/tabs</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#374151" }}>Search bookmarks</span>
                  <code style={{ backgroundColor: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>/bookmarks</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#374151" }}>Search history</span>
                  <code style={{ backgroundColor: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>/history</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#374151" }}>Group tabs</span>
                  <code style={{ backgroundColor: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>/group</code>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#374151" }}>AI chat</span>
                  <code style={{ backgroundColor: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>/ai</code>
                </div>
              </div>
            </div>

            {/* Quick Access */}
            <div style={{ backgroundColor: "#eff6ff", borderRadius: "12px", padding: "16px", border: "1px solid #bfdbfe" }}>
              <h3 style={{ fontWeight: "600", marginBottom: "8px", fontSize: "14px", color: "#1e3a8a" }}>Quick Access</h3>
              <p style={{ fontSize: "12px", color: "#1d4ed8", marginBottom: "12px" }}>
                Press the shortcut key from any webpage to open the command panel
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleQuickOrganize}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.15s",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Organize
                </button>
                <button
                  onClick={handleUngroupTabs}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.15s",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Ungroup
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* AI Configuration Section */}
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>AI Configuration</h2>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
                Configure your AI settings for tab organization
              </p>
            </div>

            {/* AI Host */}
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#111827" }}>
                AI Host
              </label>
              <input
                type="text"
                value={aiHost}
                onChange={(e) => setAiHost(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  color: "#111827"
                }}
              />
            </div>

            {/* AI Token */}
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#111827" }}>
                AI Token
              </label>
              <input
                type="password"
                value={aiToken}
                onChange={(e) => setAiToken(e.target.value)}
                placeholder="Enter your OpenAI API token"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  color: "#111827"
                }}
              />
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: "#2563eb", textDecoration: "underline" }}>OpenAI Platform</a>
              </p>
            </div>

            {/* AI Model */}
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#111827" }}>
                AI Model
              </label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="gpt-3.5-turbo"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  color: "#111827"
                }}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveAISettings}
              disabled={isSaving}
              style={{
                width: "100%",
                padding: "12px 24px",
                borderRadius: "12px",
                fontWeight: "600",
                transition: "all 0.15s",
                backgroundColor: isSaving ? "#d1d5db" : "black",
                color: isSaving ? "#6b7280" : "white",
                border: "none",
                cursor: isSaving ? "not-allowed" : "pointer",
                fontSize: "14px"
              }}
            >
              {isSaving ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <div style={{ width: "16px", height: "16px", border: "2px solid white", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                  <span>Saving...</span>
                </div>
              ) : (
                "Save AI Settings"
              )}
            </button>

            {/* Info Section */}
            <div style={{ backgroundColor: "#fef3c7", borderRadius: "12px", padding: "16px", border: "1px solid #f59e0b" }}>
              <h3 style={{ fontWeight: "600", marginBottom: "8px", fontSize: "14px", color: "#92400e" }}>Required for Tab Organization</h3>
              <p style={{ fontSize: "12px", color: "#92400e", marginBottom: "8px" }}>
                These settings are required to use the AI-powered tab organization feature.
              </p>
              <ul style={{ fontSize: "12px", color: "#92400e", paddingLeft: "16px" }}>
                <li>AI Host: The API endpoint for your AI service</li>
                <li>AI Token: Your API authentication key</li>
                <li>AI Model: The AI model to use for classification</li>
              </ul>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
            <p style={{ fontSize: "14px", color: "#166534", textAlign: "center" }}>{message}</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default IndexPopup
