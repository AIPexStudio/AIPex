# 🛠️ Development Guide

This document contains all the information you need to set up and contribute to AIPex development.

## 🏗️ Local Development Setup

### Prerequisites
- Node.js (v16 or higher)
- pnpm (recommended) or npm
- Git

### 1. Clone the repository
```bash
git clone https://github.com/AIPexStudio/AIPex.git
cd AIPex
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Start development server
```bash
pnpm dev
```

### 4. Load in Chrome
- Go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select the `build/chrome-mv3-dev` folder

## 🧪 Building for Production
```bash
pnpm build
```

## 📁 Project Structure
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
- [Open a feature request](https://github.com/AIPexStudio/AIPex/issues/new)
- Describe the feature and its benefits
- Consider implementation complexity

### 🔧 Submit Code
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. [Open a Pull Request](https://github.com/AIPexStudio/AIPex/compare)

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
- [ ] **Advanced AI Models** - Support for multiple AI providers

## 🐛 Known Issues

- Some websites may have compatibility issues with the AI chat feature
- Tab grouping works best with AI token configured
- Performance may vary on older devices

## 🧪 Testing

### Running Tests
```bash
pnpm test
```

### Linting
```bash
pnpm lint
```

### Type Checking
```bash
pnpm type-check
```

## 📦 Build Configuration

The project uses Plasmo framework for Chrome extension development. Key configuration files:

- `plasmo.config.ts` - Plasmo configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

## 🔧 Development Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests |
| `pnpm lint` | Run linter |
| `pnpm type-check` | Run TypeScript type checking |

## 🌐 Environment Variables

Create a `.env` file in the root directory for local development:

```env
# AI API Configuration
AI_API_KEY=your_api_key_here
AI_API_URL=https://api.openai.com/v1

# Development Settings
NODE_ENV=development
DEBUG=true
```

## 📝 Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages
- Add JSDoc comments for complex functions

## 🚀 Deployment

### Chrome Web Store
1. Build the extension: `pnpm build`
2. Zip the `build/chrome-mv3-prod` folder
3. Upload to Chrome Web Store Developer Dashboard

### Manual Installation
1. Build the extension: `pnpm build`
2. Load `build/chrome-mv3-prod` folder in Chrome extensions page

## 🤝 Community Guidelines

- Be respectful and inclusive
- Follow the code of conduct
- Provide constructive feedback
- Help other contributors
- Share knowledge and best practices

## 📞 Getting Help

- [GitHub Issues](https://github.com/buttercannfly/AIPex/issues) - Report bugs and request features
- [GitHub Discussions](https://github.com/buttercannfly/AIPex/discussions) - Ask questions and share ideas
- [Documentation](README.md) - Main project documentation

---

**Happy coding! 🚀**
