# Chatbot Components

这个目录包含了聊天机器人的基础组件，使用 Tailwind CSS 构建，提供了良好的可读性和可维护性。

## 组件列表

### 1. Thread
聊天消息列表组件，用于显示用户和助手的对话。

```tsx
import { Thread, Message } from "~/lib/components"

<Thread messages={messages}>
  {(message) => (
    <div>
      {/* 自定义消息渲染逻辑 */}
      {message.content}
    </div>
  )}
</Thread>
```

### 2. MarkdownRenderer
Markdown 渲染组件，支持语法高亮和流式显示。

```tsx
import { MarkdownRenderer } from "~/lib/components"

<MarkdownRenderer 
  content="# Hello World" 
  streaming={true} 
/>
```

### 3. CodeBlock
代码语法高亮组件，基于 react-syntax-highlighter。

```tsx
import { CodeBlock } from "~/lib/components"

<CodeBlock className="language-javascript">
  console.log("Hello World");
</CodeBlock>
```

### 4. CallTool
工具调用步骤显示组件，用于展示 AI 的推理过程。

```tsx
import { CallTool, ToolStep } from "~/lib/components"

const steps: ToolStep[] = [
  { type: 'think', content: '分析用户需求...' },
  { type: 'call_tool', name: 'get_tabs', args: {} },
  { type: 'tool_result', result: '获取到 5 个标签页' }
]

<CallTool steps={steps} />
```

### 5. Thinking
AI 思考状态显示组件，带有动画效果。

```tsx
import { Thinking } from "~/lib/components"

<Thinking isThinking={true}>
  AI 正在分析您的请求...
</Thinking>
```

## 类型定义

```tsx
interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  streaming?: boolean
}

interface ToolStep {
  type: 'think' | 'call_tool' | 'tool_result'
  content?: string
  name?: string
  args?: any
  result?: string
}
```

## 使用示例

完整的聊天界面示例：

```tsx
import { Thread, MarkdownRenderer, CallTool, Thinking } from "~/lib/components"

const ChatInterface = () => {
  return (
    <div>
      <Thread messages={messages}>
        {(message) => (
          <div className="flex flex-col gap-2">
            {message.role === 'assistant' && (
              <>
                {stepsByMessageId[message.id]?.length && (
                  <CallTool steps={stepsByMessageId[message.id]} />
                )}
                <MarkdownRenderer 
                  content={message.content} 
                  streaming={message.streaming} 
                />
              </>
            )}
          </div>
        )}
      </Thread>
      
      <Thinking isThinking={loading}>
        AI 正在处理您的请求...
      </Thinking>
    </div>
  )
}
```

## 样式特点

- 使用 Tailwind CSS 进行样式设计
- 响应式设计，适配不同屏幕尺寸
- 统一的颜色主题和间距
- 支持深色模式（通过 CSS 变量）
- 流畅的动画和过渡效果
