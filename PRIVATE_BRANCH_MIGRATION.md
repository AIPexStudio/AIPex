# Private Branch Migration Plan

**Date**: 2026-01-02
**Current Branch**: feature-next-rob
**Source Branch**: private
**Goal**: Migrate advanced features from private branch into the clean multi-package architecture

---

## Executive Summary

The **private branch** contains production-ready features in a monolithic structure, while the **current branch** has a clean multi-package architecture (@core, @browser-runtime, @aipex-react, browser-ext) but is missing key features. This document outlines how to systematically migrate features from private while preserving the architectural advantages of the current branch.

### Key Statistics
- **Private Branch**: 179 files in `src/`, 20+ MCP tools, monolithic structure
- **Current Branch**: 4 packages, 8 basic tools, clean layer separation
- **Migration Scope**: ~10 major feature systems to integrate

---

## Table of Contents

- [Architecture Comparison](#architecture-comparison)
- [Feature Analysis](#feature-analysis)
- [Module Mapping Table](#module-mapping-table)
- [Migration Plan by Phase](#migration-plan-by-phase)
- [Package Dependency Graph](#package-dependency-graph)
- [Implementation Guidelines](#implementation-guidelines)
- [Risk Assessment](#risk-assessment)

---

## Architecture Comparison

### Current Branch (feature-next-rob) - Multi-Package Architecture

```
packages/
├── core/                      # Pure TypeScript interfaces
│   ├── agent/                 # Agent abstractions
│   ├── conversation/          # Conversation model
│   ├── runtime/               # Runtime interfaces
│   └── tool/                  # Tool interfaces
│
├── browser-runtime/           # Chrome implementation
│   ├── automation/            # CDP automation, snapshot
│   ├── context/               # Context providers
│   ├── runtime/               # Runtime hosts, intervention-host
│   ├── storage/               # Storage adapters
│   └── tools/                 # 8 basic tools (needs expansion)
│
├── aipex-react/               # UI library (platform-agnostic)
│   ├── components/            # React components
│   ├── adapters/              # Chat, runtime adapters
│   └── hooks/                 # React hooks
│
└── browser-ext/               # Extension assembly
    ├── background/            # Background script
    ├── content/               # Content script
    ├── options/               # Options page
    └── sidepanel/             # Side panel
```

### Private Branch - Monolithic Architecture

```
src/
├── background.ts              # Extension background
├── content.tsx                # Content script
├── sidepanel.tsx              # Side panel
├── options.tsx                # Options page
├── mcp/                       # MCP integration
├── mcp-servers/               # 20+ MCP tools (mixed concerns)
├── interventions/             # Intervention system (complete)
├── skill/                     # Skill system with QuickJS VM
├── use-cases/                 # Use case scenarios (6 total)
└── lib/                       # Shared utilities
    ├── voice/                 # Voice input system
    ├── vm/                    # QuickJS virtual machine
    ├── context/               # Context management
    ├── services/              # Version, auth, APIs
    └── components/            # UI components
```

### Target Architecture (After Migration)

```
packages/
├── core/                      # [No changes needed]
│
├── browser-runtime/           # [Expand capabilities]
│   ├── automation/            # ✅ Enhanced snapshot manager
│   ├── intervention/          # ✅ Add manager + registry
│   ├── runtime/               # ✅ Add skill execution
│   ├── storage/               # ✅ Add skill storage
│   ├── tools/                 # ✅ Expand from 8 to 20+ tools
│   ├── voice/                 # ✅ Add voice system
│   └── vm/                    # ✅ Add QuickJS VM
│
├── aipex-react/               # [Add UI components]
│   ├── components/
│   │   ├── intervention/      # ✅ Intervention UI
│   │   ├── voice/             # ✅ Voice mode UI (3D sphere)
│   │   ├── skill/             # ✅ Skill manager UI
│   │   └── conversation/      # ✅ History UI
│   └── adapters/              # [Existing]
│
├── browser-ext/               # [Add services]
│   ├── services/              # ✅ Version checker, auth, APIs
│   └── [existing]             # [No changes]
│
└── use-cases/                 # ✅ NEW PACKAGE (Top-level application)
    ├── user-guide-generator/  # Flagship use case
    ├── accessibility-testing/
    ├── batch-submit-jobs/
    ├── batch-submit-backlinks/
    ├── e2e-testing/
    └── design-comparison/
```

---

## Feature Analysis

### 1. 🔴 HIGH PRIORITY: MCP Tools Expansion

**Current State**: 8 basic tools
**Target State**: 20+ comprehensive tools
**Destination Package**: `@browser-runtime/tools`

#### Current Tools (8)
- bookmark, element, history, page, screenshot, snapshot, tab, index

#### Missing Tools from Private Branch (12+)
| Tool | Purpose | Complexity | Lines |
|------|---------|------------|-------|
| `bookmarks` | Bookmark CRUD operations | Low | ~150 |
| `clipboard` | Clipboard read/write | Low | ~100 |
| `context-menus` | Right-click menu creation | Low | ~120 |
| `downloads` | Download management | Low | ~180 |
| `extensions` | Extension management | Low | ~90 |
| `sessions` | Session save/restore | Medium | ~250 |
| `tab-groups` | Tab group operations | Medium | ~200 |
| `windows` | Window management | Medium | ~220 |
| `smart-locator` | AI-powered element location | High | ~400 |
| `ui-operations` | Advanced UI interactions | High | ~500 |
| `wait-helper` | Smart waiting strategies | Medium | ~150 |
| `debugger-manager` | CDP debugger control | High | ~300 |

#### Enhanced Tools (Critical Upgrades)
| Tool | Enhancement | Lines | Impact |
|------|-------------|-------|--------|
| `snapshot` | Accessibility tree integration, 2-pass algorithm, persistent node IDs | 1064 | CRITICAL |
| `page` | Enhanced content extraction with better DOM parsing | 400+ | HIGH |

**Key Features of Enhanced Snapshot Manager**:
- **Accessibility Tree Integration**: Uses Chrome CDP `Accessibility.getFullAXTree`
- **Smart Node ID Management**: Persistent `data-aipex-nodeid` attributes
- **Two-Pass Algorithm**: Puppeteer-style interesting node collection
- **Concurrency Control**: p-limit for efficient CDP operations
- **Search & Query**: Advanced snapshot search with context
- **Node Reuse**: Preserves IDs across snapshots for stability

---

### 2. 🔴 HIGH PRIORITY: Intervention System Completion

**Current State**: Interface definitions only (`intervention-host.ts`)
**Target State**: Complete system with manager, registry, and UI
**Destination Packages**: `@browser-runtime` (logic) + `@aipex-react` (UI)

#### Architecture in Private Branch

```
interventions/
├── types/                          # Type definitions
├── lib/
│   ├── intervention-manager.ts     # Queue, timeout, lifecycle
│   ├── intervention-registry.ts    # Plugin registration
│   └── element-capture-common.ts   # Element capture service
├── implementations/
│   ├── monitor-operation.ts        # Monitor user actions
│   ├── voice-input.ts              # Voice-based interventions
│   └── user-selection.ts           # Element selection
├── components/
│   ├── InterventionCard.tsx        # Base card component
│   ├── MonitorCard.tsx             # Monitor-specific UI
│   ├── VoiceCard.tsx               # Voice input UI
│   ├── SelectionCard.tsx           # Selection UI
│   └── InterventionModeToggle.tsx  # Mode switcher
└── mcp-servers/
    └── interventions.ts            # MCP tool interface
```

#### Key Features
1. **Intervention Manager**: Queue management, timeout handling (5s default), page navigation monitoring
2. **Registry System**: Dynamic intervention registration with lifecycle hooks
3. **Built-in Interventions**: Monitor, voice, and selection types
4. **UI Components**: Cards for each intervention type with mode toggle
5. **Intervention Modes**: `active`, `passive`, `disabled`

**Migration Target**:
- Core logic → `packages/browser-runtime/src/intervention/`
- UI components → `packages/aipex-react/src/components/intervention/`

---

### 3. 🟡 MEDIUM PRIORITY: Voice Input System

**Current State**: Not present
**Target State**: Multi-source voice input with 3D visualization
**Destination Packages**: `@browser-runtime/voice` (APIs) + `@aipex-react/components/voice` (UI)

#### Features in Private Branch

**Core Components**:
- `voice-input-manager.ts` - Main manager with multi-source support
- `audio-recorder.ts` - MediaRecorder integration
- `vad-detector.ts` - Voice Activity Detection
- `elevenlabs-stt.ts` - ElevenLabs API integration
- `server-stt.ts` - Server-side STT API
- `voice-mode/voice-input.tsx` - 3D sphere visualization (WebGL)

**Voice Sources**:
1. **Web Speech API** - Browser native, free, real-time
2. **ElevenLabs STT** - High quality, paid API
3. **Server STT** - Custom backend integration
4. **Auto-fallback** - Switches between sources automatically

**3D Visualization**:
- WebGL particle system
- Audio-reactive sphere animation
- Smooth visual feedback
- Proper cleanup on unmount

---

### 4. 🟡 MEDIUM PRIORITY: Skill System

**Current State**: Not present
**Target State**: Complete skill package management with QuickJS VM
**Destination Package**: `@browser-runtime` (execution) + `@aipex-react` (UI)

#### Architecture in Private Branch

```
skill/
├── lib/
│   ├── services/
│   │   ├── skill-manager.ts        # Install/uninstall/enable/disable
│   │   ├── skill-registry.ts       # Skill registration
│   │   └── skill-executor.ts       # VM execution wrapper
│   ├── storage/
│   │   └── skill-storage.ts        # IndexedDB storage
│   └── utils/
│       └── zip-utils.ts            # Package handling
├── components/
│   ├── file-manager/               # File browser UI
│   └── skills/                     # Skill management UI
├── built-in/
│   └── skill-creator-browser/      # Built-in template skills
└── mcp-servers/
    └── skills.ts                   # MCP tool interface
```

#### Key Features
1. **Skill Package Management**: Install from .zip, enable/disable, update, uninstall
2. **QuickJS VM Execution**: Sandboxed JavaScript with memory limits and timeouts
3. **CDN Module Loading**: Dynamic imports from jsDelivr/unpkg with caching
4. **File Manager UI**: Browse, view, and edit skill files
5. **MCP Integration**: Skills exposed as MCP tools with auto-generated schemas

**Dependencies**:
- `@jitl/quickjs-wasmfile-release-sync` - QuickJS WASM runtime
- `@zenfs/core` - Virtual file system
- `p-limit` - Concurrency control

---

### 5. 🟢 HIGH VALUE: Use Cases System (Top-Level Application)

**Current State**: Not present
**Target State**: Dedicated package with 6 use cases
**Destination**: NEW package `@aipexstudio/use-cases`

#### Use Cases in Private Branch

| Use Case | Status | Key Features |
|----------|--------|--------------|
| `user-guide-generator/` | ⭐ Most Complete | Screenshot recording, GIF generation with spotlight, PDF/Markdown export, manual replay |
| `accessibility-testing/` | Complete | Accessibility auditing, report generation, localization |
| `batch-submit-jobs/` | Complete | Batch form submission, localization |
| `batch-submit-backlinks/` | Complete | Backlink submission automation |
| `e2e-testing/` | Complete | E2E test scenario execution, localization |
| `design-comparison/` | Complete | Visual diff comparison |

#### User Guide Generator: Flagship Feature

**Features**:
1. **Step Recording**
   - Automatic step detection via DOM mutations
   - Manual step marking
   - AI-generated step descriptions
   - Screenshot capture per step
   - DOM snapshot for each step

2. **Screenshot Management**
   - Buffer system (circular buffer)
   - S3 upload integration
   - Lazy loading for large guides
   - Spotlight highlighting on elements

3. **Export Formats**
   - **PDF**: Using pdf-lib (replaced jsPDF)
   - **Markdown**: With embedded images
   - **GIF**: Animated walkthrough with spotlight effects
   - **JSON**: Raw data export

4. **Advanced Settings**
   - Screenshot preferences (quality, format, frequency)
   - Export template customization
   - Localization support (8 languages)

5. **Manual Replay**
   - Playback recorded steps
   - Navigate between steps
   - Edit/delete steps

**Why Separate Package?**
- Use cases are **top-level applications** that use all other packages
- Optional features (not all users need all use cases)
- Independent versioning
- Clear dependency hierarchy: `use-cases → {aipex-react, browser-runtime, browser-ext} → core`

---

### 6. 🟡 MEDIUM PRIORITY: QuickJS Virtual Machine

**Current State**: Not present
**Target State**: Sandboxed JavaScript execution
**Destination Package**: `@browser-runtime/vm`

#### Features
- QuickJS JavaScript runtime in browser
- CDN module loading with caching
- ZenFS virtual file system integration
- Memory management and pooling
- Security sandboxing

**Files**:
- `quickjs-manager.ts` - Main VM manager
- `module-loader.ts` - CDN module loading
- `bundled-modules/` - Pre-bundled common modules (lodash, date-fns, etc.)
- `zenfs-integration.ts` - Virtual file system

---

### 7. 🟢 MEDIUM PRIORITY: Memory/Context Enhancement

**Current State**: Basic context management
**Target State**: Enhanced tracking and optimization
**Destination Package**: `@browser-runtime/context`

#### Features
- Token usage tracking
- Context optimizer (smart compression)
- Background context manager (async operations)
- Simple tokenizer utilities

**Files**:
- `token-tracker.ts`
- `context-optimizer.ts`
- `background-context-manager.ts`
- `simple-tokenizer.ts`

---

### 8. 🟢 LOW PRIORITY: Conversation History

**Current State**: Not present
**Target State**: Conversation history UI
**Destination Package**: `@aipex-react/components/conversation`

#### Features
- Conversation list UI
- Session storage and retrieval
- History search and filtering
- Export conversations

**Files**:
- `conversation-history.tsx` → `ConversationHistory.tsx`

---

### 9. 🟢 LOW PRIORITY: Version Management & Auth

**Current State**: Not present
**Target State**: Version checker, auth, update banner
**Destination Package**: `@browser-ext/services`

#### Features
- Version checking for updates
- Web authentication
- User manuals API (cloud integration)
- Update banner UI

**Files**:
- `version-checker.ts`
- `web-auth.ts`
- `user-manuals-api.ts`
- `UpdateBanner.tsx` (UI component in @aipex-react)

---

## Module Mapping Table

| Private Branch Feature | Target Package | Priority | Rationale |
|------------------------|----------------|----------|-----------|
| **MCP Tools (20+ tools)** | `@browser-runtime/tools` | 🔴 HIGH | Core capability, extends existing tools |
| **Enhanced Snapshot Manager** | `@browser-runtime/tools/snapshot` | 🔴 CRITICAL | Accessibility tree integration, 1064 lines |
| **Intervention Manager** | `@browser-runtime/intervention` | 🔴 HIGH | Completes existing partial implementation |
| **Intervention UI** | `@aipex-react/components/intervention` | 🔴 HIGH | User-facing components |
| **Voice Input APIs** | `@browser-runtime/voice` | 🟡 MEDIUM | New feature, multi-source support |
| **Voice UI (3D Sphere)** | `@aipex-react/components/voice` | 🟡 MEDIUM | WebGL visualization |
| **Skill Manager** | `@browser-runtime/skill` | 🟡 MEDIUM | Package management logic |
| **Skill UI** | `@aipex-react/components/skill` | 🟡 MEDIUM | File explorer, installer |
| **QuickJS VM** | `@browser-runtime/vm` | 🟡 MEDIUM | Required by skill system |
| **Use Cases Framework** | `@use-cases` (new package) | 🟢 HIGH VALUE | Top-level application |
| **User Guide Generator** | `@use-cases/user-guide-generator` | 🟢 HIGH VALUE | Flagship use case |
| **Context Enhancement** | `@browser-runtime/context` | 🟢 MEDIUM | Token tracking, optimization |
| **Conversation History** | `@aipex-react/components/conversation` | 🟢 LOW | UI component |
| **Version/Auth** | `@browser-ext/services` | 🟢 LOW | Application-level services |

---

## Migration Plan by Phase

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Expand core capabilities

#### Tasks
1. ✅ **MCP Tools Expansion** (`@browser-runtime/tools`)
   - Migrate 12 missing tools
   - Enhance snapshot manager with accessibility tree (1064 lines)
   - Add comprehensive tests for each tool
   - Update tool exports in index.ts

2. ✅ **Intervention System Completion** (`@browser-runtime/intervention` + `@aipex-react`)
   - Implement intervention manager with queue and timeout
   - Create intervention registry
   - Add 3 built-in interventions (monitor, voice, selection)
   - Migrate UI components (5 components)

**Success Criteria**:
- All 20+ MCP tools functional
- Intervention system working with UI
- Enhanced snapshot generating accessibility trees
- All tests passing, no breaking changes

---

### Phase 2: Advanced Features (Weeks 3-4)
**Goal**: Add voice and context capabilities

#### Tasks
1. ✅ **Voice Input System** (`@browser-runtime/voice` + `@aipex-react`)
   - Migrate voice input manager
   - Add multi-source support (Web Speech, ElevenLabs, Server)
   - Implement VAD detection
   - Add 3D voice UI sphere (WebGL)

2. ✅ **Memory/Context Enhancement** (`@browser-runtime/context`)
   - Add token tracking
   - Implement context optimizer
   - Add background context manager
   - Add simple tokenizer

**Success Criteria**:
- Voice input working with all 3 sources
- 3D visualization rendering correctly
- Context tracking reducing token usage
- Performance benchmarks met (<100ms latency for voice)

---

### Phase 3: Skill System (Weeks 5-6)
**Goal**: Enable skill package management

#### Tasks
1. ✅ **QuickJS VM** (`@browser-runtime/vm`)
   - Integrate QuickJS runtime
   - Add CDN module loader with caching
   - Implement virtual file system (ZenFS)
   - Add security sandboxing

2. ✅ **Skill Management** (`@browser-runtime/skill`)
   - Implement skill manager
   - Add skill storage (IndexedDB)
   - Create skill registry
   - Build skill executor

3. ✅ **Skill UI** (`@aipex-react/components/skill`)
   - Skill list and manager UI
   - File explorer component
   - Skill installer (zip upload)

**Success Criteria**:
- Skills install from .zip files
- Skills execute in sandboxed VM
- Skill UI allows management
- Built-in template skills work

---

### Phase 4: Use Cases (Weeks 7-8)
**Goal**: Create top-level use cases package

#### Tasks
1. ✅ **Package Setup**
   - Create `packages/use-cases/` package
   - Set up dependencies (core, browser-runtime, aipex-react)
   - Create framework base classes

2. ✅ **User Guide Generator** (Priority 1)
   - Migrate complete implementation
   - Test step recording with DOM mutations
   - Test screenshot capture and S3 upload
   - Test GIF generation with spotlight effects
   - Test PDF export (pdf-lib)
   - Test markdown export
   - Test manual replay functionality

3. ✅ **Other Use Cases** (Priority 2)
   - Accessibility testing
   - Batch submit jobs
   - Batch submit backlinks
   - E2E testing
   - Design comparison

4. ✅ **Localization**
   - Migrate i18n files (8 languages)
   - Test multi-language support

**Success Criteria**:
- Use cases package compiles
- User guide generator produces PDF, GIF, markdown
- All 6 use cases functional
- Localization working

---

### Phase 5: Polish (Week 9)
**Goal**: Add auxiliary features and finalize

#### Tasks
1. ✅ **Conversation History** (`@aipex-react`)
   - Migrate conversation history UI
   - Add search and filtering

2. ✅ **Version & Auth** (`@browser-ext/services`)
   - Migrate version checker
   - Add update banner UI
   - Migrate web auth service
   - Migrate user manuals API

3. ✅ **Documentation**
   - Update README files
   - Document new packages
   - Update CLAUDE.md with new architecture
   - Create migration guide

**Success Criteria**:
- All features from private branch integrated
- Documentation complete
- All tests passing
- Ready for release

---

## Package Dependency Graph

```
                    ┌─────────────────┐
                    │     @core       │
                    │ (Pure TS Core)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────────┐ ┌─────────────┐
    │ @browser-runtime│ │ @aipex-react│
    │ (Chrome Impl)   │ │ (React UI)  │
    └────────┬────────┘ └──────┬──────┘
             │                 │
             └────────┬────────┘
                      │
                      ▼
              ┌─────────────────┐
              │   @use-cases    │
              │ (Top-level App) │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  @browser-ext   │
              │ (Extension Entry)│
              └─────────────────┘
```

**Dependency Rules**:
- ✅ `@core` → no dependencies
- ✅ `@browser-runtime` → `@core` only
- ✅ `@aipex-react` → `@core` only
- ✅ `@use-cases` → `@core`, `@browser-runtime`, `@aipex-react`
- ✅ `@browser-ext` → all packages (final assembly)
- ❌ `@aipex-react` → `@browser-runtime` (PROHIBITED)

---

## Implementation Guidelines

### Architecture Principles

1. **Interface-First Design**
   - Define interfaces in `@core` first
   - Implement in `@browser-runtime`
   - Consume in `@aipex-react` and `@use-cases`

2. **Platform Independence**
   - `@core`: Pure TypeScript, no platform dependencies
   - `@browser-runtime`: Chrome-specific implementations
   - `@aipex-react`: Platform-agnostic React components
   - `@use-cases`: Application-level logic using all packages

3. **Testing Isolation**
   - Each package has its own tests
   - Mock external dependencies
   - No cross-package test dependencies

4. **Bundle Size Awareness**
   - QuickJS: ~1.2MB WASM (lazy load)
   - Three.js: ~500KB (evaluate if needed for voice sphere)
   - pdf-lib: ~200KB
   - Target: Keep total increase under 3MB

### Code Quality Checklist

Before merging each phase:
- [ ] All TypeScript compiles without errors
- [ ] All tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console.log statements (use proper logging)
- [ ] All TODOs resolved or documented
- [ ] No dead code or unused imports
- [ ] Documentation updated (README, JSDoc)
- [ ] Bundle size checked
- [ ] Performance benchmarks met
- [ ] **Preflight check passes** (`npm run preflight`)

---

## Risk Assessment

### High Risk Items

1. **QuickJS VM Integration**
   - **Complexity**: High (new runtime, WASM, sandboxing)
   - **Impact**: Enables entire skill system
   - **Mitigation**: Extensive testing, gradual rollout, feature flag

2. **Enhanced Snapshot Manager**
   - **Complexity**: High (1064 lines, accessibility tree API)
   - **Impact**: Critical for automation quality
   - **Mitigation**: Keep old implementation as fallback, A/B test

### Medium Risk Items

3. **Voice Input System**
   - **Complexity**: Medium (multiple APIs, 3D rendering)
   - **Impact**: New feature, won't break existing
   - **Mitigation**: Isolated package, can be disabled

4. **Use Cases Package**
   - **Complexity**: Medium-High (top-level integration)
   - **Impact**: New application layer
   - **Mitigation**: Separate package, optional for core users

### Low Risk Items

5. **MCP Tools Expansion**
   - **Complexity**: Low-Medium (mostly straightforward APIs)
   - **Impact**: Extends existing system
   - **Mitigation**: Individual tool testing, gradual rollout

6. **Intervention System Completion**
   - **Complexity**: Medium
   - **Impact**: Completes partial implementation
   - **Mitigation**: Builds on existing `intervention-host`

---

## Success Metrics

### Technical Metrics
- **Build Time**: ≤ +20% increase
- **Bundle Size**: ≤ +3MB
- **Test Coverage**: ≥80% for new code
- **Performance**: No regressions in existing features

### Feature Metrics
- **Voice Input**: <100ms latency, >95% accuracy
- **Snapshot**: <500ms generation time
- **Skills**: <10ms execution overhead
- **Use Cases**: User guide generator completes in <30s

### User Metrics
- **Adoption Rate**: % of users trying new features
- **Retention Rate**: % continuing to use features
- **Error Rate**: <1% of feature invocations fail
- **User Satisfaction**: Survey scores >4/5

---

## Next Steps

1. **Review and approve this plan**
2. **Begin Phase 1: MCP Tools Expansion**
   - Start with enhancing snapshot manager (highest impact)
   - Add missing tools one by one
3. **Complete Phase 1: Intervention System**
   - Implement manager and registry
   - Add UI components
4. **Proceed to Phase 2-5 sequentially**

---

## Appendix: Key File Mappings

### MCP Tools
| Private Path | Target Path |
|--------------|-------------|
| `src/mcp-servers/bookmarks.ts` | `packages/browser-runtime/src/tools/bookmarks/index.ts` |
| `src/mcp-servers/snapshot-manager.ts` | `packages/browser-runtime/src/tools/snapshot/snapshot-manager.ts` |

### Intervention System
| Private Path | Target Path |
|--------------|-------------|
| `src/interventions/intervention-manager.ts` | `packages/browser-runtime/src/intervention/intervention-manager.ts` |
| `src/interventions/components/InterventionCard.tsx` | `packages/aipex-react/src/components/intervention/InterventionCard.tsx` |

### Voice System
| Private Path | Target Path |
|--------------|-------------|
| `src/lib/voice/voice-input-manager.ts` | `packages/browser-runtime/src/voice/voice-input-manager.ts` |
| `src/lib/voice/voice-mode/voice-input.tsx` | `packages/aipex-react/src/components/voice/VoiceInput.tsx` |

### Skill System
| Private Path | Target Path |
|--------------|-------------|
| `src/skill/lib/services/skill-manager.ts` | `packages/browser-runtime/src/skill/skill-manager.ts` |
| `src/lib/vm/quickjs-manager.ts` | `packages/browser-runtime/src/vm/quickjs-manager.ts` |

### Use Cases
| Private Path | Target Path |
|--------------|-------------|
| `src/use-cases/user-guide-generator/*` | `packages/use-cases/src/user-guide-generator/*` |
| `src/use-cases/accessibility-testing/*` | `packages/use-cases/src/accessibility-testing/*` |

---

**Document Version**: 1.0
**Last Updated**: 2026-01-02
**Status**: Ready for Review
