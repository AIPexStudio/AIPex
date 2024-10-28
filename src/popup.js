document.addEventListener("DOMContentLoaded", function () {
  const shortcutInput = document.getElementById("shortcutInput");
  const tabGroupCategoriesInput = document.getElementById(
    "tab_group_categories"
  );
  const autoGroupTabsInput = document.getElementById("auto_group_tabs");
  const aiHostInput = document.getElementById("ai_host");
  const aiTokenInput = document.getElementById("ai_token");
  const aiModelInput = document.getElementById("ai_model");
  const saveAllSettingsButton = document.getElementById("saveAllSettings");
  const messageDiv = document.getElementById("message");

  // Load current shortcut
  chrome.commands.getAll(function (commands) {
    const openaipexCommand = commands.find(
      (command) => command.name === "open-aipex"
    );
    if (openaipexCommand) {
      shortcutInput.value = openaipexCommand.shortcut || "Not set";
    }
  });

  // Load existing settings
  chrome.storage.sync.get(
    [
      "tabGroupCategories",
      "autoGroupTabs",
      "aiHost",
      "aiToken",
      "aiModel",
      "showSelectionToolbar",
    ],
    function (result) {
      tabGroupCategoriesInput.value =
        result.tabGroupCategories ||
        "Social, Entertainment, Read Material, Education, Productivity, Utilities";
      autoGroupTabsInput.checked = result.autoGroupTabs ?? true; // Default to true if not set
      aiHostInput.value =
        result.aiHost || "https://api.openai.com/v1/chat/completions";
      aiTokenInput.value = result.aiToken || "";
      aiModelInput.value = result.aiModel || "gpt-3.5-turbo";
      document.getElementById("show_selection_toolbar").checked =
        result.showSelectionToolbar ?? false;
    }
  );

  saveAllSettingsButton.addEventListener("click", function () {
    const tabGroupCategories = tabGroupCategoriesInput.value
      .split(",")
      .map((cat) => cat.trim())
      .join(", ");
    const autoGroupTabs = autoGroupTabsInput.checked;
    const aiHost = aiHostInput.value;
    const aiToken = aiTokenInput.value;
    const aiModel = aiModelInput.value;
    const showSelectionToolbar = document.getElementById(
      "show_selection_toolbar"
    ).checked;

    chrome.storage.sync.set(
      {
        tabGroupCategories: tabGroupCategories,
        autoGroupTabs: autoGroupTabs,
        aiHost: aiHost,
        aiToken: aiToken,
        aiModel: aiModel,
        showSelectionToolbar: showSelectionToolbar,
      },
      function () {
        messageDiv.textContent = "All settings saved successfully.";
        setTimeout(() => {
          messageDiv.textContent = "";
        }, 3000);
      }
    );
  });

  shortcutInput.addEventListener("click", function () {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" }, () => {
      messageDiv.textContent =
        "Please set the new shortcut in the Chrome Extensions Shortcuts page.";
    });
  });

  // Listen for changes in the command shortcut
  chrome.commands.onCommand.addListener(() => {
    chrome.commands.getAll((commands) => {
      const openaipexCommand = commands.find(
        (command) => command.name === "open-aipex"
      );
      if (openaipexCommand) {
        shortcutInput.value = openaipexCommand.shortcut || "Not set";
        chrome.storage.sync.set({ aipexShortcut: openaipexCommand.shortcut });
      }
    });
  });
});
