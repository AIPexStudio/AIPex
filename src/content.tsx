import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect } from "react"
import ReactDOM from "react-dom"
import "~style.css"
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


const Omni = () => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [actions, setActions] = React.useState<any[]>([])
  const [filteredActions, setFilteredActions] = React.useState<any[]>([])
  const [input, setInput] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [toast, setToast] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // 获取 actions
  const fetchActions = () => {
    chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
      console.log("response")
      console.log(response)
      if (response && response.actions) {
        console.log("response.actions")
        console.log(response.actions)
        setActions(response.actions)
        setFilteredActions(response.actions)
      }
    })
  }

  // 弹窗打开时获取 actions
  React.useEffect(() => {
    if (isOpen) {
      console.log("fetchActions")
      fetchActions()
      setInput("")
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // 输入过滤
  React.useEffect(() => {
    if (!input) {
      setFilteredActions(actions)
    } else if (input.startsWith("/tabs")) {
      const tempvalue = input.replace("/tabs ", "")
      setFilteredActions(
        actions.filter(a => a.type === "tab" && (
          !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)
        ))
      )
    } else if (input.startsWith("/bookmarks")) {
      const tempvalue = input.replace("/bookmarks ", "")
      if (tempvalue && tempvalue !== "/bookmarks") {
        chrome.runtime.sendMessage({ request: "search-bookmarks", query: tempvalue }, (response) => {
          setFilteredActions((response?.bookmarks || []).filter(a => a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)))
        })
      } else {
        setFilteredActions(actions.filter(a => a.type === "bookmark"))
      }
    } else if (input.startsWith("/history")) {
      const tempvalue = input.replace("/history ", "")
      if (tempvalue && tempvalue !== "/history") {
        chrome.runtime.sendMessage({ request: "search-history", query: tempvalue }, (response) => {
          setFilteredActions((response?.history || []).filter(a => a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)))
        })
      } else {
        setFilteredActions(actions.filter(a => a.type === "history"))
      }
    } else if (input.startsWith("/remove")) {
      const tempvalue = input.replace("/remove ", "")
      setFilteredActions(
        actions.filter(a => (a.type === "bookmark" || a.type === "tab") && (
          !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)
        ))
      )
    } else if (input.startsWith("/actions")) {
      const tempvalue = input.replace("/actions ", "")
      setFilteredActions(
        actions.filter(a => a.type === "action" && (
          !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue) || a.url?.toLowerCase().includes(tempvalue)
        ))
      )
    } else {
      setFilteredActions(
        actions.filter((a) =>
          a.title?.toLowerCase().includes(input.toLowerCase()) ||
          a.desc?.toLowerCase().includes(input.toLowerCase()) ||
          a.url?.toLowerCase().includes(input.toLowerCase())
        )
      )
    }
  }, [input, actions])

  // 输入过滤时重置高亮项
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [filteredActions])

  // 消息监听
  React.useEffect(() => {
    const onMessage = (message: any) => {
      if (message.request === "open-aipex") {
        setIsOpen((prev) => !prev)
      } else if (message.request === "close-omni") {
        setIsOpen(false)
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [])

  // 全局快捷键监听（Esc 关闭）
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
        chrome.runtime.sendMessage({ request: "close-omni" })
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen])

  // 键盘操作
  React.useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
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
  }, [isOpen, filteredActions, selectedIndex])

  // 辅助函数
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

  // 执行 action
  const handleAction = (action: any) => {
    setToast(`Action: ${action.title} 已执行`)
    setTimeout(() => setToast(null), 2000)
    // 具体操作
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
      case "remove-all":
      case "remove-history":
      case "remove-cookies":
      case "remove-cache":
      case "remove-local-storage":
      case "remove-passwords":
        // 仅弹出 toast
        break
      default:
        chrome.runtime.sendMessage({ request: action.action, tab: action, query: input })
        break
    }
  }

  // Helper to get icon for action
  function getActionIcon(action: any) {
    if (action.favIconUrl) return action.favIconUrl
    if (action.url?.startsWith("chrome-extension://")) return chrome.runtime.getURL("/assets/globe.svg")
    if (action.url?.startsWith("chrome://")) return chrome.runtime.getURL("/assets/globe.svg")
    return chrome.runtime.getURL("/assets/globe.svg")
  }

  // Diagnostic: log all favIconUrls when filteredActions change
  React.useEffect(() => {
    filteredActions.forEach(action => {
      console.log("[DIAG] action.title:", action.title, "favIconUrl:", action.favIconUrl)
    })
  }, [filteredActions])

  if (!isOpen) return null
  return ReactDOM.createPortal(
    <div
      id="omni-extension"
      className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 flex items-start justify-center"
    >
      <div
        className="mt-24 w-[800px] bg-neutral-900 rounded-2xl shadow-2xl p-6 relative border border-neutral-800"
      >
        <input
          ref={inputRef}
          className="w-full px-3 py-2 text-lg rounded-md border border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500"
          placeholder="Type to search..."
          value={input}
          onChange={e => {
            checkShortHand(e, e.target.value)
            setInput(e.target.value)
          }}
        />
        <div className="mt-4 max-h-[300px] overflow-y-auto">
          {filteredActions.length === 0 && <div className="text-neutral-500">No actions</div>}
          {filteredActions.map((action, idx) => (
            <div
              key={action.title + idx}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 cursor-pointer border transition ${idx === selectedIndex ? "bg-neutral-800 border-blue-500" : "bg-transparent border-transparent hover:bg-neutral-800/60"}`}
              onClick={() => handleAction(action)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {action.emoji ? (
                <span style={{fontSize: 22}}>{action.emojiChar}</span>
              ) : (
                <img
                  src={getActionIcon(action)}
                  alt="favicon"
                  className="w-5 h-5 rounded"
                  onError={e => {
                    e.currentTarget.src = chrome.runtime.getURL("/assets/globe.svg")
                  }}
                  onLoad={() => {
                    console.log("[DIAG] Image loaded successfully:", getActionIcon(action))
                  }}
                />
              )}
              <div className="flex-1 text-left">
                <div className="font-semibold text-white">{action.title}</div>
                <div className="text-xs text-neutral-400">{action.desc}</div>
                {action.url && (
                  <div className="text-xs text-neutral-500 break-all mt-1">
                    {action.url.length > 40
                      ? action.url.slice(0, 40) + "..."
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
    </div>,
    document.body
  )
}

const PlasmoOverlay = () => {
  // useEffect(() => {
  //   const handler = (msg: any) => {
  //     if (msg.type === "open-aipex") {
  //       showNotification()
  //     }
  //   }
  //   chrome.runtime.onMessage.addListener(handler)
  //   return () => chrome.runtime.onMessage.removeListener(handler)
  // }, [])
  return <Omni />
}

export default PlasmoOverlay
