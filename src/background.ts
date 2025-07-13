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
    {title:"New tab", desc:"Open a new tab", type:"action", action:"new-tab", emoji:true, emojiChar:"✨", keycheck:true, keys:['⌘','T']},
    {
      title: "AI Chat",
      desc: "Start an AI conversation",
      type: "action",
      action: "ai-chat",
      emoji: true,
      emojiChar: "🤖",
      keycheck: false,
    },
    {
      title: "Organize Tabs",
      desc: "Group tabs using AI",
      type: "action",
      action: "organize-tabs",
      emoji: true,
      emojiChar: "📑",
      keycheck: false,
    },
    {title:"Bookmark", desc:"Create a bookmark", type:"action", action:"create-bookmark", emoji:true, emojiChar:"📕", keycheck:true, keys:['⌘','D']},
    pinaction,
    {title:"Fullscreen", desc:"Make the page fullscreen", type:"action", action:"fullscreen", emoji:true, emojiChar:"🖥", keycheck:true, keys:['⌘', 'Ctrl', 'F']},
    muteaction,
    {title:"Reload", desc:"Reload the page", type:"action", action:"reload", emoji:true, emojiChar:"♻️", keycheck:true, keys:['⌘','⇧', 'R']},
    {title:"Help", desc:"Get help with Omni on GitHub", type:"action", action:"url", url:"https://github.com/alyssaxuu/omni", emoji:true, emojiChar:"🤔", keycheck:false},
    {title:"Compose email", desc:"Compose a new email", type:"action", action:"email", emoji:true, emojiChar:"✉️", keycheck:true, keys:['⌥','⇧', 'C']},
    {title:"Print page", desc:"Print the current page", type:"action", action:"print", emoji:true, emojiChar:"🖨️", keycheck:true, keys:['⌘', 'P']},
    {title:"New Notion page", desc:"Create a new Notion page", type:"action", action:"url", url:"https://notion.new", emoji:false, favIconUrl:logoNotion, keycheck:false},
    {title:"New Sheets spreadsheet", desc:"Create a new Google Sheets spreadsheet", type:"action", action:"url", url:"https://sheets.new", emoji:false, favIconUrl:logoSheets, keycheck:false},
    {title:"New Docs document", desc:"Create a new Google Docs document", type:"action", action:"url", emoji:false, url:"https://docs.new", favIconUrl:logoDocs, keycheck:false},
    {title:"New Slides presentation", desc:"Create a new Google Slides presentation", type:"action", action:"url", url:"https://slides.new", emoji:false, favIconUrl:logoSlides, keycheck:false},
    {title:"New form", desc:"Create a new Google Forms form", type:"action", action:"url", url:"https://forms.new", emoji:false, favIconUrl:logoForms, keycheck:false},
    {title:"New Medium story", desc:"Create a new Medium story", type:"action", action:"url", url:"https://story.new", emoji:false, favIconUrl:logoMedium, keycheck:false},
    {title:"New GitHub repository", desc:"Create a new GitHub repository", type:"action", action:"url", url:"https://github.new", emoji:false, favIconUrl:logoGithub, keycheck:false},
    {title:"New GitHub gist", desc:"Create a new GitHub gist", type:"action", action:"url", url:"https://gist.new", emoji:false, favIconUrl:logoGithub, keycheck:false},
    {title:"New CodePen pen", desc:"Create a new CodePen pen", type:"action", action:"url", url:"https://pen.new", emoji:false, favIconUrl:logoCodepen, keycheck:false},
    {title:"New Excel spreadsheet", desc:"Create a new Excel spreadsheet", type:"action", action:"url", url:"https://excel.new", emoji:false, favIconUrl:logoExcel, keycheck:false},
    {title:"New PowerPoint presentation", desc:"Create a new PowerPoint presentation", type:"action", url:"https://powerpoint.new", action:"url", emoji:false, favIconUrl:logoPowerpoint, keycheck:false},
    {title:"New Word document", desc:"Create a new Word document", type:"action", action:"url", url:"https://word.new", emoji:false, favIconUrl:logoWord, keycheck:false},
    {title:"Create a whiteboard", desc:"Create a collaborative whiteboard", type:"action", action:"url", url:"https://whiteboard.new", emoji:true, emojiChar:"🧑‍🏫", keycheck:false},
    {title:"Record a video", desc:"Record and edit a video", type:"action", action:"url", url:"https://recording.new", emoji:true, emojiChar:"📹", keycheck:false},
    {title:"Create a Figma file", desc:"Create a new Figma file", type:"action", action:"url", url:"https://figma.new", emoji:false, favIconUrl:logoFigma, keycheck:false},
    {title:"Create a FigJam file", desc:"Create a new FigJam file", type:"action", action:"url", url:"https://figjam.new", emoji:true, emojiChar:"🖌", keycheck:false},
    {title:"Hunt a product", desc:"Submit a product to Product Hunt", type:"action", action:"url", url:"https://www.producthunt.com/posts/new", emoji:false, favIconUrl:logoProducthunt, keycheck:false},
    {title:"Make a tweet", desc:"Make a tweet on Twitter", type:"action", action:"url", url:"https://twitter.com/intent/tweet", emoji:false, favIconUrl:logoTwitter, keycheck:false},
    {title:"Create a playlist", desc:"Create a Spotify playlist", type:"action", action:"url", url:"https://playlist.new", emoji:false, favIconUrl:logoSpotify, keycheck:false},
    {title:"Create a Canva design", desc:"Create a new design with Canva", type:"action", action:"url", url:"https://design.new", emoji:false, favIconUrl:logoCanva, keycheck:false},
    {title:"Create a new podcast episode", desc:"Create a new podcast episode with Anchor", type:"action", action:"url", url:"https://episode.new", emoji:false, favIconUrl:logoAnchor, keycheck:false},
    {title:"Edit an image", desc:"Edit an image with Adobe Photoshop", type:"action", action:"url", url:"https://photo.new", emoji:false, favIconUrl:logoPhotoshop, keycheck:false},
    {title:"Convert to PDF", desc:"Convert a file to PDF", type:"action", action:"url", url:"https://pdf.new", emoji:true, emojiChar:"📄", keycheck:false},
    {title:"Scan a QR code", desc:"Scan a QR code with your camera", type:"action", action:"url", url:"https://scan.new", emoji:false, favIconUrl:logoQr, keycheck:false},
    {title:"Add a task to Asana", desc:"Create a new task in Asana", type:"action", action:"url", url:"https://task.new", emoji:false, favIconUrl:logoAsana, keycheck:false},
    {title:"Add an issue to Linear", desc:"Create a new issue in Linear", type:"action", action:"url", url:"https://linear.new", emoji:false, favIconUrl:logoLinear, keycheck:false},
    {title:"Add a task to WIP", desc:"Create a new task in WIP", type:"action", action:"url", url:"https://todo.new", emoji:false, favIconUrl:logoWip, keycheck:false},
    {title:"Create an event", desc:"Add an event to Google Calendar", type:"action", action:"url", url:"https://cal.new", emoji:false, favIconUrl:logoCalendar, keycheck:false},
    {title:"Add a note", desc:"Add a note to Google Keep", type:"action", action:"url", emoji:false, url:"https://note.new", favIconUrl:logoKeep, keycheck:false},
    {title:"New meeting", desc:"Start a Google Meet meeting", type:"action", action:"url", emoji:false, url:"https://meet.new", favIconUrl:logoMeet, keycheck:false},
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
    chrome.tabs.create({ url: "https://alyssax.com/omni/" })
  }
})

// Extension button click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id)
    chrome.tabs.sendMessage(tab.id, {request: "open-aipex"})
})

// Shortcut listener
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-aipex") {
    getCurrentTab().then((response) => {
      if (!response.url.includes("chrome://") && !response.url.includes("chrome.google.com")) {
        console.log("open-aipex")
        chrome.tabs.sendMessage(response.id!, {request: "open-aipex"})
      } else {
        chrome.tabs.create({ url: "./newtab.html" }).then((tab) => {
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
//   await getBookmarks()
  const search = [
    {title:"Search", desc:"Search for a query", type:"action", action:"search", emoji:true, emojiChar:"🔍", keycheck:false},
    {title:"Search", desc:"Go to website", type:"action", action:"goto", emoji:true, emojiChar:"🔍", keycheck:false}
  ]
  actions = search.concat(actions)
}

// Listen for tab/bookmark changes, reset actions
chrome.tabs.onUpdated.addListener(() => { resetOmni() })
chrome.tabs.onCreated.addListener(() => { resetOmni() })
chrome.tabs.onRemoved.addListener(() => { resetOmni() })

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

// OpenAI chat completion helper
async function chatCompletion(prompt, context = [], stream = false) {
  const storage = new Storage()
  const aiHost = (await storage.get("aiHost")) || "https://api.openai.com/v1/chat/completions"
  const aiToken = await storage.get("aiToken")
  const aiModel = (await storage.get("aiModel")) || "gpt-3.5-turbo"
  if (!aiToken) throw new Error("No OpenAI API token set")
  const messages = [
    ...context.map((c) => ({ role: "system", content: c })),
    { role: "user", content: prompt }
  ]
  const res = await fetch(aiHost, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiToken}`
    },
    body: JSON.stringify({
      model: aiModel,
      messages,
      stream
    })
  })
  if (!res.ok) throw new Error("OpenAI API error: " + (await res.text()))
  return await res.json()
}

// Organize tabs by AI
async function classifyAndGroupTab(tab, tabGroupCategories) {
  try {
    // Get tab latest status
    let latestTab;
    try {
      latestTab = await chrome.tabs.get(tab.id);
    } catch (err) {
      console.warn(`Tab ${tab.id} may have been closed, skipping.`);
      return;
    }
    const win = await chrome.windows.get(latestTab.windowId);
    if (win.type !== "normal" || latestTab.pinned) {
      console.warn(`Tab "${latestTab.title}" is not in a normal window or is pinned, skipping grouping.`);
      return;
    }
    // Get current window's active tab (corrected: specify windowId)
    const activeTab = await chrome.tabs.query({
      active: true,
      windowId: latestTab.windowId,
    });

    const context = ["You are a browser tab group classificator"];
    const content = `Classify the tab group based on the provided URL (${latestTab.url}) and title (${latestTab.title}) into one of the categories: ${tabGroupCategories.join(", ")}. Response with the category only, without any comments.`;

    const aiResponse = await chatCompletion(content, context, false);
    let category = aiResponse.choices[0].message.content.trim();
    // Correct: If AI returns a category not in predefined categories, assign to Other
    if (!tabGroupCategories.includes(category)) {
      category = "Other";
    }

    try {
      // Get all groups in the current window
      const groups = await chrome.tabGroups.query({
        windowId: latestTab.windowId,
      });

      console.log(groups)

      // Find existing group with the same name
      const existingGroup = groups.find((group) => group.title === category);

      console.log(existingGroup)

      if (existingGroup) {
        // Use existing group
        await chrome.tabs.group({
          tabIds: [latestTab.id],
          groupId: existingGroup.id,
        });
      } else {
        // Create new group
        console.log({
          tabIds: [latestTab.id],
        })
        const groupId = await chrome.tabs.group({
          tabIds: [latestTab.id],
        });
        console.log("groupId", groupId)


        // Set group title
        await chrome.tabGroups.update(groupId, {
          title: category,
        });

        console.log(groupId)
        console.log(category)

        // Set collapsed state based on whether it's the active tab
        const collapsed = latestTab.id !== activeTab[0]?.id;
        await chrome.tabGroups.update(groupId, {
          collapsed,
        });
      }

      console.log(
        `Tab "${latestTab.title}" grouped into "${category}" in window ${latestTab.windowId}`
      );
    } catch (groupError) {
      console.error(
        `Error grouping tab ${latestTab.id} into ${category} in window ${latestTab.windowId}:`,
        groupError
      );
    }
  } catch (error) {
    console.error(
      `Error processing tab ${tab.id} in window ${tab.windowId}:`,
      error
    );
  }
}

async function groupTabsByAI() {
  const storage = new Storage();
  let tabGroupCategoriesRaw = (await storage.get("tabGroupCategories")) || "Social, Entertainment, Read Material, Education, Productivity, Utilities";
  let tabGroupCategories;
  if (typeof tabGroupCategoriesRaw === "string") {
    tabGroupCategories = tabGroupCategoriesRaw.split(",").map(c => c.trim());
  } else if (Array.isArray(tabGroupCategoriesRaw)) {
    tabGroupCategories = tabGroupCategoriesRaw;
  } else {
    tabGroupCategories = ["Other"];
  }

  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of tabs) {
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("chrome-devtools://") ||
      tab.pinned // Skip pinned tab
    ) continue;
    // Only process normal window (remove duplicate check, handled in classifyAndGroupTab)
    await classifyAndGroupTab(tab, tabGroupCategories);
  }
  console.log("All tabs have been processed.");
}

// background message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.request) {
    case "get-actions":
      console.log("get-actions")
      console.log(actions)
      resetOmni().then(() => sendResponse({actions}))
      console.log("get-actions-end")
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
    case "organize-tabs":
      groupTabsByAI()
      break
    case "open-sidepanel":
      if (sender.tab && sender.tab.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id })
      }
      break
  }
})

// Initialize actions
resetOmni()