# Conversation Storage

A robust conversation storage system for managing chat history with IndexedDB, LRU policy, and automatic migration from localStorage.

## Features

- 🗄️ **IndexedDB Storage**: Persistent storage with IndexedDB
- 🔄 **LRU Policy**: Automatically manages conversation limit (default: 5)
- 📦 **Auto Migration**: Seamlessly migrates from localStorage to IndexedDB
- 🔒 **Type Safe**: Full TypeScript support
- 🧪 **Well Tested**: Comprehensive unit and integration tests
- 🎯 **Drop-in Replacement**: Compatible with aipex implementation

## Installation

```typescript
import { conversationStorage } from '@aipexstudio/browser-runtime';
```

## Quick Start

### Basic Usage

```typescript
import { conversationStorage } from '@aipexstudio/browser-runtime';
import type { UIMessage } from '@aipexstudio/browser-runtime';

// Create messages
const messages: UIMessage[] = [
  {
    id: 'msg1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hello!' }],
  },
  {
    id: 'msg2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Hi! How can I help?' }],
  },
];

// Save conversation
const conversationId = await conversationStorage.saveConversation(messages);

// Get all conversations
const conversations = await conversationStorage.getAllConversations();

// Get specific conversation
const conversation = await conversationStorage.getConversation(conversationId);

// Update conversation
await conversationStorage.updateConversation(conversationId, updatedMessages);

// Delete conversation
await conversationStorage.deleteConversation(conversationId);

// Clear all conversations
await conversationStorage.clearAllConversations();
```

### Custom Configuration

```typescript
import { ConversationStorage } from '@aipexstudio/browser-runtime';

const customStorage = new ConversationStorage({
  maxConversations: 10,  // Keep 10 conversations instead of 5
  dbName: 'my-conversations-db',
  storeName: 'my-conversations',
});

// Use custom storage
const id = await customStorage.saveConversation(messages);
```

## API Reference

### `conversationStorage` (Singleton)

The default singleton instance with standard configuration.

#### Methods

##### `saveConversation(messages: UIMessage[]): Promise<string>`

Saves a new conversation and returns its ID.

- Filters out system messages
- Generates title from first user message
- Applies LRU policy automatically
- Returns conversation ID or empty string on error

```typescript
const conversationId = await conversationStorage.saveConversation(messages);
```

##### `getAllConversations(): Promise<ConversationData[]>`

Gets all conversations sorted by most recent first.

```typescript
const conversations = await conversationStorage.getAllConversations();
```

##### `getConversation(conversationId: string): Promise<ConversationData | null>`

Gets a specific conversation by ID and updates its access time.

```typescript
const conversation = await conversationStorage.getConversation('conv_123_abc');
```

##### `updateConversation(conversationId: string, messages: UIMessage[]): Promise<void>`

Updates an existing conversation with new messages.

```typescript
await conversationStorage.updateConversation('conv_123_abc', updatedMessages);
```

##### `deleteConversation(conversationId: string): Promise<void>`

Deletes a specific conversation.

```typescript
await conversationStorage.deleteConversation('conv_123_abc');
```

##### `clearAllConversations(): Promise<void>`

Deletes all conversations.

```typescript
await conversationStorage.clearAllConversations();
```

##### `close(): Promise<void>`

Closes the IndexedDB connection (cleanup).

```typescript
await conversationStorage.close();
```

## Data Structures

### ConversationData

```typescript
interface ConversationData {
  id: string;           // Format: "conv_{timestamp}_{random}"
  title: string;        // Generated from first user message
  messages: UIMessage[]; // Filtered messages (no system messages)
  createdAt: number;    // Creation timestamp
  updatedAt: number;    // Last update timestamp
}
```

### UIMessage

```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
  timestamp?: number;
}

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageData: string; imageTitle?: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
```

## LRU Policy

The storage automatically manages conversation count using a Least Recently Used (LRU) policy:

- **Default Limit**: 5 conversations
- **Sorting**: By `updatedAt` timestamp (most recent first)
- **Deletion**: Oldest conversations are automatically deleted when limit is exceeded
- **Access Tracking**: Reading a conversation updates its `updatedAt` timestamp

### Customizing LRU

```typescript
const storage = new ConversationStorage({
  maxConversations: 20,  // Keep 20 conversations
});
```

## Migration

The storage automatically migrates data from localStorage on first use:

- **Source**: `aipex-conversations` (localStorage)
- **Target**: `aipex-conversations-db` (IndexedDB)
- **Flag**: `aipex-conversations-migrated` (localStorage)
- **Behavior**: Runs once, idempotent, automatic

### Migration Process

1. Check if migration flag is set
2. If not migrated, read old conversations from localStorage
3. Save each conversation to IndexedDB
4. Apply LRU policy
5. Set migration flag
6. Remove old localStorage data

## Architecture

```
conversation/
├── types.ts                    # Type definitions
├── lru-policy.ts              # LRU policy implementation
├── migration.ts               # Migration logic
├── conversation-storage.ts    # Main storage class
├── index.ts                   # Public exports
├── __tests__/                 # Tests
│   ├── lru-policy.test.ts
│   ├── migration.test.ts
│   ├── conversation-storage.test.ts
│   └── integration.test.ts
├── COMPATIBILITY.md           # Compatibility verification
└── README.md                  # This file
```

## Testing

Run tests:

```bash
npm test conversation
```

### Test Coverage

- ✅ Unit tests for LRU policy
- ✅ Unit tests for migration logic
- ✅ Unit tests for conversation storage
- ✅ Integration tests for full workflow
- ✅ Integration tests for LRU behavior
- ✅ Integration tests for migration
- ✅ Concurrent operation tests
- ✅ Error handling tests

## Compatibility

This implementation is **100% compatible** with the aipex conversation storage:

- ✅ Same data structures
- ✅ Same database schema
- ✅ Same LRU behavior
- ✅ Same migration logic
- ✅ Drop-in replacement

See [COMPATIBILITY.md](./COMPATIBILITY.md) for detailed verification.

## Migration from aipex

### Before (aipex)

```typescript
import { ConversationStorage } from '~/lib/components/chatbot/conversation-storage';

const id = await ConversationStorage.saveConversation(messages);
const conversations = await ConversationStorage.getAllConversations();
```

### After (new-aipex)

```typescript
import { conversationStorage } from '@aipexstudio/browser-runtime';

const id = await conversationStorage.saveConversation(messages);
const conversations = await conversationStorage.getAllConversations();
```

**That's it!** Just change the import. Data migrates automatically.

## Performance

- **IndexedDB**: Asynchronous, non-blocking
- **LRU**: O(n log n) for sorting, O(n) for deletion
- **Migration**: One-time cost, runs in background
- **Memory**: Minimal (only active conversation in memory)

## Best Practices

1. **Use Singleton**: Use `conversationStorage` for most cases
2. **Error Handling**: Check return values (empty string = error)
3. **Cleanup**: Call `close()` when done (optional)
4. **Custom Config**: Create separate instances for different use cases
5. **Testing**: Mock the storage in tests using dependency injection

## Examples

### React Hook

```typescript
import { conversationStorage } from '@aipexstudio/browser-runtime';
import { useState, useEffect } from 'react';

function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const data = await conversationStorage.getAllConversations();
    setConversations(data);
    setLoading(false);
  };

  const saveConversation = async (messages) => {
    const id = await conversationStorage.saveConversation(messages);
    await loadConversations();
    return id;
  };

  return { conversations, loading, saveConversation };
}
```

### With Error Handling

```typescript
async function saveWithRetry(messages, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const id = await conversationStorage.saveConversation(messages);
    if (id) return id;
    
    console.warn(`Save attempt ${i + 1} failed, retrying...`);
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
  }
  
  throw new Error('Failed to save conversation after retries');
}
```

## Troubleshooting

### "Migration already completed" but no conversations

The migration flag is set but IndexedDB is empty. This can happen if:
- Migration completed but conversations were deleted
- Database was manually cleared

**Solution**: Clear the migration flag to re-run migration:
```typescript
localStorage.removeItem('aipex-conversations-migrated');
```

### Conversations not persisting

Check browser storage limits:
- IndexedDB quota exceeded
- Private/incognito mode restrictions

**Solution**: Clear old data or increase quota.

### LRU deleting conversations too aggressively

Default limit is 5 conversations.

**Solution**: Increase the limit:
```typescript
const storage = new ConversationStorage({ maxConversations: 20 });
```

## License

Part of the AIPex project.
