# AIPex

> **你的下一个AI浏览器，何必需要迁移？**
>
> 开源、免费、隐私保护。直接在你现有的浏览器里跑。

<div align="right">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">中文</a> | <a href="README.de.md">Deutsch</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.ja.md">日本語</a> | <a href="README.ko.md">한국어</a> | <a href="README.pt.md">Português</a> | <a href="README.ru.md">Русский</a>
</div>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar">
    <img src="https://img.shields.io/badge/Chrome%20应用商店-安装-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store">
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa">
    <img src="https://img.shields.io/badge/Edge%20加载项-安装-0078D4?style=for-the-badge&logo=microsoft-edge&logoColor=white" alt="Edge Add-ons">
  </a>
</p>

<p align="center">
  <a href="https://github.com/buttercannfly/AIPex"><img src="https://img.shields.io/github/stars/buttercannfly/AIPex?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/buttercannfly/AIPex"><img src="https://img.shields.io/github/forks/buttercannfly/AIPex?style=social" alt="GitHub forks"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

<!-- TODO: 添加一个展示核心自动化流程的 Hero GIF -->
<!-- <p align="center">
  <img src="assets/demo.gif" alt="AIPex Demo" width="600">
</p> -->

---

**AIPex** — 一个生活在你现有浏览器中的开源浏览器代理。

- **零迁移成本**：无需安装新浏览器。无需学习新工作流。
- **完全开源**：MIT 协议。完全透明、可审计、可自由扩展。
- **隐私优先**：数据不离开本地。支持自带密钥 (BYOK)。

---

## 我们为什么做这个？

市面上的浏览器自动化工具都在要求你：
- 安装一个独立浏览器（Dia/Comet）
- 支付每月订阅费（ChatGPT Atlas）
- 交出你的浏览数据

**我们问自己：为什么自动化不能直接在你已有的浏览器里跑？**

AIPex 就是答案。安装扩展，输入你自己的 API Key，然后直接开始自动化——就在你日常工作的地方。

---

## 快速开始

1. **安装** — [Chrome 应用商店](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar) 或 [Edge 加载项](https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa)
2. **打开** — 点击 AIPex 图标
3. **自动化** — 用自然语言说出你想做的事

---

## 与 AI 编程助手集成（MCP）

AIPex 现已支持 [模型上下文协议（MCP）](https://modelcontextprotocol.io)，让 Cursor、Claude Code、VS Code Copilot 等 AI 助手能够直接控制你的浏览器。

```
AI Agent ──stdio──▶ aipex-mcp-bridge ──WebSocket──▶ AIPex Extension ──▶ Browser
```

### 第一步：配置你的 AI 工具

**Cursor** (`.cursor/mcp.json`) · **Claude Desktop** (`claude_desktop_config.json`) · **Windsurf** (`mcp_config.json`):

```json
{
  "mcpServers": {
    "aipex-browser": {
      "command": "npx",
      "args": ["-y", "aipex-mcp-bridge"]
    }
  }
}
```

**Claude Code**:

```bash
claude mcp add aipex-browser -- npx -y aipex-mcp-bridge
```

**VS Code Copilot** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "aipex-browser": {
      "command": "npx",
      "args": ["-y", "aipex-mcp-bridge"]
    }
  }
}
```

### 第二步：连接扩展程序

1. 打开 Chrome → 点击 AIPex 图标 → **选项**
2. 将 WebSocket URL 设置为 `ws://localhost:9223`
3. 点击 **连接**

你的 AI 助手现在可以通过 MCP 使用 30+ 个浏览器自动化工具。更多配置详见 [mcp-bridge/README.md](mcp-bridge/README.md)。

---

## Skill

AIPex 提供了一个 **`aipex-browser`** skill —— 供支持 skill 协议的 agent（如 [Claude Code](https://claude.ai/code) 及兼容 [OpenClaw](https://openclaw.dev) 的运行时）使用的即开即用自动化技能包。

该 skill 内置了工具使用策略、所有 30+ 浏览器工具的完整参数 schema，以及常用自动化模式，让 agent 无需自行摸索即可高效控制浏览器。

详见 [`skill/SKILL.md`](skill/SKILL.md)。

---

## 演示

### "我开了100个标签页，救命"

https://github.com/user-attachments/assets/4a4f2a64-691c-4783-965e-043b329a8035

### "帮我研究这个主题，不用离开浏览器"

https://github.com/user-attachments/assets/71ec4efd-d80e-4e8f-8e39-88baee3ec38e

### "帮我发一条推文"

https://github.com/user-attachments/assets/81f6b482-84d0-4fd9-924b-dca634b208ec

### "帮我通过这个考试"

https://github.com/user-attachments/assets/ba454715-c759-41df-bf87-e835f76be365

---

## AIPex 和其他产品对比

*既然你已有的浏览器就能自动化，为什么还要安装新浏览器？*

| 特性 | AIPex | ChatGPT Atlas | Dia/Comet | Manus |
|------|-------|---------------|-----------|-------|
| **浏览器迁移** | 无需 | 需要 | 需要 | 无需 |
| **价格** | 免费 | 付费 | 付费 | 付费 |
| **开源** | 是 | 否 | 否 | 否 |
| **隐私保护** | 完全 | 部分 | 部分 | 部分 |
| **自带密钥** | 支持 | 不支持 | 不支持 | 不支持 |

---

## 贡献代码

我们欢迎贡献！查看 [DEVELOPMENT.md](DEVELOPMENT.md) 了解开发设置。

---

## 贡献者

<a href="https://github.com/buttercannfly/AIPex/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=buttercannfly/AIPex" />
</a>

---

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=buttercannfly/AIPex&type=Date)](https://star-history.com/#buttercannfly/AIPex&Date)

---

<p align="center">
  <strong>Made with ❤️ by the AIPex Team</strong>
</p>

<p align="center">
  <a href="https://github.com/buttercannfly/AIPex"><img src="https://img.shields.io/badge/GitHub-100000?logo=github&logoColor=white" alt="GitHub"></a>
  <a href="https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar"><img src="https://img.shields.io/badge/Chrome-4285F4?logo=google-chrome&logoColor=white" alt="Chrome"></a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa"><img src="https://img.shields.io/badge/Edge-0078D4?logo=microsoft-edge&logoColor=white" alt="Edge"></a>
</p>
