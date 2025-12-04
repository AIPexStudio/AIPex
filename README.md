
<p align="center"><a href="https://claudechrome.com"><img alt="AIPex Browser Automation" src="https://github.com/user-attachments/assets/67eea9fa-c1fb-4d61-aad4-e3b5885a78f4" width="100%" />
</a></p>

<strong><p align="center">Your browser already works!</p></strong>


<p align="center">
  <a href="https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar">
    <img src="https://img.shields.io/badge/Chrome%20Web%20Store-Install-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store">
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa">
    <img src="https://img.shields.io/badge/Edge%20Add--ons-Install-0078D4?style=for-the-badge&logo=microsoft-edge&logoColor=white" alt="Edge Add-ons">
  </a>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <br>
  <a href="https://discord.gg/sfZC3G5qfe"><img src="https://img.shields.io/badge/-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/weikangzhang3"><img src="https://img.shields.io/badge/-000000?style=for-the-badge&logo=x&logoColor=white" alt="X/Twitter"></a>
  <a href="https://www.youtube.com/@aipex-chrome-extension"><img src="https://img.shields.io/badge/-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube"></a>
  <br>
  <br>
  <a href="README.md">English</a> | <a href="README.zh-CN.md">中文</a>
</p>

<!-- TODO: Add a hero GIF here showing the core automation flow -->
<!-- <p align="center">
  <img src="assets/demo.gif" alt="AIPex Demo" width="600">
</p> -->

---

|  |  |
|---|---|
| **Zero Migration** | Use your existing browser. No new app to learn. |
| **Open Source** | MIT licensed. Audit the code. Extend it yourself. |
| **Privacy First** | Your data never leaves your machine. BYOK supported. |

---

## Why We Built This

Every browser automation tool asks you to:
- Install a separate browser (Dia/Comet)
- Pay monthly subscriptions (ChatGPT Atlas)
- Give up your browsing data

**We asked: why can't automation just run in the browser you already use?**

AIPex is the answer. Install the extension, bring your own API key, and automate anything — right where you already work.

---

## Quick Start

1. **Install** — [Chrome Web Store](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar) or [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa)
2. **Open** — Press AIPex icon
3. **Automate** — Type or speak what you want in natural language

---

## See It In Action

### "I have 100 tabs open. Help."

https://github.com/user-attachments/assets/4a4f2a64-691c-4783-965e-043b329a8035

### "Research this topic without leaving my browser"

https://github.com/user-attachments/assets/71ec4efd-d80e-4e8f-8e39-88baee3ec38e

### "Write a tweet for me"

https://github.com/user-attachments/assets/81f6b482-84d0-4fd9-924b-dca634b208ec

### "Help me pass this exam"

https://github.com/user-attachments/assets/ba454715-c759-41df-bf87-e835f76be365

---

## How Does AIPex Compare?

*Why install a new browser when you can automate the one you already have?*

| Feature | AIPex | ChatGPT Atlas | Dia/Comet | Manus |
|---------|-------|---------------|-----------|-------|
| **Browser Migration** | None | Required | Required | None |
| **Pricing** | Free | Paid | Paid | Paid |
| **Open Source** | Yes | No | No | No |
| **Privacy** | Full | Partial | Partial | Partial |
| **BYOK** | Yes | No | No | No |

---

## Roadmap

- [ ] Multi-step workflow builder
- [ ] Scheduled automation
- [ ] More LLM providers (Claude, Gemini, local models)
- [ ] Firefox support

[View full roadmap →](https://github.com/buttercannfly/AIPex/issues)

---

## Contributing

We love contributions! See [DEVELOPMENT.md](DEVELOPMENT.md) for setup instructions.

---

<details>
<summary><strong>Tool Categories Overview</strong></summary>

### Tab Management — 8 tools
- `get_all_tabs` - Get all open tabs across all windows
- `get_current_tab` - Get information about the currently active tab  
- `switch_to_tab` - Switch to a specific tab by ID
- `create_new_tab` - Create a new tab with the specified URL
- `get_tab_info` - Get detailed information about a specific tab
- `duplicate_tab` - Duplicate an existing tab
- `close_tab` - Close a specific tab
- `get_current_tab_content` - Get the visible text content of the current tab

### Page Content & Interaction — 14 tools
- `get_page_metadata` - Get page metadata including title, description, keywords
- `extract_page_text` - Extract text content with word count and reading time
- `get_page_links` - Get all links from the current page
- `search_page_text` - Search for text on the current page
- `get_interactive_elements` - Get all interactive elements (links, buttons, inputs)
- `click_element` - Click an element using CSS selector
- `summarize_page` - Summarize page content with key points
- `fill_input` - Fill an input field with text
- `clear_input` - Clear the content of an input field
- `get_input_value` - Get the current value of an input field
- `submit_form` - Submit a form using CSS selector
- `get_form_elements` - Get all form elements and input fields
- `scroll_to_element` - Scroll to a DOM element and center it
- `highlight_element` - Permanently highlight DOM elements

### Downloads & Files — 4 tools
- `download_text_as_markdown` - Download text content as markdown file
- `download_image` - Download an image from base64 data
- `download_chat_images` - Download multiple images from chat messages
- `download_current_chat_images` - Download all images from current AI chat

### Screenshots — 3 tools
- `capture_screenshot` - Capture screenshot of current visible tab
- `capture_tab_screenshot` - Capture screenshot of a specific tab by ID
- `capture_screenshot_to_clipboard` - Capture screenshot and save to clipboard

</details>

---

## Contributors

<a href="https://github.com/buttercannfly/AIPex/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=buttercannfly/AIPex" />
</a>

---

## Star History

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
