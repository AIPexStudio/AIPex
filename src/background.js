let actions = [];
let newtaburl = "";
let aiHost = "";
let aiKey = "";
let aiModel = "";

chrome.storage.sync.get(["aiHost", "aiToken", "aiModel"], function (result) {
  aiHost = result.aiHost || "";
  aiKey = result.aiToken || "";
  aiModel = result.aiModel || "gpt-3.5-turbo";
});
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync") {
    if (changes.aiHost) {
      const { oldValue, newValue } = changes.aiHost;
      console.log("AI Host changed:", { oldValue, newValue });
    }

    if (changes.aiToken) {
      const { oldValue, newValue } = changes.aiToken;
      console.log("AI Token changed:", { oldValue, newValue });
    }

    if (changes.aiModel) {
      const { oldValue, newValue } = changes.aiModel;
      console.log("AI Model changed:", { oldValue, newValue });
    }

    chrome.storage.sync.get(["aiHost", "aiToken", "aiModel"], (result) => {
      aiHost = result.aiHost;
      aiKey = result.aiToken;
      aiModel = result.aiModel;
      console.log("Updated AI settings:", { aiHost, aiKey, aiModel });
    });
  }
});

const clearActions = () => {
  getCurrentTab().then((response) => {
    actions = [];
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    let muteaction = {
      title: "Mute tab",
      desc: "Mute the current tab",
      type: "action",
      action: "mute",
      emoji: true,
      emojiChar: "🔇",
      keycheck: true,
      keys: ["⌥", "⇧", "M"],
    };
    let pinaction = {
      title: "Pin tab",
      desc: "Pin the current tab",
      type: "action",
      action: "pin",
      emoji: true,
      emojiChar: "📌",
      keycheck: true,
      keys: ["⌥", "⇧", "P"],
    };
    if (response.mutedInfo.muted) {
      muteaction = {
        title: "Unmute tab",
        desc: "Unmute the current tab",
        type: "action",
        action: "unmute",
        emoji: true,
        emojiChar: "🔈",
        keycheck: true,
        keys: ["⌥", "⇧", "M"],
      };
    }
    if (response.pinned) {
      pinaction = {
        title: "Unpin tab",
        desc: "Unpin the current tab",
        type: "action",
        action: "unpin",
        emoji: true,
        emojiChar: "📌",
        keycheck: true,
        keys: ["⌥", "⇧", "P"],
      };
    }
    actions = [
      {
        title: "New tab",
        desc: "Open a new tab",
        type: "action",
        action: "new-tab",
        emoji: true,
        emojiChar: "✨",
        keycheck: true,
        keys: ["⌘", "T"],
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
      {
        title: "Remove Tab Groups",
        desc: "Remove the groups of tabs",
        type: "action",
        action: "remove-groups",
        emoji: true,
        emojiChar: "❌",
        keycheck: false,
      },
      {
        title: "Bookmark",
        desc: "Create a bookmark",
        type: "action",
        action: "create-bookmark",
        emoji: true,
        emojiChar: "📕",
        keycheck: true,
        keys: ["⌘", "D"],
      },
      {
        title: "AI Chat",
        desc: "Start an AI conversation",
        type: "action",
        action: "ai-chat",
        emoji: true,
        emojiChar: "🤖",
        keycheck: false,
      },
      pinaction,
      {
        title: "Fullscreen",
        desc: "Make the page fullscreen",
        type: "action",
        action: "fullscreen",
        emoji: true,
        emojiChar: "🖥",
        keycheck: true,
        keys: ["⌘", "Ctrl", "F"],
      },
      muteaction,
      {
        title: "Reload",
        desc: "Reload the page",
        type: "action",
        action: "reload",
        emoji: true,
        emojiChar: "♻️",
        keycheck: true,
        keys: ["⌘", "⇧", "R"],
      },
      {
        title: "Help",
        desc: "Get help with aipex on GitHub",
        type: "action",
        action: "url",
        url: "https://github.com/buttercannfly/AIpex",
        emoji: true,
        emojiChar: "🤔",
        keycheck: false,
      },
      {
        title: "Compose email",
        desc: "Compose a new email",
        type: "action",
        action: "email",
        emoji: true,
        emojiChar: "✉️",
        keycheck: true,
        keys: ["⌥", "⇧", "C"],
      },
      {
        title: "Print page",
        desc: "Print the current page",
        type: "action",
        action: "print",
        emoji: true,
        emojiChar: "🖨️",
        keycheck: true,
        keys: ["⌘", "P"],
      },
      {
        title: "New Notion page",
        desc: "Create a new Notion page",
        type: "action",
        action: "url",
        url: "https://notion.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-notion.png"),
        keycheck: false,
      },
      {
        title: "New Sheets spreadsheet",
        desc: "Create a new Google Sheets spreadsheet",
        type: "action",
        action: "url",
        url: "https://sheets.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-sheets.png"),
        keycheck: false,
      },
      {
        title: "New Docs document",
        desc: "Create a new Google Docs document",
        type: "action",
        action: "url",
        emoji: false,
        url: "https://docs.new",
        favIconUrl: chrome.runtime.getURL("assets/logo-docs.png"),
        keycheck: false,
      },
      {
        title: "New Slides presentation",
        desc: "Create a new Google Slides presentation",
        type: "action",
        action: "url",
        url: "https://slides.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-slides.png"),
        keycheck: false,
      },
      {
        title: "New form",
        desc: "Create a new Google Forms form",
        type: "action",
        action: "url",
        url: "https://forms.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-forms.png"),
        keycheck: false,
      },
      {
        title: "New Medium story",
        desc: "Create a new Medium story",
        type: "action",
        action: "url",
        url: "https://story.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-medium.png"),
        keycheck: false,
      },
      {
        title: "New GitHub repository",
        desc: "Create a new GitHub repository",
        type: "action",
        action: "url",
        url: "https://github.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-github.png"),
        keycheck: false,
      },
      {
        title: "New GitHub gist",
        desc: "Create a new GitHub gist",
        type: "action",
        action: "url",
        url: "https://gist.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-github.png"),
        keycheck: false,
      },
      {
        title: "New CodePen pen",
        desc: "Create a new CodePen pen",
        type: "action",
        action: "url",
        url: "https://pen.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-codepen.png"),
        keycheck: false,
      },
      {
        title: "New Excel spreadsheet",
        desc: "Create a new Excel spreadsheet",
        type: "action",
        action: "url",
        url: "https://excel.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-excel.png"),
        keycheck: false,
      },
      {
        title: "New PowerPoint presentation",
        desc: "Create a new PowerPoint presentation",
        type: "action",
        url: "https://powerpoint.new",
        action: "url",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-powerpoint.png"),
        keycheck: false,
      },
      {
        title: "New Word document",
        desc: "Create a new Word document",
        type: "action",
        action: "url",
        url: "https://word.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-word.png"),
        keycheck: false,
      },
      {
        title: "Create a whiteboard",
        desc: "Create a collaborative whiteboard",
        type: "action",
        action: "url",
        url: "https://whiteboard.new",
        emoji: true,
        emojiChar: "🧑‍🏫",
        keycheck: false,
      },
      {
        title: "Record a video",
        desc: "Record and edit a video",
        type: "action",
        action: "url",
        url: "https://recording.new",
        emoji: true,
        emojiChar: "📹",
        keycheck: false,
      },
      {
        title: "Create a Figma file",
        desc: "Create a new Figma file",
        type: "action",
        action: "url",
        url: "https://figma.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-figma.png"),
        keycheck: false,
      },
      {
        title: "Create a FigJam file",
        desc: "Create a new FigJam file",
        type: "action",
        action: "url",
        url: "https://figjam.new",
        emoji: true,
        emojiChar: "🖌",
        keycheck: false,
      },
      {
        title: "Hunt a product",
        desc: "Submit a product to Product Hunt",
        type: "action",
        action: "url",
        url: "https://www.producthunt.com/posts/new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-producthunt.png"),
        keycheck: false,
      },
      {
        title: "Make a tweet",
        desc: "Make a tweet on Twitter",
        type: "action",
        action: "url",
        url: "https://twitter.com/intent/tweet",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-twitter.png"),
        keycheck: false,
      },
      {
        title: "Create a playlist",
        desc: "Create a Spotify playlist",
        type: "action",
        action: "url",
        url: "https://playlist.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-spotify.png"),
        keycheck: false,
      },
      {
        title: "Create a Canva design",
        desc: "Create a new design with Canva",
        type: "action",
        action: "url",
        url: "https://design.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-canva.png"),
        keycheck: false,
      },
      {
        title: "Create a new podcast episode",
        desc: "Create a new podcast episode with Anchor",
        type: "action",
        action: "url",
        url: "https://episode.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-anchor.png"),
        keycheck: false,
      },
      {
        title: "Edit an image",
        desc: "Edit an image with Adobe Photoshop",
        type: "action",
        action: "url",
        url: "https://photo.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-photoshop.png"),
        keycheck: false,
      },
      {
        title: "Convert to PDF",
        desc: "Convert a file to PDF",
        type: "action",
        action: "url",
        url: "https://pdf.new",
        emoji: true,
        emojiChar: "📄",
        keycheck: false,
      },
      {
        title: "Scan a QR code",
        desc: "Scan a QR code with your camera",
        type: "action",
        action: "url",
        url: "https://scan.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-qr.png"),
        keycheck: false,
      },
      {
        title: "Add a task to Asana",
        desc: "Create a new task in Asana",
        type: "action",
        action: "url",
        url: "https://task.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-asana.png"),
        keycheck: false,
      },
      {
        title: "Add an issue to Linear",
        desc: "Create a new issue in Linear",
        type: "action",
        action: "url",
        url: "https://linear.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-linear.png"),
        keycheck: false,
      },
      {
        title: "Add a task to WIP",
        desc: "Create a new task in WIP",
        type: "action",
        action: "url",
        url: "https://todo.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-wip.png"),
        keycheck: false,
      },
      {
        title: "Create an event",
        desc: "Add an event to Google Calendar",
        type: "action",
        action: "url",
        url: "https://cal.new",
        emoji: false,
        favIconUrl: chrome.runtime.getURL("assets/logo-calendar.png"),
        keycheck: false,
      },
      {
        title: "Add a note",
        desc: "Add a note to Google Keep",
        type: "action",
        action: "url",
        emoji: false,
        url: "https://note.new",
        favIconUrl: chrome.runtime.getURL("assets/logo-keep.png"),
        keycheck: false,
      },
      {
        title: "New meeting",
        desc: "Start a Google Meet meeting",
        type: "action",
        action: "url",
        emoji: false,
        url: "https://meet.new",
        favIconUrl: chrome.runtime.getURL("assets/logo-meet.png"),
        keycheck: false,
      },
      {
        title: "Browsing history",
        desc: "Browse through your browsing history",
        type: "action",
        action: "history",
        emoji: true,
        emojiChar: "🗂",
        keycheck: true,
        keys: ["⌘", "Y"],
      },
      {
        title: "Incognito mode",
        desc: "Open an incognito window",
        type: "action",
        action: "incognito",
        emoji: true,
        emojiChar: "🕵️",
        keycheck: true,
        keys: ["⌘", "⇧", "N"],
      },
      {
        title: "Downloads",
        desc: "Browse through your downloads",
        type: "action",
        action: "downloads",
        emoji: true,
        emojiChar: "📦",
        keycheck: true,
        keys: ["⌘", "⇧", "J"],
      },
      {
        title: "Extensions",
        desc: "Manage your Chrome Extensions",
        type: "action",
        action: "extensions",
        emoji: true,
        emojiChar: "🧩",
        keycheck: false,
        keys: ["⌘", "D"],
      },
      {
        title: "Chrome settings",
        desc: "Open the Chrome settings",
        type: "action",
        action: "settings",
        emoji: true,
        emojiChar: "⚙️",
        keycheck: true,
        keys: ["⌘", ","],
      },
      {
        title: "Scroll to bottom",
        desc: "Scroll to the bottom of the page",
        type: "action",
        action: "scroll-bottom",
        emoji: true,
        emojiChar: "👇",
        keycheck: true,
        keys: ["⌘", "↓"],
      },
      {
        title: "Scroll to top",
        desc: "Scroll to the top of the page",
        type: "action",
        action: "scroll-top",
        emoji: true,
        emojiChar: "👆",
        keycheck: true,
        keys: ["⌘", "↑"],
      },
      {
        title: "Go back",
        desc: "Go back in history for the current tab",
        type: "action",
        action: "go-back",
        emoji: true,
        emojiChar: "👈",
        keycheck: true,
        keys: ["⌘", "←"],
      },
      {
        title: "Go forward",
        desc: "Go forward in history for the current tab",
        type: "action",
        action: "go-forward",
        emoji: true,
        emojiChar: "👉",
        keycheck: true,
        keys: ["⌘", "→"],
      },
      {
        title: "Duplicate tab",
        desc: "Make a copy of the current tab",
        type: "action",
        action: "duplicate-tab",
        emoji: true,
        emojiChar: "📋",
        keycheck: true,
        keys: ["⌥", "⇧", "D"],
      },
      {
        title: "Restore tab",
        desc: "Restore the last closed tab",
        type: "action",
        action: "restore-tab",
        emoji: true,
        emojiChar: "🗑",
        keycheck: true,
        keys: ["⌘", "⇧", "T"],
      },
      {
        title: "Close tab",
        desc: "Close the current tab",
        type: "action",
        action: "close-tab",
        emoji: true,
        emojiChar: "🗑",
        keycheck: true,
        keys: ["⌘", "W"],
      },
      {
        title: "Close window",
        desc: "Close the current window",
        type: "action",
        action: "close-window",
        emoji: true,
        emojiChar: "💥",
        keycheck: true,
        keys: ["⌘", "⇧", "W"],
      },
      {
        title: "Manage browsing data",
        desc: "Manage your browsing data",
        type: "action",
        action: "manage-data",
        emoji: true,
        emojiChar: "🔬",
        keycheck: true,
        keys: ["⌘", "⇧", "Delete"],
      },
      {
        title: "Clear all browsing data",
        desc: "Clear all of your browsing data",
        type: "action",
        action: "remove-all",
        emoji: true,
        emojiChar: "🧹",
        keycheck: false,
        keys: ["⌘", "D"],
      },
      {
        title: "Clear browsing history",
        desc: "Clear all of your browsing history",
        type: "action",
        action: "remove-history",
        emoji: true,
        emojiChar: "🗂",
        keycheck: false,
        keys: ["⌘", "D"],
      },
      {
        title: "Clear cookies",
        desc: "Clear all cookies",
        type: "action",
        action: "remove-cookies",
        emoji: true,
        emojiChar: "🍪",
        keycheck: false,
        keys: ["⌘", "D"],
      },
      {
        title: "Clear cache",
        desc: "Clear the cache",
        type: "action",
        action: "remove-cache",
        emoji: true,
        emojiChar: "🗄",
        keycheck: false,
        keys: ["⌘", "D"],
      },
      {
        title: "Clear local storage",
        desc: "Clear the local storage",
        type: "action",
        action: "remove-local-storage",
        emoji: true,
        emojiChar: "📦",
        keycheck: false,
        keys: ["⌘", "D"],
      },
    ];

    if (!isMac) {
      for (action of actions) {
        switch (action.action) {
          case "reload":
            action.keys = ["F5"];
            break;
          case "fullscreen":
            action.keys = ["F11"];
            break;
          case "downloads":
            action.keys = ["Ctrl", "J"];
            break;
          case "settings":
            action.keycheck = false;
            break;
          case "history":
            action.keys = ["Ctrl", "H"];
            break;
          case "go-back":
            action.keys = ["Alt", "←"];
            break;
          case "go-forward":
            action.keys = ["Alt", "→"];
            break;
          case "scroll-top":
            action.keys = ["Home"];
            break;
          case "scroll-bottom":
            action.keys = ["End"];
            break;
        }
        for (const key in action.keys) {
          if (action.keys[key] === "⌘") {
            action.keys[key] = "Ctrl";
          } else if (action.keys[key] === "⌥") {
            action.keys[key] = "Alt";
          }
        }
      }
    }
  });
};

// Open on install
chrome.runtime.onInstalled.addListener((object) => {
  chrome.contextMenus.create({
    id: "answerWithAI",
    title: "Answer with AI",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "translate",
    title: "Translate",
    contexts: ["selection"],
  });

  // Inject aipex on install
  const manifest = chrome.runtime.getManifest();

  const injectIntoTab = (tab) => {
    const scripts = manifest.content_scripts[0].js;
    const s = scripts.length;

    for (let i = 0; i < s; i++) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [scripts[i]],
      });
    }

    chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: [manifest.content_scripts[0].css[0]],
    });
  };

  // Get all windows
  chrome.windows.getAll(
    {
      populate: true,
    },
    (windows) => {
      let currentWindow;
      const w = windows.length;

      for (let i = 0; i < w; i++) {
        currentWindow = windows[i];

        let currentTab;
        const t = currentWindow.tabs.length;

        for (let j = 0; j < t; j++) {
          currentTab = currentWindow.tabs[j];
          if (
            !currentTab.url.includes("chrome://") &&
            !currentTab.url.includes("chrome-extension://") &&
            !currentTab.url.includes("chrome.google.com")
          ) {
            injectIntoTab(currentTab);
          }
        }
      }
    }
  );

  if (object.reason === "install") {
    chrome.tabs.create({ url: "https://aipex.quest" }); // todo need replace with my website
  }
});

// Check when the extension button is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { request: "open-aipex" });
});

// Listen for the open aipex shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-aipex") {
    getCurrentTab().then((response) => {
      //   if (
      //     !response.url.includes("chrome://") &&
      //     !response.url.includes("chrome.google.com")
      //   ) {
      chrome.tabs.sendMessage(response.id, { request: "open-aipex" });
      //   } else {
      //     chrome.tabs
      //       .create({
      //         url: "./newtab.html",
      //       })
      //       .then(() => {
      //         newtaburl = response.url;
      //         chrome.tabs.remove(response.id);
      //       });
      //   }
    });
  }
});

// Get the current tab
const getCurrentTab = async () => {
  const queryOptions = { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};

// Restore the new tab page (workaround to show aipex in new tab page)
function restoreNewTab() {
  getCurrentTab().then((response) => {
    chrome.tabs
      .create({
        url: newtaburl,
      })
      .then(() => {
        chrome.tabs.remove(response.id);
      });
  });
}

const resetaipex = () => {
  clearActions();
  getTabs();
  getBookmarks();
  // getHistory();
  var search = [
    {
      title: "Search",
      desc: "Search for a query",
      type: "action",
      action: "search",
      emoji: true,
      emojiChar: "🔍",
      keycheck: false,
    },
    {
      title: "Search",
      desc: "Go to website",
      type: "action",
      action: "goto",
      emoji: true,
      emojiChar: "🔍",
      keycheck: false,
    },
  ];
  actions = search.concat(actions);
};

// Check if tabs have changed and actions need to be fetched again
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => resetaipex());
chrome.tabs.onCreated.addListener((tab) => resetaipex());
chrome.tabs.onRemoved.addListener((tabId, changeInfo) => resetaipex());

// Get tabs to populate in the actions
const getTabs = () => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      tab.desc = "Chrome tab";
      tab.keycheck = false;
      tab.action = "switch-tab";
      tab.type = "tab";
    });
    actions = tabs.concat(actions);
  });
};

// Get bookmarks to populate in the actions
const getBookmarks = () => {
  const process_bookmark = (bookmarks) => {
    for (const bookmark of bookmarks) {
      if (bookmark.url) {
        actions.push({
          title: bookmark.title,
          desc: "Bookmark",
          id: bookmark.id,
          url: bookmark.url,
          type: "bookmark",
          action: "bookmark",
          emoji: true,
          emojiChar: "⭐️",
          keycheck: false,
        });
      }
      if (bookmark.children) {
        process_bookmark(bookmark.children);
      }
    }
  };

  chrome.bookmarks.getRecent(100, process_bookmark);
};

// Lots of different actions
const switchTab = (tab) => {
  chrome.tabs.highlight({
    tabs: tab.index,
    windowId: tab.windowId,
  });
  chrome.windows.update(tab.windowId, { focused: true });
};
const goBack = (tab) => {
  chrome.tabs.goBack({
    tabs: tab.index,
  });
};
const goForward = (tab) => {
  chrome.tabs.goForward({
    tabs: tab.index,
  });
};
const duplicateTab = (tab) => {
  getCurrentTab().then((response) => {
    chrome.tabs.duplicate(response.id);
  });
};
const restoreTab = (tab) => {
  // 使用sessions.getRecentlyClosed获取最近关闭的标签和窗口
  chrome.sessions.getRecentlyClosed({ maxResults: 1 }, (sessions) => {
    if (sessions.length) {
      const lastSession = sessions[0];
      // 如果是标签页
      if (lastSession.tab) {
        // 在新标签页打开URL
        chrome.tabs.create({
          url: lastSession.tab.url,
          active: true,
        });
      }
      // 如果是窗口
      else if (lastSession.window) {
        // 获取窗口中的第一个标签页URL
        const url = lastSession.window.tabs[0].url;
        chrome.tabs.create({
          url: url,
          active: true,
        });
      }
    }
  });
};
const createBookmark = (tab) => {
  getCurrentTab().then((response) => {
    chrome.bookmarks.create({
      title: response.title,
      url: response.url,
    });
  });
};
const muteTab = (mute) => {
  getCurrentTab().then((response) => {
    chrome.tabs.update(response.id, { muted: mute });
  });
};
const reloadTab = () => {
  chrome.tabs.reload();
};
const pinTab = (pin) => {
  getCurrentTab().then((response) => {
    chrome.tabs.update(response.id, { pinned: pin });
  });
};
const clearAllData = () => {
  chrome.browsingData.remove(
    {
      since: new Date().getTime(),
    },
    {
      appcache: true,
      cache: true,
      cacheStorage: true,
      cookies: true,
      downloads: true,
      fileSystems: true,
      formData: true,
      history: true,
      indexedDB: true,
      localStorage: true,
      passwords: true,
      serviceWorkers: true,
      webSQL: true,
    }
  );
};
const clearBrowsingData = () => {
  chrome.browsingData.removeHistory({ since: 0 });
};
const clearCookies = () => {
  chrome.browsingData.removeCookies({ since: 0 });
};
const clearCache = () => {
  chrome.browsingData.removeCache({ since: 0 });
};
const clearLocalStorage = () => {
  chrome.browsingData.removeLocalStorage({ since: 0 });
};
const clearPasswords = () => {
  chrome.browsingData.removePasswords({ since: 0 });
};
const openChromeUrl = (url) => {
  chrome.tabs.create({ url: "chrome://" + url + "/" });
};
const openIncognito = () => {
  chrome.windows.create({ incognito: true });
};
const closeWindow = (id) => {
  chrome.windows.remove(id);
};
const closeTab = (tab) => {
  chrome.tabs.remove(tab.id);
};
const closeCurrentTab = () => {
  getCurrentTab().then(closeTab);
};
const removeBookmark = (bookmark) => {
  chrome.bookmarks.remove(bookmark.id);
};

async function chatCompletion(content, context, stream) {
  const url = `${aiHost}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiKey}`,
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        { role: "system", content: context.join("\n") },
        { role: "user", content: content },
      ],
      stream: stream,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  if (stream) {
    return response.body;
  } else {
    const data = await response.json();
    return data;
  }
}

let existingGroups = new Map();

// 分类并分组单个标签页的函数

async function classifyAndGroupTab(tab) {
  try {
    // 获取当前窗口的活动标签页
    const activeTab = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const context = ["You are a browser tab group classificator"];
    const content = `Classify the tab group base on the provided URL (${tab.url}) and title (${tab.title}) into one of the categories: Social, Entertainment, Read Material, Education, Productivity, Utilities. Response with the category only, without any comments.`;

    const aiResponse = await chatCompletion(content, context, false);
    const category = aiResponse.choices[0].message.content.trim();

    try {
      // 获取当前标签页所在窗口的所有分组
      const groups = await chrome.tabGroups.query({
        windowId: tab.windowId,
      });

      // 在当前窗口查找已存在的同名分组
      const existingGroup = groups.find((group) => group.title === category);

      if (existingGroup) {
        // 使用已存在的分组
        await chrome.tabs.group({
          tabIds: tab.id,
          groupId: existingGroup.id,
        });
      } else {
        // 创建新分组 - 只需要提供 tabIds，Chrome 会自动在正确的窗口中创建分组
        const groupId = await chrome.tabs.group({
          tabIds: [tab.id],
        });

        // 设置分组标题
        await chrome.tabGroups.update(groupId, {
          title: category,
        });

        // 根据是否为活动标签页来设置折叠状态
        const collapsed = tab.id !== activeTab[0]?.id;
        await chrome.tabGroups.update(groupId, {
          collapsed,
        });
      }

      console.log(
        `Tab "${tab.title}" grouped into "${category}" in window ${tab.windowId}`
      );
    } catch (groupError) {
      console.error(
        `Error grouping tab ${tab.id} into ${category} in window ${tab.windowId}:`,
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

// 处理所有现有标签页的函数
async function groupTabsByHostname() {
  console.log(new Date().toISOString());
  try {
    // 重置现有分组 Map
    existingGroups = new Map();

    const tabs = await chrome.tabs.query({ currentWindow: true });

    // Process each tab individually
    for (const tab of tabs) {
      await classifyAndGroupTab(tab);
    }

    console.log("All tabs have been processed.");
  } catch (error) {
    console.error("Error in grouping process:", error);
  }
}

chrome.tabs.onCreated.addListener(async (tab) => {
  setTimeout(async () => {
    const updatedTab = await chrome.tabs.get(tab.id);
    if (updatedTab.url && updatedTab.url !== "chrome://newtab/") {
      await classifyAndGroupTab(updatedTab);
    }
  }, 1000);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url !== "chrome://newtab/"
  ) {
    const existingGroupId = await chrome.tabs.get(tabId).then((t) => t.groupId);
    if (existingGroupId === -1) {
      await classifyAndGroupTab(tab);
    }
  }
});

// Receive messages from any tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "callOpenAI") {
    chatCompletion(message.content, message.context, true)
      .then((stream) => {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let isFirstChunk = true;

        function readStream() {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                console.log("Stream complete");
                chrome.tabs.sendMessage(sender.tab.id, { action: "streamEnd" });
                return;
              }

              // decode and then add to buffer
              buffer += decoder.decode(value, { stream: true });

              let eventEnd = buffer.indexOf("\n\n");
              while (eventEnd !== -1) {
                const eventData = buffer.substring(0, eventEnd);
                buffer = buffer.substring(eventEnd + 2);

                // handle event
                processEvent(eventData);

                eventEnd = buffer.indexOf("\n\n");
              }

              // continue read stream
              readStream();
            })
            .catch((error) => {
              console.info("Stream error:", error);
              chrome.tabs.sendMessage(sender.tab.id, {
                action: "streamError",
                error: error.message,
              });
            });
        }

        function processEvent(eventData) {
          const lines = eventData.split("\n");
          let jsonData = "";

          for (const line of lines) {
            if (line.startsWith("data:")) {
              jsonData += line.substring(5).trim();
            }
          }

          if (jsonData) {
            try {
              const jsonChunk = JSON.parse(jsonData);

              const content = jsonChunk.choices[0].delta.content;
              if (content) {
                chrome.tabs.sendMessage(sender.tab.id, {
                  action: "streamChunk",
                  chunk: content,
                  isFirstChunk: isFirstChunk,
                });
                isFirstChunk = false;
              }
            } catch (error) {
              console.error(
                "Error parsing JSON:",
                error,
                "Raw data:",
                jsonData
              );
            }
          }
        }

        readStream();
      })
      .catch((error) => {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "streamError",
          error: error.message,
        });
      });
    return true;
  }
  switch (message.request) {
    case "get-actions":
      resetaipex();
      sendResponse({ actions: actions });
      break;
    case "switch-tab":
      switchTab(message.tab);
      break;
    case "go-back":
      goBack(message.tab);
      break;
    case "go-forward":
      goForward(message.tab);
      break;
    case "duplicate-tab":
      duplicateTab(message.tab);
      break;
    case "restore-tab":
      restoreTab(message.tab);
      break;
    case "create-bookmark":
      createBookmark(message.tab);
      break;
    case "mute":
      muteTab(true);
      break;
    case "unmute":
      muteTab(false);
      break;
    case "reload":
      reloadTab();
      break;
    case "pin":
      pinTab(true);
      break;
    case "unpin":
      pinTab(false);
      break;
    case "remove-all":
      clearAllData();
      break;
    case "remove-history":
      clearBrowsingData();
      break;
    case "remove-cookies":
      clearCookies();
      break;
    case "remove-cache":
      clearCache();
      break;
    case "remove-local-storage":
      clearLocalStorage();
      break;
    case "remove-passwords":
      clearPasswords();
    case "history": // Fallthrough
    case "downloads":
    case "extensions":
    case "settings":
    case "extensions/shortcuts":
      openChromeUrl(message.request);
      break;
    case "organize-tabs":
      console.log("organize tabs");
      groupTabsByHostname(message.host, message.key, message.model);
      break;
    case "new-incognito-tab":
      chrome.windows.create({
        url: "https://google.com",
        incognito: true,
      });
      break;
    case "remove-groups":
      console.log("remove groups");
      chrome.tabGroups.query({}, (groups) => {
        groups.forEach((group) => {
          chrome.tabs.query({ groupId: group.id }, (tabs) => {
            tabs.forEach((tab) => {
              chrome.tabs.ungroup(tab.id);
            });
          });
        });
      });
      break;
    case "manage-data":
      openChromeUrl("settings/clearBrowserData");
      break;
    case "incognito":
      openIncognito();
      break;
    case "close-window":
      closeWindow(sender.tab.windowId);
      break;
    case "close-tab":
      closeCurrentTab();
      break;
    case "search-history":
      chrome.history
        .search({ text: message.query, maxResults: 0, startTime: 0 })
        .then((data) => {
          data.forEach((action, index) => {
            action.type = "history";
            action.emoji = true;
            action.emojiChar = "🏛";
            action.action = "history";
            action.keyCheck = false;
          });
          sendResponse({ history: data });
        });
      return true;
    case "search-bookmarks":
      chrome.bookmarks.search({ query: message.query }).then((data) => {
        // The index property of the bookmark appears to be causing issues, iterating separately...
        data
          .filter((x) => x.index == 0)
          .forEach((action, index) => {
            if (!action.url) {
              data.splice(index, 1);
            }
            action.type = "bookmark";
            action.emoji = true;
            action.emojiChar = "⭐️";
            action.action = "bookmark";
            action.keyCheck = false;
          });
        data.forEach((action, index) => {
          if (!action.url) {
            data.splice(index, 1);
          }
          action.type = "bookmark";
          action.emoji = true;
          action.emojiChar = "⭐️";
          action.action = "bookmark";
          action.keyCheck = false;
        });
        sendResponse({ bookmarks: data });
      });
      return true;
    case "remove":
      if (message.type == "bookmark") {
        removeBookmark(message.action);
      } else {
        closeTab(message.action);
      }
      break;
    case "search":
      chrome.search.query({ text: message.query });
      break;
    case "restore-new-tab":
      restoreNewTab();
      break;
    case "close-aipex":
      getCurrentTab().then((response) => {
        chrome.tabs.sendMessage(response.id, { request: "close-aipex" });
      });
      break;
  }
});

// Get actions
resetaipex();
