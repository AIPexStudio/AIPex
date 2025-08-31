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

  // Custom tool call parsing state
  private inToolCallsSection = false
  private inToolCall = false
  private inToolCallArguments = false
  private currentToolCallId = ''
  private currentToolCallName = ''
  private currentToolCallArgs = ''

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
        // Note: We don't rely on [DONE] for completion detection
        // Completion is determined by the stream reader's done state
        if (data === '[DONE]') {
          // Optional: still handle [DONE] if provided, but don't rely on it
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
            
            // Check for custom tool call format markers
            if (delta.content.includes('<|tool_calls_section_begin|>')) {
              this.inToolCallsSection = true
              console.log('Detected custom tool calls section begin')
            } else if (delta.content.includes('<|tool_calls_section_end|>')) {
              this.inToolCallsSection = false
              console.log('Detected custom tool calls section end')
            } else if (delta.content.includes('<|tool_call_begin|>')) {
              this.inToolCall = true
              this.currentToolCallId = ''
              this.currentToolCallName = ''
              this.currentToolCallArgs = ''
              console.log('Detected custom tool call begin')
            } else if (delta.content.includes('<|tool_call_end|>')) {
              this.inToolCall = false
              // Finalize the current tool call
              // Try to extract tool name from arguments if not already set
              if (!this.currentToolCallName && this.currentToolCallArgs) {
                try {
                  const args = JSON.parse(this.currentToolCallArgs)
                  // Look for common tool name patterns in the arguments
                  if (args.tabId && !args.url) {
                    this.currentToolCallName = 'get_tab_info'
                  } else if (args.tabId && args.url) {
                    this.currentToolCallName = 'switch_to_tab'
                  } else if (args.url && !args.tabId) {
                    this.currentToolCallName = 'create_new_tab'
                  } else if (args.query) {
                    this.currentToolCallName = 'search_history'
                  } else if (Object.keys(args).length === 0) {
                    // No arguments, likely a simple tool
                    this.currentToolCallName = 'get_all_tabs'
                  }
                } catch (e) {
                  console.warn('Failed to extract tool name from arguments:', e)
                }
              }
              
              if (this.currentToolCallName) {
                const toolCall = {
                  index: this.toolCalls.length,
                  id: this.currentToolCallId || `call_${Date.now()}_${this.toolCalls.length}`,
                  type: 'function',
                  function: {
                    name: this.currentToolCallName,
                    arguments: this.currentToolCallArgs
                  }
                }
                this.toolCalls.push(toolCall)
                
                newChunks.push({
                  type: 'tool_call',
                  name: this.currentToolCallName,
                  args: this.currentToolCallArgs ? 
                    JSON.parse(this.currentToolCallArgs) : {},
                  timestamp: Date.now(),
                  messageId: this.messageId
                })
              }
              console.log('Detected custom tool call end')
            } else if (delta.content.includes('<|tool_call_argument_begin|>')) {
              this.inToolCallArguments = true
              console.log('Detected custom tool call arguments begin')
            } else if (delta.content.includes('<|tool_call_argument_end|>')) {
              this.inToolCallArguments = false
              console.log('Detected custom tool call arguments end')
            } else if (this.inToolCall && !this.inToolCallArguments) {
              // Parse tool call ID and name from content
              const content = delta.content
              if (content.startsWith('call_')) {
                // Extract tool call ID and name
                const parts = content.split('_')
                if (parts.length >= 2) {
                  this.currentToolCallId = content
                  // Try to extract function name from the ID
                  const nameMatch = content.match(/call_[a-f0-9]+_([a-zA-Z_]+)/)
                  if (nameMatch) {
                    this.currentToolCallName = nameMatch[1]
                  }
                }
              }
            } else if (this.inToolCallArguments) {
              // Accumulate tool call arguments
              this.currentToolCallArgs += delta.content
            } else if (!this.inToolCallsSection) {
              // Only add text chunks for non-tool-call content
              newChunks.push({
                type: 'text',
                content: delta.content,
                timestamp: Date.now(),
                messageId: this.messageId
              })
            }
          }
          
          if (delta?.tool_calls) {
            // Handle standard tool call streaming
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
    
    // Reset custom tool call parsing state
    this.inToolCallsSection = false
    this.inToolCall = false
    this.inToolCallArguments = false
    this.currentToolCallId = ''
    this.currentToolCallName = ''
    this.currentToolCallArgs = ''
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
      if (done) {
        // Stream is complete - this is the reliable way to detect completion
        const completionChunk: StreamChunk = {
          type: 'complete',
          timestamp: Date.now(),
          messageId: messageId
        }
        if (onChunk) {
          onChunk(completionChunk)
        }
        break
      }
      
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
