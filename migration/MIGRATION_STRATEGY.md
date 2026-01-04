# AIPex Private 分支功能迁移策略

**版本**: 2.0
**创建日期**: 2026-01-03
**源分支**: `remotes/private/private`
**目标分支**: `feature-next-rob`
**架构模式**: 多包架构 (Monorepo)

---

## 执行摘要

本文档定义了将 private 分支的企业级功能迁移到 feature-next-rob 分支的详细策略。迁移将分 **9 个阶段** 进行，预计耗时 **4-6 周**，每个阶段都独立可测试、可回滚。

### 迁移范围概览

| 指标 | 数值 |
|-----|------|
| 代码变更 | +30,773 行 / -23,913 行 |
| 净增代码 | ~6,860 行 |
| 新增文件 | 199 个 |
| 功能模块 | 8 个主要系统 |
| MCP 工具 | 26 个服务器 |
| 用例模板 | 6 个 |

---

## 目录

1. [架构原则](#架构原则)
2. [迁移阶段](#迁移阶段)
3. [详细实施计划](#详细实施计划)
4. [验证与测试](#验证与测试)
5. [风险管理](#风险管理)
6. [回滚策略](#回滚策略)

---

## 架构原则

### 多包依赖规则

```
┌─────────────────────────────────────────────────────┐
│                     @core                           │
│            (纯 TypeScript 接口定义)                  │
│    - 无平台依赖                                      │
│    - 仅类型、接口、抽象类                            │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
       ┌───────┴────────┐  ┌─────┴──────────┐
       │                │  │                 │
       ▼                │  ▼                 │
┌─────────────────┐     │  ┌─────────────────┐
│ @browser-runtime│     │  │  @aipex-react   │
│ (Chrome 实现)   │     │  │  (React UI)     │
│ - CDP 集成      │     │  │  - 纯 UI 组件   │
│ - 工具实现      │     │  │  - Hooks        │
│ - 运行时逻辑    │     │  │  - 适配器       │
└────────┬────────┘     │  └────────┬────────┘
         │              │           │
         └──────────────┼───────────┘
                        │
                        ▼
               ┌─────────────────┐
               │   @use-cases    │
               │ (应用层，新建)   │
               │ - 工作流模板     │
               │ - 用例实现       │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │   browser-ext   │
               │   (扩展入口)     │
               │ - 最终组装       │
               │ - 环境配置       │
               └─────────────────┘
```

### 关键约束

| 规则 | 描述 | 违规后果 |
|-----|------|---------|
| ✅ `@core` 无依赖 | 不依赖任何包或平台 API | 构建失败 |
| ✅ `@browser-runtime` → `@core` | 仅依赖 core 接口 | 循环依赖 |
| ✅ `@aipex-react` → `@core` | 仅依赖 core 接口 | UI 层污染 |
| ❌ `@aipex-react` ↛ `@browser-runtime` | **严格禁止** | 平台耦合 |
| ✅ `@use-cases` → 所有下层包 | 可依赖所有包 | N/A |
| ✅ `browser-ext` → 所有包 | 最终组装点 | N/A |

---

## 迁移阶段

### 阶段时间线

```
阶段一 ━━━━━━━━━┓
              ┃ (3-4天)
              ┗━━━━┓
阶段二 ━━━━━━━━━━━┫ (3-4天)
                  ┗━━━━┓
阶段三 ━━━━━━━━━━━━━━┫ (2-3天)
                      ┗━━━━┓
阶段四 ━━━━━━━━━━━━━━━━━┫ (1-2天)
                          ┗━━━━┓
阶段五 ━━━━━━━━━━━━━━━━━━━━┫ (2-3天)
                              ┗━━━━┓
阶段六 ━━━━━━━━━━━━━━━━━━━━━━━┫ (3-4天)
                                  ┗━━━━┓
阶段七 ━━━━━━━━━━━━━━━━━━━━━━━━━━┫ (4-5天)
                                      ┗━━━━┓
阶段八 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ (2-3天)
                                          ┗━━━━┓
阶段九 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ (1-2天)

总计: 21-30 天 (4-6 周)
```

### 优先级矩阵

| 阶段 | 功能 | 优先级 | 依赖 | 风险 |
|-----|------|-------|------|------|
| 1 | MCP 工具增强 | 🔴 HIGH | 无 | 🟡 MEDIUM |
| 2 | 干预系统 | 🔴 HIGH | 阶段 1 | 🟢 LOW |
| 3 | 语音输入 | 🟡 MEDIUM | 阶段 2 | 🟢 LOW |
| 4 | 上下文增强 | 🟡 MEDIUM | 无 | 🟢 LOW |
| 5 | QuickJS VM | 🟡 MEDIUM | 阶段 4 | 🔴 HIGH |
| 6 | 技能系统 | 🟡 MEDIUM | 阶段 5 | 🟡 MEDIUM |
| 7 | 用例系统 | 🟢 HIGH VALUE | 阶段 6 | 🟡 MEDIUM |
| 8 | 服务与辅助 | 🟢 LOW | 阶段 7 | 🟢 LOW |
| 9 | 国际化与收尾 | 🟢 LOW | 阶段 8 | 🟢 LOW |

---

## 详细实施计划

## 阶段一: MCP 工具增强 (3-4 天)

**目标**: 扩展和增强现有 MCP 工具，提升核心自动化能力

**优先级**: 🔴 HIGH
**风险等级**: 🟡 MEDIUM
**依赖**: 无

### 背景

当前 `feature-next-rob` 分支已有约 60 个基础 MCP 工具，但 private 分支包含：
- 增强版 `snapshot-manager` (支持 Accessibility Tree)
- 新的 `smart-locator` (AI 驱动元素定位)
- 高级 `ui-operations` (复杂 UI 交互)
- CDP 层面的调试器管理

### 迁移文件清单

#### 1.1 增强版 Snapshot Manager

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/mcp-servers/snapshot-manager.ts` | `packages/browser-runtime/src/automation/snapshot-manager.ts` | ~1064 | 增强版，需**合并**现有实现 |

**关键特性**:
- ✅ Accessibility Tree 集成 (`Accessibility.getFullAXTree`)
- ✅ 智能节点 ID (`data-aipex-nodeid`)
- ✅ Puppeteer 风格的"有趣节点"算法
- ✅ 并发控制 (p-limit)
- ✅ 搜索与查询功能

**实施步骤**:
1. **比对差异**: 使用 `git diff` 比对两个版本
2. **特性合并**: 将 Accessibility Tree 支持合并到现有版本
3. **保留兼容**: 保留现有 API 签名
4. **测试覆盖**: 编写 `snapshot-manager.test.ts`

#### 1.2 智能定位器

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/mcp-servers/smart-locator.ts` | `packages/browser-runtime/src/automation/smart-locator.ts` | ~400 | 全新工具 |

**特性**:
- Monaco Editor 内容提取
- CodeMirror 支持
- ACE Editor 支持
- 智能表单字段定位

**实施步骤**:
1. 复制文件到目标位置
2. 更新导入路径 (`@core`, `@browser-runtime`)
3. 添加到工具注册表
4. 编写测试

#### 1.3 高级 UI 操作

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/mcp-servers/ui-operations.ts` | `packages/browser-runtime/src/tools/ui-operations/index.ts` | ~500 | 模块化拆分 |

**功能**:
- 拖拽操作
- 悬停操作
- 复杂表单填充
- 自定义事件触发

**实施步骤**:
1. 创建 `ui-operations/` 目录
2. 拆分为独立功能模块:
   - `drag-drop.ts`
   - `hover.ts`
   - `form-fill.ts`
   - `events.ts`
3. 创建 `index.ts` 聚合导出
4. 单元测试

#### 1.4 调试器管理

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/mcp-servers/debugger-manager.ts` | `packages/browser-runtime/src/automation/debugger-manager.ts` | ~300 | 全新 |
| `src/mcp-servers/cdp-comander.ts` | `packages/browser-runtime/src/automation/cdp-commander.ts` | 待确认 | 全新 |

**功能**:
- CDP 调试器生命周期管理
- 自动 attach/detach
- 调试器命令封装
- 错误处理和重试

**实施步骤**:
1. 复制两个文件
2. 集成到现有 CDP 基础设施
3. 添加工具定义
4. 测试调试器协议

### 验收标准

- [ ] 所有 5 个工具文件已迁移
- [ ] TypeScript 编译无错误
- [ ] 所有工具在 MCP 客户端中可见
- [ ] 单元测试覆盖率 ≥ 70%
- [ ] `npm run preflight` 通过
- [ ] 手动测试每个工具基本功能
- [ ] 文档已更新 (JSDoc)

### 回滚点

- 创建 Git 标签: `phase-1-start`
- 完成后创建: `phase-1-complete`

---

## 阶段二: 干预系统完成 (3-4 天)

**目标**: 实现完整的 Human-in-the-Loop 干预系统

**优先级**: 🔴 HIGH
**风险等级**: 🟢 LOW
**依赖**: 阶段一 (需要增强的工具支持)

### 背景

当前 `feature-next-rob` 分支仅有类型定义 (`packages/browser-runtime/src/intervention/types.ts`)，private 分支有完整实现。

### 架构设计

```
┌──────────────────────────────────────────────────┐
│         Intervention Manager (Manager)           │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │   Queue    │ │  Timeout   │ │Page Monitor  │ │
│  │ Management │ │  Handler   │ │(Navigation)  │ │
│  └────────────┘ └────────────┘ └──────────────┘ │
└─────────────────────┬────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
  ┌───────────┐ ┌───────────┐ ┌───────────┐
  │  Monitor  │ │   Voice   │ │ Selection │
  │ Operation │ │   Input   │ │           │
  └───────────┘ └───────────┘ └───────────┘
       (观察)        (说话)        (点选)
```

### 迁移文件清单

#### 2.1 核心逻辑层 → @browser-runtime

| Private 源路径 | 目标路径 | 包 |
|---------------|----------|-----|
| `src/interventions/lib/intervention-manager.ts` | `packages/browser-runtime/src/intervention/intervention-manager.ts` | @browser-runtime |
| `src/interventions/lib/intervention-registry.ts` | `packages/browser-runtime/src/intervention/intervention-registry.ts` | @browser-runtime |
| `src/interventions/lib/element-capture-common.ts` | `packages/browser-runtime/src/intervention/element-capture.ts` | @browser-runtime |

**实施步骤**:
1. 扩展现有 `types.ts`，添加缺失的接口
2. 迁移 `intervention-registry.ts` (注册表模式)
3. 迁移 `intervention-manager.ts` (核心管理器)
4. 迁移 `element-capture.ts` (元素捕获)
5. 单元测试 (mock Chrome API)

#### 2.2 干预实现 → @browser-runtime

| Private 源路径 | 目标路径 |
|---------------|----------|
| `src/interventions/implementations/monitor-operation.ts` | `packages/browser-runtime/src/intervention/implementations/monitor-operation.ts` |
| `src/interventions/implementations/voice-input.ts` | `packages/browser-runtime/src/intervention/implementations/voice-input.ts` |
| `src/interventions/implementations/user-selection.ts` | `packages/browser-runtime/src/intervention/implementations/user-selection.ts` |

**实施步骤**:
1. 创建 `implementations/` 目录
2. 迁移 3 个实现类
3. 确保实现 `Intervention` 接口
4. 测试每个实现

#### 2.3 MCP 工具集成 → @browser-runtime

| Private 源路径 | 目标路径 |
|---------------|----------|
| `src/interventions/mcp-servers/interventions.ts` | `packages/browser-runtime/src/tools/interventions/index.ts` |

**MCP 工具**:
- `request_monitor_operation` - 请求监控用户操作
- `request_voice_input` - 请求语音输入
- `request_user_selection` - 请求用户选择
- `get_intervention_status` - 获取干预状态

**实施步骤**:
1. 创建 `tools/interventions/` 目录
2. 定义 4 个 MCP 工具
3. 连接到 `intervention-manager`
4. 集成测试

#### 2.4 UI 组件层 → @aipex-react

| Private 源路径 | 目标路径 |
|---------------|----------|
| `src/interventions/components/InterventionCard.tsx` | `packages/aipex-react/src/components/intervention/InterventionCard.tsx` |
| `src/interventions/components/MonitorCard.tsx` | `packages/aipex-react/src/components/intervention/MonitorCard.tsx` |
| `src/interventions/components/VoiceCard.tsx` | `packages/aipex-react/src/components/intervention/VoiceCard.tsx` |
| `src/interventions/components/SelectionCard.tsx` | `packages/aipex-react/src/components/intervention/SelectionCard.tsx` |
| `src/interventions/components/InterventionModeToggle.tsx` | `packages/aipex-react/src/components/intervention/InterventionModeToggle.tsx` |

**组件职责**:
- `InterventionCard`: 通用干预卡片容器
- `MonitorCard`: 监控操作 UI
- `VoiceCard`: 语音输入 UI (不含语音引擎，仅 UI)
- `SelectionCard`: 选择界面 UI
- `InterventionModeToggle`: 干预模式切换

**关键架构约束**:
- ❌ **禁止**直接导入 `@browser-runtime`
- ✅ 使用 Props 传递回调函数
- ✅ 使用 `@core` 定义的接口类型
- ✅ UI 组件保持纯展示逻辑

**实施步骤**:
1. 创建 `components/intervention/` 目录
2. 逐个迁移组件
3. 修改所有平台相关代码:
   - 移除 Chrome API 调用
   - 改为 Props 回调
   - 使用 `@core` 类型
4. Storybook 故事 (可选)
5. React Testing Library 测试

### 验收标准

- [ ] 干预管理器核心逻辑完成
- [ ] 3 种干预类型实现完成
- [ ] 4 个 MCP 工具可用
- [ ] 5 个 UI 组件迁移完成
- [ ] UI 组件无 `@browser-runtime` 依赖
- [ ] TypeScript 编译无错误
- [ ] 单元测试覆盖率 ≥ 70%
- [ ] 手动测试干预流程
- [ ] `npm run preflight` 通过

### 回滚点

- Git 标签: `phase-2-complete`

---

## 阶段三: 语音输入系统 (2-3 天)

**目标**: 添加多源语音输入能力和 3D 可视化

**优先级**: 🟡 MEDIUM
**风险等级**: 🟢 LOW
**依赖**: 阶段二 (干预系统需要语音输入实现)

### 背景

语音输入是干预系统的一部分，但因其复杂性独立为一个阶段。

### 语音源架构

```
┌────────────────────────────────────┐
│    VoiceInputManager (管理器)       │
└────────┬───────────────────────────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    │          │          │          │
    ▼          ▼          ▼          ▼
┌────────┐┌─────────┐┌─────────┐┌────────┐
│Browser ││Eleven   ││ Server  ││  Auto  │
│Web API ││Labs STT ││   STT   ││Fallback│
│(免费)  ││(付费)   ││(自定义) ││(智能)  │
└────────┘└─────────┘└─────────┘└────────┘
```

### 迁移文件清单

#### 3.1 API 层 → @browser-runtime

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/lib/voice/voice-input-manager.ts` | `packages/browser-runtime/src/voice/voice-input-manager.ts` | ~300 | 核心管理器 |
| `src/lib/voice/audio-recorder.ts` | `packages/browser-runtime/src/voice/audio-recorder.ts` | ~150 | 音频录制 |
| `src/lib/voice/vad-detector.ts` | `packages/browser-runtime/src/voice/vad-detector.ts` | ~200 | 语音活动检测 |
| `src/lib/voice/elevenlabs-stt.ts` | `packages/browser-runtime/src/voice/elevenlabs-stt.ts` | ~100 | ElevenLabs API |
| `src/lib/voice/server-stt.ts` | `packages/browser-runtime/src/voice/server-stt.ts` | ~80 | 服务器 STT |

**实施步骤**:
1. 创建 `packages/browser-runtime/src/voice/` 目录
2. 迁移 5 个文件
3. 更新导入路径
4. 添加依赖: `@ricky0123/vad-web`
5. 单元测试 (mock 音频 API)

#### 3.2 UI 层 → @aipex-react

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/lib/components/voice-mode/voice-input.tsx` | `packages/aipex-react/src/components/voice/VoiceInput.tsx` | ~250 | 主组件 |
| `src/lib/components/voice-mode/particle-system.ts` | `packages/aipex-react/src/components/voice/particle-system.ts` | ~400 | WebGL 粒子 |
| `src/lib/components/voice-mode/shaders.ts` | `packages/aipex-react/src/components/voice/shaders.ts` | ~150 | GLSL 着色器 |
| `src/lib/components/voice-mode/config.ts` | `packages/aipex-react/src/components/voice/config.ts` | ~50 | 配置 |
| `src/lib/components/voice-mode/types.ts` | `packages/aipex-react/src/components/voice/types.ts` | ~30 | 类型 |

**3D 可视化特性**:
- WebGL 粒子系统 (2000+ 粒子)
- 音频响应式球形动画
- 实时音频频谱分析
- 平滑颜色过渡
- 正确的资源清理 (防止内存泄漏)

**实施步骤**:
1. 创建 `components/voice/` 目录
2. 迁移 5 个文件
3. 移除平台依赖 (通过 Props 传递音频数据)
4. 添加依赖: `three` (如果未安装)
5. 测试 WebGL 兼容性
6. 性能测试 (60 FPS 目标)

**架构约束**:
- ❌ 禁止在 UI 组件中直接调用 `VoiceInputManager`
- ✅ 使用 Props 接收音频数据和状态
- ✅ 使用回调函数通知父组件

### 验收标准

- [ ] 5 个语音 API 文件迁移完成
- [ ] 5 个 UI 文件迁移完成
- [ ] 3 种 STT 源均可用
- [ ] VAD 检测正常工作
- [ ] 粒子系统渲染正常 (60 FPS)
- [ ] 无内存泄漏 (长时间运行测试)
- [ ] TypeScript 编译无错误
- [ ] `npm run preflight` 通过

### 回滚点

- Git 标签: `phase-3-complete`

---

## 阶段四: 上下文增强 (1-2 天)

**目标**: 添加 Token 追踪和智能上下文优化

**优先级**: 🟡 MEDIUM
**风险等级**: 🟢 LOW
**依赖**: 无 (独立功能)

### 背景

上下文管理是提升 AI 对话质量的关键，private 分支实现了智能压缩和 Token 管理。

### 架构设计

```
┌──────────────────────────────────────────────┐
│      BackgroundContextManager (后台管理)      │
└─────────────────┬────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌──────────┐
│Context  │  │ Token   │  │  Usage   │
│Optimizer│  │Tokenizer│  │ Tracker  │
└─────────┘  └─────────┘  └──────────┘
    │             │             │
    ▼             ▼             ▼
压缩策略      计数引擎      统计分析
```

### 核心功能

**上下文优化器 (ContextOptimizer)**:
- 水位线触发机制 (Token 阈值)
- 自动摘要旧消息
- 保护最近 N 条消息
- Tool call 配对完整性保护
- 系统提示词保留

**Token 计数**:
- `ActualTokenizer`: 使用 `tokenlens` 精确计数
- `SimpleTokenizer`: 快速估算 (字符数 / 4)
- 支持多种模型 (Claude, GPT)

**使用追踪**:
- 每条消息的 Token 使用
- 对话级别统计
- 成本估算

### 迁移文件清单

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/lib/context/background-context-manager.ts` | `packages/browser-runtime/src/context/background-context-manager.ts` | ~200 | 后台管理器 |
| `src/lib/context/context-optimizer.ts` | `packages/browser-runtime/src/context/context-optimizer.ts` | ~300 | 优化器 |
| `src/lib/context/token-usage.ts` | `packages/browser-runtime/src/context/token-usage.ts` | ~100 | 使用统计 |
| `src/lib/context/usage-tracker.ts` | `packages/browser-runtime/src/context/usage-tracker.ts` | ~150 | 追踪器 |
| `src/lib/context/actual-tokenizer.ts` | `packages/browser-runtime/src/context/actual-tokenizer.ts` | ~80 | 精确分词 |
| `src/lib/context/simple-tokenizer.ts` | `packages/browser-runtime/src/context/simple-tokenizer.ts` | ~50 | 快速分词 |
| `src/lib/context/config.ts` | `packages/browser-runtime/src/context/config.ts` | ~40 | 配置 |
| `src/lib/context/types.ts` | `packages/browser-runtime/src/context/types.ts` | ~60 | 类型定义 |

### 实施步骤

1. **检查现有上下文代码**
   ```bash
   ls -la packages/browser-runtime/src/context/
   ```
   确认是否有冲突

2. **迁移类型定义**
   - 迁移 `types.ts` 和 `config.ts`
   - 确保与现有类型兼容

3. **迁移 Token 计数**
   - 添加依赖: `pnpm add tokenlens`
   - 迁移 `actual-tokenizer.ts` 和 `simple-tokenizer.ts`
   - 单元测试 (验证计数准确性)

4. **迁移优化器**
   - 迁移 `context-optimizer.ts`
   - 实现压缩策略
   - 测试消息摘要功能

5. **迁移追踪器**
   - 迁移 `usage-tracker.ts` 和 `token-usage.ts`
   - 集成到对话管理器

6. **迁移后台管理器**
   - 迁移 `background-context-manager.ts`
   - 连接所有组件
   - 集成测试

### 配置示例

```typescript
// config.ts
export const CONTEXT_CONFIG = {
  // 触发优化的 Token 阈值
  watermark: 150000,

  // 保护最近的消息数量
  protectedMessageCount: 10,

  // 启用自动优化
  autoOptimize: true,

  // 模型选择
  model: 'claude-sonnet-4',

  // 压缩比例目标
  compressionTarget: 0.5, // 压缩到 50%
};
```

### 验收标准

- [ ] 8 个文件迁移完成
- [ ] Token 计数准确性 ≥ 95%
- [ ] 上下文优化正常工作
- [ ] 使用追踪数据正确
- [ ] 依赖 `tokenlens` 已安装
- [ ] TypeScript 编译无错误
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] `npm run preflight` 通过

### 回滚点

- Git 标签: `phase-4-complete`

---

## 阶段五: QuickJS 虚拟机 (2-3 天)

**目标**: 为技能系统添加沙箱化 JavaScript 执行环境

**优先级**: 🟡 MEDIUM
**风险等级**: 🔴 HIGH (WASM 集成复杂)
**依赖**: 阶段四 (需要上下文管理支持)

### 背景

QuickJS 是一个轻量级 JavaScript 引擎，可在浏览器中通过 WASM 运行。这是技能系统的基础。

### 架构设计

```
┌──────────────────────────────────────────┐
│       QuickJSManager (WASM 运行时)        │
│  ┌────────────┐  ┌──────────────────┐    │
│  │ VM Pool    │  │  Memory Manager  │    │
│  │ (池化管理)  │  │  (100MB Limit)   │    │
│  └────────────┘  └──────────────────┘    │
└────────┬─────────────────────────────────┘
         │
    ┌────┴─────┬──────────┬────────────┐
    │          │          │            │
    ▼          ▼          ▼            ▼
┌────────┐┌─────────┐┌─────────┐┌──────────┐
│ZenFS   ││ Skill   ││  CDN    ││  Bundled │
│Manager ││   API   ││ Loader  ││ Modules  │
│(VFS)   ││ Bridge  ││(esm.sh) ││(内置)    │
└────────┘└─────────┘└─────────┘└──────────┘
```

### 技术选型

**QuickJS 变体**: `@jitl/quickjs-wasmfile-release-sync`
- 原因: Chrome 扩展 CSP (内容安全策略) 兼容
- 大小: ~1.2 MB (WASM)
- 特性: 同步 API，ES6 模块支持

**虚拟文件系统**: `@zenfs/core` + `@zenfs/dom`
- IndexedDB 持久化
- 标准 Node.js `fs` API
- 跨会话数据保留

### 迁移文件清单

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/lib/vm/quickjs-manager.ts` | `packages/browser-runtime/src/vm/quickjs-manager.ts` | ~500 | VM 主管理器 |
| `src/lib/vm/zenfs-manager.ts` | `packages/browser-runtime/src/vm/zenfs-manager.ts` | ~200 | 虚拟文件系统 |
| `src/lib/vm/skill-api.ts` | `packages/browser-runtime/src/vm/skill-api.ts` | ~300 | Skill API Bridge |
| `src/lib/vm/migration.ts` | `packages/browser-runtime/src/vm/migration.ts` | ~100 | 迁移工具 |
| `src/lib/vm/bundled-modules/*` | `packages/browser-runtime/src/vm/bundled-modules/` | 多文件 | 预打包模块 |

### 核心功能

**QuickJSManager**:
- VM 实例池化 (避免重复初始化)
- 内存限制: 100 MB
- 栈限制: 1 MB
- CDN 模块加载与缓存 (esm.sh)
- 异步操作支持 (通过消息传递)
- 错误隔离和恢复

**ZenFSManager**:
- 虚拟文件系统初始化
- IndexedDB 后端配置
- 文件 CRUD 操作
- 目录管理

**Skill API Bridge**:
暴露给技能脚本的 API:
```typescript
// 技能脚本中可用的 API
const api = {
  // 文件系统
  fs: {
    readFile: (path: string) => Promise<string>,
    writeFile: (path: string, content: string) => Promise<void>,
    // ... 更多 fs 方法
  },

  // 工具注册
  tools: {
    register: (tool: ToolDefinition) => void,
    // ... 更多工具方法
  },

  // HTTP 请求
  http: {
    fetch: (url: string, options?: RequestInit) => Promise<Response>,
  },

  // 浏览器下载
  browser: {
    download: (url: string, filename: string) => Promise<void>,
  },

  // 日志
  console: {
    log: (...args: any[]) => void,
    error: (...args: any[]) => void,
  },
};
```

### 实施步骤

1. **安装依赖**
   ```bash
   pnpm add @jitl/quickjs-wasmfile-release-sync @zenfs/core @zenfs/dom p-limit
   ```

2. **创建 VM 目录**
   ```bash
   mkdir -p packages/browser-runtime/src/vm/bundled-modules
   ```

3. **迁移核心文件**
   - 迁移 `zenfs-manager.ts` (先)
   - 迁移 `quickjs-manager.ts` (后)
   - 迁移 `skill-api.ts`
   - 迁移 `migration.ts`

4. **配置 WASM 加载**
   - 确保 WASM 文件在构建输出中
   - 配置 Vite/Webpack 复制 WASM 文件
   - 测试 WASM 加载路径

5. **测试 VM 功能**
   - 基本 JS 执行
   - 模块加载 (ESM)
   - 文件系统操作
   - API Bridge 调用
   - 内存限制测试
   - 错误处理测试

6. **性能优化**
   - VM 池化测试
   - 冷启动优化
   - 内存使用分析

### 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| WASM 加载失败 | 阻塞技能系统 | 添加降级方案，提供友好错误提示 |
| CSP 兼容性问题 | 无法运行 | 使用 SYNC 变体，测试多种 CSP 配置 |
| 内存泄漏 | 性能下降 | 严格的资源清理，定期 GC |
| 加载时间长 | 用户体验差 | 懒加载，预加载优化，显示加载进度 |

### 验收标准

- [ ] 5 个核心文件迁移完成
- [ ] QuickJS WASM 成功加载
- [ ] 基本 JS 代码执行正常
- [ ] ES6 模块加载正常
- [ ] ZenFS 文件系统正常工作
- [ ] Skill API Bridge 可用
- [ ] 内存限制生效
- [ ] 无内存泄漏 (长时间运行测试)
- [ ] TypeScript 编译无错误
- [ ] `npm run preflight` 通过
- [ ] 性能基准测试 (VM 初始化 < 500ms)

### 回滚点

- Git 标签: `phase-5-complete`
- 如果失败: 移除 QuickJS 依赖，保留接口定义供未来实现

---

## 阶段六: 技能系统 (3-4 天)

**目标**: 实现技能包的安装、管理和执行

**优先级**: 🟡 MEDIUM
**风险等级**: 🟡 MEDIUM
**依赖**: 阶段五 (QuickJS VM)

### 背景

技能系统是 AIPex 的插件机制，允许用户安装自定义技能包 (.zip)，扩展 AI 能力。

### 架构设计

```
┌──────────────────────────────────────────┐
│         SkillManager (中央管理)           │
│  ┌────────────┐  ┌──────────────────┐    │
│  │  Registry  │  │  Event System    │    │
│  │  (注册表)   │  │  (事件总线)       │    │
│  └────────────┘  └──────────────────┘    │
└────────┬─────────────────────────────────┘
         │
    ┌────┴─────┬──────────┬────────────┐
    │          │          │            │
    ▼          ▼          ▼            ▼
┌────────┐┌─────────┐┌─────────┐┌──────────┐
│Skill   ││ Skill   ││  Skill  ││   MCP    │
│Storage ││Executor ││ Package ││  Tools   │
│(持久化) ││(执行器) ││(解析器) ││ (集成)   │
└────────┘└─────────┘└─────────┘└──────────┘
```

### 技能包结构

```
skill-example.zip
├── SKILL.md (必需)
│   ├── --- (YAML frontmatter)
│   │   name: "技能名称"
│   │   description: "技能描述"
│   │   version: "1.0.0"
│   │   author: "作者"
│   │   ---
│   └── Markdown 内容 (技能指令)
│
└── (可选资源)
    ├── scripts/
    │   └── helper.js
    ├── references/
    │   └── api-docs.md
    └── assets/
        └── icon.png
```

### 迁移文件清单

#### 6.1 核心逻辑 → @browser-runtime

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/skill/lib/services/skill-manager.ts` | `packages/browser-runtime/src/skill/skill-manager.ts` | ~400 | 核心管理器 |
| `src/skill/lib/services/skill-registry.ts` | `packages/browser-runtime/src/skill/skill-registry.ts` | ~200 | 注册表 |
| `src/skill/lib/services/skill-executor.ts` | `packages/browser-runtime/src/skill/skill-executor.ts` | ~300 | 执行器 |
| `src/skill/lib/storage/skill-storage.ts` | `packages/browser-runtime/src/skill/skill-storage.ts` | ~150 | 存储层 |
| `src/skill/lib/utils/zip-utils.ts` | `packages/browser-runtime/src/skill/zip-utils.ts` | ~100 | ZIP 工具 |

**实施步骤**:
1. 创建 `packages/browser-runtime/src/skill/` 目录
2. 迁移 5 个文件
3. 更新导入路径，连接 QuickJS VM
4. 单元测试 (mock ZIP 文件)

#### 6.2 MCP 工具集成 → @browser-runtime

| Private 源路径 | 目标路径 |
|---------------|----------|
| `src/skill/mcp-servers/skills.ts` | `packages/browser-runtime/src/tools/skills/index.ts` |

**MCP 工具**:
- `list_skills` - 列出所有技能
- `install_skill` - 从 ZIP 安装技能
- `uninstall_skill` - 卸载技能
- `enable_skill` - 启用技能
- `disable_skill` - 禁用技能
- `get_skill_details` - 获取技能详情
- `execute_skill` - 执行技能脚本

**实施步骤**:
1. 创建 `tools/skills/` 目录
2. 定义 7 个 MCP 工具
3. 连接到 `SkillManager`
4. 集成测试

#### 6.3 UI 组件 → @aipex-react

| Private 源路径 | 目标路径 |
|---------------|----------|
| `src/skill/components/skills/SkillCard.tsx` | `packages/aipex-react/src/components/skill/SkillCard.tsx` |
| `src/skill/components/skills/SkillDetails.tsx` | `packages/aipex-react/src/components/skill/SkillDetails.tsx` |
| `src/skill/components/skills/SkillList.tsx` | `packages/aipex-react/src/components/skill/SkillList.tsx` |
| `src/skill/components/skills/SkillUploader.tsx` | `packages/aipex-react/src/components/skill/SkillUploader.tsx` |

**组件职责**:
- `SkillCard`: 单个技能卡片
- `SkillDetails`: 技能详情页
- `SkillList`: 技能列表
- `SkillUploader`: 技能上传器

**实施步骤**:
1. 创建 `components/skill/` 目录
2. 迁移 4 个组件
3. 移除平台依赖 (Props 化)
4. React 测试

#### 6.4 文件管理器 → @aipex-react

| Private 源路径 | 目标路径 |
|---------------|----------|
| `src/skill/components/file-manager/FileExplorer.tsx` | `packages/aipex-react/src/components/file-manager/FileExplorer.tsx` |
| `src/skill/components/file-manager/FileTree.tsx` | `packages/aipex-react/src/components/file-manager/FileTree.tsx` |
| `src/skill/components/file-manager/FilePreview.tsx` | `packages/aipex-react/src/components/file-manager/FilePreview.tsx` |
| `src/skill/components/file-manager/FileEditor.tsx` | `packages/aipex-react/src/components/file-manager/FileEditor.tsx` |

**功能**:
- 树形目录结构
- 文件预览 (文本、图片)
- 文件编辑
- 文件删除
- 文件搜索

**实施步骤**:
1. 创建 `components/file-manager/` 目录
2. 迁移 4 个组件
3. 连接到 ZenFS API (通过 Props)
4. UI 测试

#### 6.5 内置技能 → browser-ext

| Private 源路径 | 目标路径 |
|---------------|----------|
| `src/skill/built-in/skill-creator-browser/` | `packages/browser-ext/src/built-in-skills/skill-creator-browser/` |

**实施步骤**:
1. 创建 `built-in-skills/` 目录
2. 复制整个技能目录
3. 在启动时自动安装内置技能
4. 测试技能创建工作流

### 验收标准

- [ ] 5 个核心文件迁移完成
- [ ] 7 个 MCP 工具可用
- [ ] 8 个 UI 组件迁移完成
- [ ] ZIP 安装/卸载正常工作
- [ ] 技能在 QuickJS VM 中执行
- [ ] 文件管理器正常工作
- [ ] 内置技能可用
- [ ] TypeScript 编译无错误
- [ ] 单元测试覆盖率 ≥ 70%
- [ ] `npm run preflight` 通过
- [ ] 手动测试完整技能生命周期

### 回滚点

- Git 标签: `phase-6-complete`

---

## 阶段七: 用例系统 (4-5 天)

**目标**: 创建顶层用例包，迁移 6 个用例模板

**优先级**: 🟢 HIGH VALUE (高业务价值)
**风险等级**: 🟡 MEDIUM
**依赖**: 阶段六 (技能系统)

### 背景

用例系统是预定义的工作流模板，最有价值的是 **User Guide Generator**，支持屏幕录制、GIF 生成、PDF 导出。

### 新包创建: @use-cases

这是一个**新的顶层包**，位于 `packages/use-cases/`。

**包结构**:
```
packages/use-cases/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts (导出所有用例)
│   ├── schemas.ts (Zod schemas)
│   ├── runtime-manager.tsx (运行时管理)
│   ├── view-manager.tsx (视图管理)
│   │
│   ├── components/ (通用组件)
│   │   ├── UseCasesHome.tsx
│   │   └── UserManualHistory.tsx
│   │
│   ├── user-guide-generator/ (用例 1)
│   │   ├── index.ts
│   │   ├── UseCaseDetail.tsx
│   │   ├── StepsPreview.tsx
│   │   ├── gif-generator.ts
│   │   ├── pdf-exporter.ts
│   │   ├── markdown-exporter.ts
│   │   ├── screenshot-buffer.ts
│   │   └── spotlight-overlay.tsx
│   │
│   ├── accessibility-testing/ (用例 2)
│   ├── batch-submit-jobs/ (用例 3)
│   ├── batch-submit-backlinks/ (用例 4)
│   ├── e2e-testing/ (用例 5)
│   └── design-comparison/ (用例 6)
│
└── README.md
```

### 迁移文件清单

#### 7.1 包初始化

1. **创建 package.json**:
```json
{
  "name": "@aipex/use-cases",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "dependencies": {
    "@aipex/core": "workspace:*",
    "@aipex/browser-runtime": "workspace:*",
    "@aipex/aipex-react": "workspace:*",
    "pdf-lib": "^1.17.1",
    "html2canvas": "^1.4.1",
    "gifshot": "^0.4.5",
    "zod": "^3.22.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

2. **创建 tsconfig.json**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../core" },
    { "path": "../browser-runtime" },
    { "path": "../aipex-react" }
  ]
}
```

#### 7.2 核心文件迁移

| Private 源路径 | 目标路径 | 说明 |
|---------------|----------|------|
| `src/use-cases/index.ts` | `packages/use-cases/src/index.ts` | 用例注册 |
| `src/use-cases/schemas.ts` | `packages/use-cases/src/schemas.ts` | Zod schemas |
| `src/use-cases/runtime-manager.tsx` | `packages/use-cases/src/runtime-manager.tsx` | 运行时管理 |
| `src/use-cases/view-manager.tsx` | `packages/use-cases/src/view-manager.tsx` | 视图管理 |

#### 7.3 通用组件

| Private 源路径 | 目标路径 |
|---------------|----------|
| `src/use-cases/components/UseCasesHome.tsx` | `packages/use-cases/src/components/UseCasesHome.tsx` |
| `src/use-cases/components/UserManualHistory.tsx` | `packages/use-cases/src/components/UserManualHistory.tsx` |

#### 7.4 用例 1: User Guide Generator (重点)

**文件列表**:

| Private 源路径 | 目标路径 | 行数 | 说明 |
|---------------|----------|------|------|
| `src/use-cases/user-guide-generator/index.ts` | `packages/use-cases/src/user-guide-generator/index.ts` | ~100 | 用例定义 |
| `src/use-cases/user-guide-generator/UseCaseDetail.tsx` | `packages/use-cases/src/user-guide-generator/UseCaseDetail.tsx` | ~500 | 主界面 |
| `src/use-cases/user-guide-generator/StepsPreview.tsx` | `packages/use-cases/src/user-guide-generator/StepsPreview.tsx` | ~300 | 步骤预览 |
| `src/use-cases/user-guide-generator/gif-generator.ts` | `packages/use-cases/src/user-guide-generator/gif-generator.ts` | ~200 | GIF 生成 |
| `src/use-cases/user-guide-generator/pdf-exporter.ts` | `packages/use-cases/src/user-guide-generator/pdf-exporter.ts` | ~742 | PDF 导出 |
| `src/use-cases/user-guide-generator/markdown-exporter.ts` | `packages/use-cases/src/user-guide-generator/markdown-exporter.ts` | ~150 | Markdown 导出 |
| `src/use-cases/user-guide-generator/screenshot-buffer.ts` | `packages/use-cases/src/user-guide-generator/screenshot-buffer.ts` | ~200 | 截图缓冲 |
| `src/use-cases/user-guide-generator/spotlight-overlay.tsx` | `packages/use-cases/src/user-guide-generator/spotlight-overlay.tsx` | ~150 | 高亮效果 |

**核心功能**:

1. **步骤录制**:
   - 通过 DOM 变化自动检测步骤
   - 手动步骤标记
   - AI 生成步骤描述
   - 每步截图捕获
   - 每步 DOM 快照

2. **截图管理**:
   - 循环缓冲系统 (避免内存溢出)
   - S3 上传集成 (可选)
   - 懒加载大型指南
   - Spotlight 高亮效果

3. **导出格式**:
   - **PDF**: 使用 `pdf-lib` (~742 行实现)
   - **Markdown**: 嵌入 base64 图片
   - **GIF**: 使用 `gifshot`，带 Spotlight 动画
   - **JSON**: 原始数据导出

**实施步骤**:
1. 创建 `user-guide-generator/` 目录
2. 迁移 8 个文件
3. 安装依赖: `pdf-lib`, `html2canvas`, `gifshot`
4. 测试每个导出格式
5. 性能优化 (大型指南)

#### 7.5 用例 2-6: 其他用例

| 用例 | 目录 | 复杂度 | 说明 |
|-----|------|--------|------|
| Accessibility Testing | `accessibility-testing/` | MEDIUM | 可访问性审计 |
| Batch Submit Jobs | `batch-submit-jobs/` | MEDIUM | 批量表单提交 |
| Batch Submit Backlinks | `batch-submit-backlinks/` | MEDIUM | 反向链接提交 |
| E2E Testing | `e2e-testing/` | MEDIUM | E2E 测试执行 |
| Design Comparison | `design-comparison/` | LOW | 视觉对比 |

**实施步骤**:
1. 为每个用例创建目录
2. 迁移所有文件
3. 更新导入路径
4. 测试基本功能

### 集成到 browser-ext

在 `packages/browser-ext/src/sidepanel/` 中添加用例入口:
```tsx
import { UseCasesHome } from '@aipex/use-cases';

// 在侧边栏中添加"用例"标签
<Tabs>
  <Tab label="聊天">...</Tab>
  <Tab label="用例">
    <UseCasesHome />
  </Tab>
</Tabs>
```

### 验收标准

- [ ] `@use-cases` 包创建完成
- [ ] package.json 和 tsconfig.json 配置正确
- [ ] 4 个核心文件迁移完成
- [ ] 2 个通用组件迁移完成
- [ ] User Guide Generator 完整迁移 (8 个文件)
- [ ] PDF 导出正常工作
- [ ] GIF 生成正常工作
- [ ] Markdown 导出正常工作
- [ ] 其他 5 个用例迁移完成
- [ ] 用例在侧边栏中可访问
- [ ] TypeScript 编译无错误
- [ ] `npm run preflight` 通过
- [ ] 手动测试所有用例

### 回滚点

- Git 标签: `phase-7-complete`

---

## 阶段八: 服务与辅助功能 (2-3 天)

**目标**: 迁移版本管理、认证、聊天增强等辅助功能

**优先级**: 🟢 LOW
**风险等级**: 🟢 LOW
**依赖**: 阶段七

### 迁移文件清单

#### 8.1 服务层 → browser-ext

| Private 源路径 | 目标路径 | 说明 |
|---------------|----------|------|
| `src/lib/services/version-checker.ts` | `packages/browser-ext/src/services/version-checker.ts` | 版本检查 |
| `src/lib/services/web-auth.ts` | `packages/browser-ext/src/services/web-auth.ts` | 认证服务 |
| `src/lib/services/user-manuals-api.ts` | `packages/browser-ext/src/services/user-manuals-api.ts` | 用户手册 API |
| `src/lib/services/screenshot-upload.ts` | `packages/browser-ext/src/services/screenshot-upload.ts` | 截图上传 |
| `src/lib/services/replay-controller.ts` | `packages/browser-ext/src/services/replay-controller.ts` | 回放控制 |
| `src/lib/services/ai-config.ts` | `packages/browser-ext/src/services/ai-config.ts` | AI 配置 |
| `src/lib/services/recording-upload.ts` | `packages/browser-ext/src/services/recording-upload.ts` | 录制上传 |
| `src/lib/services/tool-manager.ts` | `packages/browser-ext/src/services/tool-manager.ts` | 工具管理 |

**实施步骤**:
1. 创建 `packages/browser-ext/src/services/` 目录
2. 迁移 8 个服务文件
3. 更新导入路径
4. 测试每个服务

#### 8.2 UI 组件 → @aipex-react

| Private 源路径 | 目标路径 | 说明 |
|---------------|----------|------|
| `src/lib/components/chatbot/conversation-history.tsx` | `packages/aipex-react/src/components/chatbot/components/conversation-history.tsx` | 对话历史 |
| `src/lib/components/chatbot/update-banner.tsx` | `packages/aipex-react/src/components/chatbot/components/update-banner.tsx` | 更新横幅 |
| `src/lib/components/chatbot/TokenUsageIndicator.tsx` | `packages/aipex-react/src/components/chatbot/components/token-usage.tsx` | Token 使用 |
| `src/lib/components/chatbot/replay-progress-overlay.tsx` | `packages/aipex-react/src/components/chatbot/components/replay-progress.tsx` | 回放进度 |
| `src/lib/components/auth/AuthProvider.tsx` | `packages/aipex-react/src/components/auth/AuthProvider.tsx` | 认证提供者 |
| `src/lib/components/auth/UserProfile.tsx` | `packages/aipex-react/src/components/auth/UserProfile.tsx` | 用户资料 |

**实施步骤**:
1. 迁移聊天增强组件 (4 个)
2. 迁移认证组件 (2 个)
3. 移除平台依赖
4. React 测试

### 验收标准

- [ ] 8 个服务文件迁移完成
- [ ] 6 个 UI 组件迁移完成
- [ ] 版本检查正常工作
- [ ] 认证流程正常
- [ ] 对话历史正常显示
- [ ] Token 使用指示器正常
- [ ] TypeScript 编译无错误
- [ ] `npm run preflight` 通过

### 回滚点

- Git 标签: `phase-8-complete`

---

## 阶段九: 国际化与收尾 (1-2 天)

**目标**: 迁移 i18n 配置，完成文档更新，执行最终验证

**优先级**: 🟢 LOW
**风险等级**: 🟢 LOW
**依赖**: 阶段八

### 9.1 国际化文件迁移

| Private 源路径 | 目标路径 | 说明 |
|---------------|----------|------|
| `src/lib/i18n/locales/en.json` | `packages/aipex-react/src/i18n/locales/en.json` | 合并英文 |
| `src/lib/i18n/locales/zh.json` | `packages/aipex-react/src/i18n/locales/zh.json` | 合并中文 |
| 其他语言文件 | 合并到现有结构 | 逐个合并 |

**实施步骤**:
1. 备份现有 i18n 文件
2. 逐个语言文件合并 (JSON 深度合并)
3. 检查翻译完整性
4. 测试语言切换

### 9.2 文档更新

**需要更新的文档**:
- [ ] `README.md` - 添加新功能说明
- [ ] `CLAUDE.md` - 更新架构图和包说明
- [ ] `DEVELOPMENT.md` - 添加开发指南
- [ ] 各包的 `README.md`

**文档内容**:
- 架构图更新 (包含 @use-cases)
- 新功能清单
- 安装与使用指南
- API 参考
- 故障排查

### 9.3 最终验证

#### 代码质量检查

```bash
# 1. 类型检查
npm run typecheck

# 2. Lint 检查
npm run lint

# 3. 格式检查
npm run format:check

# 4. 单元测试
npm run test

# 5. 完整 preflight
npm run preflight
```

#### 功能测试清单

- [ ] MCP 工具 (所有 26 个工具)
- [ ] 干预系统 (3 种干预类型)
- [ ] 语音输入 (3 种 STT 源)
- [ ] 上下文优化
- [ ] QuickJS VM
- [ ] 技能系统 (安装/执行)
- [ ] 用例系统 (所有 6 个用例)
- [ ] User Guide Generator (PDF/GIF/Markdown)
- [ ] 认证流程
- [ ] 国际化

#### 性能基准测试

| 指标 | 目标 | 实际 | 状态 |
|-----|------|------|------|
| 构建时间 | ≤ +20% | __ | [ ] |
| 包大小 | ≤ +3MB | __ | [ ] |
| 加载时间 | ≤ 2s | __ | [ ] |
| 内存使用 | ≤ 200MB | __ | [ ] |
| QuickJS 初始化 | ≤ 500ms | __ | [ ] |
| 快照生成 | ≤ 500ms | __ | [ ] |

### 9.4 清理工作

- [ ] 删除未使用的代码
- [ ] 删除未使用的依赖
- [ ] 清理 console.log
- [ ] 清理 TODO 注释
- [ ] 删除临时文件
- [ ] 删除本迁移计划文件 (或标记为已完成)

### 验收标准

- [ ] i18n 文件合并完成
- [ ] 所有文档更新完成
- [ ] 代码质量检查全部通过
- [ ] 功能测试全部通过
- [ ] 性能基准达标
- [ ] 清理工作完成
- [ ] `npm run preflight` 通过
- [ ] 手动回归测试完成

### 最终回滚点

- Git 标签: `phase-9-complete`
- Git 标签: `migration-complete-v1.0`

---

## 验证与测试

### 单元测试策略

**测试框架**: Vitest

**覆盖率目标**:
- 核心逻辑: ≥ 80%
- UI 组件: ≥ 70%
- 工具函数: ≥ 90%

**关键测试区域**:
1. MCP 工具 (mock Chrome API)
2. 干预系统 (事件流测试)
3. 语音输入 (mock 音频 API)
4. 上下文优化 (Token 计数准确性)
5. QuickJS VM (沙箱隔离)
6. 技能系统 (生命周期)

### 集成测试

**测试场景**:
1. 完整干预流程
2. 技能安装到执行
3. 用例完整工作流
4. 多语言切换

### E2E 测试

使用 Playwright 测试扩展功能:
```bash
npm run test:e2e
```

**测试用例**:
1. 侧边栏打开
2. 聊天对话
3. 工具调用
4. 干预请求
5. 用例执行

---

## 风险管理

### 高风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| QuickJS WASM 加载失败 | 🔴 CRITICAL | 🟡 MEDIUM | 1. 降级方案<br>2. 详细错误日志<br>3. 用户友好提示 |
| 包大小超标 (>3MB) | 🟡 HIGH | 🟡 MEDIUM | 1. 懒加载 WASM<br>2. 代码分割<br>3. Tree shaking |
| 构建时间过长 | 🟡 HIGH | 🟢 LOW | 1. 并行构建<br>2. 缓存优化<br>3. 增量构建 |
| 跨包循环依赖 | 🔴 CRITICAL | 🟢 LOW | 1. 严格遵守架构规则<br>2. CI 检查<br>3. 依赖图分析 |

### 中风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| UI 组件平台耦合 | 🟡 HIGH | 🟡 MEDIUM | 1. 代码审查<br>2. 静态分析<br>3. Props 模式 |
| 测试覆盖率不足 | 🟡 MEDIUM | 🟡 MEDIUM | 1. 强制覆盖率门槛<br>2. 测试优先策略 |
| 性能回归 | 🟡 MEDIUM | 🟡 MEDIUM | 1. 性能基准测试<br>2. 持续监控 |

### 低风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| i18n 翻译缺失 | 🟢 LOW | 🟢 LOW | 1. 降级到英文<br>2. 逐步补充 |
| 文档过时 | 🟢 LOW | 🟡 MEDIUM | 1. 文档审查<br>2. 定期更新 |

---

## 回滚策略

### 阶段级回滚

每个阶段都有独立的 Git 标签，可以快速回滚:

```bash
# 回滚到阶段 N 开始前
git checkout phase-N-start

# 回滚到阶段 N 完成后
git checkout phase-N-complete
```

### 功能级回滚

**功能开关 (Feature Flags)**:

```typescript
// packages/core/src/config/feature-flags.ts
export const FEATURE_FLAGS = {
  INTERVENTION_SYSTEM: true,
  VOICE_INPUT: true,
  QUICKJS_VM: true,
  SKILL_SYSTEM: true,
  USE_CASES: true,
  CONTEXT_OPTIMIZER: true,
};
```

**使用示例**:
```typescript
if (FEATURE_FLAGS.QUICKJS_VM) {
  // 使用 QuickJS
} else {
  // 降级方案
}
```

### 完全回滚

如果迁移失败，回滚到起点:

```bash
git checkout phase-1-start
# 或者
git revert <migration-start-commit>
```

---

## 成功指标

### 技术指标

| 指标 | 目标 | 测量方法 |
|-----|------|---------|
| 构建时间增加 | ≤ +20% | CI 构建日志 |
| 包大小增加 | ≤ +3MB | `npm run build` + 文件大小 |
| 测试覆盖率 | ≥ 80% (新代码) | Vitest 覆盖率报告 |
| TypeScript 错误 | 0 | `npm run typecheck` |
| Lint 错误 | 0 | `npm run lint` |
| 性能无回归 | 100% | 性能基准对比 |

### 功能指标

| 功能 | 目标 | 测量方法 |
|-----|------|---------|
| 语音输入延迟 | <100ms | 手动测试 + 日志 |
| 语音识别准确率 | >95% | 样本测试 (20 条语音) |
| 快照生成时间 | <500ms | 性能测试 |
| 技能执行开销 | <10ms | 基准测试 |
| User Guide Generator | <30s (10 步) | 端到端测试 |
| PDF 生成时间 | <5s (10 步) | 性能测试 |

### 业务指标

| 指标 | 目标 | 说明 |
|-----|------|------|
| 功能完整性 | 100% | 所有 private 分支功能迁移 |
| 架构合规性 | 100% | 无违反架构规则 |
| 文档完整性 | 100% | 所有新功能有文档 |

---

## 时间估算与里程碑

### 详细时间线

| 周 | 阶段 | 任务 | 交付物 |
|----|-----|------|-------|
| 第 1 周 | 阶段 1-2 | MCP 工具 + 干预系统 | 工具增强、干预实现 |
| 第 2 周 | 阶段 3-4 | 语音输入 + 上下文增强 | 语音系统、Token 管理 |
| 第 3 周 | 阶段 5-6 | QuickJS VM + 技能系统 | VM 运行时、技能管理 |
| 第 4 周 | 阶段 7 | 用例系统 | 6 个用例模板 |
| 第 5 周 | 阶段 8-9 | 服务层 + 收尾 | 辅助功能、文档 |
| 第 6 周 | 缓冲 | 测试与优化 | 性能优化、bug 修复 |

### 关键里程碑

| 里程碑 | 日期 | 标准 |
|--------|------|------|
| M1: 基础工具完成 | 第 1 周末 | 阶段 1-2 完成，preflight 通过 |
| M2: 核心功能完成 | 第 2 周末 | 阶段 3-4 完成，集成测试通过 |
| M3: 高级功能完成 | 第 3 周末 | 阶段 5-6 完成，VM 测试通过 |
| M4: 用例系统完成 | 第 4 周末 | 阶段 7 完成，用例测试通过 |
| M5: 迁移完成 | 第 5 周末 | 阶段 8-9 完成，所有测试通过 |
| M6: 生产就绪 | 第 6 周末 | 性能优化完成，文档完善 |

---

## 附录

### A. 依赖清单

**新增依赖**:

```json
{
  "dependencies": {
    "@jitl/quickjs-wasmfile-release-sync": "^0.23.0",
    "@zenfs/core": "^0.13.0",
    "@zenfs/dom": "^0.2.0",
    "@ricky0123/vad-web": "^0.0.12",
    "tokenlens": "^1.1.0",
    "pdf-lib": "^1.17.1",
    "html2canvas": "^1.4.1",
    "gifshot": "^0.4.5",
    "p-limit": "^4.0.0",
    "three": "^0.160.0",
    "fflate": "^0.8.1"
  }
}
```

**总大小**: ~3 MB (主要是 QuickJS WASM)

### B. 文件迁移矩阵

完整的文件迁移清单，见各阶段详细表格。

### C. 架构决策记录 (ADR)

**ADR-001: 为什么创建 @use-cases 包？**
- **决策**: 创建独立的 `@use-cases` 包
- **理由**:
  1. 用例是高层业务逻辑，依赖所有下层包
  2. 保持 `@aipex-react` 纯粹的 UI 层
  3. 便于未来扩展更多用例
- **替代方案**: 放在 `browser-ext` 中（不利于代码组织）

**ADR-002: 为什么使用 QuickJS 而不是其他方案？**
- **决策**: 使用 QuickJS WASM
- **理由**:
  1. 轻量级 (~1.2 MB)
  2. Chrome 扩展 CSP 兼容
  3. ES6 模块支持
  4. 沙箱隔离
- **替代方案**:
  - Isolated World (不支持动态加载)
  - Web Workers (无文件系统)

**ADR-003: 为什么干预系统的 UI 组件在 @aipex-react？**
- **决策**: 干预 UI 组件放在 `@aipex-react`
- **理由**:
  1. 遵守架构规则 (UI 层平台无关)
  2. 可复用于其他平台 (未来)
  3. 测试更容易 (无需 mock Chrome API)
- **约束**: 必须通过 Props 传递所有平台相关逻辑

### D. 术语表

| 术语 | 定义 |
|-----|------|
| **Intervention** | 人机交互干预，AI 请求人工帮助的机制 |
| **Skill** | 可插拔的技能包，扩展 AI 能力 |
| **Use Case** | 预定义的工作流模板 |
| **MCP** | Model Context Protocol，统一的工具协议 |
| **CDP** | Chrome DevTools Protocol |
| **QuickJS** | 轻量级 JavaScript 引擎 |
| **ZenFS** | 浏览器中的虚拟文件系统 |
| **VAD** | Voice Activity Detection，语音活动检测 |
| **STT** | Speech-to-Text，语音转文字 |
| **AXTree** | Accessibility Tree，可访问性树 |

### E. 联系与支持

如果在迁移过程中遇到问题:
1. 查阅本文档相关章节
2. 检查 Git 标签，尝试回滚
3. 查看 `CLAUDE.md` 中的架构规则
4. 运行 `npm run preflight` 诊断问题

---

**文档状态**: ✅ 待审核
**下一步**: 获取审批后开始阶段一

---

*本文档由 Claude Sonnet 4.5 生成，基于代码分析和项目需求*
