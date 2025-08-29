import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoConfig = {
  // 支持多浏览器构建
  targets: ["chrome", "firefox", "edge", "safari"],
  
  // 构建时环境变量处理
  env: {
    AI_HOST: process.env.AI_HOST || "https://api.openai.com/v1/chat/completions",
    AI_MODEL: process.env.AI_MODEL || "gpt-3.5-turbo",
    AI_TOKEN: process.env.AI_TOKEN || ""
  },
  
  // 构建配置
  build: {
    // 为不同浏览器生成不同的manifest
    manifest: {
      // Chrome/Edge 使用 Manifest V3
      chrome: {
        manifest_version: 3,
        permissions: [
          "tabs",
          "windows", 
          "tabGroups",
          "activeTab",
          "bookmarks",
          "browsingData",
          "history",
          "scripting",
          "search",
          "commands",
          "storage",
          "contextMenus",
          "sessions",
          "sidePanel",
          "management",
          "downloads"
        ],
        host_permissions: ["https://*/*"],
        web_accessible_resources: [
          {
            resources: ["*"],
            matches: ["<all_urls>"]
          }
        ],
        commands: {
          "open-aipex": {
            suggested_key: {
              default: "Ctrl+M",
              mac: "Command+M"
            },
            description: "Open command menu"
          }
        }
      },
      // Firefox 使用 Manifest V2
      firefox: {
        manifest_version: 2,
        permissions: [
          "tabs",
          "windows",
          "bookmarks",
          "browsingData", 
          "history",
          "search",
          "storage",
          "contextMenus",
          "sessions",
          "management",
          "downloads",
          "https://*/*"
        ],
        commands: {
          "open-aipex": {
            suggested_key: {
              default: "Ctrl+M",
              mac: "Command+M"
            },
            description: "Open command menu"
          }
        }
      }
    }
  }
}
