// Streaming data parser for handling different types of stream chunks
export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'thinking' | 'planning' | 'complete' | 'error'
  content?: string
  name?: string
  args?: any
  result?: string
  error?: string
  timestamp: number
  messageId?: string
}

export interface ParsedStreamData {
  content: string
  toolCalls: any[]
  chunks: StreamChunk[]
}

export class StreamingParser {
  private buffer = ''
  private content = ''
  private toolCalls: any[] = []
  private chunks: StreamChunk[] = []
  private currentToolCall: any = null
  private messageId?: string

  constructor(messageId?: string) {
    this.messageId = messageId
  }

  // Parse a single chunk of streaming data
  parseChunk(chunk: Uint8Array): StreamChunk[] {
    const decoder = new TextDecoder()
    this.buffer += decoder.decode(chunk, { stream: true })
    
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''
    
    const newChunks: StreamChunk[] = []
    
    for (const line of lines) {
      if (line.trim() === '') continue
      
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          newChunks.push({
            type: 'complete',
            timestamp: Date.now(),
            messageId: this.messageId
          })
          continue
        }
        
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta
          
          if (delta?.content) {
            // Handle text content streaming
            this.content += delta.content
            newChunks.push({
              type: 'text',
              content: delta.content,
              timestamp: Date.now(),
              messageId: this.messageId
            })
          }
          
          if (delta?.tool_calls) {
            // Handle tool call streaming
            for (const toolCall of delta.tool_calls) {
              if (toolCall.index !== undefined) {
                // Start new tool call
                if (!this.currentToolCall || this.currentToolCall.index !== toolCall.index) {
                  this.currentToolCall = {
                    index: toolCall.index,
                    id: toolCall.id || '',
                    type: 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || ''
                    }
                  }
                  this.toolCalls[toolCall.index] = this.currentToolCall
                  
                  newChunks.push({
                    type: 'tool_call',
                    name: this.currentToolCall.function.name,
                    args: this.currentToolCall.function.arguments ? 
                      JSON.parse(this.currentToolCall.function.arguments) : {},
                    timestamp: Date.now(),
                    messageId: this.messageId
                  })
                }
                
                // Update existing tool call
                if (toolCall.id) this.currentToolCall.id = toolCall.id
                if (toolCall.function?.name) this.currentToolCall.function.name = toolCall.function.name
                if (toolCall.function?.arguments) {
                  this.currentToolCall.function.arguments += toolCall.function.arguments
                }
              }
            }
          }
          
          // Handle thinking/planning content
          if (delta?.content && (delta.content.includes('thinking') || delta.content.includes('planning'))) {
            newChunks.push({
              type: 'thinking',
              content: delta.content,
              timestamp: Date.now(),
              messageId: this.messageId
            })
          }
          
        } catch (e) {
          // Skip invalid JSON
          console.warn('Invalid JSON in stream:', e)
        }
      }
    }
    
    this.chunks.push(...newChunks)
    return newChunks
  }

  // Add tool result
  addToolResult(name: string, result: any, error?: string) {
    const chunk: StreamChunk = {
      type: 'tool_result',
      name,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      error,
      timestamp: Date.now(),
      messageId: this.messageId
    }
    this.chunks.push(chunk)
    return chunk
  }

  // Add thinking step
  addThinking(content: string) {
    const chunk: StreamChunk = {
      type: 'thinking',
      content,
      timestamp: Date.now(),
      messageId: this.messageId
    }
    this.chunks.push(chunk)
    return chunk
  }

  // Add planning step
  addPlanning(content: string) {
    const chunk: StreamChunk = {
      type: 'planning',
      content,
      timestamp: Date.now(),
      messageId: this.messageId
    }
    this.chunks.push(chunk)
    return chunk
  }

  // Add error
  addError(error: string) {
    const chunk: StreamChunk = {
      type: 'error',
      error,
      timestamp: Date.now(),
      messageId: this.messageId
    }
    this.chunks.push(chunk)
    return chunk
  }

  // Get parsed data
  getParsedData(): ParsedStreamData {
    return {
      content: this.content,
      toolCalls: this.toolCalls,
      chunks: this.chunks
    }
  }

  // Reset parser state
  reset() {
    this.buffer = ''
    this.content = ''
    this.toolCalls = []
    this.chunks = []
    this.currentToolCall = null
  }

  // Get all chunks
  getChunks(): StreamChunk[] {
    return this.chunks
  }

  // Get current content
  getContent(): string {
    return this.content
  }

  // Get tool calls
  getToolCalls(): any[] {
    return this.toolCalls
  }
}

// Utility function to create a streaming parser
export function createStreamingParser(messageId?: string): StreamingParser {
  return new StreamingParser(messageId)
}

// Utility function to parse streaming response
export async function parseStreamingResponse(
  response: Response, 
  messageId?: string,
  onChunk?: (chunk: StreamChunk) => void
): Promise<ParsedStreamData> {
  if (!response.body) {
    throw new Error('No response body for streaming')
  }
  
  const parser = createStreamingParser(messageId)
  const reader = response.body.getReader()
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunks = parser.parseChunk(value)
      
      // Call onChunk callback for each new chunk
      if (onChunk) {
        for (const chunk of chunks) {
          onChunk(chunk)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
  
  return parser.getParsedData()
}
