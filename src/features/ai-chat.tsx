import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Bubble, Sender } from "@ant-design/x"
import Markdown from "markdown-to-jsx"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import newChatIcon from "url:~/assets/add-action.png"
import "~/style.css"
interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  streaming?: boolean
}

// Code block component for syntax highlighting
const CodeBlock = ({ children, className, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'text'
  
  return (
    <SyntaxHighlighter
      style={oneLight}
      language={language}
      PreTag="div"
      className="rounded-lg mb-3 border border-gray-200 text-sm"
      customStyle={{
        margin: 0,
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        fontSize: '0.875rem',
        lineHeight: '1.5'
      }}
      showLineNumbers={false}
      wrapLines={false}
      {...props}
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  )
}

// Inline code component
const InlineCode = ({ children, ...props }: any) => {
  return (
    <code 
      className="bg-gray-50 text-gray-900 px-1.5 py-0.5 rounded text-sm border border-gray-200 font-mono"
      {...props}
    >
      {children}
    </code>
  )
}

// Custom markdown renderer component
const MarkdownRenderer = ({ content, streaming }: { content: string, streaming?: boolean }) => {
  return (
    <div className="markdown-content text-gray-800">
      <Markdown
        options={{
          overrides: {
            // Code block styling with syntax highlighting
            code: ({ children, className, ...props }) => {
              // Check if this is a code block (has language class) or inline code
              const isCodeBlock = className && className.startsWith('language-')
              
              if (isCodeBlock) {
                return <CodeBlock className={className} {...props}>{children}</CodeBlock>
              } else {
                return <InlineCode {...props}>{children}</InlineCode>
              }
            },
            pre: ({ children, ...props }) => {
              // Check if this is a code block by looking for code child
              const firstChild = React.Children.toArray(children)[0]
              if (React.isValidElement(firstChild) && firstChild.type === 'code') {
                const codeProps = firstChild.props as any
                if (codeProps.className && codeProps.className.startsWith('language-')) {
                  // This is a code block, render with syntax highlighting
                  return <CodeBlock className={codeProps.className}>{codeProps.children}</CodeBlock>
                }
              }
              
              // Otherwise, render as a regular pre
              return <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto mb-3 border border-gray-200 font-mono text-sm" {...props}>{children}</pre>
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
                className: "text-red-600 hover:text-red-700 underline transition-colors",
                target: "_blank",
                rel: "noopener noreferrer"
              }
            },
            // Blockquote styling
            blockquote: {
              props: {
                className: "border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-3 bg-gray-50 py-2 rounded-r"
              }
            },
            // Table styling
            table: {
              props: {
                className: "border-collapse border border-gray-200 mb-3 text-gray-800 w-full"
              }
            },
            th: {
              props: {
                className: "border border-gray-200 px-3 py-2 bg-gray-50 text-gray-900 font-semibold"
              }
            },
            td: {
              props: {
                className: "border border-gray-200 px-3 py-2 text-gray-800"
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
                className: "italic text-gray-600"
              }
            },
            // Horizontal rule
            hr: {
              props: {
                className: "border-gray-200 my-4"
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
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [organizeStatus, setOrganizeStatus] = useState("")
  const [organizeSteps, setOrganizeSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [operationType, setOperationType] = useState<"organize" | "ungroup" | null>(null)
  const [aiHost, setAiHost] = useState("")
  const [aiToken, setAiToken] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const lastScrollTopRef = useRef<number>(0)

  // Check for selected text when component mounts
  useEffect(() => {
    const checkForSelectedText = async () => {
      try {
        // Request the selected text from background script
        const response = await chrome.runtime.sendMessage({
          request: "get-selected-text"
        });
        
        if (response && response.selectedText) {
          // Set the selected text as input value
          setInputValue(response.selectedText);
          // Focus the input field only if there is selected text
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
        // If no selected text, do nothing (do not focus or set input)
      } catch (error) {
        // Optionally log error, but do not focus or set input
        console.error("Error getting selected text:", error);
      }
    };
    
    checkForSelectedText();
  }, []);

  // IntersectionObserver to detect when bottom element is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting
        setIsAtBottom(isVisible)
        setShowScrollButton(!isVisible && messages.length > 0)
      },
      { threshold: 0.1 }
    )

    if (messagesEndRef.current) {
      observer.observe(messagesEndRef.current)
    }

    return () => observer.disconnect()
  }, [messages.length])

  // Handle scroll events to detect user scrolling
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop
      const scrollDirection = currentScrollTop > lastScrollTopRef.current ? 'down' : 'up'
      
      // Calculate distance from bottom
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      const isNearBottom = distanceFromBottom < 150 // 150px threshold
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Only consider it user scrolling away if they scroll up AND are far from bottom
      if (scrollDirection === 'up' && !isNearBottom) {
        setUserScrolled(true)
        
        // Reset user scrolled state after some time of inactivity
        scrollTimeoutRef.current = setTimeout(() => {
          setUserScrolled(false)
        }, 2000) // Reduced to 2 seconds for better responsiveness
      } else if (isNearBottom) {
        // If user is near bottom, reset the scrolled state
        setUserScrolled(false)
      }
      
      lastScrollTopRef.current = currentScrollTop
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Auto-scroll function with smooth animation - only for manual scroll button
  const scrollToBottom = useCallback((force = false) => {
    if (!messagesEndRef.current) return
    
    // Only scroll when explicitly forced (manual button click)
    if (force) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [])

  // Manual scroll to bottom (for button click)
  const handleScrollToBottom = useCallback(() => {
    setUserScrolled(false)
    scrollToBottom(true)
  }, [scrollToBottom])

  // Auto-scroll when new messages arrive - DISABLED
  // useEffect(() => {
  //   if (messages.length > 0) {
  //     // For new messages, always try to scroll if user hasn't scrolled far away
  //     if (!userScrolled) {
  //       // Small delay to ensure DOM has updated
  //       setTimeout(() => scrollToBottom(), 100)
  //     }
  //   }
  // }, [messages, scrollToBottom, userScrolled])

  // Load AI settings initially
  useEffect(() => {
    const loadAISettings = async () => {
      try {
        const storage = new (await import("@plasmohq/storage")).Storage()
        const [hostValue, tokenValue, modelValue] = await Promise.all([
          storage.get("aiHost"),
          storage.get("aiToken"),
          storage.get("aiModel")
        ])
        setAiHost(hostValue || "https://api.deepseek.com/chat/completions")
        setAiToken(tokenValue || "")
        setAiModel(modelValue || "deepseek-chat")
      } catch (e) {
        console.error("Failed to load AI settings", e)
      }
    }
    loadAISettings()
  }, [])

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
      } else if (message.request === "organize-tabs-complete") {
        setIsOrganizing(false)
        setOperationType(null)
        if (message.success) {
          setOrganizeStatus("Tabs organized successfully!")
          setOrganizeSteps(prev => [...prev, message.message])
        } else {
          setOrganizeStatus("Failed to organize tabs")
          setOrganizeSteps(prev => [...prev, `Error: ${message.message}`])
        }
      } else if (message.request === "ungroup-tabs-complete") {
        setIsOrganizing(false)
        setOperationType(null)
        if (message.success) {
          setOrganizeStatus("Tabs ungrouped successfully!")
          setOrganizeSteps(prev => [...prev, message.message])
        } else {
          setOrganizeStatus("Failed to ungroup tabs")
          setOrganizeSteps(prev => [...prev, `Error: ${message.message}`])
        }
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

  // When sidepanel mounts, automatically read chrome.storage.local['aipex_user_input'], if exists, auto-fill and send
  useEffect(() => {
    chrome.storage?.local?.get(["aipex_user_input"], (result) => {
      if (result && result.aipex_user_input) {
        setInputValue(result.aipex_user_input)
        setTimeout(() => {
          handleSubmit(result.aipex_user_input)
          chrome.storage.local.remove("aipex_user_input")
        }, 0)
      }
    })
  }, [handleSubmit])

  // Clear conversation function
  const handleClearConversation = useCallback(() => {
    setMessages([])
    setLoading(false)
    setInputValue('')
    setUserScrolled(false)
    setIsAtBottom(true)
    setShowScrollButton(false)
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

  const handleOrganizeTabs = async () => {
    setIsOrganizing(true)
    setCurrentStep(0)
    setOrganizeSteps([])
    setOperationType("organize")
    setOrganizeStatus("Starting tab organization...")
    try {
      setOrganizeStatus("Getting all open tabs...")
      setOrganizeSteps(prev => [...prev, "Getting all open tabs"]) 
      setCurrentStep(1)
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const validTabs = tabs.filter(tab => tab.url)
      if (validTabs.length === 0) {
        setOrganizeStatus("No tabs found to organize")
        setIsOrganizing(false)
        setOperationType(null)
        return
      }
      setOrganizeStatus(`Found ${validTabs.length} tabs to organize...`)
      setOrganizeSteps(prev => [...prev, `Found ${validTabs.length} tabs to analyze`])
      setCurrentStep(2)
      const tabDetails = validTabs.slice(0, 5).map(tab => {
        const hostname = tab.url ? new URL(tab.url).hostname : "unknown"
        return `${tab.title} (${hostname})`
      })
      if (validTabs.length > 5) tabDetails.push(`... and ${validTabs.length - 5} more tabs`)
      setOrganizeSteps(prev => [...prev, "Sample tabs:", ...tabDetails])
      setCurrentStep(3)
      setOrganizeStatus("Organizing tabs with AI...")
      setOrganizeSteps(prev => [...prev, "Sending to AI for classification"]) 
      setCurrentStep(4)
      chrome.runtime.sendMessage({ request: "organize-tabs" })
    } catch (error: any) {
      console.error("Error in handleOrganizeTabs:", error)
      setOrganizeStatus("Error occurred")
      setOrganizeSteps(prev => [...prev, `Error: ${error.message}`])
      setIsOrganizing(false)
      setOperationType(null)
    }
  }

  const handleUngroupTabs = async () => {
    setIsOrganizing(true)
    setCurrentStep(0)
    setOrganizeSteps([])
    setOperationType("ungroup")
    setOrganizeStatus("Starting tab ungrouping...")
    try {
      setOrganizeStatus("Finding existing tab groups...")
      setOrganizeSteps(prev => [...prev, "Finding existing tab groups"]) 
      setCurrentStep(1)
      const currentWindow = await chrome.windows.getCurrent()
      const groups = await chrome.tabGroups.query({ windowId: currentWindow.id })
      if (groups.length === 0) {
        setOrganizeStatus("No groups found")
        setOrganizeSteps(prev => [...prev, "No tab groups found to ungroup"]) 
        setIsOrganizing(false)
        setOperationType(null)
        return
      }
      setOrganizeStatus(`Found ${groups.length} groups to ungroup...`)
      setOrganizeSteps(prev => [...prev, `Found ${groups.length} tab groups`])
      setCurrentStep(2)
      const groupDetails = groups.slice(0, 3).map(group => `"${group.title || 'Untitled'}" (${group.id})`)
      if (groups.length > 3) groupDetails.push(`... and ${groups.length - 3} more groups`)
      setOrganizeSteps(prev => [...prev, "Groups to ungroup:", ...groupDetails])
      setCurrentStep(3)
      setOrganizeStatus("Ungrouping tabs...")
      setOrganizeSteps(prev => [...prev, "Removing tab groups"]) 
      setCurrentStep(4)
      chrome.runtime.sendMessage({ request: "ungroup-tabs" })
    } catch (error: any) {
      console.error("Error in handleUngroupTabs:", error)
      setOrganizeStatus("Error occurred")
      setOrganizeSteps(prev => [...prev, `Error: ${error.message}`])
      setIsOrganizing(false)
      setOperationType(null)
    }
  }

  const handleSaveAISettings = async () => {
    setIsSaving(true)
    try {
      const storage = new (await import("@plasmohq/storage")).Storage()
      await Promise.all([
        storage.set("aiHost", aiHost),
        storage.set("aiToken", aiToken),
        storage.set("aiModel", aiModel)
      ])
      // brief success indicator
      setOrganizeStatus("AI settings saved")
      setTimeout(() => setOrganizeStatus(""), 1500)
    } catch (e) {
      console.error("Error saving AI settings:", e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 w-full h-full bg-white flex flex-col border-t border-gray-200 font-sans text-gray-900">
      {/* Header with close icon */}
      <div className="relative px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900 text-center">AI Chat</h2>
        <button
          onClick={handleClearConversation}
          disabled={loading}
          className="absolute right-4 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="New Chat"
        >
          <img src={newChatIcon} alt="New Chat" className="w-5 h-6" />
        </button>
        <button
          onClick={() => setShowSettings(s => !s)}
          className="absolute left-4 top-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          title="Settings"
        >
          {/* fallback if missing gear image: simple svg */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11.983 1.588a1 1 0 00-1.966 0l-.078.46a7.97 7.97 0 00-1.357.563l-.42-.243a1 1 0 00-1.366.366l-.983 1.703a1 1 0 00.366 1.366l.42.243c-.124.44-.214.9-.264 1.372l-.46.078a1 1 0 000 1.966l.46.078c.05.472.14.932.264 1.372l-.42.243a1 1 0 00-.366 1.366l.983 1.703a1 1 0 001.366.366l.42-.243c.425.242.88.44 1.357.563l.078.46a1 1 0 001.966 0l.078-.46c.472-.05.932-.14 1.372-.264l.243.42a1 1 0 001.366.366l1.703-.983a1 1 0 00.366-1.366l-.243-.42c.242-.425.44-.88.563-1.357l.46-.078a1 1 0 000-1.966l-.46-.078a7.97 7.97 0 00-.563-1.357l.243-.42a1 1 0 00-.366-1.366l-1.703-.983a1 1 0 00-1.366.366l-.243.42a7.97 7.97 0 00-1.372-.264l-.078-.46zM10 13a3 3 0 110-6 3 3 0 010 6z" />
          </svg>
        </button>
      </div>
      {/* Quick actions bar always visible */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-2">
        <button
          onClick={() => { setShowSettings(true); handleOrganizeTabs() }}
          disabled={isOrganizing}
          className={`px-3 py-1.5 rounded-md text-white text-sm font-semibold inline-flex items-center ${isOrganizing ? 'bg-gray-300 disabled:cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {isOrganizing && operationType === 'organize' ? (
            <>
              <span className="mr-2 inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Organizing...
            </>
          ) : 'Organize Tabs'}
        </button>
        <button
          onClick={() => { setShowSettings(true); handleUngroupTabs() }}
          disabled={isOrganizing}
          className={`px-3 py-1.5 rounded-md text-white text-sm font-semibold inline-flex items-center ${isOrganizing ? 'bg-gray-300 disabled:cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'}`}
        >
          {isOrganizing && operationType === 'ungroup' ? (
            <>
              <span className="mr-2 inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Ungrouping...
            </>
          ) : 'Ungroup Tabs'}
        </button>
        {organizeStatus && (
          <div className="ml-2 text-sm text-gray-700 truncate">{organizeStatus}</div>
        )}
      </div>
      
      {showSettings ? (
        // Settings view (styled)
        <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-slate-50">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Title */}
            <div className="text-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
              <p className="text-sm text-gray-600">Organize/Ungroup and AI configuration</p>
            </div>

            {/* Card: Tab Organization */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">Tab Organization</div>
                  <div className="text-sm text-gray-600">Group or ungroup your current window tabs</div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleOrganizeTabs}
                    disabled={isOrganizing}
                    className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold inline-flex items-center justify-center ${isOrganizing ? 'bg-gray-300 disabled:cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {isOrganizing ? (
                      <>
                        <span className="mr-2 inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Organizing...
                      </>
                    ) : 'Organize Tabs'}
                  </button>
                  <button
                    onClick={handleUngroupTabs}
                    disabled={isOrganizing}
                    className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold inline-flex items-center justify-center ${isOrganizing ? 'bg-gray-300 disabled:cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'}`}
                  >
                    {isOrganizing ? (
                      <>
                        <span className="mr-2 inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Ungrouping...
                      </>
                    ) : 'Ungroup Tabs'}
                  </button>
                </div>
                {organizeStatus && (
                  <div className="text-sm text-gray-700">{organizeStatus}</div>
                )}
                {organizeSteps.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-sm font-semibold text-gray-900 mb-2">Progress ({currentStep}/{operationType === 'ungroup' ? 4 : 4})</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs whitespace-pre-wrap">
                      {organizeSteps.map((step, idx) => (
                        <div key={idx} className="text-gray-700">{step}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card: AI Configuration */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="text-base font-semibold text-gray-900">AI Configuration</div>
                <div className="text-sm text-gray-600">Configure AI host, token and model</div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">AI Host</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                    value={aiHost}
                    onChange={(e) => setAiHost(e.target.value)}
                    placeholder="https://api.deepseek.com/chat/completions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">AI Token</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                    type="password"
                    value={aiToken}
                    onChange={(e) => setAiToken(e.target.value)}
                    placeholder="Enter your API token"
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    Need a key? <a className="text-blue-600 hover:text-blue-800 underline" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI</a>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">AI Model</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="deepseek-chat"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveAISettings}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-lg text-white font-semibold ${isSaving ? 'bg-gray-300 disabled:cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                  >{isSaving ? 'Saving...' : 'Save Settings'}</button>
                  <button
                    onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold"
                  >Open Shortcuts</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages area - takes up remaining space */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto min-h-0 relative"
          >
            {items.length > 0 && (
              <div className="p-4">
                <Bubble.List items={items} />
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </div>
            )}
            
            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                onClick={handleScrollToBottom}
                className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center z-10"
                title="Scroll to bottom"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Input area fixed at bottom */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
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
        </>
      )}
    </div>
  )
}

export default AIChatSidebar 