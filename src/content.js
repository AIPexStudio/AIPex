// Workaround to capture Esc key on certain sites
var isOpen = false;
var aiHost = "https://api.openai.com/v1/chat/completions";
var aiToken = "";
var aiModel = "";
const conversations = [];

let showSelectionToolbar = false;

chrome.storage.sync.get(["showSelectionToolbar"], function (result) {
  showSelectionToolbar = result.showSelectionToolbar ?? false;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync" && changes.showSelectionToolbar) {
    showSelectionToolbar = changes.showSelectionToolbar.newValue;
  }
});

document.onkeyup = (e) => {
  if (e.key == "Escape" && isOpen) {
    chrome.runtime.sendMessage({ request: "close-aipex" });
  }
};

document.addEventListener(
  "keydown",
  (event) => {
    if (event.metaKey && event.key === "t") {
      event.preventDefault();
      openaipex();
    }
  },
  true
);

function waitForElement(selector, callback) {
  const observer = new MutationObserver((mutations, obs) => {
    const element = document.querySelector(selector);
    if (element) {
      callback(element);
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

$(document).ready(() => {
  //initialize markdown
  marked.setOptions({
    highlight: function (code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      } else {
        return hljs.highlightAuto(code).value;
      }
    },
  });

  var actions = [];
  var isFiltered = false;

  // Append the aipex into the current page
  $.get(chrome.runtime.getURL("/content.html"), (data) => {
    $(data).appendTo("body");

    // Get checkmark image for toast
    $("#aipex-extension-toast img").attr(
      "src",
      chrome.runtime.getURL("assets/check.svg")
    );

    // Request actions from the background
    chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
      actions = response.actions;
    });

    // New tab page workaround
    if (window.location.href == "https://aipex.quest") {
      isOpen = true;
      $("#aipex-extension").removeClass("aipex-closing");
      window.setTimeout(() => {
        $("#aipex-extension input").focus();
      }, 100);
    }

    const style = document.createElement("style");
    style.textContent = `
      .aipex-ai-search-results {
        background: white;
        border: 1px solid #dfe1e5;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        width: 100%;
        box-sizing: border-box;
      }

      #rhs .aipex-ai-search-results {
        max-width: 100%;
      }

      .aipex-ai-search-header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        font-size: 14px;
        color: #202124;
      }

      .aipex-ai-search-header img {
        width: 20px;
        height: 20px;
        margin-right: 8px;
      }

      .aipex-ai-search-content {
        font-size: 14px;
        line-height: 1.58;
        color: #4d5156;
      }
    `;
    document.head.appendChild(style);
  });

  chrome.storage.sync.get(["aiHost", "aiToken", "aiModel"], function (result) {
    aiHost = result.aiHost ?? "https://api.openai.com/v1/chat/completions";
    aiToken = result.aiToken;
    aiModel = result.aiModel ?? "gpt-3.5-turbo";
    console.log(aiHost + aiToken + aiModel);
  });

  function renderAction(action, index, keys, img) {
    var skip = "";
    if (action.action == "search" || action.action == "goto") {
      skip = "style='display:none'";
    }

    // Add URL to the description if it exists
    var description = action.desc;
    if (action.url) {
      description = action.url;
    }

    // if (index != 0) {
    $("#aipex-extension #aipex-list").append(
      "<div class='aipex-item' " +
        skip +
        " data-index='" +
        index +
        "' data-type='" +
        action.type +
        "'>" +
        img +
        "<div class='aipex-item-details'><div class='aipex-item-name'>" +
        action.title +
        "</div><div class='aipex-item-desc'>" +
        description +
        "</div></div>" +
        keys +
        "<div class='aipex-select'>Select <span class='aipex-shortcut'>⏎</span></div></div>"
    );
    if (!action.emoji) {
      var loadimg = new Image();
      loadimg.src = action.favIconUrl;

      // Favicon doesn't load, use a fallback
      loadimg.onerror = () => {
        $(".aipex-item[data-index='" + index + "'] img").attr(
          "src",
          chrome.runtime.getURL("/assets/globe.svg")
        );
      };
    }
  }

  // Add actions to the aipex
  function populateaipex() {
    $("#aipex-extension #aipex-list").html("");
    actions.forEach((action, index) => {
      var keys = "";
      if (action.keycheck) {
        keys = "<div class='aipex-keys'>";
        action.keys.forEach(function (key) {
          keys += "<span class='aipex-shortcut'>" + key + "</span>";
        });
        keys += "</div>";
      }

      // Check if the action has an emoji or a favicon
      if (!action.emoji) {
        var onload =
          'if ("naturalHeight" in this) {if (this.naturalHeight + this.naturalWidth === 0) {this.onerror();return;}} else if (this.width + this.height == 0) {this.onerror();return;}';
        var img =
          "<img src='" +
          action.favIconUrl +
          "' alt='favicon' onload='" +
          onload +
          "' onerror='this.src=&quot;" +
          chrome.runtime.getURL("/assets/globe.svg") +
          "&quot;' class='aipex-icon'>";
        renderAction(action, index, keys, img);
      } else {
        var img =
          "<span class='aipex-emoji-action'>" + action.emojiChar + "</span>";
        renderAction(action, index, keys, img);
      }
    });
    $(".aipex-extension #aipex-results").html(actions.length + " results");
  }

  // Add filtered actions to the aipex
  function populateaipexFilter(actions) {
    isFiltered = true;
    $("#aipex-extension #aipex-list").html("");
    const renderRow = (index) => {
      const action = actions[index];
      var keys = "";
      if (action.keycheck) {
        keys = "<div class='aipex-keys'>";
        action.keys.forEach(function (key) {
          keys += "<span class='aipex-shortcut'>" + key + "</span>";
        });
        keys += "</div>";
      }
      var img =
        "<img src='" +
        action.favIconUrl +
        "' alt='favicon' onerror='this.src=&quot;" +
        chrome.runtime.getURL("/assets/globe.svg") +
        "&quot;' class='aipex-icon'>";
      if (action.emoji) {
        img =
          "<span class='aipex-emoji-action'>" + action.emojiChar + "</span>";
      }
      var description = action.desc;
      if (action.url) {
        description = action.url;
      }
      return $(
        "<div class='aipex-item' data-index='" +
          index +
          "' data-type='" +
          action.type +
          "' data-url='" +
          action.url +
          "'>" +
          img +
          "<div class='aipex-item-details'><div class='aipex-item-name'>" +
          action.title +
          "</div><div class='aipex-item-desc'>" +
          description +
          "</div></div>" +
          keys +
          "<div class='aipex-select'>Select <span class='aipex-shortcut'>⏎</span></div></div>"
      )[0];
    };
    actions.length &&
      new VirtualizedList.default($("#aipex-extension #aipex-list")[0], {
        height: 400,
        rowHeight: 60,
        rowCount: actions.length,
        renderRow,
        onMount: () =>
          $(".aipex-extension #aipex-results").html(
            actions.length + " results"
          ),
      });
  }

  // Open the aipex
  function openaipex() {
    chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
      isOpen = true;
      actions = response.actions;
      $("#aipex-extension input").val("");
      populateaipex();
      $("html, body").stop();
      $("#aipex-extension").removeClass("aipex-closing");
      window.setTimeout(() => {
        $("#aipex-extension input").focus();
        focusLock.on($("#aipex-extension input").get(0));
        $("#aipex-extension input").focus();
      }, 100);
    });
  }

  // Close the aipex
  function closeaipex() {
    if (window.location.href == "https://aipex.quest") {
      chrome.runtime.sendMessage({ request: "restore-new-tab" });
    } else {
      isOpen = false;
      $("#aipex-extension").addClass("aipex-closing");
    }
  }

  // Hover over an action in the aipex
  function hoverItem() {
    $(".aipex-item-active").removeClass("aipex-item-active");
    $(this).addClass("aipex-item-active");
  }

  // Show a toast when an action has been performed
  function showToast(action) {
    $("#aipex-extension-toast span").html(
      '"' + action.title + '" has been successfully performed'
    );
    $("#aipex-extension-toast").addClass("aipex-show-toast");
    setTimeout(() => {
      $(".aipex-show-toast").removeClass("aipex-show-toast");
    }, 3000);
  }

  // Autocomplete commands. Since they all start with different letters, it can be the default behavior
  function checkShortHand(e, value) {
    var el = $(".aipex-extension input");
    if (e.keyCode != 8) {
      if (value == "/t") {
        el.val("/tabs ");
      } else if (value == "/b") {
        el.val("/bookmarks ");
      } else if (value == "/h") {
        el.val("/history ");
      } else if (value == "/r") {
        el.val("/remove ");
      } else if (value == "/a") {
        el.val("/ai ");
      }
    } else {
      if (
        value == "/tabs" ||
        value == "/bookmarks" ||
        value == "/ai" ||
        value == "/remove" ||
        value == "/history"
      ) {
        el.val("");
      }
    }
  }

  // Add protocol
  function addhttp(url) {
    if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
      url = "http://" + url;
    }
    return url;
  }

  // Check if valid url
  function validURL(str) {
    var pattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
      "i"
    ); // fragment locator
    return !!pattern.test(str);
  }

  function openAIChatDrawer(query) {
    const drawer = document.getElementById("ai-chat-drawer");
    if (!drawer) {
      console.error("AI Chat drawer not found in the DOM");
      return;
    }

    // Initialize the drawer if it hasn't been initialized
    if (!drawer.classList.contains("initialized")) {
      initializeDrawer();
    }

    // Open the drawer
    drawer.classList.add("open");

    const inputField = document.getElementById("ai-chat-message");
    if (inputField) {
      inputField.focus();
    }

    if (query && query.trim().length > 0) {
      addUserMessage(query);
    }
  }

  function initializeDrawer() {
    const drawer = document.getElementById("ai-chat-drawer");
    const sendButton = document.getElementById("ai-chat-send");
    const closeButton = document.getElementById("close-ai-chat");
    const messageInput = document.getElementById("ai-chat-message");
    const resizeHandle = drawer.querySelector(".resize-handle");
    const tabButtons = drawer.querySelectorAll(".tab-button");
    const tabContents = drawer.querySelectorAll(".tab-content");

    // Resize functionality
    let isResizing = false;
    let startX, startWidth;

    resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = parseInt(getComputedStyle(drawer).width, 10);

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", () => {
        isResizing = false;
        document.removeEventListener("mousemove", handleMouseMove);
      });
    });

    function handleMouseMove(e) {
      if (!isResizing) return;

      const width = startWidth - (e.clientX - startX);
      if (width >= 320 && width <= 800) {
        drawer.style.width = `${width}px`;
      }
    }

    // Tab switching functionality
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.tab;

        // Update active states
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        button.classList.add("active");
        drawer
          .querySelector(`.tab-content[data-tab="${tab}"]`)
          .classList.add("active");
      });
    });
    let isComposing = false;

    messageInput.addEventListener("compositionstart", function () {
      isComposing = true;
    });

    messageInput.addEventListener("compositionend", function () {
      isComposing = false;
    });

    // const textarea = document.getElementById('ai-chat-message');
    const preview = document.querySelector(".markdown-preview");
    let previewTimeout;

    // Handle textarea input
    messageInput.addEventListener("input", function () {
      clearTimeout(previewTimeout);
      previewTimeout = setTimeout(() => {
        const text = this.value.trim();
        if (text) {
          preview.innerHTML = marked.parse(text);
          preview.classList.add("show");
        } else {
          preview.classList.remove("show");
        }
      }, 300);
    });

    // Handle textarea height
    messageInput.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });

    // Handle Enter key (Shift+Enter for new line)
    messageInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
        e.preventDefault();
        sendButton.click();
      }
    });

    sendButton.addEventListener("click", sendAIChatMessage);
    closeButton.addEventListener("click", closeAIChatDrawer);
    // messageInput.addEventListener("keypress", function (e) {
    //   if (e.key === "Enter") sendAIChatMessage();
    // });

    drawer.classList.add("initialized");
  }

  function scrollToBottom() {
    const chatContent = document.getElementById("ai-chat-content");
    chatContent.scrollTop = chatContent.scrollHeight;
  }

  function closeAIChatDrawer() {
    document.getElementById("ai-chat-drawer").classList.remove("open");
    var chatContent = document.getElementById("ai-chat-content");
    chatContent.innerHTML = "";
  }

  function sendAIChatMessage(text) {
    document.getElementById("ai-chat-drawer").classList.add("open");
    const messageInput = document.getElementById("ai-chat-message");
    const sendButton = document.getElementById("ai-chat-send");
    let message = messageInput.value.trim();
    messageInput.style.height = "auto";
    const preview = document.querySelector(".markdown-preview");
    preview.classList.remove("show");
    if (text && text.length > 0) {
      message = text;
    }

    if (message === "") return;

    // 禁用输入和发送按钮
    messageInput.disabled = true;
    sendButton.disabled = true;
    sendButton.classList.add("loading");
    sendButton.textContent = "";

    addUserMessage(message);
    messageInput.value = "";
    sendToAI(message);
  }

  function addUserMessage(message) {
    conversations.push("[Question]: " + message);
    // scrollToBottom();
    addMessage("You", message, "user-message");
  }

  function addAIMessage(message) {
    console.log(message);
    const messageEle = addFormattedMessage("AI", message, "ai-message");
    // scrollToBottom();
    return messageEle;
  }

  function addMessage(sender, message, className) {
    const chatContent = document.getElementById("ai-chat-content");
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", className);
    messageElement.innerHTML = `<strong>${sender}:</strong> ${escapeHTML(
      message
    )}`;
    chatContent.appendChild(messageElement);
    chatContent.scrollTop = chatContent.scrollHeight;
  }

  function addFormattedMessage(sender, message, className) {
    const chatContent = document.getElementById("ai-chat-content");
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", className);

    const senderElement = document.createElement("strong");
    senderElement.textContent = `${sender}:`;
    messageElement.appendChild(senderElement);

    const formattedContent = formatMessage(message);
    messageElement.appendChild(formattedContent);

    chatContent.appendChild(messageElement);
    chatContent.scrollTop = chatContent.scrollHeight;
    return messageElement;
  }

  function formatMessage(message) {
    const container = document.createElement("div");

    // 使用正则表达式匹配Markdown样式的格式
    message = message.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"); // 粗体
    message = message.replace(/\*(.*?)\*/g, "<em>$1</em>"); // 斜体
    message = message.replace(/`([^`]+)`/g, "<code>$1</code>"); // 内联代码

    // 处理代码块
    message = message.replace(/```([\s\S]*?)```/g, function (match, p1) {
      return `<pre><code>${escapeHTML(p1.trim())}</code></pre>`;
    });

    // 处理换行
    message = message.replace(/\n/g, "<br>");

    container.innerHTML = message;
    return container;
  }

  function escapeHTML(str) {
    return str.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        }[tag] || tag)
    );
  }

  function renderMarkdownToHtml(text) {
    const htmlContent = marked.parse(text);
    return htmlContent;
  }

  function renderCode() {
    document
      .getElementById("ai-chat-drawer")
      .querySelectorAll("pre code")
      .forEach((block) => {
        hljs.highlightBlock(block);

        const button = document.createElement("button");
        button.className = "copy-button";
        button.textContent = "Copy";
        block.parentNode.insertBefore(button, block);

        button.addEventListener("click", () => {
          const code = block.textContent;
          navigator.clipboard
            .writeText(code)
            .then(() => {
              button.textContent = "Copied!";
              setTimeout(() => {
                button.textContent = "Copy";
              }, 2000);
            })
            .catch((error) => {
              console.error("Copy failed:", error);
            });
        });
      });
  }

  function sendToAI(message, callback = null) {
    if (callback) {
      console.log(message);
      // For search results, we want a direct response without chat UI
      chrome.runtime.sendMessage(
        {
          action: "callOpenAI",
          content: message,
          model: aiModel,
          key: aiToken,
          host: aiHost,
          context: [],
          stream: false,
        },
        (response) => {
          if (response && response.choices && response.choices[0]) {
            callback(response.choices[0].message.content);
          }
        }
      );
    } else {
      const aiMessage = addAIMessage("Thinking...");
      const messageInput = document.getElementById("ai-chat-message");
      const sendButton = document.getElementById("ai-chat-send");

      chrome.runtime.sendMessage({
        action: "callOpenAI",
        content: message,
        model: aiModel,
        key: aiToken,
        host: aiHost,
        context: conversations,
      });

      let res = "";

      chrome.runtime.onMessage.addListener(function messageListener(
        request,
        sender,
        sendResponse
      ) {
        if (request.action === "streamChunk") {
          res = res + request.chunk;
          if (!request.isFirstChunk) {
            aiMessage.innerHTML = renderMarkdownToHtml(res);
            renderCode();
            scrollToBottom();
          } else {
            aiMessage.innerHTML = renderMarkdownToHtml(res);
            renderCode();
            // scrollToBottom();
          }
        } else if (request.action === "streamEnd") {
          // scrollToBottom();
          conversations.push("[Answer]: " + aiMessage.textContent);

          // 恢复输入和发送按钮状态
          messageInput.disabled = false;
          sendButton.disabled = false;
          sendButton.classList.remove("loading");
          sendButton.textContent = "➤";
          messageInput.focus();

          chrome.runtime.onMessage.removeListener(messageListener);
        } else if (request.action === "streamError") {
          aiMessage.innerHTML =
            "Sorry, I encountered an error. Please try again later.";
          console.error(request.error);

          // 恢复输入和发送按钮状态
          messageInput.disabled = false;
          sendButton.disabled = false;
          sendButton.classList.remove("loading");
          sendButton.textContent = "➤";
          messageInput.focus();

          chrome.runtime.onMessage.removeListener(messageListener);
        }
      });
    }
  }

  function isGoogleSearch() {
    return (
      window.location.hostname === "www.google.com" &&
      window.location.pathname === "/search"
    );
    // return false;
  }

  function getGoogleSearchQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("q");
  }

  function injectAISearchResults() {
    if (!isGoogleSearch()) return;

    const searchQuery = getGoogleSearchQuery();
    if (!searchQuery) return;

    // Find the right-hand side panel
    const rhsPanel = document.getElementById("rhs");
    if (!rhsPanel) return;

    // Create AI results container
    const aiResultsContainer = document.createElement("div");
    aiResultsContainer.className = "aipex-ai-search-results";
    aiResultsContainer.style.marginBottom = "16px"; // Add some spacing

    // Add loading state
    aiResultsContainer.innerHTML = `
      <div class="aipex-ai-search-header">
        <img src="${chrome.runtime.getURL("assets/ai-icon.png")}" alt="AI" />
        AI-Generated Results
      </div>
      <div class="aipex-ai-search-content">
        <div class="aipex-loading">Generating AI response...</div>
      </div>
      <div class="aipex-ai-search-actions">
        <button class="aipex-action-button continue-chat">
          <img src="${chrome.runtime.getURL(
            "assets/ai-icon.png"
          )}" alt="Continue" />
          Continue Chat in AIPex
        </button>
      </div>
    `;

    // Insert at the beginning of the rhs panel
    rhsPanel.prepend(aiResultsContainer);
    // rhsPanel.insertBefore(aiResultsContainer, rhsPanel.firstChild);

    const continueButton = aiResultsContainer.querySelector(".continue-chat");

    continueButton.addEventListener("click", () => {
      sendAIChatMessage(searchQuery);
    });

    // Get AI response
    const prompt = `Please provide a concise summary of "${searchQuery}" in about 2-3 sentences. Then list 3 key points about this topic.`;

    const content = aiResultsContainer.querySelector(
      ".aipex-ai-search-content"
    );
    let response = "";

    // Use the streaming approach like the sidebar
    chrome.runtime.sendMessage({
      action: "callOpenAI",
      content: prompt,
      model: aiModel,
      key: aiToken,
      host: aiHost,
      context: [],
    });

    // Listen for streaming chunks
    chrome.runtime.onMessage.addListener(function messageListener(request) {
      if (request.action === "streamChunk") {
        response += request.chunk;
        content.innerHTML = marked.parse(response);
        renderCode();
      } else if (request.action === "streamEnd") {
        chrome.runtime.onMessage.removeListener(messageListener);
      } else if (request.action === "streamError") {
        content.innerHTML =
          "Sorry, I encountered an error. Please try again later.";
        console.error(request.error);
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    });
  }

  // Add observer to handle Google's dynamic loading
  const observer = new MutationObserver(() => {
    if (
      document.getElementById("search") &&
      !document.querySelector(".aipex-ai-search-results")
    ) {
      injectAISearchResults();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  let toolbar = null;
  let toolbarTimer = null;

  document.addEventListener("mouseup", function (event) {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      // Clear any existing timer
      if (toolbarTimer) {
        clearTimeout(toolbarTimer);
      }

      // Set a new timer to show the toolbar after 0.5 seconds
      toolbarTimer = setTimeout(() => {
        showToolbar(event.pageX, event.pageY, selection);
      }, 500);
    } else {
      // If there's no selection, clear the timer and remove the toolbar
      clearTimeout(toolbarTimer);
      removeToolbar();
    }
  });

  document.addEventListener("mousedown", function (event) {
    // Clear the timer when the user starts a new selection
    clearTimeout(toolbarTimer);

    if (toolbar && !toolbar.contains(event.target)) {
      removeToolbar();
    }
  });

  function showToolbar(x, y, text) {
    removeToolbar();
    if (!showSelectionToolbar) {
      return;
    }

    toolbar = document.createElement("div");
    toolbar.id = "aipex-selection-toolbar";
    toolbar.style.position = "absolute";
    toolbar.style.left = `${x + 5}px`;
    toolbar.style.top = `${y + 5}px`;
    toolbar.style.backgroundColor = "#f9f9f9";
    toolbar.style.border = "1px solid #e0e0e0";
    toolbar.style.borderRadius = "8px"; // 圆角
    toolbar.style.padding = "3px";
    toolbar.style.display = "flex";
    // toolbar.style.gap = "10px";
    toolbar.style.zIndex = "1000";
    toolbar.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)"; // 阴影

    const answerButton = createIconButton(
      "Ask AI",
      chrome.runtime.getURL("/assets/ai-icon.svg"),
      (event) => {
        event.stopPropagation();
        removeToolbar();
        sendAIChatMessage(text);
      },
      "Ask AI"
    );

    const translateButton = createIconButton(
      "Translate",
      chrome.runtime.getURL("/assets/translate-icon.svg"),
      (event) => {
        event.stopPropagation();
        removeToolbar();
        translate(text);
      },
      "Translate"
    );

    toolbar.appendChild(answerButton);
    toolbar.appendChild(translateButton);
    document.body.appendChild(toolbar);
  }

  function createIconButton(label, iconUrl, onClick, text) {
    const button = document.createElement("button");
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.gap = "1px";
    button.style.backgroundColor = "#ffffff";
    button.style.border = "1px solid #e0e0e0";
    button.style.borderRadius = "6px";
    button.style.padding = "1px 22px";
    button.style.cursor = "pointer";
    button.style.transition =
      "background-color 0.2s, transform 0.2s, filter 0.2s";
    button.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.05)";

    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = "#f0f0f0";
      icon.style.filter = "grayscale(0%)";
    });

    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = "#ffffff";
      icon.style.filter = "grayscale(100%)";
    });

    button.addEventListener("mousedown", () => {
      button.style.transform = "scale(0.98)";
    });

    button.addEventListener("mouseup", () => {
      button.style.transform = "scale(1)";
    });

    // 创建一个包含文字的 span 元素
    const textSpan = document.createElement("span");
    textSpan.textContent = text || label; // 如果没有提供text，就使用label

    // 创建图标元素
    const icon = document.createElement("img");
    icon.src = iconUrl;
    icon.style.width = "16px";
    icon.style.height = "16px";
    icon.style.filter = "grayscale(100%)";

    // 先添加文字，再添加图标
    button.appendChild(textSpan);
    button.appendChild(icon);

    button.addEventListener("click", onClick);
    return button;
  }

  function removeToolbar() {
    if (toolbar) {
      toolbar.remove();
      toolbar = null;
    }
  }

  function translate(text) {
    // Implement translation logic here
    alert(`Translated text: ${text}`);
  }

  // Search for an action in the aipex
  function search(e) {
    if (
      e.keyCode == 37 ||
      e.keyCode == 38 ||
      e.keyCode == 39 ||
      e.keyCode == 40 ||
      e.keyCode == 13 ||
      e.keyCode == 37
    ) {
      return;
    }
    var value = $(this).val().toLowerCase();
    checkShortHand(e, value);
    value = $(this).val().toLowerCase();
    if (value.startsWith("/history")) {
      $(
        ".aipex-item[data-index='" +
          actions.findIndex((x) => x.action == "search") +
          "']"
      ).hide();
      $(
        ".aipex-item[data-index='" +
          actions.findIndex((x) => x.action == "goto") +
          "']"
      ).hide();
      var tempvalue = value.replace("/history ", "");
      var query = "";
      if (tempvalue != "/history") {
        query = value.replace("/history ", "");
      }
      chrome.runtime.sendMessage(
        { request: "search-history", query: query },
        (response) => {
          console.log(response);
          populateaipexFilter(response.history);
        }
      );
    } // Inside the search function in content.js, add this condition
    else if (value.startsWith("/ai")) {
      $(".aipex-item").hide();
      $(
        ".aipex-item[data-index='" +
          actions.findIndex((x) => x.action == "ai-chat") +
          "']"
      ).show();

      // Update the results count
      $(".aipex-extension #aipex-results").html("1 result");

      // Ensure the AI chat item is active
      $(".aipex-item-active").removeClass("aipex-item-active");
      $(".aipex-item:visible").first().addClass("aipex-item-active");
    } else if (value.startsWith("/bookmarks")) {
      $(
        ".aipex-item[data-index='" +
          actions.findIndex((x) => x.action == "search") +
          "']"
      ).hide();
      $(
        ".aipex-item[data-index='" +
          actions.findIndex((x) => x.action == "goto") +
          "']"
      ).hide();
      var tempvalue = value.replace("/bookmarks ", "");
      if (tempvalue != "/bookmarks" && tempvalue != "") {
        var query = value.replace("/bookmarks ", "");
        chrome.runtime.sendMessage(
          { request: "search-bookmarks", query: query },
          (response) => {
            populateaipexFilter(response.bookmarks);
          }
        );
      } else {
        populateaipexFilter(actions.filter((x) => x.type == "bookmark"));
      }
    } else {
      if (isFiltered) {
        populateaipex();
        isFiltered = false;
      }
      $(".aipex-extension #aipex-list .aipex-item").filter(function () {
        if (value.startsWith("/tabs")) {
          $(
            ".aipex-item[data-index='" +
              actions.findIndex((x) => x.action == "search") +
              "']"
          ).hide();
          $(
            ".aipex-item[data-index='" +
              actions.findIndex((x) => x.action == "goto") +
              "']"
          ).hide();
          var tempvalue = value.replace("/tabs ", "");
          if (tempvalue == "/tabs") {
            $(this).toggle($(this).attr("data-type") == "tab");
          } else {
            tempvalue = value.replace("/tabs ", "");
            $(this).toggle(
              ($(this)
                .find(".aipex-item-name")
                .text()
                .toLowerCase()
                .indexOf(tempvalue) > -1 ||
                $(this)
                  .find(".aipex-item-desc")
                  .text()
                  .toLowerCase()
                  .indexOf(tempvalue) > -1) &&
                $(this).attr("data-type") == "tab"
            );
          }
        } else if (value.startsWith("/remove")) {
          $(
            ".aipex-item[data-index='" +
              actions.findIndex((x) => x.action == "search") +
              "']"
          ).hide();
          $(
            ".aipex-item[data-index='" +
              actions.findIndex((x) => x.action == "goto") +
              "']"
          ).hide();
          var tempvalue = value.replace("/remove ", "");
          if (tempvalue == "/remove") {
            $(this).toggle(
              $(this).attr("data-type") == "bookmark" ||
                $(this).attr("data-type") == "tab"
            );
          } else {
            tempvalue = value.replace("/remove ", "");
            $(this).toggle(
              ($(this)
                .find(".aipex-item-name")
                .text()
                .toLowerCase()
                .indexOf(tempvalue) > -1 ||
                $(this)
                  .find(".aipex-item-desc")
                  .text()
                  .toLowerCase()
                  .indexOf(tempvalue) > -1) &&
                ($(this).attr("data-type") == "bookmark" ||
                  $(this).attr("data-type") == "tab")
            );
          }
        } else {
          $(this).toggle(
            $(this)
              .find(".aipex-item-name")
              .text()
              .toLowerCase()
              .indexOf(value) > -1 ||
              $(this)
                .find(".aipex-item-desc")
                .text()
                .toLowerCase()
                .indexOf(value) > -1
          );
          if (value == "") {
            $(
              ".aipex-item[data-index='" +
                actions.findIndex((x) => x.action == "search") +
                "']"
            ).hide();
            $(
              ".aipex-item[data-index='" +
                actions.findIndex((x) => x.action == "goto") +
                "']"
            ).hide();
          } else if (!validURL(value)) {
            $(
              ".aipex-item[data-index='" +
                actions.findIndex((x) => x.action == "search") +
                "']"
            ).show();
            $(
              ".aipex-item[data-index='" +
                actions.findIndex((x) => x.action == "goto") +
                "']"
            ).hide();
            $(
              ".aipex-item[data-index='" +
                actions.findIndex((x) => x.action == "search") +
                "'] .aipex-item-name"
            ).html('"' + value + '"');
          } else {
            $(
              ".aipex-item[data-index='" +
                actions.findIndex((x) => x.action == "search") +
                "']"
            ).hide();
            $(
              ".aipex-item[data-index='" +
                actions.findIndex((x) => x.action == "goto") +
                "']"
            ).show();
            $(
              ".aipex-item[data-index='" +
                actions.findIndex((x) => x.action == "goto") +
                "'] .aipex-item-name"
            ).html(value);
          }
        }
      });
    }

    $(".aipex-extension #aipex-results").html(
      $("#aipex-extension #aipex-list .aipex-item:visible").length + " results"
    );
    $(".aipex-item-active").removeClass("aipex-item-active");
    $(".aipex-extension #aipex-list .aipex-item:visible")
      .first()
      .addClass("aipex-item-active");
  }

  // Handle actions from the aipex
  function handleAction(e) {
    var action = actions[$(".aipex-item-active").attr("data-index")];
    closeaipex();
    if ($(".aipex-extension input").val().toLowerCase().startsWith("/remove")) {
      chrome.runtime.sendMessage({
        request: "remove",
        type: action.type,
        action: action,
      });
    } else if (
      $(".aipex-extension input").val().toLowerCase().startsWith("/history")
    ) {
      window.open($(".aipex-item-active").attr("data-url"));
    } else if (
      $(".aipex-extension input").val().toLowerCase().startsWith("/bookmarks")
    ) {
      window.open($(".aipex-item-active").attr("data-url"));
    } else {
      chrome.runtime.sendMessage({
        request: action.action,
        tab: action,
        query: $(".aipex-extension input").val(),
      });
      switch (action.action) {
        case "bookmark":
          if (e.ctrlKey || e.metaKey) {
            window.open(action.url);
          } else {
            window.open(action.url, "_self");
          }
          break;
        case "scroll-bottom":
          window.scrollTo(0, document.body.scrollHeight);
          showToast(action);
          break;
        case "scroll-top":
          window.scrollTo(0, 0);
          break;
        case "navigation":
          if (e.ctrlKey || e.metaKey) {
            window.open(action.url);
          } else {
            window.open(action.url, "_self");
          }
          break;
        case "fullscreen":
          var elem = document.documentElement;
          elem.requestFullscreen();
          break;
        case "new-tab":
          window.open("");
          break;
        case "new-incognito-tab":
          chrome.runtime.sendMessage({
            request: "new-incognito-tab",
          });
          break;
        case "email":
          window.open("mailto:");
          break;
        case "url":
          if (e.ctrlKey || e.metaKey) {
            window.open(action.url);
          } else {
            window.open(action.url, "_self");
          }
          break;
        case "goto":
          // if (e.ctrlKey || e.metaKey) {
          // 	window.open(addhttp($(".aipex-extension input").val()));
          // } else {
          window.open(addhttp($(".aipex-extension input").val()));
          // }
          break;
        case "print":
          window.print();
          break;
        case "open-history-url":
          console.log("history is right");
          window.open($(".aipex-item-active .aipex-item-url").text());
          break;
        case "organize-tabs":
          console.log("organize tabs");
          chrome.runtime.sendMessage({
            request: "organize-tabs",
            model: aiModel,
            host: aiHost,
            key: aiToken,
          });
          break;
        case "remove-groups":
          chrome.runtime.sendMessage({
            request: "remove-groups",
          });
          break;
        case "ai-chat":
          const query = $(".aipex-extension input").val().replace("/ai ", "");
          openAIChatDrawer(query);
          break;
        case "remove-all":
        case "remove-history":
        case "remove-cookies":
        case "remove-cache":
        case "remove-local-storage":
        case "remove-passwords":
          showToast(action);
          break;
      }
    }

    // Fetch actions again
    chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
      actions = response.actions;
      populateaipex();
    });
  }

  // Customize the shortcut to open the aipex box
  function openShortcuts() {
    chrome.runtime.sendMessage({ request: "extensions/shortcuts" });
  }

  // Check which keys are down
  var down = [];

  $(document)
    .keydown((e) => {
      down[e.keyCode] = true;
      if (down[38]) {
        // Up key
        if (
          $(".aipex-item-active").prevAll("div").not(":hidden").first().length
        ) {
          var previous = $(".aipex-item-active")
            .prevAll("div")
            .not(":hidden")
            .first();
          $(".aipex-item-active").removeClass("aipex-item-active");
          previous.addClass("aipex-item-active");
          previous[0].scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      } else if (down[40]) {
        // Down key
        if (
          $(".aipex-item-active").nextAll("div").not(":hidden").first().length
        ) {
          var next = $(".aipex-item-active")
            .nextAll("div")
            .not(":hidden")
            .first();
          $(".aipex-item-active").removeClass("aipex-item-active");
          next.addClass("aipex-item-active");
          next[0].scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      } else if (down[27] && isOpen) {
        // Esc key
        closeaipex();
      } else if (down[13] && isOpen) {
        // Enter key
        handleAction(e);
      }
    })
    .keyup((e) => {
      if (down[18] && down[16] && down[80]) {
        if (actions.find((x) => x.action == "pin") != undefined) {
          chrome.runtime.sendMessage({ request: "pin-tab" });
        } else {
          chrome.runtime.sendMessage({ request: "unpin-tab" });
        }
        chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
          actions = response.actions;
          populateaipex();
        });
      } else if (down[18] && down[16] && down[77]) {
        if (actions.find((x) => x.action == "mute") != undefined) {
          chrome.runtime.sendMessage({ request: "mute-tab" });
        } else {
          chrome.runtime.sendMessage({ request: "unmute-tab" });
        }
        chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
          actions = response.actions;
          populateaipex();
        });
      } else if (down[18] && down[16] && down[67]) {
        window.open("mailto:");
      }

      down = [];
    });

  // Recieve messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.request == "open-aipex") {
      if (isOpen) {
        closeaipex();
      } else {
        openaipex();
      }
    } else if (message.request == "close-aipex") {
      closeaipex();
    }
  });

  $(document).on("click", "#open-page-aipex-extension-thing", openShortcuts);
  $(document).on(
    "mouseover",
    ".aipex-extension .aipex-item:not(.aipex-item-active)",
    hoverItem
  );
  $(document).on("keyup", ".aipex-extension input", search);
  $(document).on("click", ".aipex-item-active", handleAction);
  $(document).on("click", ".aipex-extension #aipex-overlay", closeaipex);
  waitForElement("#aipex-drag-icon", function (element) {
    const $dragIcon = $("#aipex-drag-icon");
    let isDragging = false;
    let startX, startY;
    let initialLeft, initialTop;
    let isMove = false;

    $dragIcon.css({
      cursor: "pointer",
      "touch-action": "none",
    });

    $dragIcon.on("mousedown", function (e) {
      console.log("mouse down");
      e.preventDefault();
      isDragging = true;

      startX = e.clientX;
      startY = e.clientY;

      const style = window.getComputedStyle($dragIcon[0]);
      initialLeft = parseInt(style.left, 10) || 0;
      initialTop = parseInt(style.top, 10) || 0;

      $(document).on("mouseup", handleMouseUp);

      $dragIcon.css("cursor", "move");

      $("body").append(
        '<style id="drag-cursor-style">* { cursor: move !important; }</style>'
      );
    });

    $("#aipex-icon").on("mouseover", function (e) {
      $(this).attr(
        "src",
        "https://miro.medium.com/v2/resize:fit:720/format:webp/1*dovpu-gbULPxot3OmL2eEQ.png"
      );
    });

    $("#aipex-icon").on("mouseout", function (e) {
      $(this).attr(
        "src",
        "https://miro.medium.com/v2/resize:fit:720/format:webp/1*gHH5bC3nCpzRVXu7UdT0ZQ.png"
      );
    });

    $(document).on("mousemove", { capture: true }, function (e) {
      if (!isDragging) return;
      isMove = true;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newLeft = initialLeft + deltaX;
      const newTop = initialTop + deltaY;

      $dragIcon.css({
        left: `${newLeft}px`,
        top: `${newTop}px`,
        position: "fixed",
      });
    });

    function handleMouseUp() {
      console.log("mouse up");
      isDragging = false;
      $(document).off("mouseup", handleMouseUp);

      $dragIcon.css("cursor", "pointer");

      $("#drag-cursor-style").remove();

      if (!isMove) {
        openaipex();
      }

      isMove = false;
    }
  });

  // document.addEventListener("selectionchange", function () {
  //   if (!showSelectionToolbar) return;

  //   const selection = window.getSelection();
  //   const selectedText = selection.toString().trim();

  //   if (selectedText) {
  //     const range = selection.getRangeAt(0);
  //     const rect = range.getBoundingClientRect();

  //     let toolbar = document.getElementById("aipex-selection-toolbar");
  //     if (!toolbar) {
  //       toolbar = document.createElement("div");
  //       toolbar.id = "aipex-selection-toolbar";
  //       document.body.appendChild(toolbar);
  //     }

  //     toolbar.style.top = `${rect.top + window.scrollY - 45}px`;
  //     toolbar.style.left = `${rect.left + window.scrollX}px`;
  //     toolbar.style.display = "flex";

  //     toolbar.querySelector("#aipex-ask-ai").onclick = () => {
  //       openAIChatDrawer(selectedText);
  //     };

  //     toolbar.querySelector("#aipex-translate").onclick = () => {
  //       openAIChatDrawer(`Translate the following text: ${selectedText}`);
  //     };
  //   } else {
  //     const toolbar = document.getElementById("aipex-selection-toolbar");
  //     if (toolbar) {
  //       toolbar.style.display = "none";
  //     }
  //   }
  // });

  document.addEventListener("click", function (e) {
    if (!e.target.closest("#aipex-selection-toolbar")) {
      const toolbar = document.getElementById("aipex-selection-toolbar");
      if (toolbar) {
        toolbar.style.display = "none";
      }
    }
  });
});
