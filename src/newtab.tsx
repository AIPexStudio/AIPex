import React, { useState, useEffect, useRef } from "react"
import "~style.css"
import iconUrl from "url:~/assets/icon.png"
import globeUrl from "url:~/assets/globe.svg"

const NewTabPage = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [actions, setActions] = useState<any[]>([])
  const [filteredActions, setFilteredActions] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Get actions from background
  const fetchActions = () => {
    chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
      if (response && response.actions) {
        setActions(response.actions)
        setFilteredActions(response.actions)
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
          setFilteredActions(newActions)
          return newActions
        })
      }
    })
  }

  // Load actions on mount
  useEffect(() => {
    fetchActions()
    // Focus input on mount
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [])

  // Input filtering logic
  useEffect(() => {
    let newFiltered: any[] = []
    if (!input) {
      newFiltered = actions
    } else if (input.startsWith("/tabs")) {
      const tempvalue = input.replace("/tabs ", "")
      newFiltered = actions.filter(a => a.type === "tab" && (
        !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)
      ))
    } else if (input.startsWith("/bookmarks")) {
      const tempvalue = input.replace("/bookmarks ", "")
      if (tempvalue && tempvalue !== "/bookmarks") {
        chrome.runtime.sendMessage({ request: "search-bookmarks", query: tempvalue }, (response) => {
          setFilteredActions(((response?.bookmarks || []).filter(a => a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue))).concat([
            {
              title: "Ask AI",
              desc: input,
              action: "ai-chat-user-input",
              type: "ai"
            }
          ]))
        })
        return
      } else {
        newFiltered = actions.filter(a => a.type === "bookmark")
      }
    } else if (input.startsWith("/history")) {
      const tempvalue = input.replace("/history ", "")
      if (tempvalue && tempvalue !== "/history") {
        chrome.runtime.sendMessage({ request: "search-history", query: tempvalue }, (response) => {
          setFilteredActions(((response?.history || []).filter(a => a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue))).concat([
            {
              title: "Ask AI",
              desc: input,
              action: "ai-chat-user-input",
              type: "ai"
            }
          ]))
        })
        return
      } else {
        newFiltered = actions.filter(a => a.type === "history")
      }
    } else if (input.startsWith("/remove")) {
      const tempvalue = input.replace("/remove ", "")
      newFiltered = actions.filter(a => (a.type === "bookmark" || a.type === "tab") && (
        !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)
      ))
    } else if (input.startsWith("/actions")) {
      const tempvalue = input.replace("/actions ", "")
      newFiltered = actions.filter(a => a.type === "action" && (
        !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)
      ))
    } else {
      newFiltered = actions.filter((a) =>
        a.title?.toLowerCase().includes(input.toLowerCase()) ||
        a.desc?.toLowerCase().includes(input.toLowerCase()) ||
        a.url?.toLowerCase().includes(input.toLowerCase())
      )
    }
    
    // Always add Ask AI and Google Search actions
    newFiltered = newFiltered.concat([
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
    setFilteredActions(newFiltered)
  }, [input, actions])

  // Reset highlighted item when filtered actions change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredActions])

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        const currentIndex = selectedIndex
        const newIndex = Math.min(currentIndex + 1, filteredActions.length - 1)
        
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
        e.preventDefault()
      } else if (e.key === "ArrowUp") {
        const currentIndex = selectedIndex
        const newIndex = Math.max(currentIndex - 1, 0)
        
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
        e.preventDefault()
      } else if (e.key === "Enter" && filteredActions[selectedIndex]) {
        handleAction(filteredActions[selectedIndex])
        e.preventDefault()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [filteredActions, selectedIndex])

  // Helper functions
  function addhttp(url: string) {
    if (!/^(?:f|ht)tps?:\/\//.test(url)) {
      url = "http://" + url
    }
    return url
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

  // Execute action
  const handleAction = (action: any) => {
    setToast(`Action: ${action.title} executed`)
    setTimeout(() => setToast(null), 2000)
    
    // Clear input after action
    setInput("")
    
    // Specific operations
    if (action.action === "ai-chat-user-input") {
      chrome.storage.local.set({ aipex_user_input: action.desc })
      chrome.runtime.sendMessage({ request: "open-sidepanel" })
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

  // Format time as HH:MM
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Format date as Day of Week, Month Day
  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="w-full h-screen bg-gradient-to-br from-red-100 via-white to-red-50 flex flex-col items-center justify-center px-4">
      {/* Header with time and branding */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <img src={iconUrl} alt="AIpex" className="w-12 h-12 mr-3" />
          <h1 className="text-4xl font-bold text-red-600">AIpex</h1>
        </div>
        <div className="text-6xl font-bold text-red-700 mb-2">{formattedTime}</div>
        <div className="text-xl text-red-500">{formattedDate}</div>
      </div>

      {/* Command Interface */}
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-red-200 relative overflow-hidden">
          {/* Red accent line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-red-600"></div>
          
          <input
            ref={inputRef}
            className="w-full px-6 py-4 text-xl rounded-xl border-2 border-red-200 bg-white text-gray-900 placeholder:text-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all duration-150"
            placeholder="Search or ask anything..."
            value={input}
            onChange={e => {
              checkShortHand(e, e.target.value)
              setInput(e.target.value)
            }}
          />
          
          {/* Results */}
          <div 
            ref={scrollContainerRef} 
            className="mt-6 max-h-[400px] overflow-y-auto scroll-smooth"
          >
            {filteredActions.length === 0 && (
              <div className="text-red-400 text-lg px-4 py-6 text-center">
                No actions found
              </div>
            )}
            {filteredActions.map((action, idx) => (
              <div
                key={action.title + idx}
                data-action-index={idx}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl mb-2 cursor-pointer border-2 transition-all duration-150 ${
                  idx === selectedIndex 
                    ? "bg-red-50 border-red-500 shadow-md" 
                    : "bg-transparent border-transparent hover:bg-red-50 hover:border-red-200"
                }`}
                onClick={() => handleAction(action)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                {action.emoji ? (
                  <span className="text-3xl">{action.emojiChar}</span>
                ) : (
                  <img
                    src={getActionIcon(action)}
                    alt="favicon"
                    className="w-8 h-8 rounded"
                    onError={e => {
                      e.currentTarget.src = globeUrl
                    }}
                  />
                )}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 text-lg">{action.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{action.desc}</div>
                  {action.url && (
                    <div className="text-sm text-gray-500 break-all mt-1">
                      {action.url.length > 80
                        ? action.url.slice(0, 80) + "..."
                        : action.url}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {getActionHint(action)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-8 text-center text-red-500 text-sm">
        <p>Use arrow keys to navigate • Press Enter to execute </p>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-8 right-8 bg-white text-gray-900 px-6 py-3 rounded-xl shadow-lg text-base z-50 border-2 border-red-200">
          {toast}
        </div>
      )}
    </div>
  )
}

export default NewTabPage 