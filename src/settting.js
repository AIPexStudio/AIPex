document.addEventListener("DOMContentLoaded", function () {
	const shortcutInput = document.getElementById("shortcutInput");
	const changeShortcutButton = document.getElementById("changeShortcut");

	// Load current shortcut
	chrome.commands.getAll(function (commands) {
		const openaipexCommand = commands.find(
			(command) => command.name === "open-aipex"
		);
		if (openaipexCommand) {
			shortcutInput.value = openaipexCommand.shortcut || "Not set";
		}
	});

	changeShortcutButton.addEventListener("click", function () {
		chrome.tabs.create({
			url: "chrome://extensions/shortcuts",
		});
	});
});

