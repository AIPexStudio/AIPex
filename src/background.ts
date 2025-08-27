import logoNotion from "url:~/assets/logo-notion.png"
import logoSheets from "url:~/assets/logo-sheets.png"
import logoDocs from "url:~/assets/logo-docs.png"
import logoSlides from "url:~/assets/logo-slides.png"
import logoForms from "url:~/assets/logo-forms.png"
import logoMedium from "url:~/assets/logo-medium.png"
import logoGithub from "url:~/assets/logo-github.png"
import logoCodepen from "url:~/assets/logo-codepen.png"
import logoExcel from "url:~/assets/logo-excel.png"
import logoPowerpoint from "url:~/assets/logo-powerpoint.png"
import logoWord from "url:~/assets/logo-word.png"
import logoFigma from "url:~/assets/logo-figma.png"
import logoProducthunt from "url:~/assets/logo-producthunt.png"
import logoTwitter from "url:~/assets/logo-twitter.png"
import logoSpotify from "url:~/assets/logo-spotify.png"
import logoCanva from "url:~/assets/logo-canva.png"
import logoAnchor from "url:~/assets/logo-anchor.png"
import logoPhotoshop from "url:~/assets/logo-photoshop.png"
import logoQr from "url:~/assets/logo-qr.png"
import logoAsana from "url:~/assets/logo-asana.png"
import logoLinear from "url:~/assets/logo-linear.png"
import logoWip from "url:~/assets/logo-wip.png"
import logoCalendar from "url:~/assets/logo-calendar.png"
import logoKeep from "url:~/assets/logo-keep.png"
import logoMeet from "url:~/assets/logo-meet.png"
import { Storage } from "@plasmohq/storage"
import globeSvg from "url:~/assets/globe.svg";

// background.ts is responsible for listening to extension-level shortcuts (such as Command/Ctrl+M),
// and notifies the content script (content.tsx) via chrome.tabs.sendMessage
console.log(logoNotion)

let actions: any[] = []
let newtaburl = ""

// Check if AI grouping is available
async function isAIGroupingAvailable() {
  const storage = new Storage()
  const aiToken = await storage.get("aiToken")
  return !!aiToken
}

// Get current tab
const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

// Clear and add default actions
const clearActions = async () => {
  const response = await getCurrentTab()
  actions = []
  // if (!response) {
  //   // No active tab, return or initialize empty actions
  //   return
  // }
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  let muteaction = {title:"Mute tab", desc:"Mute the current tab", type:"action", action:"mute", emoji:true, emojiChar:"🔇", keycheck:true, keys:['⌥','⇧', 'M']}
  let pinaction = {title:"Pin tab", desc:"Pin the current tab", type:"action", action:"pin", emoji:true, emojiChar:"📌", keycheck:true, keys:['⌥','⇧', 'P']}
  if (response.mutedInfo?.muted) {
    muteaction = {title:"Unmute tab", desc:"Unmute the current tab", type:"action", action:"unmute", emoji:true, emojiChar:"🔈", keycheck:true, keys:['⌥','⇧', 'M']}
  }
  if (response.pinned) {
    pinaction = {title:"Unpin tab", desc:"Unpin the current tab", type:"action", action:"unpin", emoji:true, emojiChar:"📌", keycheck:true, keys:['⌥','⇧', 'P']}
  }
  actions = [
    {
      title: "AI Chat",
      desc: "Start an AI conversation",
      type: "action",
      action: "ai-chat",
      emoji: true,
      emojiChar: "🤖",
      keycheck: false,
    },
    {title:"New tab", desc:"Open a new tab", type:"action", action:"new-tab", emoji:true, emojiChar:"✨", keycheck:true, keys:['⌘','T']},
    {
      title: "Organize Tabs",
      desc: "Group tabs using AI",
      type: "action",
      action: "organize-tabs",
      emoji: true,
      emojiChar: "📑",
      keycheck: false,
    },
    {
      title: "Ungroup Tabs",
      desc: "Ungroup all tabs",
      type: "action",
      action: "ungroup-tabs",
      emoji: true,
      emojiChar: "📄",
      keycheck: false,
    },
    {title:"Bookmark", desc:"Create a bookmark", type:"action", action:"create-bookmark", emoji:true, emojiChar:"📕", keycheck:true, keys:['⌘','D']},
    pinaction,
    {title:"Fullscreen", desc:"Make the page fullscreen", type:"action", action:"fullscreen", emoji:true, emojiChar:"🖥", keycheck:true, keys:['⌘', 'Ctrl', 'F']},
    muteaction,
    {title:"Reload", desc:"Reload the page", type:"action", action:"reload", emoji:true, emojiChar:"♻️", keycheck:true, keys:['⌘','⇧', 'R']},
    {title:"Help", desc:"Get help with AIPex on GitHub", type:"action", action:"url", url:"https://github.com/buttercannfly/AIpex", emoji:true, emojiChar:"🤔", keycheck:false},
    {title:"Compose email", desc:"Compose a new email", type:"action", action:"email", emoji:true, emojiChar:"✉️", keycheck:true, keys:['⌥','⇧', 'C']},
    {title:"Print page", desc:"Print the current page", type:"action", action:"print", emoji:true, emojiChar:"🖨️", keycheck:true, keys:['⌘', 'P']},
    {title:"New Notion page", desc:"Create a new Notion page", type:"action", action:"url", url:"https://notion.new", emoji:false, favIconUrl:logoNotion, keycheck:false},
    {title:"New Sheets spreadsheet", desc:"Create a new Google Sheets spreadsheet", type:"action", action:"url", url:"https://sheets.new", emoji:false, favIconUrl:logoSheets, keycheck:false},
    {title:"New Docs document", desc:"Create a new Google Docs document", type:"action", action:"url", emoji:false, url:"https://docs.new", favIconUrl:logoDocs, keycheck:false},
    {title:"New Slides presentation", desc:"Create a new Google Slides presentation", type:"action", action:"url", url:"https://slides.new", emoji:false, favIconUrl:logoSlides, keycheck:false},
    {title:"New form", desc:"Create a new Google Forms form", type:"action", action:"url", url:"https://forms.new", emoji:false, favIconUrl:logoForms, keycheck:false},
    {title:"New Medium story", desc:"Create a new Medium story", type:"action", action:"url", url:"https://medium.com/new-story", emoji:false, favIconUrl:logoMedium, keycheck:false},
    {title:"New GitHub repository", desc:"Create a new GitHub repository", type:"action", action:"url", url:"https://github.new", emoji:false, favIconUrl:logoGithub, keycheck:false},
    {title:"New GitHub gist", desc:"Create a new GitHub gist", type:"action", action:"url", url:"https://gist.github.com/", emoji:false, favIconUrl:logoGithub, keycheck:false},
    {title:"New CodePen pen", desc:"Create a new CodePen pen", type:"action", action:"url", url:"https://codepen.io/pen/", emoji:false, favIconUrl:logoCodepen, keycheck:false},
    {title:"New Excel spreadsheet", desc:"Create a new Excel spreadsheet", type:"action", action:"url", url:"https://office.live.com/start/excel.aspx", emoji:false, favIconUrl:logoExcel, keycheck:false},
    {title:"New PowerPoint presentation", desc:"Create a new PowerPoint presentation", type:"action", url:"https://office.live.com/start/powerpoint.aspx", action:"url", emoji:false, favIconUrl:logoPowerpoint, keycheck:false},
    {title:"New Word document", desc:"Create a new Word document", type:"action", action:"url", url:"https://office.live.com/start/word.aspx", emoji:false, favIconUrl:logoWord, keycheck:false},
    {title:"Create a whiteboard", desc:"Create a collaborative whiteboard", type:"action", action:"url", url:"https://miro.com/app/board/", emoji:true, emojiChar:"🧑‍🏫", keycheck:false},
    {title:"Record a video", desc:"Record and edit a video", type:"action", action:"url", url:"https://www.loom.com/record", emoji:true, emojiChar:"📹", keycheck:false},
    {title:"Create a Figma file", desc:"Create a new Figma file", type:"action", action:"url", url:"https://figma.new", emoji:false, favIconUrl:logoFigma, keycheck:false},
    {title:"Create a FigJam file", desc:"Create a new FigJam file", type:"action", action:"url", url:"https://www.figma.com/figjam/", emoji:true, emojiChar:"🖌", keycheck:false},
    {title:"Hunt a product", desc:"Submit a product to Product Hunt", type:"action", action:"url", url:"https://www.producthunt.com/posts/new", emoji:false, favIconUrl:logoProducthunt, keycheck:false},
    {title:"Make a tweet", desc:"Make a tweet on Twitter", type:"action", action:"url", url:"https://twitter.com/intent/tweet", emoji:false, favIconUrl:logoTwitter, keycheck:false},
    {title:"Create a playlist", desc:"Create a Spotify playlist", type:"action", action:"url", url:"https://open.spotify.com/", emoji:false, favIconUrl:logoSpotify, keycheck:false},
    {title:"Create a Canva design", desc:"Create a new design with Canva", type:"action", action:"url", url:"https://www.canva.com/create/", emoji:false, favIconUrl:logoCanva, keycheck:false},
    {title:"Create a new podcast episode", desc:"Create a new podcast episode with Anchor", type:"action", action:"url", url:"https://anchor.fm/dashboard/episodes/new", emoji:false, favIconUrl:logoAnchor, keycheck:false},
    {title:"Edit an image", desc:"Edit an image with Adobe Photoshop", type:"action", action:"url", url:"https://www.photoshop.com/", emoji:false, favIconUrl:logoPhotoshop, keycheck:false},
    {title:"Convert to PDF", desc:"Convert a file to PDF", type:"action", action:"url", url:"https://www.ilovepdf.com/", emoji:true, emojiChar:"📄", keycheck:false},
    {title:"Scan a QR code", desc:"Scan a QR code with your camera", type:"action", action:"url", url:"https://www.qr-code-generator.com/", emoji:false, favIconUrl:logoQr, keycheck:false},
    {title:"Add a task to Asana", desc:"Create a new task in Asana", type:"action", action:"url", url:"https://app.asana.com/", emoji:false, favIconUrl:logoAsana, keycheck:false},
    {title:"Add an issue to Linear", desc:"Create a new issue in Linear", type:"action", action:"url", url:"https://linear.new", emoji:false, favIconUrl:logoLinear, keycheck:false},
    {title:"Add a task to WIP", desc:"Create a new task in WIP", type:"action", action:"url", url:"https://wip.co/", emoji:false, favIconUrl:logoWip, keycheck:false},
    {title:"Create an event", desc:"Add an event to Google Calendar", type:"action", action:"url", url:"https://calendar.google.com/", emoji:false, favIconUrl:logoCalendar, keycheck:false},
    {title:"Add a note", desc:"Add a note to Google Keep", type:"action", action:"url", emoji:false, url:"https://keep.google.com/", favIconUrl:logoKeep, keycheck:false},
    {title:"New meeting", desc:"Start a Google Meet meeting", type:"action", action:"url", emoji:false, url:"https://meet.google.com/", favIconUrl:logoMeet, keycheck:false},
    {title:"Start ChatGPT", desc:"Open ChatGPT for AI assistance", type:"action", action:"url", url:"https://chat.openai.com/", emoji:true, emojiChar:"🤖", keycheck:false},
    {title:"Microsoft Copilot", desc:"Access Microsoft's AI assistant", type:"action", action:"url", url:"https://copilot.microsoft.com/", emoji:true, emojiChar:"🤖", keycheck:false},
    {title:"Claude AI", desc:"Chat with Anthropic's Claude AI", type:"action", action:"url", url:"https://claude.ai/", emoji:true, emojiChar:"🧠", keycheck:false},
    {title:"Discord Server", desc:"Join or create a Discord server", type:"action", action:"url", url:"https://discord.com/", emoji:true, emojiChar:"💬", keycheck:false},
    {title:"Slack Workspace", desc:"Open your Slack workspace", type:"action", action:"url", url:"https://slack.com/", emoji:true, emojiChar:"💼", keycheck:false},
    {title:"Zoom Meeting", desc:"Start or join a Zoom meeting", type:"action", action:"url", url:"https://zoom.us/", emoji:true, emojiChar:"📹", keycheck:false},
    {title:"Trello Board", desc:"Create a new Trello board", type:"action", action:"url", url:"https://trello.com/", emoji:true, emojiChar:"📋", keycheck:false},
    {title:"Vercel Deploy", desc:"Deploy your project with Vercel", type:"action", action:"url", url:"https://vercel.com/new", emoji:true, emojiChar:"🚀", keycheck:false},
    {title:"Netlify Deploy", desc:"Deploy your site with Netlify", type:"action", action:"url", url:"https://app.netlify.com/", emoji:true, emojiChar:"🌐", keycheck:false},
    {title:"Bluesky Post", desc:"Create a post on Bluesky", type:"action", action:"url", url:"https://bsky.app/", emoji:true, emojiChar:"🦋", keycheck:false},
    {title:"Browsing history", desc:"Browse through your browsing history", type:"action", action:"history", emoji:true, emojiChar:"🗂", keycheck:true, keys:['⌘','Y']},
    {title:"Incognito mode", desc:"Open an incognito window", type:"action", action:"incognito", emoji:true, emojiChar:"🕵️", keycheck:true, keys:['⌘','⇧', 'N']},
    {title:"Downloads", desc:"Browse through your downloads", type:"action", action:"downloads", emoji:true, emojiChar:"📦", keycheck:true, keys:['⌘','⇧', 'J']},
    {title:"Extensions", desc:"Manage your Chrome Extensions", type:"action", action:"extensions", emoji:true, emojiChar:"🧩", keycheck:false, keys:['⌘','D']},
    {title:"Chrome settings", desc:"Open the Chrome settings", type:"action", action:"settings", emoji:true, emojiChar:"⚙️", keycheck:true, keys:['⌘',',']},
    {title:"Scroll to bottom", desc:"Scroll to the bottom of the page", type:"action", action:"scroll-bottom", emoji:true, emojiChar:"👇", keycheck:true, keys:['⌘','↓']},
    {title:"Scroll to top", desc:"Scroll to the top of the page", type:"action", action:"scroll-top", emoji:true, emojiChar:"👆", keycheck:true, keys:['⌘','↑']},
    {title:"Go back", desc:"Go back in history for the current tab", type:"action", action:"go-back", emoji:true, emojiChar:"👈",  keycheck:true, keys:['⌘','←']},
    {title:"Go forward", desc:"Go forward in history for the current tab", type:"action", action:"go-forward", emoji:true, emojiChar:"👉", keycheck:true, keys:['⌘','→']},
    {title:"Duplicate tab", desc:"Make a copy of the current tab", type:"action", action:"duplicate-tab", emoji:true, emojiChar:"📋", keycheck:true, keys:['⌥','⇧', 'D']},
    {title:"Close tab", desc:"Close the current tab", type:"action", action:"close-tab", emoji:true, emojiChar:"🗑", keycheck:true, keys:['⌘','W']},
    {title:"Close window", desc:"Close the current window", type:"action", action:"close-window", emoji:true, emojiChar:"💥", keycheck:true, keys:['⌘','⇧', 'W']},
    {title:"Manage browsing data", desc:"Manage your browsing data", type:"action", action:"manage-data", emoji:true, emojiChar:"🔬", keycheck:true, keys:['⌘','⇧', 'Delete']},
    {title:"Clear all browsing data", desc:"Clear all of your browsing data", type:"action", action:"remove-all", emoji:true, emojiChar:"🧹", keycheck:false, keys:['⌘','D']},
    {title:"Clear browsing history", desc:"Clear all of your browsing history", type:"action", action:"remove-history", emoji:true, emojiChar:"🗂", keycheck:false, keys:['⌘','D']},
    {title:"Clear cookies", desc:"Clear all cookies", type:"action", action:"remove-cookies", emoji:true, emojiChar:"🍪", keycheck:false, keys:['⌘','D']},
    {title:"Clear cache", desc:"Clear the cache", type:"action", action:"remove-cache", emoji:true, emojiChar:"🗄", keycheck:false, keys:['⌘','D']},
    {title:"Clear local storage", desc:"Clear the local storage", type:"action", action:"remove-local-storage", emoji:true, emojiChar:"📦", keycheck:false, keys:['⌘','D']},
    {title:"Clear passwords", desc:"Clear all saved passwords", type:"action", action:"remove-passwords", emoji:true, emojiChar:"🔑", keycheck:false, keys:['⌘','D']},
  ]
  if (!isMac) {
    for (const action of actions) {
      switch (action.action) {
        case "reload":
          action.keys = ['F5']
          break
        case "fullscreen":
          action.keys = ['F11']
          break
        case "downloads":
          action.keys = ['Ctrl', 'J']
          break
        case "settings":
          action.keycheck = false
          break
        case "history":
          action.keys = ['Ctrl', 'H']
          break
        case "go-back":
          action.keys = ['Alt','←']
          break
        case "go-forward":
          action.keys = ['Alt','→']
          break
        case "scroll-top":
          action.keys = ['Home']
          break
        case "scroll-bottom":
          action.keys = ['End']
          break
      }
      for (let key in action.keys) {
        if (action.keys[key] === "⌘") {
          action.keys[key] = "Ctrl"
        } else if (action.keys[key] === "⌥") {
          action.keys[key] = "Alt"
        }
      }
    }
  }
}

// Open on install
chrome.runtime.onInstalled.addListener((object) => {
  // Plasmo/Manifest V3: Cannot directly inject scripts using content_scripts field, need scripting API
  if (object.reason === "install") {
    chrome.tabs.create({ url: "https://aipex.quest" })
  }
})

// Extension button click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Open AI Chat sidepanel directly when clicking the toolbar icon
    chrome.sidePanel.open({ tabId: tab.id })
  }
})

// Shortcut listener
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-aipex") {
    getCurrentTab().then((response) => {
      if (!response.url.includes("chrome://") && !response.url.includes("chrome.google.com")) {
        console.log("open-aipex")
        chrome.tabs.sendMessage(response.id!, {request: "open-aipex"})
      } else {
        // Open a new tab with our custom new tab page
        chrome.tabs.create({ url: "chrome://newtab" }).then((tab) => {
          console.log("open-aipex-new-tab")
          newtaburl = response.url
          chrome.tabs.remove(response.id!)
        })
      }
    })
  }
})

// Restore new tab
const restoreNewTab = () => {
  getCurrentTab().then((response) => {
    chrome.tabs.create({ url: newtaburl }).then(() => {
      chrome.tabs.remove(response.id!)
    })
  })
}

// Reset actions
const resetOmni = async () => {
  await clearActions()
  await getTabs()
  await getHistory()
//   await getBookmarks()
  
  // Find AI Chat action and move it to the front
  const aiChatIndex = actions.findIndex(action => action.action === 'ai-chat')
  if (aiChatIndex > 0) {
    const aiChatAction = actions.splice(aiChatIndex, 1)[0]
    actions.unshift(aiChatAction)
  }
}

// Tab updates - only reset actions, no auto-grouping
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  resetOmni()
})

chrome.tabs.onCreated.addListener(async (tab) => {
  resetOmni()
})

chrome.tabs.onRemoved.addListener(() => { 
  resetOmni() 
  // Don't count tab removals towards the regroup threshold
})

// Get all tabs
const getTabs = async () => {
  const tabs = await chrome.tabs.query({})
  console.log("getTabs", tabs)
  tabs.forEach((tab) => {
    (tab as any).desc = "Chrome tab"
    ;(tab as any).keycheck = false
    ;(tab as any).action = "switch-tab"
    ;(tab as any).type = "tab"
  })
  actions = tabs.concat(actions)
}

// Get all bookmarks
const getBookmarks = async () => {
  const process_bookmark = (bookmarks: any[]) => {
    for (const bookmark of bookmarks) {
      if (bookmark.url) {
        actions.push({title:bookmark.title, desc:"Bookmark", id:bookmark.id, url:bookmark.url, type:"bookmark", action:"bookmark", emoji:true, emojiChar:"⭐️", keycheck:false})
      }
      if (bookmark.children) {
        process_bookmark(bookmark.children)
      }
    }
  }
  const bookmarks = await chrome.bookmarks.getRecent(100)
  process_bookmark(bookmarks)
}

// Get all history
const getHistory = async () => {
  const history = await chrome.history.search({text:"", maxResults:1000, startTime:0})
  history.forEach((item: any) => {
    actions.push({
      title: item.title || "Untitled",
      desc: item.url,
      url: item.url,
      type: "history",
      action: "history",
      emoji: true,
      emojiChar: "🏛",
      keycheck: false
    })
  })
}

// Action execution functions
const switchTab = (tab: any) => {
  chrome.tabs.highlight({ tabs: tab.index, windowId: tab.windowId })
  chrome.windows.update(tab.windowId, { focused: true })
}
const goBack = (tab: any) => {
  chrome.tabs.goBack(tab.id)
}
const goForward = (tab: any) => {
  chrome.tabs.goForward(tab.id)
}
const duplicateTab = (tab: any) => {
  getCurrentTab().then((response) => {
    chrome.tabs.duplicate(response.id!)
  })
}
const createBookmark = (tab: any) => {
  getCurrentTab().then((response) => {
    chrome.bookmarks.create({ title: response.title, url: response.url })
  })
}
const muteTab = (mute: boolean) => {
  getCurrentTab().then((response) => {
    chrome.tabs.update(response.id!, { muted: mute })
  })
}
const reloadTab = () => {
  chrome.tabs.reload()
}
const pinTab = (pin: boolean) => {
  getCurrentTab().then((response) => {
    chrome.tabs.update(response.id!, { pinned: pin })
  })
}
const clearAllData = () => {
  chrome.browsingData.remove({ since: (new Date()).getTime() }, {
    appcache: true, cache: true, cacheStorage: true, cookies: true, downloads: true, fileSystems: true, formData: true, history: true, indexedDB: true, localStorage: true, passwords: true, serviceWorkers: true, webSQL: true
  })
}
const clearBrowsingData = () => {
  chrome.browsingData.removeHistory({ since: 0 })
}
const clearCookies = () => {
  chrome.browsingData.removeCookies({ since: 0 })
}
const clearCache = () => {
  chrome.browsingData.removeCache({ since: 0 })
}
const clearLocalStorage = () => {
  chrome.browsingData.removeLocalStorage({ since: 0 })
}
const clearPasswords = () => {
  chrome.browsingData.removePasswords({ since: 0 })
}
const openChromeUrl = (url: string) => {
  chrome.tabs.create({ url: 'chrome://' + url + '/' })
}
const openIncognito = () => {
  chrome.windows.create({ incognito: true })
}
const closeWindow = (id: number) => {
  chrome.windows.remove(id)
}
const closeTab = (tab: any) => {
  chrome.tabs.remove(tab.id)
}
const closeCurrentTab = () => {
  getCurrentTab().then(closeTab)
}
const removeBookmark = (bookmark: any) => {
  chrome.bookmarks.remove(bookmark.id)
}

const ungroupAllTabs = async () => {
  try {
    // Get current window
    const currentWindow = await chrome.windows.getCurrent()
    
    // Get all tab groups in the current window
    const groups = await chrome.tabGroups.query({ windowId: currentWindow.id })
    
    if (groups.length === 0) {
      console.log("No tab groups found to ungroup")
      // Notify popup that operation is complete
      chrome.runtime.sendMessage({ 
        request: "ungroup-tabs-complete", 
        success: true, 
        message: "No tab groups found to ungroup" 
      }).catch(err => {
        console.log('Failed to send ungroup completion message:', err)
      });
      return;
    }
    
    // For each group, get its tabs and ungroup them
    for (const group of groups) {
      const tabs = await chrome.tabs.query({ groupId: group.id })
      const tabIds = tabs.map(tab => tab.id)
      
      if (tabIds.length > 0) {
        chrome.tabs.ungroup(tabIds)
      }
    }
    
    console.log(`Ungrouped ${groups.length} tab groups`)
    
    // Notify popup that operation completed successfully
    chrome.runtime.sendMessage({ 
      request: "ungroup-tabs-complete", 
      success: true, 
      message: `Successfully ungrouped ${groups.length} tab groups` 
    }).catch(err => {
      console.log('Failed to send ungroup completion message:', err)
    });
    
  } catch (error) {
    console.error("Error ungrouping tabs:", error)
    
    // Notify popup that operation failed
    chrome.runtime.sendMessage({ 
      request: "ungroup-tabs-complete", 
      success: false, 
      message: `Error ungrouping tabs: ${error.message}` 
    }).catch(err => {
      console.log('Failed to send ungroup error message:', err)
    });
  }
}

// OpenAI chat completion helper
async function chatCompletion(messages, stream = true, options = {}) {
  const storage = new Storage()
  const aiHost = (await storage.get("aiHost")) || "https://api.openai.com/v1/chat/completions"
  const aiToken = await storage.get("aiToken")
  const aiModel = (await storage.get("aiModel")) || "gpt-3.5-turbo"
  if (!aiToken) throw new Error("No OpenAI API token set")
  
  // If messages is a string (legacy support), convert to new format
  let conversationMessages
  if (typeof messages === 'string') {
    conversationMessages = [{ role: "user", content: messages }]
  } else if (Array.isArray(messages)) {
    conversationMessages = messages
  } else {
    throw new Error("Invalid messages format")
  }
  
  const requestBody = {
    model: aiModel,
    messages: conversationMessages,
    stream: true, // Always use streaming
    ...options
  }
  
  const res = await fetch(aiHost, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiToken}`
    },
    body: JSON.stringify(requestBody)
  })
  if (!res.ok) throw new Error("OpenAI API error: " + (await res.text()))
  
  // Always return response object for streaming
  return res
}

// Helper function to parse streaming response and extract tool calls
async function parseStreamingResponse(response: Response, messageId?: string) {
  if (!response.body) {
    throw new Error('No response body for streaming')
  }
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let toolCalls: any[] = []
  let currentToolCall: any = null
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.trim() === '') continue
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            // Send completion message
            if (messageId) {
              chrome.runtime.sendMessage({ request: 'ai-chat-complete', messageId }).catch(() => {})
            }
            return { content, toolCalls }
          }
          
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            
            // Handle content streaming
            if (delta?.content) {
              content += delta.content
              if (messageId) {
                chrome.runtime.sendMessage({ 
                  request: 'ai-chat-stream', 
                  chunk: delta.content, 
                  messageId 
                }).catch(() => {})
              }
            }
            
            // Handle tool call streaming
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.index !== undefined) {
                  // Start new tool call
                  if (!currentToolCall || currentToolCall.index !== toolCall.index) {
                    currentToolCall = {
                      index: toolCall.index,
                      id: toolCall.id || '',
                      type: 'function',
                      function: {
                        name: toolCall.function?.name || '',
                        arguments: toolCall.function?.arguments || ''
                      }
                    }
                    toolCalls[toolCall.index] = currentToolCall
                    
                    // Send tool call notification
                    if (messageId && currentToolCall.function.name) {
                      try {
                        const args = currentToolCall.function.arguments ? 
                          JSON.parse(currentToolCall.function.arguments) : {}
                        chrome.runtime.sendMessage({
                          request: 'ai-chat-tools-step',
                          messageId,
                          step: { 
                            type: 'call_tool', 
                            name: currentToolCall.function.name, 
                            args 
                          }
                        }).catch(() => {})
                      } catch (e) {
                        console.warn('Failed to parse tool call arguments:', e)
                      }
                    }
                  }
                  
                  // Update existing tool call
                  if (toolCall.id) currentToolCall.id = toolCall.id
                  if (toolCall.function?.name) currentToolCall.function.name = toolCall.function.name
                  if (toolCall.function?.arguments) {
                    currentToolCall.function.arguments += toolCall.function.arguments
                  }
                }
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
  
  return { content, toolCalls }
}

// Unified system prompt describing AIPex product capabilities (Chinese)
const SYSTEM_PROMPT = [
  "You are the AIPex browser assistant with enhanced planning capabilities. Reply concisely in English. Use tools when available and provide clear next steps when tools are not needed.",
  
  "\n=== ENHANCED PLANNING FRAMEWORK ===",
  "You follow a structured Planning Agent approach with ReAct (Reasoning + Acting) pattern:",
  
  "\n1. TASK ANALYSIS PHASE:",
  "   - Analyze the user's request and identify the core objective",
  "   - Determine if this is a simple task or requires multi-step planning",
  "   - Identify required tools and dependencies",
  
  "\n2. PLANNING PHASE:",
  "   - For complex tasks, create a detailed execution plan with numbered steps",
  "   - Consider potential obstacles and alternative approaches",
  "   - Estimate the sequence and dependencies of tool calls",
  
  "\n3. EXECUTION PHASE (ReAct Loop):",
  "   - THINK: Analyze current situation and decide next action",
  "   - ACT: Execute the planned tool or action",
  "   - OBSERVE: Evaluate the result and update understanding",
  "   - REASON: Adjust plan if needed and continue or conclude",
  
  "\n4. MONITORING & ADAPTATION:",
  "   - Track progress against the original plan",
  "   - Adapt strategy if unexpected results occur",
  "   - Provide status updates and explain deviations",
  
  "\n=== PLANNING TEMPLATES ===",
  "For complex tasks, use this planning format:",
  "```",
  "📋 TASK ANALYSIS:",
  "- Objective: [Clear goal]",
  "- Complexity: [Simple/Medium/Complex]",
  "- Required Tools: [List of needed tools]",
  "- Dependencies: [What needs to happen first]",
  
  "📝 EXECUTION PLAN:",
  "1. [First step with tool call]",
  "2. [Second step with tool call]",
  "3. [Continue as needed...]",
  
  "🔄 REACT CYCLE:",
  "THINK → ACT → OBSERVE → REASON → [Repeat]",
  "```",
  
  "\n=== CAPABILITIES ===",
  "1) Quick UI actions: guide users to open the AI Chat side panel and view/search available actions.",
  "2) Manage tabs: list all tabs, get the current active tab, switch to a tab by id, and focus the right window.",
  "3) Organize tabs: use AI to group current-window tabs by topic/purpose, or ungroup all in one click.",
  "4) Manage bookmarks: create, delete, search, and organize bookmarks.",
  "5) Manage history: search, view recent history, and clear browsing data.",
  "6) Manage windows: create, switch, minimize, maximize, and close windows.",
  "7) Manage tab groups: create, update, and organize tab groups.",
  "8) Page content analysis: extract and analyze content from web pages.",
  "9) Clipboard management: copy and manage clipboard content.",
  "10) Storage management: manage extension storage and settings.",
  
  "\n=== AVAILABLE TOOLS ===",
  "When tools are available, prefer these:",
  
  "Tab Management:",
  "- get_all_tabs: list all tabs (id, title, url)",
  "- get_current_tab: get the active tab",
  "- switch_to_tab: switch to a tab by id",
  "- create_new_tab: create a new tab with URL",
  "- get_tab_info: get detailed tab information",
  "- duplicate_tab: duplicate an existing tab",
  "- close_tab: close a specific tab",
  "- get_current_tab_content: extract content from current tab",
  
  "Tab Group Management:",
  "- organize_tabs: AI-organize current-window tabs",
  "- ungroup_tabs: remove all tab groups in the current window",
  "- get_all_tab_groups: list all tab groups",
  "- create_tab_group: create a new tab group",
  "- update_tab_group: update tab group properties",
  
  "Bookmark Management:",
  "- get_all_bookmarks: list all bookmarks",
  "- get_bookmark_folders: get bookmark folder structure",
  "- create_bookmark: create a new bookmark",
  "- delete_bookmark: delete a bookmark by ID",
  "- search_bookmarks: search bookmarks by title/URL",
  
  "History Management:",
  "- get_recent_history: get recent browsing history",
  "- search_history: search browsing history",
  "- delete_history_item: delete a specific history item",
  "- clear_history: clear browsing history for specified days",
  
  "Window Management:",
  "- get_all_windows: list all browser windows",
  "- get_current_window: get the current focused window",
  "- switch_to_window: switch focus to a specific window",
  "- create_new_window: create a new browser window",
  "- close_window: close a specific window",
  "- minimize_window: minimize a specific window",
  "- maximize_window: maximize a specific window",
  
  "Page Content:",
  "- get_page_metadata: get page metadata (title, description, keywords)",
  "- extract_page_text: extract text content with word count and reading time",
  "- get_page_links: get all links from the current page",
  "- get_page_images: get all images from the current page",
  "- search_page_text: search for text on the current page",
  "- get_interactive_elements: get all interactive elements (links, buttons, inputs) from the current page",
  "- click_element: click an element on the current page using its CSS selector",
  "- summarize_page: summarize the current page content with key points and reading statistics",
  
  "Form & Input Management:",
  "- fill_input: fill an input field with text using CSS selector",
  "- clear_input: clear the content of an input field using CSS selector",
  "- get_input_value: get the current value of an input field using CSS selector",
  "- submit_form: submit a form using CSS selector",
  "- get_form_elements: get all form elements and their input fields on the current page",
  
  "Clipboard:",
  "- copy_to_clipboard: copy text to clipboard",
  "- read_from_clipboard: read text from clipboard",
  "- copy_current_page_url: copy current page URL to clipboard",
  "- copy_current_page_title: copy current page title to clipboard",
  "- copy_selected_text: copy selected text from current page",
  "- copy_page_as_markdown: copy page content as markdown format",
  "- copy_page_as_text: copy page content as plain text",
  
  "Storage:",
  "- get_storage_value: get a value from storage",
  "- set_storage_value: set a value in storage",
  "- get_extension_settings: get extension settings",
  "- get_ai_config: get AI configuration",
  
  "Utilities:",
  "- get_browser_info: get browser information",
  "- get_system_info: get system information",
  "- get_current_datetime: get current date and time",
  "- validate_url: validate if a URL is properly formatted",
  "- extract_domain: extract domain from URL",
  "- get_text_stats: get text statistics (word count, reading time)",
  "- check_permissions: check if all required permissions are available",
  
  "Extensions:",
  "- get_all_extensions: get all installed extensions with details",
  "- get_extension: get extension details by ID",
  "- set_extension_enabled: enable or disable an extension",
  "- uninstall_extension: uninstall an extension",
  "- get_extension_permissions: get extension permissions",
  
  "Downloads:",
  "- get_all_downloads: get all downloads with status and progress",
  "- get_download: get download details by ID",
  "- pause_download: pause a download",
  "- resume_download: resume a paused download",
  "- cancel_download: cancel a download",
  "- remove_download: remove a download from history",
  "- open_download: open a downloaded file",
  "- show_download_in_folder: show a download in its folder",
  "- get_download_stats: get download statistics",
  
  "Sessions:",
  "- get_all_sessions: get all recently closed sessions",
  "- get_session: get session details by ID",
  "- restore_session: restore a closed session",
  "- get_current_device: get current device information",
  "- get_all_devices: get all devices information",
  
  "Context Menus:",
  "- create_context_menu_item: create a new context menu item",
  "- update_context_menu_item: update an existing context menu item",
  "- remove_context_menu_item: remove a context menu item",
  "- remove_all_context_menu_items: remove all context menu items",
  "- get_context_menu_items: get all context menu items",
  
  "\n=== USAGE GUIDELINES ===",
  "1. For simple requests (e.g., 'switch to X'), use direct tool calls:",
  "   - First call get_all_tabs to find the target",
  "   - Then call switch_to_tab with the matching ID",
  
  "2. For complex requests, follow the planning framework:",
  "   - Analyze the task complexity",
  "   - Create a step-by-step plan",
  "   - Execute with ReAct cycle",
  "   - Monitor and adapt as needed",
  
  "3. For content analysis requests:",
  "   - Use get_current_tab_content for current page analysis",
  "   - Use get_page_metadata for page information",
  "   - Use extract_page_text for detailed content extraction",
  
  "4. For organization tasks:",
  "   - Use organize_tabs for AI-powered tab grouping",
  "   - Use ungroup_tabs to reset organization",
  "   - Use create_tab_group for manual grouping",
  
  "5. For information gathering:",
  "   - Use get_all_tabs for tab overview",
  "   - Use get_all_bookmarks for bookmark management",
  "   - Use get_recent_history for browsing history",
  "   - Use get_interactive_elements to find clickable elements on the current page",
  "   - Use summarize_page to analyze and summarize the current page content",
  
  "6. For form and input interaction:",
  "   - Use get_form_elements to discover all forms and input fields on the current page",
  "   - Use fill_input to populate input fields with text",
  "   - Use clear_input to clear input field content",
  "   - Use get_input_value to read current input values",
  "   - Use submit_form to submit forms",
  "   - Use click_element to interact with buttons and other clickable elements",
  
  "\nEncourage natural, semantic requests instead of slash commands (e.g., 'help organize my tabs', 'switch to the bilibili tab', 'summarize this page', 'bookmark this page', 'search my history for github').",
  
  "\n=== PLANNING EXAMPLES ===",
  "Example 1 - Simple Task:",
  "User: 'Switch to bilibili'",
  "Plan: 1. Get all tabs → 2. Find bilibili tab → 3. Switch to it",
  
  "Example 2 - Complex Task:",
  "User: 'Organize my tabs and bookmark the current page'",
  "Plan: 1. Get current tab info → 2. Create bookmark → 3. Get all tabs → 4. Organize tabs by AI",
  
  "Example 3 - Analysis Task:",
  "User: 'Summarize this page and save key points'",
  "Plan: 1. Extract page content → 2. Analyze content → 3. Create summary → 4. Copy to clipboard",
  
  "Example 4 - Page Interaction Task:",
  "User: 'Open Google, search for MCP, and analyze the first result'",
  
  "Example 5 - Form Interaction Task:",
  "User: 'Fill out the contact form on this page with my information'",
  "Plan: 1. Get form elements → 2. Fill name input → 3. Fill email input → 4. Fill message textarea → 5. Submit form",
  
  "Example 6 - Input Management Task:",
  "User: 'Clear the search box and enter a new query'",
  "Plan: 1. Get interactive elements → 2. Find search input → 3. Clear input → 4. Fill with new query → 5. Submit or click search button",
  "Plan: 1. Create new tab with Google → 2. Get interactive elements → 3. Click search box → 4. Click search button → 5. Get search results → 6. Click first result → 7. Summarize the page"
].join("\n")

// Import MCP client to get all available tools
import { browserMcpClient } from "~mcp/client"

// Import PlanningStep type
interface PlanningStep {
  type: 'analysis' | 'plan' | 'think' | 'act' | 'observe' | 'reason' | 'complete'
  content: string
  timestamp: number
  status?: 'pending' | 'in-progress' | 'completed' | 'failed'
  toolCall?: {
    name: string
    args: any
    result?: any
    error?: string
  }
}

// Get all available tools from MCP client
const getAllTools = () => {
  const tools = browserMcpClient.getToolDescriptions()
  return tools.map(tool => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: browserMcpClient.tools.find(t => t.name === tool.name)?.inputSchema || {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    }
  }))
}

async function executeToolCall(name: string, args: any) {
  try {
    // Use MCP client to call the tool
    const result = await browserMcpClient.callTool(name, args)
    return result
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error)
    throw new Error(`Failed to execute tool ${name}: ${error?.message || String(error)}`)
  }
}

async function runChatWithTools(userMessages: any[], messageId?: string) {
  // System instruction to encourage tool usage in Chinese as well
  const systemPrompt = { role: "system", content: SYSTEM_PROMPT }

  let messages = [systemPrompt, ...userMessages]
  // First call allowing tool use with streaming
  let response = await chatCompletion(messages, true, { tools: getAllTools(), tool_choice: "auto" })
  let { content, toolCalls } = await parseStreamingResponse(response, messageId)

  // Loop over tool calls if present
  // OpenAI responses may put tool calls under choices[0].message.tool_calls
  // Repeat until there are no further tool calls
  const executedCalls = new Set<string>()
  while (true) {
    if (!toolCalls || toolCalls.length === 0) {
      // Final assistant turn — stream it for better UX when possible
      if (messageId) {
        try {
          // Add planning completion step
          chrome.runtime.sendMessage({
            request: "ai-chat-planning-step",
            messageId,
            step: {
              type: "complete",
              content: "Task completed successfully",
              timestamp: Date.now(),
              status: "completed"
            }
          })
          
          // Final streaming response
          const finalResponse = await chatCompletion(messages, true)
          await parseStreamingResponse(finalResponse, messageId)
        } catch (e) {
          // Fallback: send final once if streaming fails
          try {
            chrome.runtime.sendMessage({ request: 'ai-chat-tools-final', messageId, content })
          } catch {}
        }
      }
      return content
    }

    // If there is assistant content alongside tool calls, surface it as think
    if (content && messageId) {
      try {
        chrome.runtime.sendMessage({
          request: "ai-chat-tools-step",
          messageId,
          step: { type: "think", content: content }
        })
      } catch {}
    }

    // Check if this is a planning phase (before tool calls)
    if (content && content.includes("📋 TASK ANALYSIS") && messageId) {
      try {
        // Extract planning information from the thought
        const planningStep: PlanningStep = {
          type: "analysis",
          content: content,
          timestamp: Date.now(),
          status: "completed"
        }
        chrome.runtime.sendMessage({
          request: "ai-chat-planning-step",
          messageId,
          step: planningStep
        })
      } catch {}
    }

    // Add the assistant message with tool calls before processing tool results
    messages.push({
      role: "assistant",
      content: content || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }))
    })

    // Execute each tool and append tool results
    let executedMutating = false
    for (const tc of toolCalls) {
      const name = tc?.function?.name
      let args
      try {
        args = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch (e) {
        args = {}
      }
      try {
        // deduplicate identical tool calls in the same conversation turn chain
        const callKey = `${name}:${JSON.stringify(args)}`
        if (executedCalls.has(callKey)) {
          // Notify duplicate and skip executing to avoid loops
          if (messageId) {
            try {
              chrome.runtime.sendMessage({
                request: "ai-chat-tools-step",
                messageId,
                step: { type: "tool_result", name, result: "(duplicate call skipped)" }
              })
            } catch {}
          }
          // Still append a tool role so the model sees the effect
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name,
            content: JSON.stringify({ skipped: true, reason: "duplicate_call" })
          })
          continue
        }
        executedCalls.add(callKey)
        if (["switch_to_tab", "organize_tabs", "ungroup_tabs"].includes(name)) {
          executedMutating = true
        }
        // announce tool call
        if (messageId) {
          try {
            chrome.runtime.sendMessage({
              request: "ai-chat-tools-step",
              messageId,
              step: { type: "call_tool", name, args }
            })
          } catch {}
        }
        
        // Add ReAct planning steps
        if (messageId) {
          try {
            // Add "think" step
            chrome.runtime.sendMessage({
              request: "ai-chat-planning-step",
              messageId,
              step: {
                type: "think",
                content: `Analyzing the need to call tool: ${name}`,
                timestamp: Date.now(),
                status: "completed"
              }
            })
            
            // Add "act" step
            chrome.runtime.sendMessage({
              request: "ai-chat-planning-step",
              messageId,
              step: {
                type: "act",
                content: `Executing tool: ${name}`,
                timestamp: Date.now(),
                status: "in-progress",
                toolCall: { name, args }
              }
            })
          } catch {}
        }
        const toolResult = await executeToolCall(name, args)
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name,
          content: JSON.stringify(toolResult)
        })
        // stream tool result (truncated)
        if (messageId) {
          const resultString = (() => {
            try {
              const s = JSON.stringify(toolResult)
              return s.length > 1200 ? s.slice(0, 1200) + "…" : s
            } catch {
              const s = String(toolResult)
              return s.length > 1200 ? s.slice(0, 1200) + "…" : s
            }
          })()
          try {
            chrome.runtime.sendMessage({
              request: "ai-chat-tools-step",
              messageId,
              step: { type: "tool_result", name, result: resultString }
            })
          } catch {}
        }
        
        // Add ReAct observation and reasoning steps
        if (messageId) {
          try {
            // Add "observe" step
            chrome.runtime.sendMessage({
              request: "ai-chat-planning-step",
              messageId,
              step: {
                type: "observe",
                content: `Observing result from tool: ${name}`,
                timestamp: Date.now(),
                status: "completed",
                toolCall: { 
                  name, 
                  args, 
                  result: (() => {
                    const resultStr = String(toolResult)
                    return resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr
                  })()
                }
              }
            })
            
            // Add "reason" step
            chrome.runtime.sendMessage({
              request: "ai-chat-planning-step",
              messageId,
              step: {
                type: "reason",
                content: `Evaluating result and planning next action`,
                timestamp: Date.now(),
                status: "completed"
              }
            })
            
            // Update the "act" step to completed
            chrome.runtime.sendMessage({
              request: "ai-chat-planning-step",
              messageId,
              step: {
                type: "act",
                content: `Executing tool: ${name}`,
                timestamp: Date.now(),
                status: "completed",
                toolCall: { name, args }
              }
            })
          } catch {}
        }
      } catch (err: any) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name,
          content: JSON.stringify({ error: err?.message || String(err) })
        })
        if (messageId) {
          try {
            chrome.runtime.sendMessage({
              request: "ai-chat-tools-step",
              messageId,
              step: { type: "tool_result", name, result: JSON.stringify({ error: err?.message || String(err) }) }
            })
          } catch {}
        }
      }
    }

    // Ask the model to produce final answer given tool outputs.
    // If we've executed any mutating action, force finalization (no more tools).
    const nextOptions = executedMutating
      ? {} // Don't include tool_choice or tools when tools are not needed
      : { tools: getAllTools(), tool_choice: "auto" as const }
    response = await chatCompletion(messages, true, nextOptions)
    const result = await parseStreamingResponse(response, messageId)
    content = result.content
    toolCalls = result.toolCalls
  }
}

// Classify and group a single tab by AI
async function classifyAndGroupSingleTab(tab) {
  try {
    // Check if AI grouping is available
    if (!(await isAIGroupingAvailable())) {
      console.log('AI grouping not available, skipping single tab grouping')
      return
    }
    
    // Get tab latest status
    let latestTab;
    try {
      latestTab = await chrome.tabs.get(tab.id);
    } catch (err) {
      console.warn(`Tab ${tab.id} may have been closed, skipping.`);
      return;
    }
    
    // Skip tabs without URL
    if (!latestTab.url) {
      console.warn(`Tab "${latestTab.title}" has no URL, skipping.`);
      return;
    }
    
    const win = await chrome.windows.get(latestTab.windowId);
    if (win.type !== "normal") {
      console.warn(`Tab "${latestTab.title}" is not in a normal window, skipping grouping.`);
      return;
    }
    
    // Get current window's active tab
    const activeTab = await chrome.tabs.query({
      active: true,
      windowId: latestTab.windowId,
    });

    // Get existing groups to use as categories
    const groups = await chrome.tabGroups.query({
      windowId: latestTab.windowId,
    });
    
    let category = "Other"; // Default category
    
    if (groups.length > 0) {
      // If there are existing groups, try to classify into one of them
      const existingCategories = groups.map(g => g.title).filter(Boolean);
      
      const context = ["You are a browser tab group classifier"];
      const content = `Classify this tab based on URL (${latestTab.url}) and title (${latestTab.title}) into one of these existing categories: ${existingCategories.join(", ")}. If none fit well, respond with "Other". Response with the category only, without any comments.`;

      try {
        const aiResponse = await chatCompletion(content, true);
        const result = await parseStreamingResponse(aiResponse);
        const suggestedCategory = result.content.trim();
        
        // Use the suggested category if it exists, otherwise use "Other"
        if (existingCategories.includes(suggestedCategory)) {
          category = suggestedCategory;
        }
      } catch (aiError) {
        console.warn("AI classification failed, using default category:", aiError);
      }
    }

    // Find existing group with the same name
    const existingGroup = groups.find((group) => group.title === category);

    if (existingGroup) {
      // Add to existing group
      chrome.tabs.group({
        tabIds: [latestTab.id],
        groupId: existingGroup.id,
      }, (groupId) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to add to existing group:", chrome.runtime.lastError);
        } else {
          console.log(`Tab "${latestTab.title}" added to existing group "${category}"`);
        }
      });
    } else if (category !== "Other") {
      // Create new group only if it's not the default "Other" category
      chrome.tabs.group({
        createProperties: { windowId: latestTab.windowId },
        tabIds: [latestTab.id],
      }, (groupId) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to create new group:", chrome.runtime.lastError);
        } else {
          console.log("Group created successfully! Group ID:", groupId);
          
          // Set group title and color
          chrome.tabGroups.update(groupId, {
            title: category,
            color: "blue"
          }, () => {
            if (chrome.runtime.lastError) {
              console.error("Failed to update group title:", chrome.runtime.lastError);
            } else {
              console.log(`Group "${category}" title and color set successfully`);
            }
          });

          // Set collapsed state based on whether it's the active tab
          const collapsed = latestTab.id !== activeTab[0]?.id;
          chrome.tabGroups.update(groupId, {
            collapsed,
          }, () => {
            if (chrome.runtime.lastError) {
              console.error("Failed to set group collapse state:", chrome.runtime.lastError);
            } else {
              console.log(`Group "${category}" collapsed state set to ${collapsed}`);
            }
          });
        }
      });
    }

    console.log(`Tab "${latestTab.title}" processed for grouping into "${category}"`);
  } catch (error) {
    console.error(`Error processing tab ${tab.id}:`, error);
  }
}

async function groupTabsByAI() {
  const storage = new Storage();
  
  // Get tabs from current window
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Filter tabs that have a URL
  const validTabs = tabs.filter(tab => tab.url);
  
  if (validTabs.length === 0) {
    console.log("No valid tabs to group");
    // Notify popup that operation is complete
    chrome.runtime.sendMessage({ 
      request: "organize-tabs-complete", 
      success: true, 
      message: "No tabs found to organize" 
    }).catch(err => {
      console.log('Failed to send organize completion message:', err)
    });
    return;
  }
  
  try {
    // Get current window's active tab
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    
    // Prepare tab data for AI classification
    const tabData = validTabs.map(tab => {
      let hostname = "";
      try {
        hostname = tab.url ? new URL(tab.url).hostname : "";
      } catch (e) {
        // For special URLs like chrome:// or chrome-extension://, use the protocol as hostname
        hostname = tab.url ? tab.url.split("://")[0] + "://" : "";
      }
      return {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        hostname: hostname
      };
    });
    
    // Ask AI to classify tabs into groups
    const context = ["You are a browser tab group classifier"];
    const content = `Classify these browser tabs into 3-7 meaningful groups based on their content, purpose, or topic:
${JSON.stringify(tabData, null, 2)}

You must return a JSON object with a "groups" key containing an array where each item has:
1. "groupName": A short, descriptive name (1-3 words)
2. "tabIds": Array of tab IDs that belong to this group

Example response format:
{
  "groups": [
    {
      "groupName": "News",
      "tabIds": [123, 124, 125]
    },
    {
      "groupName": "Shopping",
      "tabIds": [126, 127]
    }
  ]
}`;
    
    // Use response_format to ensure proper JSON output
    const aiResponse = await chatCompletion(content, true, { response_format: { type: "json_object" } });
    const result = await parseStreamingResponse(aiResponse);
    const responseData = JSON.parse(result.content.trim());
    const groupingResult = responseData.groups || [];
    
    // Process each group from AI response
    for (const group of groupingResult) {
      const { groupName, tabIds } = group;
      
      // Filter out any invalid tab IDs
      const validTabIds = tabIds.filter((id: number) => 
        validTabs.some(tab => tab.id === id)
      );
      
      if (validTabIds.length === 0) continue;
      
      // Get all existing groups in the current window
      const groups = await chrome.tabGroups.query({
        windowId: validTabs[0].windowId,
      });
      
      // Find existing group with the same name
      const existingGroup = groups.find(g => g.title === groupName);
      
      if (existingGroup) {
        // Add tabs to existing group
        chrome.tabs.group({
          tabIds: validTabIds,
          groupId: existingGroup.id,
        }, (groupId) => {
          if (chrome.runtime.lastError) {
            console.error(`Failed to add to existing group "${groupName}":`, chrome.runtime.lastError);
          } else {
            console.log(`Tabs added to existing group "${groupName}"`);
            
            // Set collapsed state based on whether it contains the active tab
            const containsActiveTab = validTabIds.includes(activeTab?.id || -1);
            chrome.tabGroups.update(groupId, {
              collapsed: !containsActiveTab,
            }, () => {
              if (chrome.runtime.lastError) {
                console.error(`Failed to set group "${groupName}" collapse state:`, chrome.runtime.lastError);
              } else {
                console.log(`Group "${groupName}" collapsed state set to ${!containsActiveTab}`);
              }
            });
          }
        });
      } else {
        // Create new group
        console.log({
          tabIds: validTabIds,
        })
        chrome.tabs.group({
          createProperties: { windowId: validTabs[0].windowId },
          tabIds: validTabIds,
        }, (groupId) => {
          if (chrome.runtime.lastError) {
            console.error(`Failed to create new group "${groupName}":`, chrome.runtime.lastError);
          } else {
            console.log(`Group created successfully! Group ID: ${groupId}, Group name: ${groupName}`);
            
            // Set group title and color
            chrome.tabGroups.update(groupId, {
              title: groupName,
              color: "green"
            }, () => {
              if (chrome.runtime.lastError) {
                console.error(`Failed to update group "${groupName}" title:`, chrome.runtime.lastError);
              } else {
                console.log(`Group "${groupName}" title and color set successfully`);
              }
            });
            
            // Set collapsed state based on whether it contains the active tab
            const containsActiveTab = validTabIds.includes(activeTab?.id || -1);
            chrome.tabGroups.update(groupId, {
              collapsed: !containsActiveTab,
            }, () => {
              if (chrome.runtime.lastError) {
                console.error(`Failed to set group "${groupName}" collapse state:`, chrome.runtime.lastError);
              } else {
                console.log(`Group "${groupName}" collapsed state set to ${!containsActiveTab}`);
              }
            });
          }
        });
      }
      
      console.log(`Processing group "${groupName}" with ${validTabIds.length} tabs`);
    }
    
    // Notify popup that operation completed successfully
    chrome.runtime.sendMessage({ 
      request: "organize-tabs-complete", 
      success: true, 
      message: `Successfully organized ${validTabs.length} tabs into ${groupingResult.length} groups` 
    }).catch(err => {
      console.log('Failed to send organize completion message:', err)
    });
    
  } catch (error) {
    console.error("Error in AI tab grouping:", error);
    
    // Notify popup that operation failed
    chrome.runtime.sendMessage({ 
      request: "organize-tabs-complete", 
      success: false, 
      message: `Error organizing tabs: ${error.message}` 
    }).catch(err => {
      console.log('Failed to send organize error message:', err)
    });
  }
  
  console.log("All tabs have been processed and grouped by content.");
}

// Global variable to store selected text temporarily
let selectedTextForSidepanel = "";

// background message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.request) {
    case "get-actions":
      console.log("Background: Received get-actions request")
      console.log("Background: Current actions:", actions)
      resetOmni().then(() => {
        console.log("Background: Actions after reset:", actions)
        sendResponse({actions})
      })
      console.log("Background: get-actions response sent")
      return true
    case "switch-tab":
      switchTab(message.tab)
      break
    case "go-back":
      goBack(message.tab)
      break
    case "go-forward":
      goForward(message.tab)
      break
    case "duplicate-tab":
      duplicateTab(message.tab)
      break
    case "create-bookmark":
      createBookmark(message.tab)
      break
    case "mute":
      muteTab(true)
      break
    case "unmute":
      muteTab(false)
      break
    case "reload":
      reloadTab()
      break
    case "pin":
      pinTab(true)
      break
    case "unpin":
      pinTab(false)
      break
    case "remove-all":
      clearAllData()
      break
    case "remove-history":
      clearBrowsingData()
      break
    case "remove-cookies":
      clearCookies()
      break
    case "remove-cache":
      clearCache()
      break
    case "remove-local-storage":
      clearLocalStorage()
      break
    case "remove-passwords":
      clearPasswords()
      break
    case "history":
    case "downloads":
    case "extensions":
    case "settings":
    case "extensions/shortcuts":
      openChromeUrl(message.request)
      break
    case "manage-data":
      openChromeUrl("settings/clearBrowserData")
      break
    case "incognito":
      openIncognito()
      break
    case "close-window":
      if (sender.tab?.windowId) closeWindow(sender.tab.windowId)
      break
    case "close-tab":
      closeCurrentTab()
      break
    // MCP-style: get all tabs (lightweight info only)
    case "mcp-get-all-tabs":
      (async () => {
        console.log("Background: Received mcp-get-all-tabs request")
        console.log("Background: Current tabs:")
        try {
          const tabs = await chrome.tabs.query({})
          const simplified = tabs
            .filter((t) => typeof t.id === "number")
            .map((t) => ({
              id: t.id,
              index: t.index,
              windowId: t.windowId,
              title: t.title,
              url: t.url
            }))
          sendResponse({ success: true, tabs: simplified })
        } catch (err: any) {
          sendResponse({ success: false, error: err?.message || String(err) })
        }
      })()
      return true
    // MCP-style: switch to a tab by id
    case "mcp-switch-to-tab":
      console.log("Background: Received mcp-switch-to-tab request")
      console.log("Background: Tab ID:", message.tabId)
      ;(async () => {
        try {
          const tabId: number | undefined = message.tabId
          if (typeof tabId !== "number") {
            sendResponse({ success: false, error: "Invalid tabId" })
            return
          }
          const tab = await chrome.tabs.get(tabId)
          if (!tab || typeof tab.index !== "number" || typeof tab.windowId !== "number") {
            sendResponse({ success: false, error: "Tab not found" })
            return
          }
          await chrome.tabs.highlight({ tabs: tab.index, windowId: tab.windowId })
          await chrome.windows.update(tab.windowId, { focused: true })
          sendResponse({ success: true })
        } catch (err: any) {
          sendResponse({ success: false, error: err?.message || String(err) })
        }
      })()
      return true
    case "search-history":
      chrome.history.search({text:message.query, maxResults:0, startTime:0}).then((data) => {
        data.forEach((action: any) => {
          action.type = "history"
          action.emoji = true
          action.emojiChar = "🏛"
          action.action = "history"
          action.keyCheck = false
        })
        sendResponse({history:data})
      })
      return true
    case "search-bookmarks":
      chrome.bookmarks.search({query:message.query}).then((data) => {
        data = data.filter((x: any) => x.url)
        data.forEach((action: any) => {
          action.type = "bookmark"
          action.emoji = true
          action.emojiChar = "⭐️"
          action.action = "bookmark"
          action.keyCheck = false
        })
        sendResponse({bookmarks:data})
      })
      return true
    case "get-bookmarks":
      console.log("Background: Handling get-bookmarks request")
      chrome.bookmarks.getRecent(100).then((data) => {
        console.log("Background: Raw bookmarks data:", data)
        data = data.filter((x: any) => x.url)
        console.log("Background: Filtered bookmarks (with URLs only):", data)
        data.forEach((action: any) => {
          action.type = "bookmark"
          action.emoji = true
          action.emojiChar = "⭐️"
          action.action = "bookmark"
          action.keyCheck = false
          action.desc = action.url
        })
        console.log("Background: Processed bookmarks data:", data)
        sendResponse({bookmarks:data})
      }).catch(error => {
        console.error("Background: Error getting bookmarks:", error)
        sendResponse({bookmarks: [], error: error.message})
      })
      return true
    case "get-history":
      console.log("Background: Handling get-history request")
      chrome.history.search({text:"", maxResults:1000, startTime:0}).then((data) => {
        console.log("Background: Raw history data:", data)
        data.forEach((action: any) => {
          action.type = "history"
          action.emoji = true
          action.emojiChar = "🏛"
          action.action = "history"
          action.keyCheck = false
          action.desc = action.url
        })
        console.log("Background: Processed history data:", data)
        sendResponse({history:data})
      }).catch(error => {
        console.error("Background: Error getting history:", error)
        sendResponse({history: [], error: error.message})
      })
      return true
    case "remove":
      if (message.type == "bookmark") {
        removeBookmark(message.action)
      } else {
        closeTab(message.action)
      }
      break
    case "search":
      // chrome.search.query({text:message.query}) // Need search API permission
      break
    case "restore-new-tab":
      restoreNewTab()
      break
    case "close-omni":
      getCurrentTab().then((response) => {
        chrome.tabs.sendMessage(response.id!, {request: "close-omni"})
      })
      break
    case "open-sidepanel":
      // Open the sidepanel for all pages, including newtab
      chrome.sidePanel.open({ tabId: sender.tab?.id })
      
      // If there's selected text, store it temporarily
      if (message.selectedText) {
        selectedTextForSidepanel = message.selectedText
      }
      break
    case "get-selected-text":
      // Return and clear the temporary selected text
      const text = selectedTextForSidepanel
      selectedTextForSidepanel = ""
      sendResponse({ selectedText: text })
      return true
        case "ai-chat":
      sendResponse({ success: true, message: "AI chat started" })
      
      try {
        const { prompt, context, messageId } = message
        
        // Build conversation messages with context
        let conversationMessages = []
        
        // Add conversation history if provided
        if (context && Array.isArray(context) && context.length > 0) {
          conversationMessages = [...context]
        }
        
        // Add the current prompt as the latest user message
        conversationMessages.push({ role: "user", content: prompt })
        
        chatCompletion(conversationMessages, true) // Pass full conversation and enable streaming
          .then(async (response) => {
            if (!response.body) {
              throw new Error('No response body for streaming')
            }
            
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''
                
                for (const line of lines) {
                  if (line.trim() === '') continue
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') {
                      // Send completion message
                      chrome.runtime.sendMessage({
                        request: "ai-chat-complete",
                        messageId: messageId
                      }).catch(err => {
                        console.log('Failed to send completion message:', err)
                      })
                      return
                    }
                    
                    try {
                      const parsed = JSON.parse(data)
                      const delta = parsed.choices?.[0]?.delta
                      if (delta?.content) {
                        // Send streaming chunk
                        console.log('Sending streaming chunk:', delta.content)
                        
                        chrome.runtime.sendMessage({
                          request: "ai-chat-stream",
                          chunk: delta.content,
                          messageId: messageId
                        }).catch(err => {
                          console.log('Failed to send streaming message:', err)
                        })
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock()
            }
          })
          .catch((error) => {
            chrome.runtime.sendMessage({
              request: "ai-chat-error",
              error: error.message,
              messageId: messageId
            }).catch(err => {
              console.log('Failed to send error message:', err)
            })
          })
      } catch (error) {
        chrome.runtime.sendMessage({
          request: "ai-chat-error",
          error: error.message,
          messageId: message.messageId
        }).catch(err => {
          console.log('Failed to send error message:', err)
        })
      }
      return true // Keep the message channel open for async response
    case "ai-chat-tools":
      ;(async () => {
        try {
          const { prompt, context, messageId } = message
          let conversationMessages = []
          if (context && Array.isArray(context) && context.length > 0) {
            conversationMessages = [...context]
          }
          conversationMessages.push({ role: "user", content: prompt })
          const finalText = await runChatWithTools(conversationMessages, messageId)
          sendResponse({ success: true, content: finalText })
        } catch (error: any) {
          sendResponse({ success: false, error: error?.message || String(error) })
        }
      })()
      return true
    case "ai-chat-with-tools":
      ;(async () => {
        try {
          const { prompt, context, tools, messageId } = message
          
          // Build conversation messages with context
          let conversationMessages = []
          if (context && Array.isArray(context) && context.length > 0) {
            conversationMessages = [...context]
          }
          
          conversationMessages.push({ role: "user", content: prompt })
          
          // Use the tools-enabled chat completion
          const finalText = await runChatWithTools(conversationMessages, messageId)
          sendResponse({ success: true, content: finalText })
        } catch (error: any) {
          sendResponse({ success: false, error: error?.message || String(error) })
        }
      })()
      return true
    case "organize-tabs":
      groupTabsByAI()
      break
    case "ungroup-tabs":
      ungroupAllTabs()
      break

    case "get-selected-text":
      console.log("Retrieving selected text:", selectedTextForSidepanel);
      sendResponse({selectedText: selectedTextForSidepanel});
      // Clear the text after it's been retrieved
      selectedTextForSidepanel = "";
      return true
    case "get-tab-change-count":
      sendResponse({ count: 0, threshold: 0 })
      return true
  }
})

// Initialize actions
resetOmni()