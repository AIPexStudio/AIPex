<p align="center"><a href="https://claudechrome.com"><img alt="AIPex Browser Automation" src="https://github.com/user-attachments/assets/039768c0-1765-4a98-b020-57955e4a224a" width="100%" />
</a></p>

<strong><p align="center">Ваш браузер уже работает!</p></strong>


<p align="center">
  <a href="https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar">
    <img src="https://img.shields.io/badge/Chrome%20Web%20Store-Установить-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store">
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa">
    <img src="https://img.shields.io/badge/Edge%20Add--ons-Установить-0078D4?style=for-the-badge&logo=microsoft-edge&logoColor=white" alt="Edge Add-ons">
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

**AIPex** — Агент автоматизации браузера с открытым исходным кодом, который живет в вашем существующем браузере.

- **Нулевая миграция**: Не нужно устанавливать новый браузер. Не нужно изучать новый рабочий процесс.
- **Открытый исходный код**: Лицензия MIT. Полностью прозрачный, проверяемый и расширяемый.
- **Конфиденциальность прежде всего**: Ваши данные никогда не покидают вашу машину. Bring Your Own Key (BYOK).

---

## Почему мы создали это

Каждый инструмент автоматизации браузера просит вас:
- Установить отдельный браузер (Dia/Comet)
- Платить ежемесячную подписку (ChatGPT Atlas)
- Отказаться от ваших данных просмотра

**Мы спросили: почему автоматизация не может просто работать в браузере, который вы уже используете?**

AIPex — это ответ. Установите расширение, введите свой API-ключ и автоматизируйте что угодно — прямо там, где вы уже работаете.

---

## Быстрый старт

1. **Установить** — [Chrome Web Store](https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar) или [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa)
2. **Открыть** — Нажмите на значок AIPex
3. **Автоматизировать** — Введите или скажите, что вы хотите сделать, на естественном языке

---

## Использование с ИИ-агентами (MCP)

AIPex теперь поддерживает [Model Context Protocol (MCP)](https://modelcontextprotocol.io), позволяя ИИ-агентам, таким как Cursor, Claude Code и VS Code Copilot, напрямую управлять вашим браузером.

```
AI Agent ──stdio──▶ aipex-mcp-bridge ──WebSocket──▶ AIPex Extension ──▶ Browser
```

### Шаг 1: Настройка агента

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

### Шаг 2: Подключение расширения

1. Откройте Chrome → иконка AIPex → **Настройки**
2. Установите WebSocket URL: `ws://localhost:9223`
3. Нажмите **Подключить**

Ваш агент теперь имеет доступ к 30+ инструментам автоматизации браузера через MCP. См. [mcp-bridge/README.md](mcp-bridge/README.md) для расширенных настроек.

---

## Skill

AIPex предоставляет skill **`aipex-browser`** — готовый к использованию пакет для агентов, поддерживающих протокол skill (таких как [Claude Code](https://claude.ai/code) и среды выполнения, совместимые с [OpenClaw](https://openclaw.dev)).

Skill включает стратегию использования инструментов, полные схемы параметров для 30+ инструментов управления браузером и типовые паттерны автоматизации — агент может сразу эффективно управлять браузером без предварительного изучения.

Подробнее см. [`skill/SKILL.md`](skill/SKILL.md).

---

## Демонстрации

### "У меня открыто 100 вкладок. Помогите."

https://github.com/user-attachments/assets/4a4f2a64-691c-4783-965e-043b329a8035

### "Изучите эту тему, не покидая браузер"

https://github.com/user-attachments/assets/71ec4efd-d80e-4e8f-8e39-88baee3ec38e

### "Напишите твит за меня"

https://github.com/user-attachments/assets/81f6b482-84d0-4fd9-924b-dca634b208ec

### "Помогите мне сдать этот экзамен"

https://github.com/user-attachments/assets/ba454715-c759-41df-bf87-e835f76be365

---

## Сравнение AIPex

*Зачем устанавливать новый браузер, если вы можете автоматизировать тот, который у вас уже есть?*

| Функция | AIPex | ChatGPT Atlas | Dia/Comet | Manus |
|---------|-------|---------------|-----------|-------|
| **Миграция браузера** | Нет | Требуется | Требуется | Нет |
| **Цена** | Бесплатно | Платно | Платно | Платно |
| **Открытый исходный код** | Да | Нет | Нет | Нет |
| **Конфиденциальность** | Полная | Частичная | Частичная | Частичная |
| **BYOK** | Да | Нет | Нет | Нет |

---

## Вклад

Мы приветствуем вклад! См. [DEVELOPMENT.md](DEVELOPMENT.md) для инструкций по настройке.

---

## Участники

<a href="https://github.com/buttercannfly/AIPex/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=buttercannfly/AIPex" />
</a>

---

## История звезд

[![Star History Chart](https://api.star-history.com/svg?repos=buttercannfly/AIPex&type=Date)](https://star-history.com/#buttercannfly/AIPex&Date)

---

<p align="center">
  <strong>Сделано с ❤️ командой AIPex</strong>
</p>

<p align="center">
  <a href="https://github.com/buttercannfly/AIPex"><img src="https://img.shields.io/badge/GitHub-100000?logo=github&logoColor=white" alt="GitHub"></a>
  <a href="https://chromewebstore.google.com/detail/aipex-%E2%80%94%E2%80%94-tab-history-mana/iglkpadagfelcpmiidndgjgafpdifnke?hl=zh-CN&utm_source=ext_sidebar"><img src="https://img.shields.io/badge/Chrome-4285F4?logo=google-chrome&logoColor=white" alt="Chrome"></a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/aipex/fkgfflijckgpphikbceckjbofkicfnfa"><img src="https://img.shields.io/badge/Edge-0078D4?logo=microsoft-edge&logoColor=white" alt="Edge"></a>
</p>
