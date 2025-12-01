/**
 * Background Service Worker
 * Handles extension lifecycle events and keyboard commands
 */

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Listen for keyboard command to open AIPex
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-aipex") {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // Send message to content script to open omni
        chrome.tabs
          .sendMessage(tabs[0].id, { request: "open-aipex" })
          .catch((error) => {
            console.error("Failed to send message to content script:", error);
          });
      }
    });
  }
});

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("AIPex extension installed");
  } else if (details.reason === "update") {
    console.log(
      "AIPex extension updated to version",
      chrome.runtime.getManifest().version,
    );
  }
});

console.log("AIPex background service worker started");
