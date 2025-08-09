import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect } from "react"
import ReactDOM from "react-dom"
import globeUrl from "url:~/assets/globe.svg"
import iconUrl from "url:~/assets/icon.png"

import "url:~/assets/logo-notion.png"
import "url:~/assets/logo-sheets.png"
import "url:~/assets/logo-docs.png"
import "url:~/assets/logo-slides.png"
import "url:~/assets/logo-forms.png"
import "url:~/assets/logo-medium.png"
import "url:~/assets/logo-github.png"
import "url:~/assets/logo-codepen.png"
import "url:~/assets/logo-excel.png"
import "url:~/assets/logo-powerpoint.png"
import "url:~/assets/logo-word.png"
import "url:~/assets/logo-figma.png"
import "url:~/assets/logo-producthunt.png"
import "url:~/assets/logo-twitter.png"
import "url:~/assets/logo-spotify.png"
import "url:~/assets/logo-canva.png"
import "url:~/assets/logo-anchor.png"
import "url:~/assets/logo-photoshop.png"
import "url:~/assets/logo-qr.png"
import "url:~/assets/logo-asana.png"
import "url:~/assets/logo-linear.png"
import "url:~/assets/logo-wip.png"
import "url:~/assets/logo-calendar.png"
import "url:~/assets/logo-keep.png"
import "url:~/assets/logo-meet.png"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// Inject Tailwind only into the shadow host created by Plasmo (prevents leaking to host page)
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16
  let updatedCssText = cssText
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })
  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText
  return styleElement
}


const placeholderList = [
  "Search or Ask anything",
  "try /bookmark、/history、/ai、/group command",
  "try mention a tab with @tab",
  "Write some code...",
  "Write a draft.."
]

// Add command suggestions list
const commandSuggestions = [
  { command: "/history", desc: "Show recent browsing history" },
  { command: "/bookmarks", desc: "Show your bookmarks" },
  { command: "/group", desc: "Show grouped tabs" },
  { command: "/tabs", desc: "Show all tabs" },
  { command: "/actions", desc: "Show all actions" }
]

const Omni = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [actions, setActions] = React.useState<any[]>([])
  const [filteredActions, setFilteredActions] = React.useState<any[]>([])
  const [input, setInput] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [toast, setToast] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0)
  const [showCommandSuggestions, setShowCommandSuggestions] = React.useState(false)
  const [commandSuggestionIndex, setCommandSuggestionIndex] = React.useState(0)
  const debugRef = React.useRef({ lastSelectedIndex: 0 })
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Debug log for selectedIndex changes
  React.useEffect(() => {
    debugRef.current.lastSelectedIndex = selectedIndex
  }, [selectedIndex])

  // Carousel placeholder
  React.useEffect(() => {
    if (!isOpen) return
    setPlaceholderIndex(0)
    const interval = setInterval(() => {
      setPlaceholderIndex(idx => {
        const newIdx = (idx + 1) % placeholderList.length
        return newIdx
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Get actions
  const fetchActions = () => {
    chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
      if (response && response.actions) {
        setActions(response.actions)
        // Only set filteredActions when there's no input
        if (!input) {
          setFilteredActions(response.actions)
        }
      }
    })
    
    // Also fetch recent history and add to actions
    chrome.runtime.sendMessage({ request: "get-history" }, (historyResponse) => {
      if (historyResponse && historyResponse.history) {
        const historyActions = historyResponse.history.map((item: any) => ({
          ...item,
          type: "history",
          action: "history",
          emoji: true,
          emojiChar: "🏛",
          keyCheck: false,
          desc: item.url
        }))
        
        // Update actions with history appended
        setActions(prevActions => {
          const newActions = [...prevActions, ...historyActions]
          if (!input) {
            setFilteredActions(newActions)
          }
          return newActions
        })
      }
    })
  }

  // Get actions when modal is opened
  React.useEffect(() => {
    if (isOpen) {
      fetchActions()
      setInput("")
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle command selection
  const handleCommandSelect = (command: string) => {
    setInput(command + " ")
    setShowCommandSuggestions(false)
    
    // Immediately fetch relevant actions based on command
    if (command === "/bookmarks") {
      chrome.runtime.sendMessage({ request: "get-bookmarks" }, (response) => {
        if (response && response.bookmarks) {
          const bookmarkActions = response.bookmarks.map(bookmark => ({
            ...bookmark,
            type: "bookmark",
            action: "bookmark",  // Ensure action type is set for proper handling
            title: bookmark.title || "Untitled Bookmark",
            desc: bookmark.url,
            url: bookmark.url
          }))
          setFilteredActions(bookmarkActions)
        } else {
          setFilteredActions([{
            title: "No bookmarks found",
            desc: response?.error || "Try adding some bookmarks first",
            type: "info"
          }])
        }
      })
    } else if (command === "/history") {
      chrome.runtime.sendMessage({ request: "get-history" }, (response) => {
        if (response && response.history) {
          setFilteredActions(response.history.map(item => ({
            ...item,
            type: "history"
          })))
        }
      })
    } else if (command === "/group") {
      chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
        if (response && response.actions) {
          const organizeAction = response.actions.find(a => a.action === "organize-tabs")
          const ungroupAction = response.actions.find(a => a.action === "ungroup-tabs")
          
          const groupActions = []
          
          if (organizeAction) {
            groupActions.push({
              ...organizeAction,
              type: "action",
              title: "Organize Tabs",
              desc: "Group tabs using AI",
              emoji: true,
              emojiChar: "📑"
            })
          }
          
          if (ungroupAction) {
            groupActions.push({
              ...ungroupAction,
              type: "action",
              title: "Ungroup Tabs",
              desc: "Ungroup all tabs",
              emoji: true,
              emojiChar: "📄"
            })
          }
          
          if (groupActions.length > 0) {
            setFilteredActions(groupActions)
          } else {
            setFilteredActions([{
              title: "Group Actions",
              desc: "No group actions available",
              type: "info"
            }])
          }
        } else {
          setFilteredActions([{
            title: "Group Actions",
            desc: "Failed to load actions",
            type: "info"
          }])
        }
      })
      return
    }
  }

  // Input filtering
  React.useEffect(() => {
    if (!input) {
      // Only fetch actions if we don't have any
      if (actions.length === 0) {
        fetchActions()
      } else {
        setFilteredActions(actions)
      }
      setShowCommandSuggestions(false) // Hide command suggestions when input is empty
      setSelectedIndex(0) // Only reset selection when input is cleared
      return
    } 
    
    if (input === "/") {
      setShowCommandSuggestions(true)
      setSelectedIndex(0) // Reset selection when showing command suggestions
      return
    } 
    
    if (input.startsWith("/group")) {
      chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
        if (response && response.actions) {
          const organizeAction = response.actions.find(a => a.action === "organize-tabs")
          const ungroupAction = response.actions.find(a => a.action === "ungroup-tabs")
          
          const groupActions = []
          
          if (organizeAction) {
            groupActions.push({
              ...organizeAction,
              type: "action",
              title: "Organize Tabs",
              desc: "Group tabs using AI",
              emoji: true,
              emojiChar: "📑"
            })
          }
          
          if (ungroupAction) {
            groupActions.push({
              ...ungroupAction,
              type: "action",
              title: "Ungroup Tabs",
              desc: "Ungroup all tabs",
              emoji: true,
              emojiChar: "📄"
            })
          }
          
          if (groupActions.length > 0) {
            setFilteredActions(groupActions)
          } else {
            setFilteredActions([{
              title: "Group Actions",
              desc: "No group actions available",
              type: "info"
            }])
          }
        } else {
          setFilteredActions([{
            title: "Group Actions",
            desc: "Failed to load actions",
            type: "info"
          }])
        }
      })
      return
    } 
    
    if (input.startsWith("/bookmarks")) {
      const tempvalue = input.replace("/bookmarks ", "")
      chrome.runtime.sendMessage({ 
        request: tempvalue ? "search-bookmarks" : "get-bookmarks", 
        query: tempvalue 
      }, (response) => {
        if (response && response.bookmarks) {
          const bookmarkActions = response.bookmarks.map(bookmark => ({
            ...bookmark,
            type: "bookmark",
            action: "bookmark",  // Ensure action type is set for proper handling
            title: bookmark.title || "Untitled Bookmark",
            desc: bookmark.url,
            url: bookmark.url
          }))
          setFilteredActions(bookmarkActions)
        } else {
          setFilteredActions([{
            title: "No bookmarks found",
            desc: "Try a different search term",
            type: "info"
          }])
        }
      })
      return
    } 
    
    if (input.startsWith("/history ")) {
      const tempvalue = input.replace("/history ", "")
      chrome.runtime.sendMessage({ 
        request: "search-history", 
        query: tempvalue 
      }, (response) => {
        if (response && response.history) {
          setFilteredActions(response.history.map(item => ({
            ...item,
            type: "history"
          })))
        }
      })
      return
    } 
    
    if (input.startsWith("/tabs")) {
      chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
        if (response && response.actions) {
          const tabActions = response.actions.filter(a => a.type === "tab")
          if (tabActions.length > 0) {
            setFilteredActions(tabActions)
          } else {
            setFilteredActions([{
              title: "No Tabs",
              desc: "No open tabs found",
              type: "info"
            }])
          }
        } else {
          setFilteredActions([{
            title: "No Tabs",
            desc: "Failed to load tabs",
            type: "info"
          }])
        }
      })
      return
    } 
    
    if (input.startsWith("/remove")) {
      const tempvalue = input.replace("/remove ", "")
      const filtered = actions.filter(a => 
        (a.type === "bookmark" || a.type === "tab") && 
        (!tempvalue || 
          a.title?.toLowerCase().includes(tempvalue) || 
          a.desc?.toLowerCase().includes(tempvalue) || 
          a.url?.toLowerCase().includes(tempvalue)
        )
      )
      setFilteredActions(filtered)
      return
    } 
    
    if (input.startsWith("/actions")) {
      const tempvalue = input.replace("/actions ", "")
      const filtered = actions.filter(a => 
        a.type === "action" && 
        (!tempvalue || 
          a.title?.toLowerCase().includes(tempvalue) || 
          a.desc?.toLowerCase().includes(tempvalue) || 
          a.url?.toLowerCase().includes(tempvalue)
        )
      )
      setFilteredActions(filtered)
      return
    }

    // Default search behavior
    const filtered = actions.filter((a) =>
      a.title?.toLowerCase().includes(input.toLowerCase()) ||
      a.desc?.toLowerCase().includes(input.toLowerCase()) ||
      a.url?.toLowerCase().includes(input.toLowerCase())
    )
    
    // Always add Ask AI and Google Search actions for non-command inputs
    const newFilteredActions = filtered.concat([
      {
        title: "Ask AI",
        desc: input,
        action: "ai-chat-user-input",
        type: "ai"
      },
      {
        title: "Google Search",
        desc: input,
        action: "google-search",
        type: "search",
        emoji: true,
        emojiChar: "🔍"
      }
    ])
    
    // Only update if the filtered results have actually changed
    if (JSON.stringify(newFilteredActions) !== JSON.stringify(filteredActions)) {
      setFilteredActions(newFilteredActions)
    }
  }, [input, actions])

  // Message listener
  React.useEffect(() => {
    const onMessage = (message: any) => {
      if (message.request === "open-aipex") {
        // This will be handled by the parent component
      } else if (message.request === "close-omni") {
        onClose()
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [onClose])

  // Global shortcut listener (Esc to close)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
        chrome.runtime.sendMessage({ request: "close-omni" })
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose])

  // Keyboard operations
  React.useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        chrome.runtime.sendMessage({ request: "close-omni" })
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (showCommandSuggestions) {
          if (e.key === "ArrowDown") {
            setCommandSuggestionIndex((idx) => Math.min(idx + 1, commandSuggestions.length - 1))
          } else {
            setCommandSuggestionIndex((idx) => Math.max(idx - 1, 0))
          }
        } else {
          const currentIndex = selectedIndex
          const newIndex = e.key === "ArrowDown" 
            ? Math.min(currentIndex + 1, filteredActions.length - 1)
            : Math.max(currentIndex - 1, 0)

          if (currentIndex !== newIndex) {
            setSelectedIndex(newIndex)
            // Scroll the selected item into view within the scrollable container
            setTimeout(() => {
              const container = scrollContainerRef.current
              if (!container) return
              
              // Use a more specific selector to find action elements
              const actionElements = container.querySelectorAll('[data-action-index]')
              const selectedElement = actionElements[newIndex] as HTMLElement
              
              if (selectedElement) {
                const containerRect = container.getBoundingClientRect()
                const elementRect = selectedElement.getBoundingClientRect()
                
                // Calculate if element is outside visible area
                const isAbove = elementRect.top < containerRect.top
                const isBelow = elementRect.bottom > containerRect.bottom
                
                if (isAbove || isBelow) {
                  // Calculate scroll position to center the element
                  let newScrollTop
                  if (isAbove) {
                    // If element is above, scroll up to show it at the top with a small margin
                    newScrollTop = container.scrollTop - (containerRect.top - elementRect.top) - 8
                  } else {
                    // If element is below, scroll down to show it at the bottom with a small margin
                    newScrollTop = container.scrollTop + (elementRect.bottom - containerRect.bottom) + 8
                  }
                  
                  // Apply smooth scrolling
                  container.scrollTo({
                    top: newScrollTop,
                    behavior: 'smooth'
                  })
                }
              }
            }, 10) // Increase delay slightly to ensure DOM is updated
          }
        }
        e.preventDefault()
      } else if (e.key === "Enter") {
        if (showCommandSuggestions) {
          handleCommandSelect(commandSuggestions[commandSuggestionIndex].command)
        } else if (filteredActions[selectedIndex]) {
          handleAction(filteredActions[selectedIndex])
        }
        e.preventDefault()
      } else if (e.key === "Tab" && showCommandSuggestions) {
        handleCommandSelect(commandSuggestions[commandSuggestionIndex].command)
        e.preventDefault()
      } else if (e.altKey && e.shiftKey && e.code === "KeyP") {
        setToast("Pin/Unpin tab triggered!")
        setTimeout(() => setToast(null), 2000)
        e.preventDefault()
      } else if (e.altKey && e.shiftKey && e.code === "KeyM") {
        setToast("Mute/Unmute tab triggered!")
        setTimeout(() => setToast(null), 2000)
        e.preventDefault()
      } else if (e.altKey && e.shiftKey && e.code === "KeyC") {
        setToast("Open mailto triggered!")
        setTimeout(() => setToast(null), 2000)
        e.preventDefault()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, filteredActions, selectedIndex, showCommandSuggestions, commandSuggestionIndex, onClose])

  // Helper functions
  function addhttp(url: string) {
    if (!/^(?:f|ht)tps?:\/\//.test(url)) {
      url = "http://" + url
    }
    return url
  }
  function validURL(str: string) {
    var pattern = new RegExp('^(https?:\/\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i') // fragment locator
    return !!pattern.test(str)
  }
  function checkShortHand(e: React.ChangeEvent<HTMLInputElement>, value: string) {
    if (e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType !== 'deleteContentBackward') {
      if (value === "/t") {
        setInput("/tabs ")
      } else if (value === "/b") {
        setInput("/bookmarks ")
      } else if (value === "/h") {
        setInput("/history ")
      } else if (value === "/r") {
        setInput("/remove ")
      } else if (value === "/a") {
        setInput("/actions ")
      }
    } else {
      if (["/tabs", "/bookmarks", "/actions", "/remove", "/history"].includes(value)) {
        setInput("")
      }
    }
  }

  // Highlight search terms in text
  function highlightText(text: string, searchTerm: string) {
    if (!searchTerm || !text) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return <mark key={index} className="bg-red-100 text-red-900 font-medium px-0.5 rounded">{part}</mark>
      }
      return part
    })
  }

  // Execute action
  const handleAction = (action: any) => {
    setToast(`Action: ${action.title} executed`)
    setTimeout(() => setToast(null), 2000)
    // Specific operations
    if (action.action === "ai-chat-user-input") {
      chrome.storage.local.set({ aipex_user_input: action.desc })
      chrome.runtime.sendMessage({ request: "open-sidepanel" })
      onClose()
      return
    }
    switch (action.action) {
      case "google-search":
        window.open(`https://www.google.com/search?q=${encodeURIComponent(action.desc)}`, "_blank")
        break
      case "bookmark":
      case "navigation":
      case "url":
      case "history":  // Add history case to handle history items
        window.open(action.url, "_blank")  // Open in new tab
        break
      case "goto":
        window.open(addhttp(input), "_self")
        break
      case "scroll-bottom":
        window.scrollTo(0, document.body.scrollHeight)
        break
      case "scroll-top":
        window.scrollTo(0, 0)
        break
      case "fullscreen":
        document.documentElement.requestFullscreen()
        break
      case "new-tab":
        window.open("")
        break
      case "email":
        window.open("mailto:")
        break
      case "print":
        window.print()
        break
      case "ai-chat":
        chrome.runtime.sendMessage({ request: "open-sidepanel" })
        break
      case "remove-all":
      case "remove-history":
      case "remove-cookies":
      case "remove-cache":
      case "remove-local-storage":
      case "remove-passwords":
        // Only show toast
        break
      default:
        chrome.runtime.sendMessage({ request: action.action, tab: action, query: input })
        break
    }
    // Always close the omni window after executing any action
    onClose()
  }

  // Helper to get icon for action
  function getActionIcon(action: any) {
    if (action.favIconUrl) return action.favIconUrl
    if (action.url?.startsWith("chrome-extension://")) return globeUrl
    if (action.url?.startsWith("chrome://")) return globeUrl
    return globeUrl
  }

  // Helper to get action hint text
  function getActionHint(action: any) {
    switch (action.action) {
      case "ai-chat-user-input":
        return "Ask AI"
      case "google-search":
        return "Search"
      case "bookmark":
        return "Open Bookmark"
      case "navigation":
      case "url":
        return "Open URL"
      case "history":
        return "Open History"
      case "goto":
        return "Navigate"
      case "scroll-bottom":
        return "Scroll Down"
      case "scroll-top":
        return "Scroll Up"
      case "fullscreen":
        return "Fullscreen"
      case "new-tab":
        return "New Tab"
      case "email":
        return "Open Mail"
      case "print":
        return "Print"
      case "ai-chat":
        return "Open AI Chat"
      case "organize-tabs":
        return "Organize Tabs"
      case "ungroup-tabs":
        return "Ungroup Tabs"
      case "remove-all":
        return "Clear All"
      case "remove-history":
        return "Clear History"
      case "remove-cookies":
        return "Clear Cookies"
      case "remove-cache":
        return "Clear Cache"
      case "remove-local-storage":
        return "Clear Storage"
      case "remove-passwords":
        return "Clear Passwords"
      default:
        // For tab actions
        if (action.type === "tab") {
          return "Switch Tab"
        }
        // For bookmark actions
        if (action.type === "bookmark") {
          return "Open Bookmark"
        }
        // For history actions
        if (action.type === "history") {
          return "Open History"
        }
        // For action types
        if (action.type === "action") {
          return "Execute"
        }
        // For search actions
        if (action.type === "search") {
          return "Search"
        }
        // For AI actions
        if (action.type === "ai") {
          return "Ask AI"
        }
        // Default fallback
        return "Open"
    }
  }

  if (!isOpen) return null
  // Return UI directly, no ReactDOM.createPortal needed
  return (
    <div
      id="omni-extension"
      className="fixed inset-0 w-screen h-screen z-[99999] bg-black/20 flex items-start justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mt-24 w-[800px] bg-white rounded-2xl shadow-xl p-6 relative border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <input
            ref={inputRef}
            className="w-full px-4 py-3 text-xl rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-150"
            placeholder={placeholderList[placeholderIndex]}
            value={input}
            onChange={e => {
              const value = e.target.value
              if (value === "/") {
                setShowCommandSuggestions(true)
                setCommandSuggestionIndex(0)
              }
              setInput(value)
            }}
          />
          {showCommandSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 overflow-hidden z-50 shadow-lg">
              {commandSuggestions.map((suggestion, idx) => (
                <div
                  key={suggestion.command}
                  className={`px-3 py-2 cursor-pointer flex flex-col gap-0.5 transition-colors duration-150 ${
                    idx === commandSuggestionIndex 
                    ? 'bg-red-50 border border-red-500 text-gray-900' 
                    : 'hover:bg-gray-50 text-gray-900 border border-transparent'
                  }`}
                  onClick={() => handleCommandSelect(suggestion.command)}
                  onMouseEnter={() => setCommandSuggestionIndex(idx)}
                >
                  <div className="font-semibold text-sm">{highlightText(suggestion.command, input)}</div>
                  <div className="text-xs text-gray-500">{highlightText(suggestion.desc, input)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div 
          ref={scrollContainerRef} 
          className="mt-4 max-h-[500px] overflow-y-auto scroll-smooth"
        >
          {filteredActions.length === 0 && <div className="text-gray-500 text-lg px-4 py-3">No actions</div>}
          {filteredActions.map((action, idx) => (
            <div
              key={action.title + idx}
              data-action-index={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 cursor-pointer border transition-all duration-150 ${
                idx === selectedIndex 
                ? "bg-red-50 border-red-500 shadow-sm" 
                : "bg-transparent border-transparent hover:bg-gray-50"
              }`}
              onClick={() => handleAction(action)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {action.emoji ? (
                <span style={{fontSize: 28}}>{action.emojiChar}</span>
              ) : (
                <img
                  src={getActionIcon(action)}
                  alt="favicon"
                  className="w-6 h-6 rounded"
                  onError={e => {
                    e.currentTarget.src = globeUrl
                  }}
                />
              )}
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 text-lg">
                  {highlightText(action.title, input)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {highlightText(action.desc, input)}
                </div>
                {action.url && (
                  <div className="text-sm text-gray-500 break-all mt-1">
                    {action.url.length > 60
                      ? highlightText(action.url.slice(0, 60) + "...", input)
                      : highlightText(action.url, input)}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 font-medium">
                {getActionHint(action)}
              </div>
            </div>
          ))}
        </div>
        {toast && (
          <div className="absolute -top-16 left-0 right-0 mx-auto bg-white text-gray-900 px-6 py-3 rounded-xl text-base text-center shadow-lg w-fit min-w-[180px] border border-gray-200">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}


const PlasmoOverlay = () => {
  const [isOmniOpen, setIsOmniOpen] = React.useState(false)
  // For resetting FloatingBot's y coordinate
  // const [resetBotY, setResetBotY] = React.useState(0)
  // const hoverTimer = React.useRef<NodeJS.Timeout | null>(null)
  // const isHoveringEdge = React.useRef(false)

  // Message listener for external triggers
  React.useEffect(() => {
    const onMessage = (message: any) => {
      if (message.request === "open-aipex") {
        setIsOmniOpen(true)
      } else if (message.request === "close-omni") {
        setIsOmniOpen(false)
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [])

  // 悬停右侧2秒显示icon逻辑已移除

  // const handleOpenOmni = () => {
  //   setIsOmniOpen(true)
  // }

  // const handleOpenAIChat = () => {
  //   chrome.runtime.sendMessage({ request: "open-sidepanel" })
  // }

  // const handleCloseBotAndShowReopen = () => {
  //   // 逻辑已移除
  // }

  // Return UI directly, no ReactDOM.createPortal needed
  return (
    <>
      {/* <SelectionPopup /> */}
      {/* FloatingBot 已移除 */}
      {isOmniOpen && (
        <Omni 
          isOpen={isOmniOpen}
          onClose={() => setIsOmniOpen(false)}
        />
      )}
    </>
  )
}

export default PlasmoOverlay
