import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect } from "react"
import ReactDOM from "react-dom"

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

const showNotification = () => {
  const div = document.createElement("div")
  div.textContent = "快捷键触发成功！"
  div.style.position = "fixed"
  div.style.top = "40px"
  div.style.right = "40px"
  div.style.zIndex = "99999"
  div.style.background = "#222"
  div.style.color = "#fff"
  div.style.padding = "16px 32px"
  div.style.borderRadius = "8px"
  div.style.fontSize = "18px"
  div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)"
  document.body.appendChild(div)
  setTimeout(() => {
    div.remove()
  }, 1500)
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
          !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue)
        ))
      )
    } else if (input.startsWith("/bookmarks")) {
      const tempvalue = input.replace("/bookmarks ", "")
      if (tempvalue && tempvalue !== "/bookmarks") {
        chrome.runtime.sendMessage({ request: "search-bookmarks", query: tempvalue }, (response) => {
          setFilteredActions(response?.bookmarks || [])
        })
      } else {
        setFilteredActions(actions.filter(a => a.type === "bookmark"))
      }
    } else if (input.startsWith("/history")) {
      const tempvalue = input.replace("/history ", "")
      if (tempvalue && tempvalue !== "/history") {
        chrome.runtime.sendMessage({ request: "search-history", query: tempvalue }, (response) => {
          setFilteredActions(response?.history || [])
        })
      } else {
        setFilteredActions(actions.filter(a => a.type === "history"))
      }
    } else if (input.startsWith("/remove")) {
      const tempvalue = input.replace("/remove ", "")
      setFilteredActions(
        actions.filter(a => (a.type === "bookmark" || a.type === "tab") && (
          !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue)
        ))
      )
    } else if (input.startsWith("/actions")) {
      const tempvalue = input.replace("/actions ", "")
      setFilteredActions(
        actions.filter(a => a.type === "action" && (
          !tempvalue || a.title?.toLowerCase().includes(tempvalue) || a.desc?.toLowerCase().includes(tempvalue)
        ))
      )
    } else {
      setFilteredActions(
        actions.filter((a) =>
          a.title?.toLowerCase().includes(input.toLowerCase()) ||
          a.desc?.toLowerCase().includes(input.toLowerCase())
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

  if (!isOpen) return null
  return ReactDOM.createPortal(
    <div id="omni-extension" style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999, background: 'rgba(0,0,0,0.1)'}}>
      <div style={{margin: '100px auto', width: 400, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', padding: 24, position: 'relative'}}>
        <input
          ref={inputRef}
          style={{width: '100%', padding: 8, fontSize: 18, borderRadius: 4, border: '1px solid #eee'}}
          placeholder="Type to search..."
          value={input}
          onChange={e => {
            checkShortHand(e, e.target.value)
            setInput(e.target.value)
          }}
        />
        <div style={{marginTop: 16, maxHeight: 300, overflowY: 'auto'}}>
          {filteredActions.length === 0 && <div style={{color: '#888'}}>No actions</div>}
          {filteredActions.map((action, idx) => (
            <div
              key={action.title + idx}
              style={{
                padding: '10px 12px',
                background: idx === selectedIndex ? '#f0f6ff' : 'transparent',
                borderRadius: 6,
                marginBottom: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: idx === selectedIndex ? '1px solid #2684ff' : '1px solid transparent'
              }}
              onClick={() => handleAction(action)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {action.emoji ? (
                <span style={{fontSize: 22}}>{action.emojiChar}</span>
              ) : (
                <img src={action.favIconUrl} alt="favicon" style={{width: 20, height: 20, borderRadius: 4}} onError={e => (e.currentTarget.src = chrome.runtime.getURL("/assets/globe.svg"))} />
              )}
              <div style={{flex: 1}}>
                <div style={{fontWeight: 500}}>{action.title}</div>
                <div style={{fontSize: 13, color: '#888'}}>{action.desc}</div>
              </div>
            </div>
          ))}
        </div>
        {toast && (
          <div style={{
            position: 'absolute',
            top: -60,
            left: 0,
            right: 0,
            margin: '0 auto',
            background: '#222',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 16,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            width: 'fit-content',
            minWidth: 180
          }}>
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
