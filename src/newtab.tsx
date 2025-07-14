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
    
    // Always add Ask AI action
    newFiltered = newFiltered.concat([
      {
        title: "Ask AI",
        desc: input,
        action: "ai-chat-user-input",
        type: "ai"
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
        setSelectedIndex((idx) => Math.min(idx + 1, filteredActions.length - 1))
        e.preventDefault()
      } else if (e.key === "ArrowUp") {
        setSelectedIndex((idx) => Math.max(idx - 1, 0))
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
      case "bookmark":
      case "navigation":
      case "url":
        window.open(action.url, "_self")
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
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center px-4">
      {/* Header with time and branding */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <img src={iconUrl} alt="AIpex" className="w-12 h-12 mr-3" />
          <h1 className="text-4xl font-bold text-white">AIpex</h1>
        </div>
        <div className="text-6xl font-bold text-white mb-2">{formattedTime}</div>
        <div className="text-xl text-blue-200">{formattedDate}</div>
      </div>

      {/* Command Interface */}
      <div className="w-full max-w-4xl">
        <div className="bg-neutral-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-neutral-800">
          <input
            ref={inputRef}
            className="w-full px-6 py-4 text-xl rounded-xl border border-neutral-700 bg-neutral-800/70 backdrop-blur-sm text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
            placeholder="Search or ask anything..."
            value={input}
            onChange={e => {
              checkShortHand(e, e.target.value)
              setInput(e.target.value)
            }}
          />
          
          {/* Results */}
          <div className="mt-6 max-h-[400px] overflow-y-auto">
            {filteredActions.length === 0 && (
              <div className="text-neutral-500 text-lg px-4 py-6 text-center">
                No actions found
              </div>
            )}
            {filteredActions.map((action, idx) => (
              <div
                key={action.title + idx}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl mb-2 cursor-pointer border transition-all duration-200 ${
                  idx === selectedIndex 
                    ? "bg-blue-600/20 border-blue-500 shadow-lg" 
                    : "bg-transparent border-transparent hover:bg-neutral-800/50"
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
                  <div className="font-semibold text-white text-lg">{action.title}</div>
                  <div className="text-sm text-neutral-400 mt-1">{action.desc}</div>
                  {action.url && (
                    <div className="text-sm text-neutral-500 break-all mt-1">
                      {action.url.length > 80
                        ? action.url.slice(0, 80) + "..."
                        : action.url}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-8 text-center text-blue-200/80 text-sm">
        <p>Use arrow keys to navigate • Press Enter to execute </p>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-8 right-8 bg-neutral-800 text-white px-6 py-3 rounded-xl shadow-lg text-base z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

export default NewTabPage 