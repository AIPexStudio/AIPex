# 🤖 AIPex - AI-Powered Browser Automation Extension

> **Automate your browser with natural language commands - The open source browser-use solution**

<div align="right">
  <a href="README.md">🇺🇸 English</a> | <a href="README.zh-CN.md">🇨🇳 中文</a>
</div>

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-brightgreen)](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar)
[![GitHub stars](https://img.shields.io/github/stars/buttercannfly/AIPex?style=social)](https://github.com/buttercannfly/AIPex)
[![GitHub forks](https://img.shields.io/github/forks/buttercannfly/AIPex?style=social)](https://github.com/buttercannfly/AIPex)
[![GitHub issues](https://img.shields.io/badge/GitHub-Issues-red)](https://github.com/buttercannfly/AIPex/issues)
[![GitHub pull requests](https://img.shields.io/badge/GitHub-Pull%20Requests-blue)](https://github.com/buttercannfly/AIPex/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

<div align="center">
  **⭐ Star this repo if you find it helpful! ⭐**
  
  [![Chrome Web Store](https://img.shields.io/badge/Install%20on%20Chrome%20Web%20Store-blue?logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar)
</div>

## 🤖 What is AIPex?

AIPex is a revolutionary Chrome extension that transforms your browser into an intelligent automation platform. Using **natural language commands** and **AI-powered intelligence**, AIPex can automate virtually any browser task - from complex multi-step workflows to simple repetitive actions.

### 🎯 Why Choose AIPex for Browser Automation?

- 🧠 **Natural Language Control**: Command your browser in plain English - no coding required
- 🤖 **AI-Powered Intelligence**: 30+ MCP tools that understand context and adapt to your needs
- ⚡ **Multi-Step Automation**: Execute complex workflows with single commands
- 🔄 **Universal Compatibility**: Works with any website - no special setup needed
- 📊 **Smart Data Extraction**: Automatically collect and organize information from web pages
- 🎯 **Precision Actions**: Click, fill, scroll, and interact with elements using AI vision
- 📝 **Form Automation**: Fill out forms, submit data, and handle complex interactions
- 🖼️ **At Tabs**: Read & Act with Multiple tabs
- 🔧 **Developer Friendly**: Open source with extensive API for custom automation
- 🚀 **Lightning Fast**: Execute automation tasks in seconds, not minutes

## ✨ Core Automation Features

### 📊 Intelligent Data Extraction
- **Smart Content Analysis**: Extract structured data from any webpage
- **Price Monitoring**: Track prices across multiple e-commerce sites
- **Research Automation**: Gather information from multiple sources automatically

![Data Extraction](gif/research.gif)

### 🎯 Precision Element Interaction
- **Visual Element Detection**: AI can see and interact with page elements
- **Form Automation**: Fill out complex forms with intelligent field mapping
- **Dynamic Content Handling**: Adapt to changing page layouts and content

![Element Interaction](gif/compare.gif)

### 📝 Content Processing & Analysis
- **Text Highlighting & Summarization**: Automatically highlight and summarize important content
- **Document Processing**: Extract and organize information from web documents
- **Smart Note-Taking**: Capture and organize insights from web browsing

![Content Processing](gif/summariz.gif)

### 🗂️ Advanced Tab & Window Management
- **AI-Powered Organization**: Automatically group and organize tabs by topic
- **Smart Tab Switching**: Find and switch between tabs using natural language
- **Multi-Window Coordination**: Manage complex workflows across multiple browser windows

![Tab Management](gif/organize-tabs.gif)

## 🚀 Getting Started

### Quick Start
1. **Install from Chrome Web Store** (Recommended)
   - [Click here to install](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar)

2. **Open AIPex**
   - Press `⌘+M` (Mac) or `Ctrl+M` (Windows/Linux)
   - Or click the AIPex icon in your toolbar

3. **Start Automating**
   - Type `/ai` to start AI automation chat
   - Use natural language: "Click the login button", "Fill out this form"
   - Try complex workflows: "Research React best practices and save to notes"

## 🛠️ Development & Contributing

We love contributions! Here's how you can help make AIPex even better:

📖 **For detailed development setup, build instructions, and contribution guidelines, please see [DEVELOPMENT.md](DEVELOPMENT.md)**

### Quick Start for Contributors
- 🏗️ **Local Development**: See [DEVELOPMENT.md#local-development-setup](DEVELOPMENT.md#local-development-setup)
- 🔧 **Building**: See [DEVELOPMENT.md#building-for-production](DEVELOPMENT.md#building-for-production)
- 🤝 **Contributing**: See [DEVELOPMENT.md#how-to-contribute](DEVELOPMENT.md#how-to-contribute)
- 📊 **Project Status**: See [DEVELOPMENT.md#development-status](DEVELOPMENT.md#development-status)


### 📊 Tool Categories Overview

<details>
<summary>🗂️ <strong>Tab Management</strong> - 8 tools</summary>

Complete tab control and navigation:
- `get_all_tabs` - Get all open tabs across all windows
- `get_current_tab` - Get information about the currently active tab  
- `switch_to_tab` - Switch to a specific tab by ID
- `create_new_tab` - Create a new tab with the specified URL
- `get_tab_info` - Get detailed information about a specific tab
- `duplicate_tab` - Duplicate an existing tab
- `close_tab` - Close a specific tab
- `get_current_tab_content` - Get the visible text content of the current tab

</details>

<details>
<summary>📄 <strong>Page Content & Interaction</strong> - 15 tools</summary>

Content extraction, analysis, and page interaction:
- `get_page_metadata` - Get page metadata including title, description, keywords
- `extract_page_text` - Extract text content with word count and reading time
- `get_page_links` - Get all links from the current page
- `search_page_text` - Search for text on the current page
- `get_interactive_elements` - Get all interactive elements (links, buttons, inputs)
- `get_interactive_elements_optimized` - Optimized version for complex pages
- `click_element` - Click an element using CSS selector
- `summarize_page` - Summarize page content with key points
- `fill_input` - Fill an input field with text
- `clear_input` - Clear the content of an input field
- `get_input_value` - Get the current value of an input field
- `submit_form` - Submit a form using CSS selector
- `get_form_elements` - Get all form elements and input fields
- `scroll_to_element` - Scroll to a DOM element and center it
- `highlight_element` - Permanently highlight DOM elements
- `highlight_text_inline` - Highlight specific words or phrases within text

</details>

<details>
<summary>⬇️ <strong>Downloads & Files</strong> - 4 tools</summary>

Download control and file management:
- `download_text_as_markdown` - Download text content as markdown file
- `download_image` - Download an image from base64 data
- `download_chat_images` - Download multiple images from chat messages
- `download_current_chat_images` - Download all images from current AI chat

</details>

<details>
<summary>📸 <strong>Screenshots</strong> - 3 tools</summary>

Visual capture and screenshot management:
- `capture_screenshot` - Capture screenshot of current visible tab
- `capture_tab_screenshot` - Capture screenshot of a specific tab by ID
- `capture_screenshot_to_clipboard` - Capture screenshot and save to clipboard

</details>

<details>
<summary>🔧 <strong>Advanced Features</strong> - 3+ tools</summary>

Advanced browser automation and utilities:
- Additional specialized tools for enhanced browser control
- AI-powered content analysis and processing
- Custom automation workflows

</details>

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Support & Community

- 🐛 **Found a bug?** [Open an issue](https://github.com/buttercannfly/AIPex/issues)
- 💡 **Have a feature request?** [Start a discussion](https://github.com/buttercannfly/AIPex/discussions)
- 🤝 **Want to contribute?** See our [Contributing Guide](DEVELOPMENT.md#how-to-contribute)
- 💬 **Need help?** [Join our community discussions](https://github.com/buttercannfly/AIPex/discussions)

## 🏆 Contributors

Thank you to all the amazing contributors who help make AIPex better:

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/buttercannfly">
        <img src="https://github.com/buttercannfly.png?size=100" width="100px;" alt=""/>
        <br />
        <sub><b>ropzislaw</b></sub>
      </a>
      <br />
      <sub>56 commits</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Codexiaoyi">
        <img src="https://github.com/Codexiaoyi.png?size=100" width="100px;" alt=""/>
        <br />
        <sub><b>Codexiaoyi</b></sub>
      </a>
      <br />
      <sub>10 commits</sub>
    </td>
    <td align="center">
      <a href="https://github.com/buttercannfly">
        <img src="https://github.com/buttercannfly.png?size=100" width="100px;" alt=""/>
        <br />
        <sub><b>buttercannfly</b></sub>
      </a>
      <br />
      <sub>5 commits</sub>
    </td>
  </tr>
</table>

**Total Contributors: 3** | **Total Commits: 71**

---

*Want to contribute? Check out our [Contributing Guide](DEVELOPMENT.md#how-to-contribute) and help make AIPex even better!*

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=buttercannfly/AIPex&type=Date)](https://star-history.com/#buttercannfly/AIPex&Date)

---

<div align="center">
  <strong>Made with ❤️ by the AIPex Team</strong>
  
  [![GitHub](https://img.shields.io/badge/GitHub-100000?logo=github&logoColor=white)](https://github.com/buttercannfly/AIPex)
  [![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-4285F4?logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar)
</div>