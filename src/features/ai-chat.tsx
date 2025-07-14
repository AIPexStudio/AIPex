import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Bubble, Sender } from "@ant-design/x"
import Markdown from "markdown-to-jsx"
import newChatIcon from "url:~/assets/add-action.png"
import "~style.css"

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  streaming?: boolean
}

// Custom markdown renderer component
const MarkdownRenderer = ({ content, streaming }: { content: string, streaming?: boolean }) => {
  return (
    <div className="markdown-content text-gray-800">
      <Markdown
        options={{
          overrides: {
            // Code block styling
            code: {
              props: {
                className: "bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded text-sm border border-gray-300"
              }
            },
            pre: {
              props: {
                className: "bg-gray-100 rounded-lg p-4 overflow-x-auto mb-3 border border-gray-300"
              }
            },
            // Paragraph styling
            p: {
              props: {
                className: "mb-3 last:mb-0 text-gray-800 leading-relaxed"
              }
            },
            // Heading styling
            h1: {
              props: {
                className: "text-xl font-bold mb-3 text-gray-900"
              }
            },
            h2: {
              props: {
                className: "text-lg font-bold mb-3 text-gray-900"
              }
            },
            h3: {
              props: {
                className: "text-base font-bold mb-2 text-gray-900"
              }
            },
            // List styling
            ul: {
              props: {
                className: "list-disc ml-5 mb-3 text-gray-800 space-y-1"
              }
            },
            ol: {
              props: {
                className: "list-decimal ml-5 mb-3 text-gray-800 space-y-1"
              }
            },
            li: {
              props: {
                className: "text-gray-800 leading-relaxed"
              }
            },
            // Link styling
            a: {
              props: {
                className: "text-blue-600 hover:text-blue-800 underline transition-colors",
                target: "_blank",
                rel: "noopener noreferrer"
              }
            },
            // Blockquote styling
            blockquote: {
              props: {
                className: "border-l-4 border-gray-400 pl-4 italic text-gray-700 mb-3 bg-gray-100 py-2 rounded-r"
              }
            },
            // Table styling
            table: {
              props: {
                className: "border-collapse border border-gray-300 mb-3 text-gray-800 w-full"
              }
            },
            th: {
              props: {
                className: "border border-gray-300 px-3 py-2 bg-gray-200 text-gray-900 font-semibold"
              }
            },
            td: {
              props: {
                className: "border border-gray-300 px-3 py-2 text-gray-800"
              }
            },
            // Strong/Bold styling
            strong: {
              props: {
                className: "font-semibold text-gray-900"
              }
            },
            // Emphasis/Italic styling
            em: {
              props: {
                className: "italic text-gray-700"
              }
            },
            // Horizontal rule
            hr: {
              props: {
                className: "border-gray-300 my-4"
              }
            }
          }
        }}
      >
        {content + (streaming ? '▎' : '')}
      </Markdown>
    </div>
  )
}

const AIChatSidebar = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)

  // Check for selected text when component mounts
  useEffect(() => {
    const checkForSelectedText = async () => {
      try {
        console.log("Checking for selected text...");
        // Request the selected text from background script
        const response = await chrome.runtime.sendMessage({
          request: "get-selected-text"
        });
        
        console.log("Response from get-selected-text:", response);
        
        if (response && response.selectedText) {
          console.log("Setting selected text as input:", response.selectedText);
          // Set the selected text as input value
          setInputValue(response.selectedText);
          // Focus the input field
          setTimeout(() => {
            console.log("Focusing input field");
            inputRef.current?.focus();
          }, 100);
        }
      } catch (error) {
        console.error("Error getting selected text:", error);
      }
    };
    
    checkForSelectedText();
  }, []);

  // Auto-scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Check if user is near the bottom of the scroll
  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return true
    
    const threshold = 100 // pixels from bottom
    return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold
  }, [])

  // Auto-scroll effect - scroll when messages change and user is near bottom
  useEffect(() => {
    if (messages.length > 0 && isNearBottom()) {
      // Use a small delay to ensure DOM is updated
      const timeoutId = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [messages, scrollToBottom, isNearBottom])

  // Listen for streaming responses from background script
  useEffect(() => {
    const handleStreamMessage = (message: any) => {
      console.log('Received message:', message)
      
      if (message.request === "ai-chat-stream") {
        console.log('Processing streaming chunk:', message.chunk)
        // Update the message with streaming content (append chunk)
        setMessages(prev => prev.map(msg => 
          msg.id === message.messageId 
            ? { ...msg, content: msg.content + message.chunk }
            : msg
        ))
      } else if (message.request === "ai-chat-complete") {
        console.log('Stream completed')
        // Mark streaming as complete and re-enable input
        setMessages(prev => prev.map(msg => 
          msg.id === message.messageId 
            ? { ...msg, streaming: false }
            : msg
        ))
        setLoading(false)
        // Focus back to input after AI response is complete
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      } else if (message.request === "ai-chat-error") {
        console.log('Stream error:', message.error)
        // Handle error response and re-enable input
        setMessages(prev => prev.map(msg => 
          msg.id === message.messageId 
            ? { ...msg, content: `Error: ${message.error}`, streaming: false }
            : msg
        ))
        setLoading(false)
        // Focus back to input after error
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    }

    chrome.runtime.onMessage.addListener(handleStreamMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleStreamMessage)
    }
  }, [])

  // Build conversation context for AI memory
  const buildContext = useCallback((currentMessages: Message[]) => {
    return currentMessages
      .filter(msg => !msg.streaming && msg.content.trim()) // Exclude streaming and empty messages
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
  }, [])

  const handleSubmit = useCallback(async (message: string) => {
    if (!message.trim() || loading) return

    // Clear input immediately after submission
    setInputValue('')
    
    // Set loading state immediately
    setLoading(true)

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'user'
    }
    
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    // Create AI message placeholder for streaming
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      role: 'assistant',
      streaming: true
    }
    setMessages(prev => [...prev, aiMessage])

    try {
      // Build conversation context for AI memory
      const conversationContext = buildContext(updatedMessages)
      
      // Send message to background script for AI processing with streaming
      const response = await chrome.runtime.sendMessage({
        request: "ai-chat",
        prompt: message,
        context: conversationContext, // Send full conversation history
        messageId: aiMessageId
      })

      if (!response || !response.success) {
        // Handle immediate error response
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: `Error: Failed to start AI chat`, streaming: false }
            : msg
        ))
        setLoading(false)
        // Focus back to input after error
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
      // Success case is handled by the message listener
    } catch (error) {
      console.error('AI response failed:', error)
      // Update message with error
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `Error: ${error?.message || 'Unknown error'}`, streaming: false }
          : msg
      ))
      setLoading(false)
      // Focus back to input after error
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [messages, loading, buildContext])

  // Clear conversation function
  const handleClearConversation = useCallback(() => {
    setMessages([])
    setLoading(false)
    setInputValue('')
  }, [])

  const items = useMemo(() => 
    messages.map(msg => ({
      key: msg.id,
      content: msg.role === 'assistant' ? (
        <MarkdownRenderer content={msg.content} streaming={msg.streaming} />
      ) : (
        <div className="text-gray-800">{msg.content}</div>
      ),
      role: msg.role,
      placement: (msg.role === 'user' ? 'end' : 'start') as 'end' | 'start'
    }))
  , [messages])

  return (
    <div className="fixed bottom-0 left-0 w-full h-full bg-white flex flex-col border-t border-gray-300">
      {/* Header with close icon */}
      <div className="relative px-4 py-3 border-b border-gray-300 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900 text-center">AI Chat</h2>
        <button
          onClick={handleClearConversation}
          disabled={loading}
          className="absolute right-4 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="New Chat"
        >
          <img src={newChatIcon} alt="New Chat" className="w-5 h-6" />
        </button>
      </div>
      
      {/* Messages area - takes up remaining space */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {items.length > 0 && (
          <div className="p-4">
            <Bubble.List items={items} />
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input area fixed at bottom */}
      <div className="px-4 py-3 border-t border-gray-300 bg-white flex-shrink-0">
        <Sender
          ref={inputRef}
          placeholder={loading ? "AI is responding..." : "Ask anything"}
          onSubmit={handleSubmit}
          loading={loading}
          disabled={loading}
          value={inputValue}
          onChange={setInputValue}
        />
      </div>
    </div>
  )
}

export default AIChatSidebar 