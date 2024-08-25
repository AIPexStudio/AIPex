document.addEventListener("DOMContentLoaded", function () {
  const shortcutInput = document.getElementById("shortcutInput");
  const saveShortcutButton = document.getElementById("saveShortcut");
  const messageDiv = document.getElementById("message");

  // Load current shortcut
  chrome.commands.getAll(function (commands) {
    const openOmniCommand = commands.find(
      (command) => command.name === "open-omni"
    );
    if (openOmniCommand) {
      shortcutInput.value = openOmniCommand.shortcut || "Not set";
    }
  });

  saveShortcutButton.addEventListener("click", function () {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" }, () => {
      messageDiv.textContent =
        "Please set the new shortcut in the Chrome Extensions Shortcuts page.";
    });
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
