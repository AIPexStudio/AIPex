# AIPex

> **你的下一个AI浏览器，何必需要迁移？**
> 
> 开源、免费、隐私保护。直接在你现有的浏览器里跑。

<div align="right">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">中文</a>
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

<p align="center">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/Q_KmyMJ11wc?si=NSZp--QxIKyWl88C" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</p>

---

|  |  |
|---|---|
| **零迁移成本** | 使用你现有的浏览器，无需学习新工具 |
| **完全开源** | MIT 协议，代码透明，可自由扩展 |
| **隐私优先** | 数据不离开本地，支持自带密钥（BYOK） |

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
2. **打开** — 按 `Cmd+M` (Mac) / `Ctrl+M` (Windows)
3. **开始自动化** — 用自然语言说出你想做的事

---

## 看看它能做什么

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

## 路线图

- [ ] 多步骤工作流构建器
- [ ] 定时自动化任务
- [ ] 更多 LLM 提供商（Claude、Gemini、本地模型）
- [ ] Firefox 支持

[查看完整路线图 →](https://github.com/buttercannfly/AIPex/issues)

---

## 加入社区

有问题？想分享你的自动化工作流？

<p align="center">
  <a href="https://discord.gg/sfZC3G5qfe">
    <img src="https://img.shields.io/badge/加入%20Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Discord">
  </a>
  <a href="https://x.com/weikangzhang3">
    <img src="https://img.shields.io/badge/关注%20X-000000?style=for-the-badge&logo=x&logoColor=white" alt="X/Twitter">
  </a>
  <a href="https://www.youtube.com/@aipex-chrome-extension">
    <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube">
  </a>
</p>

---

## 贡献代码

我们欢迎贡献！查看 [DEVELOPMENT.md](DEVELOPMENT.md) 了解开发设置。

---

<details>
<summary><strong>工具类别概览</strong></summary>

### 标签页管理 — 8 个工具
- `get_all_tabs` - 获取所有窗口中的所有打开标签页
- `get_current_tab` - 获取当前活动标签页的信息  
- `switch_to_tab` - 通过 ID 切换到特定标签页
- `create_new_tab` - 使用指定 URL 创建新标签页
- `get_tab_info` - 获取特定标签页的详细信息
- `duplicate_tab` - 复制现有标签页
- `close_tab` - 关闭特定标签页
- `get_current_tab_content` - 获取当前标签页的可见文本内容

### 页面内容和交互 — 14 个工具
- `get_page_metadata` - 获取页面元数据，包括标题、描述、关键词
- `extract_page_text` - 提取文本内容，包括字数统计和阅读时间
- `get_page_links` - 获取当前页面的所有链接
- `search_page_text` - 在当前页面搜索文本
- `get_interactive_elements` - 获取所有交互元素（链接、按钮、输入框）
- `click_element` - 使用 CSS 选择器点击元素
- `summarize_page` - 总结页面内容和要点
- `fill_input` - 在输入框中填写文本
- `clear_input` - 清除输入框的内容
- `get_input_value` - 获取输入框的当前值
- `submit_form` - 使用 CSS 选择器提交表单
- `get_form_elements` - 获取所有表单元素和输入字段
- `scroll_to_element` - 滚动到 DOM 元素并居中
- `highlight_element` - 永久高亮 DOM 元素

### 下载和文件 — 4 个工具
- `download_text_as_markdown` - 将文本内容下载为 markdown 文件
- `download_image` - 从 base64 数据下载图像
- `download_chat_images` - 从聊天消息下载多个图像
- `download_current_chat_images` - 从当前 AI 聊天下载所有图像

### 截图 — 3 个工具
- `capture_screenshot` - 捕获当前可见标签页的截图
- `capture_tab_screenshot` - 通过 ID 捕获特定标签页的截图
- `capture_screenshot_to_clipboard` - 捕获截图并保存到剪贴板

</details>

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
