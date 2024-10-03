// Workaround to capture Esc key on certain sites
var isOpen = false;
var aiHost = "https://api.openai.com/v1/chat/completions";
var aiToken = "";
var aiModel = "";
const conversations = [];

document.onkeyup = (e) => {
	if (e.key == "Escape" && isOpen) {
		chrome.runtime.sendMessage({ request: "close-omni" });
	}
};

document.addEventListener(
	"keydown",
	(event) => {
		if (event.metaKey && event.key === "t") {
			event.preventDefault();
			openOmni();
		}
	},
	true
);

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

	// Append the omni into the current page
	$.get(chrome.runtime.getURL("/content.html"), (data) => {
		$(data).appendTo("body");

		// Get checkmark image for toast
		$("#omni-extension-toast img").attr(
			"src",
			chrome.runtime.getURL("assets/check.svg")
		);

		// Request actions from the background
		chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
			actions = response.actions;
		});

		// New tab page workaround
		if (
			window.location.href ==
			"chrome-extension://mpanekjjajcabgnlbabmopeenljeoggm/newtab.html"
		) {
			isOpen = true;
			$("#omni-extension").removeClass("omni-closing");
			window.setTimeout(() => {
				$("#omni-extension input").focus();
			}, 100);
		}
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
			description +=
				'<br><span class="omni-item-url">' + action.url + "</span>";
		}

		if (index != 0) {
			$("#omni-extension #omni-list").append(
				"<div class='omni-item' " +
					skip +
					" data-index='" +
					index +
					"' data-type='" +
					action.type +
					"'>" +
					img +
					"<div class='omni-item-details'><div class='omni-item-name'>" +
					action.title +
					"</div><div class='omni-item-desc'>" +
					description +
					"</div></div>" +
					keys +
					"<div class='omni-select'>Select <span class='omni-shortcut'>⏎</span></div></div>"
			);
		} else {
			$("#omni-extension #omni-list").append(
				"<div class='omni-item omni-item-active' " +
					skip +
					" data-index='" +
					index +
					"' data-type='" +
					action.type +
					"'>" +
					img +
					"<div class='omni-item-details'><div class='omni-item-name'>" +
					action.title +
					"</div><div class='omni-item-desc'>" +
					description +
					"</div></div>" +
					keys +
					"<div class='omni-select'>Select <span class='omni-shortcut'>⏎</span></div></div>"
			);
		}
		if (!action.emoji) {
			var loadimg = new Image();
			loadimg.src = action.favIconUrl;

			// Favicon doesn't load, use a fallback
			loadimg.onerror = () => {
				$(".omni-item[data-index='" + index + "'] img").attr(
					"src",
					chrome.runtime.getURL("/assets/globe.svg")
				);
			};
		}
	}

	// Add actions to the omni
	function populateOmni() {
		$("#omni-extension #omni-list").html("");
		actions.forEach((action, index) => {
			var keys = "";
			if (action.keycheck) {
				keys = "<div class='omni-keys'>";
				action.keys.forEach(function (key) {
					keys += "<span class='omni-shortcut'>" + key + "</span>";
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
					"&quot;' class='omni-icon'>";
				renderAction(action, index, keys, img);
			} else {
				var img =
					"<span class='omni-emoji-action'>" + action.emojiChar + "</span>";
				renderAction(action, index, keys, img);
			}
		});
		$(".omni-extension #omni-results").html(actions.length + " results");
	}

	// Add filtered actions to the omni
	function populateOmniFilter(actions) {
		isFiltered = true;
		$("#omni-extension #omni-list").html("");
		const renderRow = (index) => {
			const action = actions[index];
			var keys = "";
			if (action.keycheck) {
				keys = "<div class='omni-keys'>";
				action.keys.forEach(function (key) {
					keys += "<span class='omni-shortcut'>" + key + "</span>";
				});
				keys += "</div>";
			}
			var img =
				"<img src='" +
				action.favIconUrl +
				"' alt='favicon' onerror='this.src=&quot;" +
				chrome.runtime.getURL("/assets/globe.svg") +
				"&quot;' class='omni-icon'>";
			if (action.emoji) {
				img = "<span class='omni-emoji-action'>" + action.emojiChar + "</span>";
			}
			if (index != 0) {
				return $(
					"<div class='omni-item' data-index='" +
						index +
						"' data-type='" +
						action.type +
						"' data-url='" +
						action.url +
						"'>" +
						img +
						"<div class='omni-item-details'><div class='omni-item-name'>" +
						action.title +
						"</div><div class='omni-item-desc'>" +
						action.url +
						"</div></div>" +
						keys +
						"<div class='omni-select'>Select <span class='omni-shortcut'>⏎</span></div></div>"
				)[0];
			} else {
				return $(
					"<div class='omni-item omni-item-active' data-index='" +
						index +
						"' data-type='" +
						action.type +
						"' data-url='" +
						action.url +
						"'>" +
						img +
						"<div class='omni-item-details'><div class='omni-item-name'>" +
						action.title +
						"</div><div class='omni-item-desc'>" +
						action.url +
						"</div></div>" +
						keys +
						"<div class='omni-select'>Select <span class='omni-shortcut'>⏎</span></div></div>"
				)[0];
			}
		};
		actions.length &&
			new VirtualizedList.default($("#omni-extension #omni-list")[0], {
				height: 400,
				rowHeight: 60,
				rowCount: actions.length,
				renderRow,
				onMount: () =>
					$(".omni-extension #omni-results").html(actions.length + " results"),
			});
	}

	// Open the omni
	function openOmni() {
		chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
			isOpen = true;
			actions = response.actions;
			console.log(actions);
			$("#omni-extension input").val("");
			populateOmni();
			$("html, body").stop();
			$("#omni-extension").removeClass("omni-closing");
			window.setTimeout(() => {
				$("#omni-extension input").focus();
				focusLock.on($("#omni-extension input").get(0));
				$("#omni-extension input").focus();
			}, 100);
		});
	}

	// Close the omni
	function closeOmni() {
		if (
			window.location.href ==
			"chrome-extension://mpanekjjajcabgnlbabmopeenljeoggm/newtab.html"
		) {
			chrome.runtime.sendMessage({ request: "restore-new-tab" });
		} else {
			isOpen = false;
			$("#omni-extension").addClass("omni-closing");
		}
	}

	// Hover over an action in the omni
	function hoverItem() {
		$(".omni-item-active").removeClass("omni-item-active");
		$(this).addClass("omni-item-active");
	}

	// Show a toast when an action has been performed
	function showToast(action) {
		$("#omni-extension-toast span").html(
			'"' + action.title + '" has been successfully performed'
		);
		$("#omni-extension-toast").addClass("omni-show-toast");
		setTimeout(() => {
			$(".omni-show-toast").removeClass("omni-show-toast");
		}, 3000);
	}

	// Autocomplete commands. Since they all start with different letters, it can be the default behavior
	function checkShortHand(e, value) {
		var el = $(".omni-extension input");
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
			sendToAI(query);
		}
	}

	function initializeDrawer() {
		const drawer = document.getElementById("ai-chat-drawer");
		const sendButton = document.getElementById("ai-chat-send");
		const closeButton = document.getElementById("close-ai-chat");
		const messageInput = document.getElementById("ai-chat-message");

		sendButton.addEventListener("click", sendAIChatMessage);
		closeButton.addEventListener("click", closeAIChatDrawer);
		messageInput.addEventListener("keypress", function (e) {
			if (e.key === "Enter") sendAIChatMessage();
		});

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
		const messageInput = document.getElementById("ai-chat-message");
		const sendButton = document.getElementById("ai-chat-send");
		let message = messageInput.value.trim();

		if (text && text.length > 0) {
			message = text;
		}

		if (message === "") return;

		// 禁用输入和发送按钮
		messageInput.disabled = true;
		sendButton.disabled = true;
		sendButton.classList.add("loading");
		sendButton.textContent = ""; // 清空文本以显示loading图标

		addUserMessage(message);
		messageInput.value = "";
		sendToAI(message);
	}

	function addUserMessage(message) {
		conversations.push("[Question]: " + message);
		scrollToBottom();
		addMessage("You", message, "user-message");
	}

	function addAIMessage(message) {
		console.log(message);
		const messageEle = addFormattedMessage("AI", message, "ai-message");
		scrollToBottom();
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
		// console.log(text);
		const htmlContent = marked.parse(text);
		return htmlContent;
		// 处理代码块
		// text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
		// 	code = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		// 	return `<pre><code class="language-${
		// 		lang || ""
		// 	}">${code.trim()}</code></pre>`;
		// });

		// // 处理行内代码
		// text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");

		// // 处理标题
		// text = text.replace(/^# (.*$)/gm, "<h1>$1</h1>");
		// text = text.replace(/^## (.*$)/gm, "<h2>$1</h2>");
		// text = text.replace(/^### (.*$)/gm, "<h3>$1</h3>");

		// // 处理粗体
		// text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

		// // 处理斜体
		// text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

		// // 处理链接
		// text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');

		// // 处理无序列表
		// text = text.replace(/^\s*[\-\*] (.*$)/gm, "<li>$1</li>");
		// text = text.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

		// // 处理段落和保持缩进
		// const lines = text.split("\n");
		// text = lines
		// 	.map((line) => {
		// 		if (line.trim() === "") return "";
		// 		if (!/^<\/?(\w+).*>/.test(line)) {
		// 			const indent = line.match(/^\s*/)[0];
		// 			return `${indent}<p>${line.trim()}</p>`;
		// 		}
		// 		return line;
		// 	})
		// 	.join("\n");

		// return text;
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

	function sendToAI(message) {
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
					scrollToBottom();
				}
			} else if (request.action === "streamEnd") {
				scrollToBottom();
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

		toolbar = document.createElement("div");
		toolbar.id = "selection-toolbar";
		toolbar.style.position = "absolute";
		toolbar.style.left = `${x}px`;
		toolbar.style.top = `${y}px`;
		toolbar.style.backgroundColor = "white";
		toolbar.style.border = "1px solid #ccc";
		toolbar.style.padding = "5px";
		toolbar.style.display = "flex";
		toolbar.style.gap = "5px";
		toolbar.style.zIndex = "1000";

		const answerButton = createIconButton(
			"Answer with AI",
			chrome.runtime.getURL("/assets/ai-icon.svg"),
			(event) => {
				event.stopPropagation();
				removeToolbar();
				answerWithAI(text);
			}
		);

		const translateButton = createIconButton(
			"Translate",
			chrome.runtime.getURL("/assets/translate-icon.svg"),
			(event) => {
				event.stopPropagation();
				removeToolbar();
				translate(text);
			}
		);

		toolbar.appendChild(answerButton);
		toolbar.appendChild(translateButton);
		document.body.appendChild(toolbar);
	}

	function removeToolbar() {
		if (toolbar) {
			toolbar.remove();
			toolbar = null;
		}
	}

	function createIconButton(title, iconUrl, onClick) {
		const button = document.createElement("button");
		button.style.border = "none";
		button.style.backgroundColor = "transparent";
		button.style.cursor = "pointer";
		button.title = title;

		const icon = document.createElement("img");
		icon.src = iconUrl;
		icon.style.width = "24px";
		icon.style.height = "24px";

		button.appendChild(icon);
		button.onclick = onClick;

		return button;
	}

	function answerWithAI(text) {
		openAIChatDrawer(text);
	}

	function translate(text) {
		// Implement translation logic here
		alert(`Translated text: ${text}`);
	}

	// Search for an action in the omni
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
				".omni-item[data-index='" +
					actions.findIndex((x) => x.action == "search") +
					"']"
			).hide();
			$(
				".omni-item[data-index='" +
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
					populateOmniFilter(response.history);
				}
			);
		} // Inside the search function in content.js, add this condition
		else if (value.startsWith("/ai")) {
			$(".omni-item").hide();
			$(
				".omni-item[data-index='" +
					actions.findIndex((x) => x.action == "ai-chat") +
					"']"
			).show();

			// Update the description of the AI chat item
			$(
				".omni-item[data-index='" +
					actions.findIndex((x) => x.action == "ai-chat") +
					"'] .omni-item-desc"
			).text(value.replace("/ai ", ""));

			// Update the results count
			$(".omni-extension #omni-results").html("1 result");

			// Ensure the AI chat item is active
			$(".omni-item-active").removeClass("omni-item-active");
			$(".omni-item:visible").first().addClass("omni-item-active");
		} else if (value.startsWith("/bookmarks")) {
			$(
				".omni-item[data-index='" +
					actions.findIndex((x) => x.action == "search") +
					"']"
			).hide();
			$(
				".omni-item[data-index='" +
					actions.findIndex((x) => x.action == "goto") +
					"']"
			).hide();
			var tempvalue = value.replace("/bookmarks ", "");
			if (tempvalue != "/bookmarks" && tempvalue != "") {
				var query = value.replace("/bookmarks ", "");
				chrome.runtime.sendMessage(
					{ request: "search-bookmarks", query: query },
					(response) => {
						populateOmniFilter(response.bookmarks);
					}
				);
			} else {
				populateOmniFilter(actions.filter((x) => x.type == "bookmark"));
			}
		} else {
			if (isFiltered) {
				populateOmni();
				isFiltered = false;
			}
			$(".omni-extension #omni-list .omni-item").filter(function () {
				if (value.startsWith("/tabs")) {
					$(
						".omni-item[data-index='" +
							actions.findIndex((x) => x.action == "search") +
							"']"
					).hide();
					$(
						".omni-item[data-index='" +
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
								.find(".omni-item-name")
								.text()
								.toLowerCase()
								.indexOf(tempvalue) > -1 ||
								$(this)
									.find(".omni-item-desc")
									.text()
									.toLowerCase()
									.indexOf(tempvalue) > -1) &&
								$(this).attr("data-type") == "tab"
						);
					}
				} else if (value.startsWith("/remove")) {
					$(
						".omni-item[data-index='" +
							actions.findIndex((x) => x.action == "search") +
							"']"
					).hide();
					$(
						".omni-item[data-index='" +
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
								.find(".omni-item-name")
								.text()
								.toLowerCase()
								.indexOf(tempvalue) > -1 ||
								$(this)
									.find(".omni-item-desc")
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
							.find(".omni-item-name")
							.text()
							.toLowerCase()
							.indexOf(value) > -1 ||
							$(this)
								.find(".omni-item-desc")
								.text()
								.toLowerCase()
								.indexOf(value) > -1
					);
					if (value == "") {
						$(
							".omni-item[data-index='" +
								actions.findIndex((x) => x.action == "search") +
								"']"
						).hide();
						$(
							".omni-item[data-index='" +
								actions.findIndex((x) => x.action == "goto") +
								"']"
						).hide();
					} else if (!validURL(value)) {
						$(
							".omni-item[data-index='" +
								actions.findIndex((x) => x.action == "search") +
								"']"
						).show();
						$(
							".omni-item[data-index='" +
								actions.findIndex((x) => x.action == "goto") +
								"']"
						).hide();
						$(
							".omni-item[data-index='" +
								actions.findIndex((x) => x.action == "search") +
								"'] .omni-item-name"
						).html('"' + value + '"');
					} else {
						$(
							".omni-item[data-index='" +
								actions.findIndex((x) => x.action == "search") +
								"']"
						).hide();
						$(
							".omni-item[data-index='" +
								actions.findIndex((x) => x.action == "goto") +
								"']"
						).show();
						$(
							".omni-item[data-index='" +
								actions.findIndex((x) => x.action == "goto") +
								"'] .omni-item-name"
						).html(value);
					}
				}
			});
		}

		$(".omni-extension #omni-results").html(
			$("#omni-extension #omni-list .omni-item:visible").length + " results"
		);
		$(".omni-item-active").removeClass("omni-item-active");
		$(".omni-extension #omni-list .omni-item:visible")
			.first()
			.addClass("omni-item-active");
	}

	// Handle actions from the omni
	function handleAction(e) {
		var action = actions[$(".omni-item-active").attr("data-index")];
		closeOmni();
		if ($(".omni-extension input").val().toLowerCase().startsWith("/remove")) {
			chrome.runtime.sendMessage({
				request: "remove",
				type: action.type,
				action: action,
			});
		} else if (
			$(".omni-extension input").val().toLowerCase().startsWith("/history")
		) {
			console.log(e);
			if (e.ctrlKey || e.metaKey) {
				window.open($(".omni-item-active").attr("data-url"));
			} else {
				window.open($(".omni-item-active").attr("data-url"), "_self");
			}
		} else if (
			$(".omni-extension input").val().toLowerCase().startsWith("/bookmarks")
		) {
			if (e.ctrlKey || e.metaKey) {
				window.open($(".omni-item-active").attr("data-url"));
			} else {
				window.open($(".omni-item-active").attr("data-url"), "_self");
			}
		} else {
			console.log("this part");
			console.log(action.action);
			chrome.runtime.sendMessage({
				request: action.action,
				tab: action,
				query: $(".omni-extension input").val(),
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
					// 	window.open(addhttp($(".omni-extension input").val()));
					// } else {
					window.open(addhttp($(".omni-extension input").val()));
					// }
					break;
				case "print":
					window.print();
					break;
				case "open-history-url":
					console.log("history is right");
					window.open($(".omni-item-active .omni-item-url").text());
					break;
				case "ai-chat":
					const query = $(".omni-extension input").val().replace("/ai ", "");
					console.log(query);
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
			populateOmni();
		});
	}

	// Customize the shortcut to open the Omni box
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
					$(".omni-item-active").prevAll("div").not(":hidden").first().length
				) {
					var previous = $(".omni-item-active")
						.prevAll("div")
						.not(":hidden")
						.first();
					$(".omni-item-active").removeClass("omni-item-active");
					previous.addClass("omni-item-active");
					previous[0].scrollIntoView({ block: "nearest", inline: "nearest" });
				}
			} else if (down[40]) {
				// Down key
				if (
					$(".omni-item-active").nextAll("div").not(":hidden").first().length
				) {
					var next = $(".omni-item-active")
						.nextAll("div")
						.not(":hidden")
						.first();
					$(".omni-item-active").removeClass("omni-item-active");
					next.addClass("omni-item-active");
					next[0].scrollIntoView({ block: "nearest", inline: "nearest" });
				}
			} else if (down[27] && isOpen) {
				// Esc key
				closeOmni();
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
					populateOmni();
				});
			} else if (down[18] && down[16] && down[77]) {
				if (actions.find((x) => x.action == "mute") != undefined) {
					chrome.runtime.sendMessage({ request: "mute-tab" });
				} else {
					chrome.runtime.sendMessage({ request: "unmute-tab" });
				}
				chrome.runtime.sendMessage({ request: "get-actions" }, (response) => {
					actions = response.actions;
					populateOmni();
				});
			} else if (down[18] && down[16] && down[67]) {
				window.open("mailto:");
			}

			down = [];
		});

	// Recieve messages from background
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.request == "open-omni") {
			if (isOpen) {
				closeOmni();
			} else {
				openOmni();
			}
		} else if (message.request == "close-omni") {
			closeOmni();
		}
	});

	$(document).on("click", "#open-page-omni-extension-thing", openShortcuts);
	$(document).on(
		"mouseover",
		".omni-extension .omni-item:not(.omni-item-active)",
		hoverItem
	);
	$(document).on("keyup", ".omni-extension input", search);
	$(document).on("click", ".omni-item-active", handleAction);
	$(document).on("click", ".omni-extension #omni-overlay", closeOmni);
});

