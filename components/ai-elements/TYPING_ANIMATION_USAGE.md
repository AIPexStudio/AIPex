# Typing Animation Usage Guide

## Overview

The `PromptInputTextarea` component now supports a typing animation effect for placeholders, extracted from the typing text component algorithm.

## Features

- ✨ Smooth typing and deleting animation
- 🔄 Multiple placeholder texts cycling
- ⚙️ Customizable speed settings
- 🎯 Automatically pauses when focused or has value

## Basic Usage

### Enable Typing Animation

```tsx
<PromptInputTextarea
  enableTypingAnimation={true}
  placeholder="What would you like to know?"
/>
```

### Multiple Placeholder Texts

```tsx
<PromptInputTextarea
  enableTypingAnimation={true}
  placeholderTexts={[
    "Ask me anything...",
    "What would you like to know?",
    "How can I help you today?",
    "Type your question here..."
  ]}
/>
```

### Custom Animation Speed

```tsx
<PromptInputTextarea
  enableTypingAnimation={true}
  placeholderTexts={[
    "Fast typing...",
    "Smooth animation..."
  ]}
  typingOptions={{
    typingSpeed: 30,      // Faster typing (default: 50ms)
    deletingSpeed: 20,    // Faster deleting (default: 30ms)
    pauseDuration: 1500,  // Shorter pause (default: 2000ms)
    loop: true           // Loop animation (default: true)
  }}
/>
```

## Props

### `enableTypingAnimation`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable or disable the typing animation effect

### `placeholderTexts`
- **Type:** `string[]`
- **Default:** `undefined`
- **Description:** Array of placeholder texts to cycle through. If not provided, uses the `placeholder` prop

### `typingOptions`
- **Type:** `object`
- **Default:** `{}`
- **Properties:**
  - `typingSpeed`: Milliseconds between each character typed (default: 50)
  - `deletingSpeed`: Milliseconds between each character deleted (default: 30)
  - `pauseDuration`: Milliseconds to pause after completing a text (default: 2000)
  - `loop`: Whether to loop through texts indefinitely (default: true)

## Complete Example

```tsx
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

export function ChatInput() {
  return (
    <PromptInput onSubmit={(message) => console.log(message)}>
      <PromptInputBody>
        <PromptInputTextarea
          enableTypingAnimation={true}
          placeholderTexts={[
            "Summarize this page...",
            "Explain this concept...",
            "Help me understand...",
            "What does this mean?",
          ]}
          typingOptions={{
            typingSpeed: 40,
            deletingSpeed: 25,
            pauseDuration: 1800,
            loop: true,
          }}
        />
      </PromptInputBody>
      <PromptInputToolbar>
        <div />
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  );
}
```

## Behavior

1. **Animation Active**: When the input is not focused and has no value
2. **Animation Paused**: When the user focuses on the input or starts typing
3. **Animation Resumes**: When the input loses focus and is empty

## Tips

- Use 3-5 placeholder texts for best user experience
- Keep texts concise and relevant to your use case
- Adjust `typingSpeed` for readability (40-60ms recommended)
- Use shorter `pauseDuration` (1500-2000ms) to keep it engaging
- Consider disabling animation on mobile for better performance

## Performance

The hook uses `setTimeout` for animations and properly cleans up timers to prevent memory leaks. The animation only runs when necessary (not focused and no value).
