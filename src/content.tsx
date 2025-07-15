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

export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16
  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })
  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText
  return styleElement
}


const Omni = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [actions, setActions] = React.useState<any[]>([])
  const [filteredActions, setFilteredActions] = React.useState<any[]>([])
  const [input, setInput] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [toast, setToast] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Get actions
  const fetchActions = () => {
    chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
      if (response && response.actions) {
        setActions(response.actions)
        setFilteredActions(response.actions)
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

  // Input filtering
  React.useEffect(() => {
    let newFiltered: any[] = []
    if (!input) {
      newFiltered = actions
    } else if (input.startsWith("/tabs")) {
      const tempvalue = input.replace("/tabs ", "")
      newFiltered =
        actions.filter(a => a.type === "tab" && (
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
      newFiltered =
        actions.filter(a => (a.type === "bookmark" || a.type === "tab") && (
          !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)
        ))
    } else if (input.startsWith("/actions")) {
      const tempvalue = input.replace("/actions ", "")
      newFiltered =
        actions.filter(a => a.type === "action" && (
          !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)
        ))
    } else {
      newFiltered =
        actions.filter((a) =>
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
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [filteredActions])

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
      } else if (e.key === "ArrowDown") {
        setSelectedIndex((idx) => Math.min(idx + 1, filteredActions.length - 1))
        e.preventDefault()
      } else if (e.key === "ArrowUp") {
        setSelectedIndex((idx) => Math.max(idx - 1, 0))
        e.preventDefault()
      } else if (e.key === "Enter" && filteredActions[selectedIndex]) {
        handleAction(filteredActions[selectedIndex])
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
  }, [isOpen, filteredActions, selectedIndex, onClose])

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

  // Diagnostic: log all favIconUrls when filteredActions change
  React.useEffect(() => {
    filteredActions.forEach(action => {
      console.log("[DIAG] action.title:", action.title, "favIconUrl:", action.favIconUrl)
    })
  }, [filteredActions])

  if (!isOpen) return null
  // 直接返回 UI，不用 ReactDOM.createPortal
  return (
    <div
      id="omni-extension"
      className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 flex items-start justify-center"
      onClick={onClose}
    >
      <div
        className="mt-24 w-[800px] bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 relative border border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="w-full px-4 py-3 text-xl rounded-lg border border-neutral-700 bg-neutral-800/70 backdrop-blur-sm text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500"
          placeholder="Search or ask anything"
          value={input}
          onChange={e => {
            checkShortHand(e, e.target.value)
            setInput(e.target.value)
          }}
        />
        <div className="mt-4 max-h-[500px] overflow-y-auto">
          {filteredActions.length === 0 && <div className="text-neutral-500 text-lg px-4 py-3">No actions</div>}
          {filteredActions.map((action, idx) => (
            <div
              key={action.title + idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 cursor-pointer border transition ${idx === selectedIndex ? "bg-neutral-800/70 border-blue-500" : "bg-transparent border-transparent hover:bg-neutral-800/40"}`}
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
                  onLoad={() => {
                    console.log("[DIAG] Image loaded successfully:", getActionIcon(action))
                  }}
                />
              )}
              <div className="flex-1 text-left">
                <div className="font-semibold text-white text-lg">{action.title}</div>
                <div className="text-sm text-neutral-400 mt-1">{action.desc}</div>
                {action.url && (
                  <div className="text-sm text-neutral-500 break-all mt-1">
                    {action.url.length > 60
                      ? action.url.slice(0, 60) + "..."
                      : action.url}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {toast && (
          <div className="absolute -top-16 left-0 right-0 mx-auto bg-neutral-800 text-white px-6 py-3 rounded-xl text-base text-center shadow-lg w-fit min-w-[180px]">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

// FloatingBot component
const FloatingBot = ({ onOpenAIChat, onClose, resetY }: { onOpenAIChat: () => void, onClose: () => void, resetY?: number }) => {
  const iconWidth = 56 // px, w-14
  const margin = 20 // px, 距离右边的间距
  const [y, setY] = React.useState(0)
  const [left, setLeft] = React.useState(window.innerWidth - iconWidth - margin)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragOffsetY, setDragOffsetY] = React.useState(0)
  const [isHovered, setIsHovered] = React.useState(false)
  const [hasDragged, setHasDragged] = React.useState(false)
  const [isLongPressing, setIsLongPressing] = React.useState(false)
  const botRef = React.useRef<HTMLDivElement>(null)
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null)
  const positionKey = 'aipex_bot_y_position'

  // 计算 left 贴边
  const updateLeft = React.useCallback(() => {
    setLeft(window.innerWidth - iconWidth - margin)
  }, [])

  // Load saved y or initialize at bottom right
  React.useEffect(() => {
    const loadY = () => {
      try {
        const savedY = localStorage.getItem(positionKey)
        let yVal = savedY ? parseInt(savedY, 10) : (window.innerHeight - 80)
        const maxY = window.innerHeight - iconWidth - margin
        yVal = Math.max(0, Math.min(yVal, maxY))
        setY(yVal)
      } catch (e) {
        setY(window.innerHeight - 80)
      }
    }
    loadY()
    updateLeft()
    // Update y and left on window resize
    const handleResize = () => {
      setY(prevY => {
        const maxY = window.innerHeight - iconWidth - margin
        return Math.max(0, Math.min(prevY, maxY))
      })
      updateLeft()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateLeft])
  // 外部重置 y
  React.useEffect(() => {
    if (typeof resetY === 'number') {
      setY(resetY)
      updateLeft()
    }
  }, [resetY, updateLeft])

  // Long press detection for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setHasDragged(false)
    setIsLongPressing(true)
    longPressTimer.current = setTimeout(() => {
      setIsDragging(true)
      setIsLongPressing(false)
      const rect = botRef.current?.getBoundingClientRect()
      if (rect) {
        setDragOffsetY(e.clientY - rect.top)
      }
    }, 300)
  }

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (isDragging && e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setIsLongPressing(false)
    setIsDragging(false)
  }

  // Save y to localStorage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem(positionKey, String(y))
    } catch (e) {}
  }, [y, positionKey])

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      setHasDragged(true)
      const newY = e.clientY - dragOffsetY
      const maxY = window.innerHeight - iconWidth - margin
      setY(Math.max(0, Math.min(newY, maxY)))
    }
    const handleGlobalMouseUp = () => {
      handleMouseUp()
    }
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, dragOffsetY])

  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasDragged && !isLongPressing && !isDragging) {
      try {
        localStorage.setItem(positionKey, String(y))
      } catch (e) {}
      onOpenAIChat()
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isDragging && !isLongPressing) {
      onClose()
    }
  }

  // 保证每次渲染都贴边
  // const left = window.innerWidth - iconWidth - margin

  return (
    <>
      {isDragging && (
        <div
          className="fixed z-[99997] pointer-events-none"
          style={{
            left: left,
            top: 0,
            width: iconWidth,
            height: window.innerHeight,
            border: '2px dashed rgba(59, 130, 246, 0.5)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }}
        />
      )}
      <div
        ref={botRef}
        className={`fixed z-[99998] transition-all duration-200 ${isDragging ? 'cursor-grabbing' : isLongPressing ? 'cursor-grab' : 'cursor-pointer'}`}
        style={{
          left: left,
          top: y,
          transform: isDragging ? 'scale(1.1)' : isLongPressing ? 'scale(1.05)' : isHovered ? 'scale(1.05)' : 'scale(1)',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          if (isLongPressing && longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
            setIsLongPressing(false)
          }
        }}
        onClick={handleClick}
      >
        <div className={`w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 border hover:shadow-xl ${isDragging ? 'border-blue-500 border-2' : isLongPressing ? 'border-blue-400 border-2' : 'border-gray-200'}`}>
          <img 
            src={iconUrl} 
            alt="AI Assistant" 
            className="w-8 h-8 rounded"
          />
        </div>
        {isHovered && (
          <button
            onClick={handleClose}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-400 hover:bg-gray-500 rounded-full shadow-md transition-all duration-200 flex items-center justify-center text-white text-sm font-bold"
            style={{ fontSize: '12px' }}
          >
            ×
          </button>
        )}
        {isLongPressing && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            Long press to drag...
          </div>
        )}
        {isDragging && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-500 bg-opacity-75 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            Dragging (vertical only)
          </div>
        )}
      </div>
    </>
  )
}

// SelectionPopup component
// const SelectionPopup = () => {
//   const [isVisible, setIsVisible] = React.useState(false)
//   const [position, setPosition] = React.useState({ x: 0, y: 0 })
//   const [isHovered, setIsHovered] = React.useState(false)
//   const [selectedText, setSelectedText] = React.useState("")
//   const popupRef = React.useRef<HTMLDivElement>(null)
//   const selectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

//   // Check if selection is valid
//   const checkSelection = React.useCallback(() => {
//     const selection = window.getSelection()
//     if (selection && selection.toString().trim().length > 0) {
//       const text = selection.toString().trim()
//       setSelectedText(text)
      
//       try {
//         const range = selection.getRangeAt(0)
//         const rect = range.getBoundingClientRect()
        
//         if (rect.width > 0 && rect.height > 0) {
//           // Position the popup near the end of the selection
//           // Add a small offset to avoid overlapping with the selection
//           setPosition({
//             x: Math.min(rect.right + 10, window.innerWidth - 40), // Keep within viewport
//             y: Math.min(rect.top - 10, window.innerHeight - 40) // Position slightly above selection
//           })
//           setIsVisible(true)
//           return
//         }
//       } catch (error) {
//         console.error("Error getting selection rectangle:", error)
//       }
//     }
    
//     // If we get here, hide the popup
//     setIsVisible(false)
//   }, [])

//   // Handle AI chat opening with selected text
//   const handleOpenAIChat = (e: React.MouseEvent) => {
//     // Prevent event from bubbling up to document click handlers
//     if (e) {
//       e.preventDefault()
//       e.stopPropagation()
//     }
    
//     // Add a small delay to ensure the message is sent before any cleanup
//     setTimeout(() => {
//       chrome.runtime.sendMessage({ 
//         request: "open-sidepanel", 
//         selectedText: selectedText 
//       })
      
//       // Hide popup after sending message
//       setIsVisible(false)
//     }, 10)
//   }

//   React.useEffect(() => {
//     // Small delay to check selection after mouseup
//     const handleMouseUp = (e: MouseEvent) => {
//       // Don't process if it's a click on our popup
//       if (popupRef.current && popupRef.current.contains(e.target as Node)) {
//         return
//       }
      
//       // Clear any existing timeout
//       if (selectionTimeoutRef.current) {
//         clearTimeout(selectionTimeoutRef.current)
//       }
      
//       // Set a new timeout to check selection
//       selectionTimeoutRef.current = setTimeout(() => {
//         checkSelection()
//       }, 100)
//     }
    
//     // Hide popup when clicking outside
//     const handleClickOutside = (e: MouseEvent) => {
//       // Skip if the click was on the popup itself
//       if (popupRef.current && popupRef.current.contains(e.target as Node)) {
//         return
//       }
//       setIsVisible(false)
//     }
    
//     // Hide popup when selection changes or text is deselected
//     const handleSelectionChange = () => {
//       // Clear any existing timeout
//       if (selectionTimeoutRef.current) {
//         clearTimeout(selectionTimeoutRef.current)
//       }
      
//       // Set a new timeout to check selection
//       selectionTimeoutRef.current = setTimeout(() => {
//         const selection = window.getSelection()
//         if (!selection || selection.toString().trim().length === 0) {
//           setIsVisible(false)
//         } else {
//           checkSelection()
//         }
//       }, 100)
//     }
    
//     // Handle scroll events to reposition or hide popup
//     const handleScroll = () => {
//       if (isVisible) {
//         checkSelection()
//       }
//     }
    
//     document.addEventListener('mouseup', handleMouseUp)
//     document.addEventListener('mousedown', handleClickOutside)
//     document.addEventListener('selectionchange', handleSelectionChange)
//     window.addEventListener('scroll', handleScroll, { passive: true })

//     return () => {
//       if (selectionTimeoutRef.current) {
//         clearTimeout(selectionTimeoutRef.current)
//       }
//       document.removeEventListener('mouseup', handleMouseUp)
//       document.removeEventListener('mousedown', handleClickOutside)
//       document.removeEventListener('selectionchange', handleSelectionChange)
//       window.removeEventListener('scroll', handleScroll)
//     }
//   }, [isVisible, checkSelection])

//   if (!isVisible) return null

//   return (
//     <div 
//       ref={popupRef}
//       className="fixed z-[99997] animate-fade-in"
//       style={{
//         left: `${position.x}px`,
//         top: `${position.y}px`,
//       }}
//       onClick={(e) => {
//         e.stopPropagation()
//       }}
//     >
//       <div className="relative">
//         <button 
//           className="bg-white bg-opacity-80 rounded-md shadow-sm px-3 py-1 flex items-center justify-center cursor-pointer hover:bg-opacity-100 hover:shadow-md transition-all duration-200 border border-gray-200"
//           onClick={(e) => handleOpenAIChat(e)}
//           onMouseDown={(e) => {
//             // Also prevent mousedown from triggering document events
//             e.preventDefault()
//             e.stopPropagation()
//           }}
//           onMouseEnter={() => setIsHovered(true)}
//           onMouseLeave={() => setIsHovered(false)}
//           title="Ask AIpex"
//         >
//           <span className="text-sm font-medium text-gray-800">Ask AIpex</span>
//         </button>
//       </div>
//     </div>
//   )
// }

const PlasmoOverlay = () => {
  const [isOmniOpen, setIsOmniOpen] = React.useState(false)
  const [isBotVisible, setIsBotVisible] = React.useState(true)
  // 用于强制重置 FloatingBot 的 y 坐标
  const [resetBotY, setResetBotY] = React.useState(0)

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

  const handleOpenOmni = () => {
    setIsOmniOpen(true)
  }

  const handleOpenAIChat = () => {
    // Just open the side panel without any other changes
    chrome.runtime.sendMessage({ request: "open-sidepanel" })
  }

  const handleCloseBotAndShowReopen = () => {
    // 关闭时重置 y 坐标到底部
    const iconWidth = 56
    const margin = 20
    const y = window.innerHeight - 80
    const maxY = window.innerHeight - iconWidth - margin
    const finalY = Math.max(0, Math.min(y, maxY))
    try {
      localStorage.setItem('aipex_bot_y_position', String(finalY))
    } catch (e) {}
    setResetBotY(finalY) // 触发 FloatingBot 重新渲染
    setIsBotVisible(false)
    
         // Show a toast notification for reopening
     const toast = document.createElement('div')
     toast.className = 'fixed z-[99999] top-4 right-4 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm'
     toast.textContent = 'Double-click on the right edge to show the AI assistant'
    toast.style.transition = 'opacity 0.3s'
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(toast)
      }, 300)
    }, 3000)
  }

  // Double click on right edge to show bot again
  React.useEffect(() => {
    let lastClickTime = 0
    const handleDoubleClick = (e: MouseEvent) => {
      const now = Date.now()
      const rightEdgeThreshold = window.innerWidth * 0.95 // Right 5% of screen
      
      if (
        !isBotVisible && 
        e.clientX > rightEdgeThreshold &&
        now - lastClickTime < 300 // Double click within 300ms
      ) {
        // 恢复时也重置 y 坐标到底部
        const iconWidth = 56
        const margin = 20
        const y = window.innerHeight - 80
        const maxY = window.innerHeight - iconWidth - margin
        const finalY = Math.max(0, Math.min(y, maxY))
        try {
          localStorage.setItem('aipex_bot_y_position', String(finalY))
        } catch (e) {}
        setResetBotY(finalY)
        setIsBotVisible(true)
      }
      lastClickTime = now
    }

    document.addEventListener('click', handleDoubleClick)
    return () => document.removeEventListener('click', handleDoubleClick)
  }, [isBotVisible])

  // 直接返回 UI，不用 ReactDOM.createPortal
  return (
    <>
      {/* <SelectionPopup /> */}
      {isBotVisible && (
        <FloatingBot 
          onOpenAIChat={handleOpenAIChat}
          onClose={handleCloseBotAndShowReopen}
          resetY={resetBotY}
        />
      )}
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
