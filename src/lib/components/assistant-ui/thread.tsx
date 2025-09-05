import React, { useState, useEffect, useRef, useCallback } from "react";
import type { FC } from "react";
import { ToolFallback } from "./tool-fallback";
import { MarkdownText } from "./markdown-text";

// Custom Send/Stop Button Component
interface SendStopButtonProps {
  isLoading: boolean;
  hasInput: boolean;
  isAiConfigured: boolean;
  height: number;
  onSend: () => void;
  onStop: () => void;
}

const SendStopButton: FC<SendStopButtonProps> = ({
  isLoading,
  hasInput,
  isAiConfigured,
  height,
  onSend,
  onStop
}) => {
  const isDisabled = !hasInput || !isAiConfigured;
  
  if (isLoading) {
    // Stop Button
    return (
      <button
        onClick={onStop}
        className="flex items-center justify-center gap-2 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl font-semibold border-2"
        style={{ 
          height: `${height}px`,
          minHeight: '44px',
          width: '100px',
          backgroundColor: '#f3f4f6',
          borderColor: '#d1d5db',
          color: '#374151'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#e5e7eb';
          e.currentTarget.style.borderColor = '#9ca3af';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
          e.currentTarget.style.borderColor = '#d1d5db';
        }}
        title="Stop AI response"
      >
        {/* Stop Icon - Simple square */}
        <div 
          style={{ 
            width: '16px', 
            height: '16px',
            backgroundColor: '#6b7280',
            borderRadius: '2px'
          }}
        />
        <span style={{ 
          color: '#374151 !important', 
          fontSize: '14px', 
          fontWeight: '500' 
        }}>
          Stop
        </span>
      </button>
    );
  }
  
  // Send Button
  return (
    <button
      onClick={onSend}
      disabled={isDisabled}
      className={`flex items-center justify-center gap-2 rounded-2xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl border-2 ${
        isDisabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300'
          : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 hover:scale-105 border-blue-500 hover:border-blue-600'
      }`}
      style={{ 
        height: `${height}px`,
        minHeight: '44px',
        width: '100px'
      }}
    >
      {/* Send Icon - Simple arrow */}
      <div 
        style={{ 
          width: '16px', 
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
          style={{ color: isDisabled ? '#9CA3AF' : '#ffffff' }}
        >
          <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </div>
      <span style={{ 
        color: isDisabled ? '#9CA3AF' : '#ffffff', 
        fontSize: '14px', 
        fontWeight: '500' 
      }}>
        Send
      </span>
    </button>
  );
};

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  streaming?: boolean;
  parts: MessagePart[];
}

interface MessagePart {
  id: string;
  type: 'text' | 'tool_call' | 'tool_result' | 'thinking' | 'planning' | 'image';
  content?: string;
  toolName?: string;
  args?: any;
  result?: any;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
  timestamp: number;
  // Image specific properties
  imageData?: string;
  imageTitle?: string;
}

interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

export const Thread: FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [textareaHeight, setTextareaHeight] = useState(44); // Default height for single line
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  
  // Add a flag to track if this is the initial mount
  const isInitialMount = useRef(true);

  // Helper function to validate and deduplicate messages
  const validateAndDeduplicateMessages = useCallback((messages: Message[]): Message[] => {
    const deduplicated: Message[] = [];
    let lastUserMessage: Message | null = null;

    for (const msg of messages) {
      // Skip empty messages
      if (!msg.content?.trim() && (!msg.parts || msg.parts.length === 0)) {
        console.log('🔄 [DEBUG] Skipping empty message:', msg.id);
        continue;
      }

      // For user messages, check for duplicates
      if (msg.role === 'user') {
        if (lastUserMessage && lastUserMessage.content === msg.content) {
          console.log('🔄 [DEBUG] Skipping duplicate user message:', msg.content);
          continue;
        }
        lastUserMessage = msg;
      } else {
        // Reset last user message when we encounter an assistant message
        lastUserMessage = null;
      }

      deduplicated.push(msg);
    }

    return deduplicated;
  }, []);

  // Check AI configuration on mount
  useEffect(() => {
    const checkAIConfig = async () => {
      try {
        const storage = new (await import("@plasmohq/storage")).Storage();
        const aiToken = await storage.get("aiToken");
        setAiConfigured(!!aiToken);
      } catch (e) {
        console.error("Failed to check AI configuration", e);
        setAiConfigured(false);
      }
    };
    checkAIConfig();
  }, []);

  // Persist messages to storage to maintain conversation continuity
  useEffect(() => {
    if (messages.length > 0) {
      const deduplicatedMessages = validateAndDeduplicateMessages(messages);
      chrome.storage?.local?.set({ 'aipex_conversation_history': deduplicatedMessages });
    }
  }, [messages, validateAndDeduplicateMessages]);

  // Restore messages from storage on mount
  useEffect(() => {
    chrome.storage?.local?.get(['aipex_conversation_history'], (result) => {
      if (result?.aipex_conversation_history && Array.isArray(result.aipex_conversation_history)) {
        console.log('🔄 [DEBUG] Restoring conversation history:', result.aipex_conversation_history.length, 'messages');
        const deduplicatedMessages = validateAndDeduplicateMessages(result.aipex_conversation_history);
        console.log('🔄 [DEBUG] After deduplication:', deduplicatedMessages.length, 'messages');
        setMessages(deduplicatedMessages);
      }
    });
  }, [validateAndDeduplicateMessages]);

  // Listen for clear messages event
  useEffect(() => {
    const handleClearMessages = async () => {
      console.log('🔄 [DEBUG] Clearing all messages and conversation history');
      
      // Stop all ongoing AI chats before clearing messages
      console.log('🛑 [DEBUG] Stopping all ongoing AI chats before clearing messages');
      try {
        await chrome.runtime.sendMessage({
          request: "stop-all-ai-chats"
        });
        console.log('🛑 [DEBUG] All AI chats stopped successfully');
      } catch (error) {
        console.error('🛑 [DEBUG] Failed to stop AI chats:', error);
      }
      
      setMessages([]);
      setInputValue('');
      setLoading(false);
      setCurrentMessageId(null);
      // Also clear the stored conversation history
      chrome.storage?.local?.remove(['aipex_conversation_history']);
    };

    window.addEventListener('clear-aipex-messages', handleClearMessages);
    return () => {
      window.removeEventListener('clear-aipex-messages', handleClearMessages);
    };
  }, []);



  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Measure input container height
  useEffect(() => {
    const measureInputHeight = () => {
      if (inputContainerRef.current) {
        const height = inputContainerRef.current.offsetHeight;
        setInputHeight(height);
      }
    };

    measureInputHeight();
    window.addEventListener('resize', measureInputHeight);
    return () => window.removeEventListener('resize', measureInputHeight);
  }, []);

  // Listen for streaming responses from background script
  useEffect(() => {
    const handleStreamMessage = (message: any) => {
      console.log('Received message:', message);
      console.log('Current state - loading:', loading, 'currentMessageId:', message.messageId);
      console.log('Message type:', message.request);
      
      if (message.request === "ai-chat-stream") {
        console.log('Processing streaming chunk:', message.chunk);
        // Update the message with streaming content (append chunk)
        setMessages(prev => prev.map(msg => 
          msg.id === message.messageId 
            ? { 
                ...msg, 
                // Only update parts, not content to avoid duplication
                parts: (() => {
                  const existingParts = msg.parts || [];
                  const lastPart = existingParts[existingParts.length - 1];
                  
                  if (lastPart && lastPart.type === 'text') {
                    // Update existing text part
                    return [
                      ...existingParts.slice(0, -1),
                      {
                        ...lastPart,
                        content: (lastPart.content || '') + message.chunk
                      }
                    ];
                  } else {
                    // Create new text part
                    return [
                      ...existingParts,
                      {
                        id: `text-${Date.now()}`,
                        type: 'text' as const,
                        content: message.chunk,
                        status: 'completed',
                        timestamp: Date.now()
                      }
                    ];
                  }
                })(),
                // Ensure content field is not updated during streaming to prevent duplication
                content: msg.content || ''
              }
            : msg
        ));
      } else if (message.request === "ai-chat-tools-step") {
        console.log('Processing tools step:', message.step);
        if (message.step.type === 'call_tool') {
          // Add tool call part to the message, but check for duplicates first
          setMessages(prev => prev.map(msg => 
            msg.id === message.messageId 
              ? {
                  ...msg,
                  parts: (() => {
                    const existingParts = msg.parts || [];
                    // Check if we already have a tool_call with the same name that's still in-progress
                    const existingToolCall = existingParts.find(part => 
                      part.type === 'tool_call' && 
                      part.toolName === message.step.name && 
                      part.status === 'in-progress'
                    );
                    
                    if (existingToolCall) {
                      // Don't add duplicate, just return existing parts
                      return existingParts;
                    }
                    
                    // Add new tool call
                    return [
                      ...existingParts,
                      {
                        id: `tool-${Date.now()}-${Math.random()}`,
                        type: 'tool_call',
                        toolName: message.step.name,
                        args: message.step.args,
                        status: 'in-progress',
                        timestamp: Date.now()
                      }
                    ];
                  })(),
                  // Ensure content field is not updated during tool calls to prevent duplication
                  content: msg.content || ''
                }
              : msg
          ));
        } else if (message.step.type === 'tool_result') {
          console.log('Tool result received, maintaining loading state');
          // Update tool call part with result
          setMessages(prev => prev.map(msg => 
            msg.id === message.messageId 
              ? {
                  ...msg,
                  parts: (msg.parts || []).map(part => {
                    // Find the most recent tool_call that matches the name and hasn't been completed yet
                    if (part.type === 'tool_call' && 
                        part.toolName === message.step.name && 
                        part.status === 'in-progress') {
                      return {
                        ...part,
                        status: message.step.error ? 'failed' : 'completed',
                        error: message.step.error,
                        result: message.step.result
                      };
                    }
                    return part;
                  }),
                  // Ensure content field is not updated during tool results to prevent duplication
                  content: msg.content || ''
                }
              : msg
          ));
        } else if (message.step.type === 'think') {
          // Add thinking step
          setMessages(prev => prev.map(msg => 
            msg.id === message.messageId 
              ? {
                  ...msg,
                  parts: [
                    ...(msg.parts || []),
                    {
                      id: `thinking-${Date.now()}`,
                      type: 'thinking' as const,
                      content: message.step.content,
                      status: 'completed',
                      timestamp: Date.now()
                    }
                  ],
                  // Ensure content field is not updated during thinking to prevent duplication
                  content: msg.content || ''
                }
              : msg
          ));
        }
      } else if (message.request === "ai-chat-planning-step") {
        console.log('Processing planning step:', message.step);
        // Only add planning steps that are meaningful to the user
        // Filter out internal ReAct steps like "think", "act", "observe", "reason"
        const stepType = message.step.type;
        const isInternalStep = ['think', 'act', 'observe', 'reason'].includes(stepType);
        
        if (!isInternalStep) {
          // Add planning step
          setMessages(prev => prev.map(msg => 
            msg.id === message.messageId 
              ? {
                  ...msg,
                  parts: [
                    ...(msg.parts || []),
                    {
                      id: `planning-${Date.now()}`,
                      type: 'planning' as const,
                      content: message.step.content,
                      status: message.step.status || 'completed',
                      timestamp: Date.now()
                    }
                  ],
                  // Ensure content field is not updated during planning to prevent duplication
                  content: msg.content || ''
                }
              : msg
          ));
        }
      } else if (message.request === "ai-chat-complete") {
        console.log('Task completed - ending loading state');
        // Task is complete - end loading state
        setMessages(prev => prev.map(msg => 
          msg.id === message.messageId 
            ? { ...msg, streaming: false }
            : msg
        ));
        setLoading(false);
        setCurrentMessageId(null);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else if (message.request === "ai-chat-error") {
        console.log('Task error - ending loading state');
        // Task encountered error - end loading state
        setMessages(prev => prev.map(msg => 
          msg.id === message.messageId 
            ? { ...msg, content: `Error: ${message.error}`, streaming: false }
            : msg
        ));
        setLoading(false);
        setCurrentMessageId(null);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else if (message.request === "ai-chat-image-data") {
        console.log('Processing image data');
        
        // Add image part to the message
        setMessages(prev => prev.map(msg => 
          msg.id === message.messageId 
            ? {
                ...msg,
                parts: [
                  ...(msg.parts || []),
                  {
                    id: `image-${Date.now()}-${Math.random()}`,
                    type: 'image',
                    status: 'completed',
                    timestamp: Date.now(),
                    imageData: message.imageData,
                    imageTitle: message.title || 
                              (message.toolName === 'capture_screenshot' ? 'Current Page Screenshot' :
                              message.toolName === 'capture_tab_screenshot' ? 'Tab Screenshot' :
                              message.toolName === 'read_clipboard_image' ? 'Clipboard Image' : 'Image')
                  }
                ]
              }
            : msg
        ));
      } else {
        console.log('Unknown message type:', message.request);
      }
    };

    chrome.runtime.onMessage.addListener(handleStreamMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleStreamMessage);
    };
  }, [currentMessageId]);

  // Handle providing current chat images for AI tools
  useEffect(() => {
    const handleProvideImages = (message: any, sender: any, sendResponse: (response: any) => void) => {
      if (message.request === "provide-current-chat-images") {
        const imagesInChat = messages.filter(msg => 
          msg.parts?.some(part => part.type === 'image' && part.imageData)
        ).map(msg => ({
          id: msg.id,
          parts: msg.parts?.filter(part => part.type === 'image' && part.imageData)
        }))
        
        sendResponse({
          images: imagesInChat,
          count: imagesInChat.length
        })
        return true
      }
    }

    chrome.runtime.onMessage.addListener(handleProvideImages)
    return () => {
      chrome.runtime.onMessage.removeListener(handleProvideImages)
    }
  }, [messages])

  // Stop AI response
  const handleStopAI = useCallback(async () => {
    console.log('🛑 [DEBUG] handleStopAI called with:', { currentMessageId, loading })
    if (!currentMessageId || !loading) {
      console.log('🛑 [DEBUG] Early return - no currentMessageId or not loading')
      return;
    }
    
    try {
      console.log('🛑 [DEBUG] Sending stop-ai-chat message to background...')
      const response = await chrome.runtime.sendMessage({
        request: "stop-ai-chat",
        messageId: currentMessageId
      });
      console.log('🛑 [DEBUG] Background response:', response)
      
      // Update UI to show stopped state
      setMessages(prev => prev.map(msg => 
        msg.id === currentMessageId 
          ? { ...msg, streaming: false, content: msg.content + '\n\n[AI response stopped by user]' }
          : msg
      ));
      
      setLoading(false);
      setCurrentMessageId(null);
      
      console.log('🛑 [DEBUG] UI updated, loading set to false')
      
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error: any) {
      console.error('🛑 [DEBUG] Failed to stop AI:', error);
    }
  }, [currentMessageId, loading]);

  const handleSubmit = useCallback(async (message: string) => {
    if (!message.trim() || loading) return;

    // Check for duplicate user messages
    const trimmedMessage = message.trim();
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');
    
    if (lastUserMessage && lastUserMessage.content === trimmedMessage) {
      console.log('🔄 [DEBUG] Duplicate user message detected, skipping:', trimmedMessage);
      return;
    }

    // Check if AI is configured
    if (!aiConfigured) {
      // Add a user message to show the error
      const userMessage: Message = {
        id: Date.now().toString(),
        content: message,
        role: 'user',
        parts: []
      };
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "❌ **AI Configuration Required**\n\nPlease configure your AI settings first:\n1. Click the settings icon (⚙️) in the top-left corner\n2. Enter your AI API token and configuration\n3. Save the settings\n4. Try sending your message again",
        role: 'assistant',
        parts: []
      };
      
      setMessages(prev => [...prev, userMessage, errorMessage]);
      // Don't clear input when AI is not configured, so user can see their message
      return;
    }

    // Clear input immediately after submission
    setInputValue('');
    // Reset textarea height
    setTextareaHeight(44);
    if (inputRef.current) {
      inputRef.current.style.height = '44px';
    }
    
    // Set loading state immediately
    setLoading(true);

          // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        content: message,
        role: 'user',
        parts: []
      };
      
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Create AI message placeholder for streaming
      const aiMessageId = (Date.now() + 1).toString();
      setCurrentMessageId(aiMessageId); // Set current message ID for stop functionality
      const aiMessage: Message = {
        id: aiMessageId,
        content: '',
        role: 'assistant',
        streaming: true,
        parts: []
      };
      setMessages(prev => [...prev, aiMessage]);

    try {
      // Use MCP client for tool-enabled AI chat
      const conversationContext = updatedMessages
        .filter(msg => !msg.streaming) // Only filter out streaming messages
        .map(msg => {
          // Extract content from either content field or parts array
          let messageContent = msg.content || '';
          
          // If content is empty but we have parts, extract text content from parts
          if (!messageContent.trim() && msg.parts && msg.parts.length > 0) {
            const textParts = msg.parts
              .filter(part => part.type === 'text' && part.content)
              .map(part => part.content)
              .join('');
            messageContent = textParts;
          }
          
          // Only include messages that have actual content
          if (messageContent.trim()) {
            return {
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: messageContent.trim()
            };
          }
          return null;
        })
        .filter(msg => msg !== null) // Remove null entries
        .reduce((acc, msg, index, array) => {
          // Remove consecutive duplicate user messages
          if (index > 0 && msg.role === 'user') {
            const prevMsg = array[index - 1];
            if (prevMsg && prevMsg.role === 'user' && prevMsg.content === msg.content) {
              console.log('🔄 [DEBUG] Removing duplicate user message from context:', msg.content);
              return acc; // Skip this duplicate message
            }
          }
          acc.push(msg);
          return acc;
        }, [] as any[]);

      // Count user messages to determine if we should add "continue with the previous result"
      const userMessageCount = conversationContext.filter(msg => msg.role === 'user').length;
      console.log('🔄 [DEBUG] User message count:', userMessageCount);
      
      // If this is the second or later user message, automatically append "continue with the previous result"
      let finalPrompt = message;
      if (userMessageCount >= 2) {
        finalPrompt = `${message}\n\ncontinue with the previous result`;
        console.log(`🔄 [DEBUG] Added "continue with the previous result" to user message #${userMessageCount}`);
      }

      // Debug logging for conversation context
      console.log('🔄 [DEBUG] Conversation context being sent:', {
        messageCount: conversationContext.length,
        context: conversationContext,
        currentMessage: message,
        finalPrompt: finalPrompt,
        userMessageCount: userMessageCount
      });

      const response = await chrome.runtime.sendMessage({
        request: "ai-chat-with-tools",
        prompt: finalPrompt,
        context: conversationContext,
        messageId: aiMessageId
      });
      
      if (!response || !response.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: `Error: Failed to start AI chat`, streaming: false }
            : msg
        ));
        // Don't set loading to false here - let the error message handler do it
        console.log('Failed to start AI chat, waiting for error message');
      }
    } catch (error: any) {
      console.error('AI response failed:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `Error: ${error?.message || 'Unknown error'}`, streaming: false }
          : msg
      ));
      // Don't set loading to false here - let the error message handler do it
      console.log('AI response failed, waiting for error message');
    }
  }, [loading, messages, aiConfigured]);

  // When sidepanel mounts, automatically read chrome.storage.local['aipex_user_input'], if exists, auto-fill and send
  useEffect(() => {
    // Only execute on initial mount to prevent re-execution issues
    if (!isInitialMount.current) return;
    isInitialMount.current = false;
    
    chrome.storage?.local?.get(["aipex_user_input"], (result) => {
      if (result && result.aipex_user_input) {
        console.log('🔄 [DEBUG] Auto-filling input from storage:', result.aipex_user_input);
        setInputValue(result.aipex_user_input);
        // Use a more stable approach to prevent re-execution issues
        setTimeout(() => {
          if (!loading && aiConfigured) {
            console.log('🔄 [DEBUG] Auto-submitting message:', result.aipex_user_input);
            handleSubmit(result.aipex_user_input);
            chrome.storage.local.remove("aipex_user_input");
          }
        }, 100); // Slightly longer delay to ensure state is stable
      }
    });
  }, []); // Remove handleSubmit dependency to prevent re-execution

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    if (inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 44; // Minimum height for single line
      const maxHeight = 200; // Maximum height before scrolling
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      setTextareaHeight(newHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(inputValue);
    }
  };

  return (
    <div className="flex h-full flex-col min-h-0 relative">
      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto p-4 min-h-0"
        style={{ paddingBottom: `${Math.max(inputHeight + 16, 120)}px` }}
      >
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to AIpex</h3>
              <p className="text-gray-600">Choose a quick action or ask anything to get started</p>
              
              {!aiConfigured && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="text-sm text-yellow-800">
                        <strong>AI Configuration Required:</strong> Please configure your AI settings to start chatting.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Trigger settings panel - this will be handled by the parent component
                        window.dispatchEvent(new CustomEvent('open-aipex-settings'));
                      }}
                      className="ml-4 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                    >
                      Configure Now
                    </button>
                  </div>
                </div>
              )}
              
              <div className="grid gap-4 sm:grid-cols-2 mt-8">
                <button
                  onClick={() => handleSubmit('Please organize my open tabs by topic and purpose')}
                  disabled={!aiConfigured}
                  className={`w-full text-left p-6 rounded-2xl border transition-all duration-200 ${
                    aiConfigured 
                      ? 'border-blue-200 hover:border-blue-300 hover:bg-white hover:shadow-md bg-white/70 backdrop-blur-sm' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Organize tabs</div>
                  </div>
                  <div className="text-xs text-gray-600">Use AI to group current-window tabs by topic</div>
                </button>
                
                <button
                  onClick={() => handleSubmit('Summarize this page and save key points to clipboard')}
                  disabled={!aiConfigured}
                  className={`w-full text-left p-6 rounded-2xl border transition-all duration-200 ${
                    aiConfigured 
                      ? 'border-blue-200 hover:border-blue-300 hover:bg-white hover:shadow-md bg-white/70 backdrop-blur-sm' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Analyze & Save</div>
                  </div>
                  <div className="text-xs text-gray-600">Extract content, summarize, and copy to clipboard</div>
                </button>
                
                <button
                  onClick={() => handleSubmit('Please use Google to research topic \'MCP\'')}
                  disabled={!aiConfigured}
                  className={`w-full text-left p-6 rounded-2xl border transition-all duration-200 ${
                    aiConfigured 
                      ? 'border-purple-200 hover:border-purple-300 hover:bg-white hover:shadow-md bg-white/70 backdrop-blur-sm' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Research topics</div>
                  </div>
                  <div className="text-xs text-gray-600">Use Google to research and gather information</div>
                </button>
                
                <button
                  onClick={() => handleSubmit('Compare the price of Airpods 3')}
                  disabled={!aiConfigured}
                  className={`w-full text-left p-6 rounded-2xl border transition-all duration-200 ${
                    aiConfigured 
                      ? 'border-orange-200 hover:border-orange-300 hover:bg-white hover:shadow-md bg-white/70 backdrop-blur-sm' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Compare prices</div>
                  </div>
                  <div className="text-xs text-gray-600">Compare product prices across different sources</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-gray-800 ml-12 border border-emerald-200'
                      : 'bg-gray-100 text-gray-900 mr-12'
                  }`}
                >
                  {/* Render message content - prioritize parts over content to avoid duplication */}
                  {message.parts && message.parts.length > 0 ? (
                    <div className="space-y-2">
                      {message.parts.map((part) => {
                        if (part.type === 'text') {
                          return (
                            <div key={part.id}>
                              <MarkdownText>{part.content || ''}</MarkdownText>
                            </div>
                          );
                        } else if (part.type === 'tool_call') {
                          return (
                            <ToolFallback
                              key={part.id}
                              toolName={part.toolName || ''}
                              argsText={JSON.stringify(part.args, null, 2)}
                              result={part.result}
                              status={part.status}
                              error={part.error}
                            />
                          );
                        } else if (part.type === 'tool_result') {
                          return (
                            <div key={part.id} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              <strong>Tool Result:</strong> {part.result}
                            </div>
                          );
                        } else if (part.type === 'thinking') {
                          return null;
                        } else if (part.type === 'planning') {
                          return null;
                        } else if (part.type === 'image') {
                          return (
                            <div key={part.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                              <div className="text-sm text-gray-600 mb-2 font-medium">
                                📸 {part.imageTitle || 'Image'}
                              </div>
                              <img 
                                src={part.imageData} 
                                alt="Screenshot" 
                                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                style={{ maxHeight: '400px' }}
                                loading="lazy"
                                onClick={() => {
                                  // Open image in new tab for full view
                                  if (part.imageData) {
                                    const newTab = window.open()
                                    if (newTab) {
                                      newTab.document.write(`<img src="${part.imageData}" style="max-width: 100%; height: auto;" />`)
                                    }
                                  }
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  const errorDiv = target.parentElement?.querySelector('.error-message')
                                  if (!errorDiv) {
                                    const error = document.createElement('div')
                                    error.className = 'error-message text-red-500 text-sm'
                                    error.textContent = 'Image loading failed'
                                    target.parentElement?.appendChild(error)
                                  }
                                }}
                              />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <MarkdownText>{message.content}</MarkdownText>
                  )}
                  
                  {message.streaming && (
                    <div className="mt-2">
                      <div className="inline-block w-2 h-4 bg-gray-400 animate-pulse"></div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>
      </div>
      
      {/* Input area - Fixed at bottom */}
      <div 
        ref={inputContainerRef}
        className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 bg-white shadow-lg backdrop-blur-sm z-10"
      >
        <div className="max-w-2xl mx-auto">

          
          <div className="flex items-start gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                className="w-full resize-none border-2 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                placeholder={loading ? "AI is responding..." : aiConfigured ? "Ask anything... (Shift+Enter for new line)" : "Configure AI settings first..."}
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={loading || !aiConfigured}
                style={{ 
                  height: `${textareaHeight}px`,
                  minHeight: '44px',
                  maxHeight: '200px',
                  lineHeight: '1.5'
                }}
              />
            </div>
            <SendStopButton
              isLoading={loading && !!currentMessageId}
              hasInput={!!inputValue.trim()}
              isAiConfigured={aiConfigured}
              height={textareaHeight}
              onSend={() => handleSubmit(inputValue)}
              onStop={handleStopAI}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
