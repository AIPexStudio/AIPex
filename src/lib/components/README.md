# Chatbot Components

This directory contains basic chatbot components built with Tailwind CSS, providing good readability and maintainability.

## Component List

### 1. Thread
Chat message list component for displaying user and assistant conversations.

```tsx
<Thread>
  {(message) => (
    <div>
      {/* Custom message rendering logic */}
      {message.content}
    </div>
  )}
</Thread>
```

### 2. MarkdownRenderer
Markdown rendering component with syntax highlighting and streaming display support.

```tsx
<MarkdownRenderer 
  content={message.content} 
  streaming={message.streaming} 
/>
```

### 3. CodeBlock
Code syntax highlighting component based on react-syntax-highlighter.

```tsx
<CodeBlock language="javascript" code={codeString} />
```

### 4. CallTool
Tool call step display component for showing AI reasoning process.

```tsx
<CallTool steps={steps} />

const steps: ToolStep[] = [
  { type: 'think', content: 'Analyzing user requirements...' },
  { type: 'call_tool', name: 'get_tabs', args: {} },
  { type: 'tool_result', result: 'Retrieved 5 tabs' }
]
```

### 5. Thinking
AI thinking status display component with animation effects.

```tsx
<Thinking isThinking={true}>
  AI is analyzing your request...
</Thinking>
```

## Type Definitions

```tsx
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  streaming?: boolean;
}

interface ToolStep {
  type: 'think' | 'call_tool' | 'tool_result';
  content?: string;
  name?: string;
  args?: any;
  result?: any;
}
```

## Usage Example

Complete chat interface example:

```tsx
function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <div className="chat-container">
      <Thread>
        {messages.map(message => (
          <div key={message.id}>
            <MarkdownRenderer 
              content={message.content} 
              streaming={message.streaming} 
            />
          </div>
        ))}
      </Thread>
      
      <Thinking isThinking={loading}>
        AI is processing your request...
      </Thinking>
    </div>
  );
}
```

## Style Features

- Designed with Tailwind CSS
- Responsive design for different screen sizes
- Unified color theme and spacing
- Dark mode support (via CSS variables)
- Smooth animations and transitions