import React, { useEffect, useState } from "react"
import { CountButton } from "~features/count-button"
import "~style.css"
import { Storage } from "@plasmohq/storage"

const DEFAULT_TAB_GROUP_CATEGORIES =
  "Social, Entertainment, Read Material, Education, Productivity, Utilities"
const DEFAULT_AI_HOST = "https://api.openai.com/v1/chat/completions"
const DEFAULT_AI_MODEL = "gpt-3.5-turbo"

const storage = new Storage()

function IndexPopup() {
  const [shortcut, setShortcut] = useState("Not set")
  const [tabGroupCategories, setTabGroupCategories] = useState("")
  const [autoGroupTabs, setAutoGroupTabs] = useState(true)
  const [aiHost, setAiHost] = useState("")
  const [aiToken, setAiToken] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false)
  const [message, setMessage] = useState("")

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
    // Load settings from Plasmo Storage
    Promise.all([
      storage.get("tabGroupCategories"),
      storage.get("autoGroupTabs"),
      storage.get("aiHost"),
      storage.get("aiToken"),
      storage.get("aiModel"),
      storage.get("showSelectionToolbar")
    ]).then(([
      tabGroupCategoriesValue,
      autoGroupTabsValue,
      aiHostValue,
      aiTokenValue,
      aiModelValue,
      showSelectionToolbarValue
    ]) => {
      setTabGroupCategories(tabGroupCategoriesValue || DEFAULT_TAB_GROUP_CATEGORIES)
      setAutoGroupTabs(typeof autoGroupTabsValue === "boolean" ? autoGroupTabsValue : autoGroupTabsValue === "true" ? true : !!autoGroupTabsValue)
      setAiHost(aiHostValue || DEFAULT_AI_HOST)
      setAiToken(aiTokenValue || "")
      setAiModel(aiModelValue || DEFAULT_AI_MODEL)
      setShowSelectionToolbar(typeof showSelectionToolbarValue === "boolean" ? showSelectionToolbarValue : showSelectionToolbarValue === "true" ? true : !!showSelectionToolbarValue)
    })
  }, [])

  useEffect(() => {
    if (chrome?.commands) {
      const handler = () => {
        chrome.commands.getAll((commands) => {
          const openaipexCommand = commands.find(
            (command) => command.name === "open-aipex"
          )
          if (openaipexCommand) {
            setShortcut(openaipexCommand.shortcut || "Not set")
            storage.set("aipexShortcut", openaipexCommand.shortcut)
          }
        })
      }
      chrome.commands.onCommand.addListener(handler)
      return () => {
        chrome.commands.onCommand.removeListener(handler)
      }
    }
  }, [])

  const handleSaveAllSettings = async () => {
    const categories = tabGroupCategories
      .split(",")
      .map((cat) => cat.trim())
      .join(", ")
    await Promise.all([
      storage.set("tabGroupCategories", categories),
      storage.set("autoGroupTabs", autoGroupTabs),
      storage.set("aiHost", aiHost),
      storage.set("aiToken", aiToken),
      storage.set("aiModel", aiModel),
      storage.set("showSelectionToolbar", showSelectionToolbar)
    ])
    setMessage("All settings saved successfully.")
    setTimeout(() => setMessage(""), 3000)
  }

  const handleShortcutClick = () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" }, () => {
      setMessage("Please set the new shortcut in the Chrome Extensions Shortcuts page.")
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] w-[320px] bg-white p-6 text-black font-sans">
      <h1 className="text-xl font-bold mb-6 tracking-tight">Settings</h1>
      <div className="rounded-2xl border border-gray-200 p-4 w-full mb-4 bg-white">
        <label htmlFor="shortcutInput" className="block text-sm font-medium mb-2 text-gray-900">
          Current Shortcut
        </label>
        <input
          type="text"
          id="shortcutInput"
          className="w-full p-2 border border-gray-200 rounded-full mb-2 bg-gray-100 text-black cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black/10 transition"
          value={shortcut}
          disabled
        />
        <button
          className="bg-black hover:bg-gray-800 text-white rounded-full px-4 py-2 w-full text-sm font-semibold transition"
          onClick={handleShortcutClick}
        >
          Change Shortcut
        </button>
      </div>
      <div className="rounded-2xl border border-gray-200 p-4 w-full mb-4 bg-white">
        <label htmlFor="tab_group_categories" className="block text-sm font-medium mb-2 text-gray-900">
          Tab Group Categories
        </label>
        <input
          type="text"
          id="tab_group_categories"
          className="w-full p-2 border border-gray-200 rounded-full bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-black/10 transition"
          placeholder={DEFAULT_TAB_GROUP_CATEGORIES}
          value={tabGroupCategories}
          onChange={(e) => setTabGroupCategories(e.target.value)}
        />
      </div>
      <div className="rounded-2xl border border-gray-200 p-4 w-full mb-4 flex items-center justify-between bg-white">
        <label htmlFor="auto_group_tabs" className="text-sm font-medium text-gray-900">
          Auto Group Tabs
        </label>
        <input
          type="checkbox"
          id="auto_group_tabs"
          checked={autoGroupTabs}
          onChange={(e) => setAutoGroupTabs(e.target.checked)}
          className="ml-2 accent-black w-5 h-5 rounded-full border border-gray-300 focus:ring-black/20 transition"
        />
      </div>
      <div className="rounded-2xl border border-gray-200 p-4 w-full mb-4 bg-white">
        <label htmlFor="ai_host" className="block text-sm font-medium mb-2 text-gray-900">
          AI Host
        </label>
        <input
          type="text"
          id="ai_host"
          className="w-full p-2 border border-gray-200 rounded-full mb-2 bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-black/10 transition"
          placeholder={DEFAULT_AI_HOST}
          value={aiHost}
          onChange={(e) => setAiHost(e.target.value)}
        />
        <label htmlFor="ai_token" className="block text-sm font-medium mb-2 text-gray-900">
          AI Token
        </label>
        <input
          type="text"
          id="ai_token"
          className="w-full p-2 border border-gray-200 rounded-full mb-2 bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-black/10 transition"
          value={aiToken}
          onChange={(e) => setAiToken(e.target.value)}
        />
        <label htmlFor="ai_model" className="block text-sm font-medium mb-2 text-gray-900">
          AI Model
        </label>
        <input
          type="text"
          id="ai_model"
          className="w-full p-2 border border-gray-200 rounded-full bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-black/10 transition"
          placeholder="Enter model name"
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
        />
      </div>
      <div className="rounded-2xl border border-gray-200 p-4 w-full mb-4 bg-white">
        <label htmlFor="show_selection_toolbar" className="text-sm font-medium flex items-center text-gray-900">
          Show Selection Toolbar
          <input
            type="checkbox"
            id="show_selection_toolbar"
            checked={showSelectionToolbar}
            onChange={(e) => setShowSelectionToolbar(e.target.checked)}
            className="ml-2 accent-black w-5 h-5 rounded-full border border-gray-300 focus:ring-black/20 transition"
          />
        </label>
        <div className="text-xs text-gray-400 mt-1">
          Show toolbar with AI and translate options when text is selected
        </div>
      </div>
      <button
        className="bg-black hover:bg-gray-800 text-white rounded-full px-4 py-2 w-full text-sm font-semibold mb-2 transition"
        onClick={handleSaveAllSettings}
      >
        Save All Settings
      </button>
      {message && (
        <div className="text-sm text-center text-black mt-3">{message}</div>
      )}
    </div>
  )
}

export default IndexPopup
