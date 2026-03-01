<p align="center"><a href="https://claudechrome.com"><img alt="AIPex Browser Automation" src="https://github.com/user-attachments/assets/039768c0-1765-4a98-b020-57955e4a224a" width="100%" />
</a></p>

<strong><p align="center">브라우저는 이미 작동합니다!</p></strong>


<p align="center">
  <a href="https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar">
    <img src="https://img.shields.io/badge/Chrome%20Web%20Store-설치-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store">
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa">
    <img src="https://img.shields.io/badge/Edge%20Add--ons-설치-0078D4?style=for-the-badge&logo=microsoft-edge&logoColor=white" alt="Edge Add-ons">
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
  <a href="README.md">English</a> | <a href="README.zh-CN.md">中文</a> | <a href="README.de.md">Deutsch</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.ja.md">日本語</a> | <a href="README.ko.md">한국어</a> | <a href="README.pt.md">Português</a> | <a href="README.ru.md">Русский</a>
</p>

<!-- TODO: Add a hero GIF here showing the core automation flow -->
<!-- <p align="center">
  <img src="assets/demo.gif" alt="AIPex Demo" width="600">
</p> -->

---

**AIPex** — 기존 브라우저에 상주하는 오픈 소스 브라우저 자동화 에이전트입니다.

- **마이그레이션 제로**: 새 브라우저를 설치할 필요가 없습니다. 새로운 워크플로를 배울 필요가 없습니다.
- **오픈 소스**: MIT 라이선스. 완전히 투명하고, 감사 가능하며, 확장 가능합니다.
- **개인정보 보호 우선**: 데이터는 절대 컴퓨터를 떠나지 않습니다. Bring Your Own Key (BYOK).

---

## 이것을 만든 이유

모든 브라우저 자동화 도구는 다음을 요구합니다:
- 별도의 브라우저 설치 (Dia/Comet)
- 월간 구독료 지불 (ChatGPT Atlas)
- 브라우징 데이터 포기

**우리는 질문했습니다: 왜 자동화는 이미 사용 중인 브라우저에서 실행될 수 없습니까?**

AIPex가 그 대답입니다. 확장 프로그램을 설치하고, 자신의 API 키를 가져와서, 이미 작업 중인 곳에서 무엇이든 자동화하세요.

---

## 빠른 시작

1. **설치** — [Chrome Web Store](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar) 또는 [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa)
2. **열기** — AIPex 아이콘 누르기
3. **자동화** — 하고 싶은 일을 자연어로 입력하거나 말하세요

---

## AI 에이전트와 연동 (MCP)

AIPex는 이제 [Model Context Protocol(MCP)](https://modelcontextprotocol.io)을 지원하여 Cursor, Claude Code, VS Code Copilot 등 AI 에이전트가 브라우저를 직접 제어할 수 있습니다.

```
AI Agent ──stdio──▶ aipex-mcp-bridge ──WebSocket──▶ AIPex Extension ──▶ Browser
```

### 1단계: 에이전트 설정

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

### 2단계: 확장 프로그램 연결

1. Chrome → AIPex 아이콘 → **옵션** 열기
2. WebSocket URL을 `ws://localhost:9223`으로 설정
3. **연결** 클릭

이제 에이전트는 MCP를 통해 30개 이상의 브라우저 자동화 도구를 사용할 수 있습니다. 자세한 설정은 [mcp-bridge/README.md](mcp-bridge/README.md)를 참고하세요.

---

## 스킬 (Skill)

AIPex는 **`aipex-browser`** 스킬을 제공합니다. [Claude Code](https://claude.ai/code) 및 [OpenClaw](https://openclaw.dev) 호환 런타임 등 스킬 프로토콜을 지원하는 에이전트가 바로 사용할 수 있는 브라우저 자동화 스킬 패키지입니다.

스킬에는 도구 사용 전략, 30개 이상의 브라우저 도구 파라미터 스키마, 자주 쓰이는 자동화 패턴이 포함되어 있어 에이전트가 시행착오 없이 효율적으로 브라우저를 제어할 수 있습니다.

자세한 내용은 [`skill/SKILL.md`](skill/SKILL.md)를 참고하세요.

---

## 데모

### "탭이 100개 열려 있습니다. 도와주세요."

https://github.com/user-attachments/assets/4a4f2a64-691c-4783-965e-043b329a8035

### "브라우저를 떠나지 않고 이 주제 조사하기"

https://github.com/user-attachments/assets/71ec4efd-d80e-4e8f-8e39-88baee3ec38e

### "나를 위해 트윗 작성하기"

https://github.com/user-attachments/assets/81f6b482-84d0-4fd9-924b-dca634b208ec

### "이 시험 합격 도와주기"

https://github.com/user-attachments/assets/ba454715-c759-41df-bf87-e835f76be365

---

## AIPex는 어떻게 비교되나요?

*이미 가지고 있는 브라우저를 자동화할 수 있는데 왜 새 브라우저를 설치합니까?*

| 기능 | AIPex | ChatGPT Atlas | Dia/Comet | Manus |
|------|-------|---------------|-----------|-------|
| **브라우저 마이그레이션** | 없음 | 필수 | 필수 | 없음 |
| **가격** | 무료 | 유료 | 유료 | 유료 |
| **오픈 소스** | 예 | 아니요 | 아니요 | 아니요 |
| **개인정보 보호** | 완전 | 부분 | 부분 | 부분 |
| **BYOK** | 예 | 아니요 | 아니요 | 아니요 |

---

## 기여하기

우리는 기여를 환영합니다! 설정 지침은 [DEVELOPMENT.md](DEVELOPMENT.md)를 참조하세요.

---

## 기여자

<a href="https://github.com/buttercannfly/AIPex/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=buttercannfly/AIPex" />
</a>

---

## 스타 기록

[![Star History Chart](https://api.star-history.com/svg?repos=buttercannfly/AIPex&type=Date)](https://star-history.com/#buttercannfly/AIPex&Date)

---

<p align="center">
  <strong>AIPex 팀이 ❤️로 만듦</strong>
</p>

<p align="center">
  <a href="https://github.com/buttercannfly/AIPex"><img src="https://img.shields.io/badge/GitHub-100000?logo=github&logoColor=white" alt="GitHub"></a>
  <a href="https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar"><img src="https://img.shields.io/badge/Chrome-4285F4?logo=google-chrome&logoColor=white" alt="Chrome"></a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa"><img src="https://img.shields.io/badge/Edge-0078D4?logo=microsoft-edge&logoColor=white" alt="Edge"></a>
</p>
