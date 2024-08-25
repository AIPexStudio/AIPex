document.addEventListener("DOMContentLoaded", function () {
  const shortcutInput = document.getElementById("shortcutInput");
  const changeShortcutButton = document.getElementById("changeShortcut");

  // Load current shortcut
  chrome.commands.getAll(function (commands) {
    const openOmniCommand = commands.find(
      (command) => command.name === "open-omni"
    );
    if (openOmniCommand) {
      shortcutInput.value = openOmniCommand.shortcut || "Not set";
    }
  });

  changeShortcutButton.addEventListener("click", function () {
    chrome.tabs.create({
      url: "chrome://extensions/shortcuts",
    });
  });
});
