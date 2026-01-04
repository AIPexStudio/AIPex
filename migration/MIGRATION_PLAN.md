# Private 分支功能迁移计划书

**日期**: 2026-01-03
**源分支**: private
**目标分支**: feature-next-rob
**目标**: 将 private 分支的高级功能迁移到多包架构中

---

## 一、背景与概述

### 1.1 现状分析

| 项目 | Private 分支 | Feature-next-rob 分支 |
|-----|-------------|---------------------|
| **架构** | 单体结构 (`src/`) | 多包架构 (`packages/`) |
| **文件数量** | 179 个文件 | 4 个包，清晰分层 |
| **MCP 工具** | 20+ 完整工具 | 60+ 基础工具 |
| **代码组织** | 混合关注点 | 层级分离 |

### 1.2 迁移范围

- **代码量**: ~55,000 行新增代码
- **文件数**: 179 个文件需要迁移/合并
- **主要功能系统**: 10 个

### 1.3 多包架构说明

```
packages/
├── core/                      # 纯 TypeScript 接口定义
│   ├── agent/                 # Agent 抽象
│   ├── conversation/          # 对话模型
│   └── tools/                 # 工具接口
│
├── browser-runtime/           # Chrome 实现层
│   ├── automation/            # CDP 自动化、快照
│   ├── context/               # 上下文提供者
│   ├── intervention/          # 干预系统 (待完善)
│   ├── runtime/               # 运行时主机
│   ├── storage/               # 存储适配器
│   ├── tools/                 # 浏览器工具 (待扩展)
│   ├── voice/                 # 语音系统 (待添加)
│   ├── vm/                    # QuickJS VM (待添加)
│   └── skill/                 # 技能系统 (待添加)
│
├── aipex-react/               # 平台无关的 UI 库
│   ├── components/            # React 组件
│   ├── adapters/              # 聊天、运行时适配器
│   └── hooks/                 # React Hooks
│
└── browser-ext/               # 扩展程序入口
    ├── background/            # 后台脚本
    ├── content/               # 内容脚本
    └── sidepanel/             # 侧边栏
```

---

## 二、架构依赖规则

```
                    ┌─────────────────┐
                    │     @core       │
                    │   (纯 TS 接口)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              │              ▼
    ┌─────────────────┐      │     ┌─────────────────┐
    │ @browser-runtime│      │     │  @aipex-react   │
    │  (Chrome 实现)  │      │     │   (React UI)    │
    └────────┬────────┘      │     └────────┬────────┘
             │               │              │
             │               │              │
             └───────────────┼──────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   @use-cases    │
                    │  (顶层应用层)    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   browser-ext   │
                    │   (扩展入口)     │
                    └─────────────────┘
```

### 关键规则

| 规则 | 说明 |
|-----|------|
| ✅ `@core` → 无依赖 | 纯 TypeScript，不依赖任何平台 |
| ✅ `@browser-runtime` → `@core` | 仅依赖 core 接口 |
| ✅ `@aipex-react` → `@core` | 仅依赖 core 接口 |
| ❌ `@aipex-react` → `@browser-runtime` | **禁止**，保持 UI 层平台无关 |
| ✅ `browser-ext` → 所有包 | 最终组装点 |

---

## 三、迁移阶段详解

### 阶段一: MCP 工具增强
**预计工时**: 3-4 天
**优先级**: 🔴 HIGH

#### 目标
扩展现有工具集，增强核心自动化能力

#### 现状
- 当前分支: 已有 60+ 工具（书签、剪贴板、下载、历史等）
- 缺失: `snapshot-manager` 增强版、`smart-locator`、`ui-operations`

#### 待迁移文件

| Private 路径 | 目标路径 | 行数 | 说明 |
|-------------|---------|------|------|
| `src/mcp-servers/snapshot-manager.ts` | `packages/browser-runtime/src/automation/snapshot-manager.ts` | ~1064 | 增强版，含 Accessibility Tree |
| `src/mcp-servers/smart-locator.ts` | `packages/browser-runtime/src/automation/smart-locator.ts` | ~400 | AI 驱动的元素定位 |
| `src/mcp-servers/ui-operations.ts` | `packages/browser-runtime/src/tools/ui-operations/` | ~500 | 高级 UI 交互 |
| `src/mcp-servers/debugger-manager.ts` | `packages/browser-runtime/src/automation/debugger-manager.ts` | ~300 | CDP 调试器控制 |
| `src/mcp-servers/cdp-comander.ts` | `packages/browser-runtime/src/automation/cdp-commander.ts` | 待确认 | CDP 命令封装 |

#### 增强版 Snapshot Manager 关键特性
- **Accessibility Tree 集成**: 使用 Chrome CDP `Accessibility.getFullAXTree`
- **智能节点 ID 管理**: 持久化 `data-aipex-nodeid` 属性
- **两遍算法**: Puppeteer 风格的有趣节点收集
- **并发控制**: 使用 p-limit 高效 CDP 操作
- **搜索与查询**: 带上下文的高级快照搜索

#### 实施步骤
1. 比对现有 `snapshot-manager.ts` 与 private 版本差异
2. 合并增强功能
3. 迁移 `smart-locator.ts`
4. 迁移 `ui-operations.ts`
5. 更新工具导出索引
6. 编写测试用例

---

### 阶段二: 干预系统完成
**预计工时**: 3-4 天
**优先级**: 🔴 HIGH
**依赖**: 阶段一

#### 目标
完成人机交互干预系统的实现和 UI 组件

#### 现状
- 当前分支: 仅有类型定义 (`packages/browser-runtime/src/intervention/types.ts`)
- Private 分支: 完整实现（14 个文件）

#### 待迁移文件

**逻辑层 → @browser-runtime**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/interventions/lib/intervention-manager.ts` | `packages/browser-runtime/src/intervention/intervention-manager.ts` |
| `src/interventions/lib/intervention-registry.ts` | `packages/browser-runtime/src/intervention/intervention-registry.ts` |
| `src/interventions/lib/element-capture-common.ts` | `packages/browser-runtime/src/intervention/element-capture.ts` |
| `src/interventions/implementations/monitor-operation.ts` | `packages/browser-runtime/src/intervention/implementations/monitor-operation.ts` |
| `src/interventions/implementations/voice-input.ts` | `packages/browser-runtime/src/intervention/implementations/voice-input.ts` |
| `src/interventions/implementations/user-selection.ts` | `packages/browser-runtime/src/intervention/implementations/user-selection.ts` |
| `src/interventions/mcp-servers/interventions.ts` | `packages/browser-runtime/src/tools/interventions/index.ts` |

**UI 层 → @aipex-react**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/interventions/components/InterventionCard.tsx` | `packages/aipex-react/src/components/intervention/InterventionCard.tsx` |
| `src/interventions/components/MonitorCard.tsx` | `packages/aipex-react/src/components/intervention/MonitorCard.tsx` |
| `src/interventions/components/VoiceCard.tsx` | `packages/aipex-react/src/components/intervention/VoiceCard.tsx` |
| `src/interventions/components/SelectionCard.tsx` | `packages/aipex-react/src/components/intervention/SelectionCard.tsx` |
| `src/interventions/components/InterventionModeToggle.tsx` | `packages/aipex-react/src/components/intervention/InterventionModeToggle.tsx` |

#### 干预系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   Intervention Manager                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │    Queue    │  │   Timeout   │  │  Page Monitor   │  │
│  │  Management │  │   Handler   │  │   (Navigation)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │  Monitor  │   │   Voice   │   │ Selection │
    │ Operation │   │   Input   │   │           │
    └───────────┘   └───────────┘   └───────────┘
```

#### 实施步骤
1. 扩展现有 `intervention/types.ts`
2. 迁移 `intervention-manager.ts` 和 `intervention-registry.ts`
3. 迁移 3 种干预实现
4. 迁移 UI 组件到 `@aipex-react`
5. 创建干预系统 MCP 工具
6. 集成测试

---

### 阶段三: 语音输入系统
**预计工时**: 2-3 天
**优先级**: 🟡 MEDIUM
**依赖**: 阶段二

#### 目标
添加多源语音输入能力和 3D 可视化

#### 语音源支持
1. **Web Speech API** - 浏览器原生，免费，实时
2. **ElevenLabs STT** - 高质量，付费 API
3. **Server STT** - 自定义后端集成
4. **自动回退** - 源之间自动切换

#### 待迁移文件

**API 层 → @browser-runtime**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/lib/voice/voice-input-manager.ts` | `packages/browser-runtime/src/voice/voice-input-manager.ts` |
| `src/lib/voice/audio-recorder.ts` | `packages/browser-runtime/src/voice/audio-recorder.ts` |
| `src/lib/voice/vad-detector.ts` | `packages/browser-runtime/src/voice/vad-detector.ts` |
| `src/lib/voice/elevenlabs-stt.ts` | `packages/browser-runtime/src/voice/elevenlabs-stt.ts` |
| `src/lib/voice/server-stt.ts` | `packages/browser-runtime/src/voice/server-stt.ts` |

**UI 层 → @aipex-react**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/lib/components/voice-mode/voice-input.tsx` | `packages/aipex-react/src/components/voice/VoiceInput.tsx` |
| `src/lib/components/voice-mode/particle-system.ts` | `packages/aipex-react/src/components/voice/particle-system.ts` |
| `src/lib/components/voice-mode/shaders.ts` | `packages/aipex-react/src/components/voice/shaders.ts` |
| `src/lib/components/voice-mode/config.ts` | `packages/aipex-react/src/components/voice/config.ts` |
| `src/lib/components/voice-mode/types.ts` | `packages/aipex-react/src/components/voice/types.ts` |

#### 3D 可视化特性
- WebGL 粒子系统
- 音频响应式球形动画
- 平滑视觉反馈
- 正确的卸载清理

---

### 阶段四: 上下文增强
**预计工时**: 1-2 天
**优先级**: 🟢 MEDIUM

#### 目标
添加 Token 追踪和上下文优化功能

#### 待迁移文件 → @browser-runtime

| Private 路径 | 目标路径 | 说明 |
|-------------|---------|------|
| `src/lib/context/token-usage.ts` | `packages/browser-runtime/src/context/token-usage.ts` | Token 使用统计 |
| `src/lib/context/usage-tracker.ts` | `packages/browser-runtime/src/context/usage-tracker.ts` | 使用追踪器 |
| `src/lib/context/context-optimizer.ts` | `packages/browser-runtime/src/context/context-optimizer.ts` | 智能压缩 |
| `src/lib/context/background-context-manager.ts` | `packages/browser-runtime/src/context/background-context-manager.ts` | 异步操作 |
| `src/lib/context/simple-tokenizer.ts` | `packages/browser-runtime/src/context/simple-tokenizer.ts` | 简单分词器 |
| `src/lib/context/actual-tokenizer.ts` | `packages/browser-runtime/src/context/actual-tokenizer.ts` | 精确分词器 |
| `src/lib/context/config.ts` | `packages/browser-runtime/src/context/config.ts` | 配置 |
| `src/lib/context/types.ts` | `packages/browser-runtime/src/context/types.ts` | 类型定义 |

---

### 阶段五: QuickJS 虚拟机
**预计工时**: 2-3 天
**优先级**: 🟡 MEDIUM
**依赖**: 阶段四

#### 目标
为技能系统添加沙箱化 JavaScript 执行环境

#### 新增依赖
- `@jitl/quickjs-wasmfile-release-sync` (~1.2MB WASM)
- `@zenfs/core` (虚拟文件系统)
- `p-limit` (并发控制)

#### 待迁移文件 → @browser-runtime

| Private 路径 | 目标路径 | 说明 |
|-------------|---------|------|
| `src/lib/vm/quickjs-manager.ts` | `packages/browser-runtime/src/vm/quickjs-manager.ts` | VM 主管理器 |
| `src/lib/vm/zenfs-manager.ts` | `packages/browser-runtime/src/vm/zenfs-manager.ts` | 虚拟文件系统 |
| `src/lib/vm/skill-api.ts` | `packages/browser-runtime/src/vm/skill-api.ts` | 技能 API |
| `src/lib/vm/migration.ts` | `packages/browser-runtime/src/vm/migration.ts` | 迁移工具 |
| `src/lib/vm/bundled-modules/` | `packages/browser-runtime/src/vm/bundled-modules/` | 预打包模块 |

#### QuickJS 特性
- 浏览器中的 JavaScript 运行时
- CDN 模块加载与缓存
- ZenFS 虚拟文件系统集成
- 内存管理和池化
- 安全沙箱

---

### 阶段六: 技能系统
**预计工时**: 3-4 天
**优先级**: 🟡 MEDIUM
**依赖**: 阶段五 (QuickJS)

#### 目标
实现技能包的安装、管理和执行

#### 待迁移文件

**逻辑层 → @browser-runtime**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/skill/lib/services/skill-manager.ts` | `packages/browser-runtime/src/skill/skill-manager.ts` |
| `src/skill/lib/services/skill-registry.ts` | `packages/browser-runtime/src/skill/skill-registry.ts` |
| `src/skill/lib/services/skill-executor.ts` | `packages/browser-runtime/src/skill/skill-executor.ts` |
| `src/skill/lib/storage/skill-storage.ts` | `packages/browser-runtime/src/skill/skill-storage.ts` |
| `src/skill/lib/utils/zip-utils.ts` | `packages/browser-runtime/src/skill/zip-utils.ts` |
| `src/skill/mcp-servers/skills.ts` | `packages/browser-runtime/src/tools/skills/index.ts` |

**UI 层 → @aipex-react**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/skill/components/skills/SkillCard.tsx` | `packages/aipex-react/src/components/skill/SkillCard.tsx` |
| `src/skill/components/skills/SkillDetails.tsx` | `packages/aipex-react/src/components/skill/SkillDetails.tsx` |
| `src/skill/components/skills/SkillList.tsx` | `packages/aipex-react/src/components/skill/SkillList.tsx` |
| `src/skill/components/skills/SkillUploader.tsx` | `packages/aipex-react/src/components/skill/SkillUploader.tsx` |
| `src/skill/components/file-manager/*.tsx` | `packages/aipex-react/src/components/file-manager/` |

**内置技能 → browser-ext**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/skill/built-in/skill-creator-browser/` | `packages/browser-ext/src/built-in-skills/skill-creator-browser/` |

#### 技能系统功能
- 从 .zip 文件安装技能
- 启用/禁用技能
- 在沙箱 VM 中执行
- 文件管理器 UI
- MCP 工具集成

---

### 阶段七: 用例系统
**预计工时**: 4-5 天
**优先级**: 🟢 HIGH VALUE
**依赖**: 阶段六

#### 目标
创建顶层用例包，迁移 6 个用例

#### 用例概览

| 用例 | 状态 | 复杂度 | 关键功能 |
|-----|------|-------|---------|
| `user-guide-generator` | ⭐ 旗舰 | HIGH | 步骤录制、GIF 生成、PDF/Markdown 导出 |
| `accessibility-testing` | 完整 | MEDIUM | 可访问性审计、报告生成 |
| `batch-submit-jobs` | 完整 | MEDIUM | 批量表单提交 |
| `batch-submit-backlinks` | 完整 | MEDIUM | 反向链接提交 |
| `e2e-testing` | 完整 | MEDIUM | E2E 测试场景执行 |
| `design-comparison` | 完整 | LOW | 视觉对比 |

#### User Guide Generator 详细功能

**步骤录制**
- 通过 DOM 变化自动检测步骤
- 手动步骤标记
- AI 生成步骤描述
- 每步截图捕获
- 每步 DOM 快照

**截图管理**
- 缓冲系统（循环缓冲）
- S3 上传集成
- 大型指南的懒加载
- 元素高亮 Spotlight

**导出格式**
- **PDF**: 使用 pdf-lib (~742 行)
- **Markdown**: 嵌入图片
- **GIF**: 带 Spotlight 效果的动画演示
- **JSON**: 原始数据导出

#### 待迁移文件

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/use-cases/index.ts` | `packages/use-cases/src/index.ts` |
| `src/use-cases/schemas.ts` | `packages/use-cases/src/schemas.ts` |
| `src/use-cases/runtime-manager.tsx` | `packages/use-cases/src/runtime-manager.tsx` |
| `src/use-cases/view-manager.tsx` | `packages/use-cases/src/view-manager.tsx` |
| `src/use-cases/components/*.tsx` | `packages/use-cases/src/components/` |
| `src/use-cases/user-guide-generator/*` | `packages/use-cases/src/user-guide-generator/` |
| `src/use-cases/accessibility-testing/*` | `packages/use-cases/src/accessibility-testing/` |
| ... 其他用例 | ... |

#### 包结构 (新建)

```
packages/use-cases/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── schemas.ts
│   ├── runtime-manager.tsx
│   ├── view-manager.tsx
│   ├── components/
│   │   ├── UseCasesHome.tsx
│   │   └── UserManualHistory.tsx
│   ├── user-guide-generator/
│   │   ├── index.ts
│   │   ├── UseCaseDetail.tsx
│   │   ├── StepsPreview.tsx
│   │   ├── gif-generator.ts
│   │   ├── pdf-exporter.ts
│   │   ├── markdown-exporter.ts
│   │   ├── screenshot-buffer.ts
│   │   └── spotlight-overlay.tsx
│   ├── accessibility-testing/
│   ├── batch-submit-jobs/
│   ├── batch-submit-backlinks/
│   ├── e2e-testing/
│   └── design-comparison/
```

---

### 阶段八: 服务与辅助功能
**预计工时**: 2-3 天
**优先级**: 🟢 LOW
**依赖**: 阶段七

#### 目标
迁移版本管理、认证、聊天增强等辅助功能

#### 待迁移文件

**服务层 → browser-ext**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/lib/services/version-checker.ts` | `packages/browser-ext/src/services/version-checker.ts` |
| `src/lib/services/web-auth.ts` | `packages/browser-ext/src/services/web-auth.ts` |
| `src/lib/services/user-manuals-api.ts` | `packages/browser-ext/src/services/user-manuals-api.ts` |
| `src/lib/services/screenshot-upload.ts` | `packages/browser-ext/src/services/screenshot-upload.ts` |
| `src/lib/services/replay-controller.ts` | `packages/browser-ext/src/services/replay-controller.ts` |
| `src/lib/services/ai-config.ts` | `packages/browser-ext/src/services/ai-config.ts` |
| `src/lib/services/recording-upload.ts` | `packages/browser-ext/src/services/recording-upload.ts` |
| `src/lib/services/tool-manager.ts` | `packages/browser-ext/src/services/tool-manager.ts` |

**UI 组件 → @aipex-react**

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/lib/components/chatbot/conversation-history.tsx` | `packages/aipex-react/src/components/chatbot/components/conversation-history.tsx` |
| `src/lib/components/chatbot/update-banner.tsx` | `packages/aipex-react/src/components/chatbot/components/update-banner.tsx` |
| `src/lib/components/chatbot/TokenUsageIndicator.tsx` | `packages/aipex-react/src/components/chatbot/components/token-usage.tsx` |
| `src/lib/components/chatbot/replay-progress-overlay.tsx` | `packages/aipex-react/src/components/chatbot/components/replay-progress.tsx` |
| `src/lib/components/auth/AuthProvider.tsx` | `packages/aipex-react/src/components/auth/AuthProvider.tsx` |
| `src/lib/components/auth/UserProfile.tsx` | `packages/aipex-react/src/components/auth/UserProfile.tsx` |

---

### 阶段九: 国际化与收尾
**预计工时**: 1-2 天
**优先级**: 🟢 LOW
**依赖**: 阶段八

#### 目标
迁移 i18n 配置，确保多语言支持，完成文档更新

#### 待迁移文件

| Private 路径 | 目标路径 |
|-------------|---------|
| `src/lib/i18n/locales/en.json` | `packages/aipex-react/src/i18n/locales/en.json` |
| `src/lib/i18n/locales/zh.json` | `packages/aipex-react/src/i18n/locales/zh.json` |
| 其他语言文件 | 合并到现有 i18n 结构 |

#### 收尾工作
1. 运行 `npm run preflight` 确保所有测试通过
2. 更新 README.md
3. 更新 CLAUDE.md 文档
4. 清理未使用的代码和导入
5. 性能基准测试
6. 删除本计划文件或标记为已完成

---

## 四、风险评估

### 高风险项

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| QuickJS VM 集成复杂 | 阻塞技能系统 | 充分测试，提供功能开关，延迟加载 |
| 增强版 Snapshot Manager | 核心自动化质量 | 保留旧实现作为回退，A/B 测试 |
| 包大小增加 (~3MB) | 加载性能 | 懒加载 QuickJS WASM，代码分割 |

### 中风险项

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 跨包依赖管理 | 构建失败 | 严格遵守架构规则，CI 检查 |
| 语音系统多平台兼容 | 功能受限 | 自动回退机制 |
| 用例包集成 | 功能孤立 | 清晰的 API 边界 |

### 低风险项

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| i18n 合并冲突 | 翻译缺失 | 逐个语言文件合并 |
| UI 组件样式冲突 | 视觉问题 | 组件隔离，CSS 命名空间 |

---

## 五、成功指标

### 技术指标
- **构建时间**: ≤ +20% 增加
- **包大小**: ≤ +3MB
- **测试覆盖率**: ≥ 80% (新代码)
- **性能**: 无现有功能回归

### 功能指标
- **语音输入**: <100ms 延迟, >95% 准确率
- **快照生成**: <500ms
- **技能执行**: <10ms 开销
- **用例完成**: User Guide Generator <30s

---

## 六、时间估算总览

| 阶段 | 工作量 | 累计时间 |
|-----|-------|---------|
| 阶段一: MCP 工具 | 3-4 天 | 3-4 天 |
| 阶段二: 干预系统 | 3-4 天 | 6-8 天 |
| 阶段三: 语音输入 | 2-3 天 | 8-11 天 |
| 阶段四: 上下文增强 | 1-2 天 | 9-13 天 |
| 阶段五: QuickJS VM | 2-3 天 | 11-16 天 |
| 阶段六: 技能系统 | 3-4 天 | 14-20 天 |
| 阶段七: 用例系统 | 4-5 天 | 18-25 天 |
| 阶段八: 服务与辅助 | 2-3 天 | 20-28 天 |
| 阶段九: 收尾 | 1-2 天 | **21-30 天** |

**总计: 约 4-6 周**

---

## 七、代码质量检查清单

每个阶段完成后执行:

- [ ] TypeScript 编译无错误
- [ ] 所有测试通过 (`npm run test`)
- [ ] Lint 检查通过 (`npm run lint`)
- [ ] 无 console.log 语句
- [ ] 所有 TODO 已解决或记录
- [ ] 无死代码或未使用导入
- [ ] 文档已更新
- [ ] 包大小已检查
- [ ] 性能基准已验证
- [ ] **Preflight 检查通过** (`npm run preflight`)

---

## 八、下一步行动

1. ✅ 审核并批准本计划
2. ⏳ 开始阶段一: MCP 工具增强
   - 从增强 snapshot-manager 开始（影响最大）
   - 逐个添加缺失工具
3. 按阶段顺序推进
4. 每阶段完成后运行 preflight

---

**文档版本**: 1.0
**创建日期**: 2026-01-03
**状态**: 待执行
