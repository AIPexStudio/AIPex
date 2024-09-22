document.addEventListener("DOMContentLoaded", function () {
	const shortcutInput = document.getElementById("shortcutInput");
	const saveShortcutButton = document.getElementById("saveShortcut");
	const messageDiv = document.getElementById("message");
	const aiHostInput = document.getElementById("ai_host");
	const aiTokenInput = document.getElementById("ai_token");
	const aiModelInput = document.getElementById("ai_model");
	const saveAISettingButton = document.getElementById("saveAISetting");

	// Load current shortcut
	chrome.commands.getAll(function (commands) {
		const openOmniCommand = commands.find(
			(command) => command.name === "open-omni"
		);
		if (openOmniCommand) {
			shortcutInput.value = openOmniCommand.shortcut || "Not set";
		}
	});

	// Load AI settings
	chrome.storage.sync.get(["aiHost", "aiToken", "aiModel"], function (result) {
		aiHostInput.value = result.aiHost || "";
		aiTokenInput.value = result.aiToken || "";
		aiModelInput.value = result.aiModel || "gpt-3.5-turbo";
	});

	saveShortcutButton.addEventListener("click", function () {
		chrome.tabs.create({ url: "chrome://extensions/shortcuts" }, () => {
			messageDiv.textContent =
				"Please set the new shortcut in the Chrome Extensions Shortcuts page.";
		});
	});

	saveAISettingButton.addEventListener("click", function () {
		const aiHost = aiHostInput.value;
		const aiToken = aiTokenInput.value;
		const aiModel = aiModelInput.value;
		chrome.storage.sync.set(
			{ aiHost: aiHost, aiToken: aiToken, aiModel: aiModel },
			function () {
				messageDiv.textContent = "AI settings saved successfully.";
			}
		);
	});

	// Listen for changes in the command shortcut
	chrome.commands.onCommand.addListener(() => {
		chrome.commands.getAll((commands) => {
			const openOmniCommand = commands.find(
				(command) => command.name === "open-omni"
			);
			if (openOmniCommand) {
				shortcutInput.value = openOmniCommand.shortcut || "Not set";
				chrome.storage.sync.set({ omniShortcut: openOmniCommand.shortcut });
			}
		});
	});
});

