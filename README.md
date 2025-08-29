# 🚀 AIPex - The Ultimate AI-Powered Browser Extension

> **Transform your browsing experience with intelligent tab management, AI assistance, and productivity tools**

<div align="right">
  <a href="README.md">🇺🇸 English</a> | <a href="README.zh-CN.md">🇨🇳 中文</a>
</div>

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-brightgreen)](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar)
[![GitHub stars](https://img.shields.io/github/stars/buttercannfly/AIPex?style=social)](https://github.com/buttercannfly/AIPex)
[![GitHub forks](https://img.shields.io/github/forks/buttercannfly/AIPex?style=social)](https://github.com/buttercannfly/AIPex)
[![GitHub issues](https://img.shields.io/github/issues/buttercannfly/AIPex)](https://github.com/buttercannfly/AIPex/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/buttercannfly/AIPex)](https://github.com/buttercannfly/AIPex/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

<div align="center">
  **⭐ Star this repo if you find it helpful! ⭐**
  
  [![Chrome Web Store](https://img.shields.io/badge/Install%20on%20Chrome%20Web%20Store-blue?logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar)
</div>

## 🌟 What is AIPex?

AIPex is a powerful Chrome extension that revolutionizes your browsing experience by combining **intelligent tab management** with **AI-powered assistance** and **advanced automation capabilities**. Think of it as your personal browser command center that helps you stay organized, productive, and efficient.

### 🎯 Why AIPex?

- 🤖 **AI-Powered**: Intelligent tab organization and AI chat assistance with 80+ MCP tools
- 🔬 **Auto Research**: Automatic topic research and content discovery
- 📧 **Email Automation**: Send emails automatically with AI assistance
- 🤖 **Browser Automation**: Automate virtually all browser operations
- ⚡ **Lightning Fast**: Quick access with keyboard shortcuts (⌘+M / Ctrl+M)
- 🎨 **Beautiful UI**: Modern, responsive design with dark mode support
- 🔧 **Highly Customizable**: Tailor the experience to your workflow
- 🌐 **Universal**: Works with all major websites and tools

## ✨ Key Features

### 🔬 Research Topic
- **AI-Powered Research**: Intelligent topic research and analysis
- **Smart Content Discovery**: Find relevant information and resources
- **Research Organization**: Organize and track your research topics
- **Enhanced Learning**: Get deeper insights into any subject

![Research Topic](gif/research.gif)

> 📺 **Watch the demo**: [Research Topic Feature Demo](https://youtu.be/vrp7OCxGy_Y)

### 🗂️ Smart Tab Management
- **AI-Powered Organization**: Automatically group related tabs using AI
- **Quick Tab Switching**: Find and switch between tabs instantly
- **Tab Actions**: Pin, mute, reload, and manage tabs efficiently
- **Tab Search**: Search through all your open tabs with smart filtering

![Smart Tab Organization](gif/organize-tabs.gif)

### 🤖 AI Assistant Sidebar
- **Intelligent Chat**: Have conversations with AI directly in your browser
- **Context-Aware**: AI understands your current page and browsing context
- **Multi-Modal**: Text chat with potential for image processing
- **Web Search Integration**: Get real-time information and answers

![AI Chatbot Sidebar](gif/AI.gif)

### 🔍 Enhanced Search & History
- **Smart History Search**: Find previously visited pages quickly
- **Bookmark Management**: Organize and search through bookmarks
- **Advanced Filtering**: Use special commands for precise searches
- **Browsing Analytics**: Track your browsing patterns

![Management Interface](gif/preview.gif)

### 🌐 Google Search Enhancement
- **AI-Powered Insights**: Get additional context for search results
- **Smart Suggestions**: Enhanced search recommendations
- **Quick Actions**: Perform actions directly from search results

![Google Search Enhancement](gif/google.gif)

### 🤖 Advanced Browser Automation
- **Natural Language Commands**: Control your browser with simple text commands
- **Multi-Step Workflows**: Automate complex sequences of browser actions
- **Data Extraction**: Extract and organize information from any website
- **Form Automation**: Fill forms, submit data, and interact with web elements
- **Cross-Site Operations**: Perform tasks across multiple websites simultaneously

## 🚀 Getting Started

### Quick Start
1. **Install from Chrome Web Store** (Recommended)
   - [Click here to install](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar)

2. **Open AIPex**
   - Press `⌘+M` (Mac) or `Ctrl+M` (Windows/Linux)
   - Or click the AIPex icon in your toolbar

3. **Start Using**
   - Type `/tabs` to search tabs
   - Type `/ai` to start AI chat
   - Use the command palette for quick actions

### Keyboard Shortcuts
| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open AIPex | `⌘+M` | `Ctrl+M` |
| New Tab | `⌘+T` | `Ctrl+T` |
| Pin Tab | `⌥+⇧+P` | `Alt+Shift+P` |
| Mute Tab | `⌥+⇧+M` | `Alt+Shift+M` |
| Fullscreen | `⌘+Ctrl+F` | `Ctrl+F` |
| Reload | `⌘+⇧+R` | `Ctrl+Shift+R` |

## 🛠️ Development & Contributing

We love contributions! Here's how you can help make AIPex even better:

### 🏗️ Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/buttercannfly/AIPex.git
   cd AIPex
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build/chrome-mv3-dev` folder

### 🧪 Building for Production
```bash
pnpm build
```

### 📁 Project Structure
```
src/
├── background.ts          # Extension background script
├── content.tsx           # Content script for web pages
├── newtab.tsx           # New tab page
├── sidepanel.tsx        # Sidebar panel
├── features/            # Feature components
│   ├── ai-chat.tsx     # AI chat functionality
│   └── count-button.tsx # Utility components
├── lib/                 # Shared libraries
│   └── components/      # Reusable UI components
└── mcp/                 # MCP (Model Context Protocol) integration
```

## 🤝 How to Contribute

We welcome all types of contributions! Here's how you can help:

### 🐛 Report Bugs
- [Create an issue](https://github.com/buttercannfly/AIPex/issues/new) with a clear description
- Include steps to reproduce the bug
- Add screenshots if applicable

### 💡 Suggest Features
- [Open a feature request](https://github.com/buttercannfly/AIPex/issues/new)
- Describe the feature and its benefits
- Consider implementation complexity

### 🔧 Submit Code
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. [Open a Pull Request](https://github.com/buttercannfly/AIPex/compare)

### 📚 Improve Documentation
- Fix typos and grammar
- Add missing information
- Improve code comments
- Create tutorials or guides

### 🎨 Design & UI
- Suggest UI improvements
- Create new icons or assets
- Improve accessibility
- Optimize for different screen sizes



## 📊 Development Status

### ✅ Completed Features
- [x] **Tab Manager** - Switch, organize, and manage tabs
- [x] **History Manager** - Search and browse history
- [x] **Bookmark Manager** - Organize bookmarks efficiently
- [x] **AI Chatbot Sidebar** - Intelligent conversations
- [x] **Keyboard Shortcuts** - Quick access commands
- [x] **Dark Mode Support** - Beautiful dark theme
- [x] **Google Search Enhancement** - AI-powered insights
- [x] **Form & Input Management** - Fill forms, manage inputs, and interact with web elements

### 🚧 In Progress
- [ ] **Enhanced AI Toolbar** - Real-time translation and summarization
- [ ] **Advanced Chatbot Features** - Image processing and web search
- [ ] **Tab Analytics** - Browsing pattern insights
- [ ] **Custom Themes** - User-defined color schemes

### 🎯 Roadmap
- [ ] **Firefox Support** - Cross-browser compatibility
- [ ] **Mobile Extension** - Mobile browser support
- [ ] **API Integration** - Connect with external services

## 🤖 Browser Automation Use Cases

AIPex excels at automating complex browser tasks through natural language commands. Here are some powerful use cases:

### 🔍 Research & Information Gathering
- **"Please use Google to research topic 'MCP'"** - Automatically search and gather information about any topic
- **"Find the latest news about AI developments"** - Search for recent news and articles
- **"Research the best practices for React development"** - Gather comprehensive information from multiple sources
- **"Find tutorials for learning TypeScript"** - Discover educational resources and guides

### 📊 Data Collection & Analysis
- **"Please help me find the first star for https://github.com/AIPexStudio/aipex"** - Extract specific information from web pages
- **"Get the current price of Bitcoin from multiple sources"** - Collect real-time data from various websites
- **"Find all the contributors to this GitHub repository"** - Extract and organize data from GitHub pages
- **"Compare prices of laptops across different e-commerce sites"** - Gather pricing information for comparison

### 📧 Email & Communication Automation
- **"Draft an email to schedule a meeting next week"** - Automatically compose emails with AI assistance
- **"Send a follow-up email to my last contact"** - Automate email sequences and follow-ups
- **"Find contact information for tech companies in San Francisco"** - Research and collect contact details

### 🛒 E-commerce & Shopping
- **"Find the best deals on wireless headphones"** - Search across multiple shopping sites
- **"Track price changes for this product"** - Monitor price fluctuations
- **"Find customer reviews for this item"** - Gather user feedback and ratings
- **"Compare specifications between different smartphone models"** - Extract and compare product details

### 📝 Content Creation & Management
- **"Summarize this article and save it to my notes"** - Extract and summarize web content
- **"Find similar articles to this one"** - Discover related content across the web
- **"Create a reading list about machine learning"** - Compile resources on specific topics
- **"Save all images from this page to my downloads"** - Batch download content

### 🔧 Development & Technical Tasks
- **"Find the documentation for this API"** - Locate technical documentation
- **"Check if this npm package is still maintained"** - Research package status and maintenance
- **"Find code examples for this programming concept"** - Gather coding tutorials and examples
- **"Monitor GitHub issues for this repository"** - Track project updates and issues

### 📈 Business Intelligence
- **"Research competitors in the AI space"** - Gather competitive intelligence
- **"Find market trends for renewable energy"** - Collect market research data
- **"Track social media mentions of our brand"** - Monitor brand presence online
- **"Analyze customer reviews for our product"** - Gather and analyze user feedback

### 🎓 Learning & Education
- **"Create a study plan for learning Python"** - Organize educational resources
- **"Find practice exercises for JavaScript"** - Discover learning materials
- **"Research the latest developments in quantum computing"** - Stay updated on cutting-edge topics
- **"Find online courses for data science"** - Discover educational opportunities

### 🏠 Personal Productivity
- **"Find the best restaurants near my location"** - Discover local businesses
- **"Research travel options for my vacation"** - Plan trips and find deals
- **"Track my favorite sports team's schedule"** - Get sports information and updates
- **"Find recipes for dinner tonight"** - Discover cooking inspiration

## 🆕 Latest Features
- **Smart Form Filling**: Automatically fill out web forms using AI
- **Input Field Operations**: Clear, read, and modify input fields
- **Form Discovery**: Find and analyze all forms on web pages
- **Interactive Elements**: Click buttons and interact with page elements
- **Form Submission**: Submit forms automatically

**New AI Tools Available:**
- `fill_input` - Fill input fields with text
- `clear_input` - Clear input field content
- `get_input_value` - Read current input values
- `submit_form` - Submit web forms
- `get_form_elements` - Discover all forms and inputs
- `click_element` - Click page elements
- `get_interactive_elements` - Find clickable elements
- [ ] **Advanced AI Models** - Support for multiple AI providers

## 🐛 Known Issues

- Some websites may have compatibility issues with the AI chat feature
- Tab grouping works best with AI token configured
- Performance may vary on older devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Support & Community

### 💬 Get Help
- [GitHub Issues](https://github.com/buttercannfly/AIPex/issues) - Report bugs and request features
- [GitHub Discussions](https://github.com/buttercannfly/AIPex/discussions) - Ask questions and share ideas
- [Chrome Web Store Reviews](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar) - Leave a review

### 🌟 Show Your Support
If AIPex has improved your browsing experience, please consider:

- ⭐ **Star this repository** - It helps others discover the project
- 🐛 **Report issues** - Help us improve by reporting bugs
- 💡 **Suggest features** - Share your ideas for new functionality
- 📝 **Write reviews** - Leave a review on the Chrome Web Store
- 🤝 **Contribute code** - Submit pull requests and improvements
- 📢 **Spread the word** - Share with friends and colleagues

### 🏆 Sponsors
Support the development of AIPex by becoming a sponsor:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor%20on%20GitHub-red?logo=github&logoColor=white)](https://github.com/sponsors/buttercannfly)

---

## 🏆 Contributors

<!-- 使用多种方式展示贡献者，确保完整性 -->
<a href="https://github.com/buttercannfly/AIPex/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=buttercannfly/AIPex" alt="Contributors" />
</a>



<div align="center">
  <strong>Made with ❤️ by the AIPex Community</strong>
  
  <p>If you find this project helpful, please give it a ⭐ star!</p>
  
  <a href="https://github.com/buttercannfly/AIPex">
    <img src="https://img.shields.io/github/stars/buttercannfly/AIPex?style=for-the-badge&logo=github" alt="GitHub stars">
  </a>
</div>


