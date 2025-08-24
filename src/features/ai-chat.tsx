import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Sender } from "@ant-design/x"
import newChatIcon from "url:~/assets/add-action.png"
import "~/style.css"

import { Thread, MarkdownRenderer, CallTool, PlanningAgent } from "~/lib/components"
import type { Message, ToolStep, PlanningStep } from "~/lib/components"

const AIChatSidebar = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
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
    const [stepsByMessageId, setStepsByMessageId] = useState<Record<string, ToolStep[]>>({})
  const [showToolsInfo, setShowToolsInfo] = useState(false)
  const [planningStepsByMessageId, setPlanningStepsByMessageId] = useState<Record<string, PlanningStep[]>>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const lastScrollTopRef = useRef<number>(0)

  // Available tools data organized by category
  const availableTools = [
    {
      category: "Tab Management",
      description: "Manage browser tabs, switch between them, and get tab information",
      tools: [
        { name: "get_all_tabs", description: "Get all open tabs across all windows with their IDs, titles, and URLs" },
        { name: "get_current_tab", description: "Get information about the currently active tab" },
        { name: "switch_to_tab", description: "Switch to a specific tab by ID" },
        { name: "create_new_tab", description: "Create a new tab with the specified URL" },
        { name: "get_tab_info", description: "Get detailed information about a specific tab" },
        { name: "duplicate_tab", description: "Duplicate an existing tab" },
        { name: "close_tab", description: "Close a specific tab" },
        { name: "get_current_tab_content", description: "Get the visible text content of the current tab" }
      ]
    },
    {
      category: "Tab Groups",
      description: "Organize tabs into groups and manage tab organization",
      tools: [
        { name: "organize_tabs", description: "Use AI to automatically group tabs by topic/purpose" },
        { name: "ungroup_tabs", description: "Remove all tab groups in the current window" },
        { name: "get_all_tab_groups", description: "Get all tab groups across all windows" },
        { name: "create_tab_group", description: "Create a new tab group with specified tabs" },
        { name: "update_tab_group", description: "Update tab group properties" }
      ]
    },
    {
      category: "Bookmarks",
      description: "Manage bookmarks, create, delete, and search bookmarks",
      tools: [
        { name: "get_all_bookmarks", description: "Get all bookmarks in a flattened list" },
        { name: "get_bookmark_folders", description: "Get bookmark folder structure" },
        { name: "create_bookmark", description: "Create a new bookmark" },
        { name: "delete_bookmark", description: "Delete a bookmark by ID" },
        { name: "search_bookmarks", description: "Search bookmarks by title/URL" }
      ]
    },
    {
      category: "History",
      description: "Manage browsing history, search and clear history",
      tools: [
        { name: "get_recent_history", description: "Get recent browsing history" },
        { name: "search_history", description: "Search browsing history" },
        { name: "delete_history_item", description: "Delete a specific history item by URL" },
        { name: "clear_history", description: "Clear browsing history for specified days" }
      ]
    },
    {
      category: "Windows",
      description: "Manage browser windows, create, switch, and control windows",
      tools: [
        { name: "get_all_windows", description: "Get all browser windows" },
        { name: "get_current_window", description: "Get the current focused window" },
        { name: "switch_to_window", description: "Switch focus to a specific window" },
        { name: "create_new_window", description: "Create a new browser window" },
        { name: "close_window", description: "Close a specific window" },
        { name: "minimize_window", description: "Minimize a specific window" },
        { name: "maximize_window", description: "Maximize a specific window" }
      ]
    },
    {
      category: "Page Content",
      description: "Extract and analyze content from web pages",
      tools: [
        { name: "get_page_metadata", description: "Get page metadata including title, description, keywords, etc." },
        { name: "extract_page_text", description: "Extract text content from the current page with word count and reading time" },
        { name: "get_page_links", description: "Get all links from the current page" },
        { name: "get_page_images", description: "Get all images from the current page" },
        { name: "search_page_text", description: "Search for text on the current page" },
        { name: "get_interactive_elements", description: "Get all interactive elements (links, buttons, inputs) from the current page" },
        { name: "click_element", description: "Click an element on the current page using its CSS selector" },
        { name: "summarize_page", description: "Summarize the current page content with key points and reading statistics" }
      ]
    },
    {
      category: "Form & Input Management",
      description: "Fill forms, manage input fields, and interact with web forms",
      tools: [
        { name: "fill_input", description: "Fill an input field with text using CSS selector" },
        { name: "clear_input", description: "Clear the content of an input field using CSS selector" },
        { name: "get_input_value", description: "Get the current value of an input field using CSS selector" },
        { name: "submit_form", description: "Submit a form using CSS selector" },
        { name: "get_form_elements", description: "Get all form elements and their input fields on the current page" }
      ]
    },
    {
      category: "Clipboard",
      description: "Copy and manage clipboard content",
      tools: [
        { name: "copy_to_clipboard", description: "Copy text to clipboard" },
        { name: "read_from_clipboard", description: "Read text from clipboard" },
        { name: "copy_current_page_url", description: "Copy current page URL to clipboard" },
        { name: "copy_current_page_title", description: "Copy current page title to clipboard" },
        { name: "copy_selected_text", description: "Copy selected text from current page" },
        { name: "copy_page_as_markdown", description: "Copy page content as markdown format" },
        { name: "copy_page_as_text", description: "Copy page content as plain text" }
      ]
    },
    {
      category: "Storage",
      description: "Manage extension storage and settings",
      tools: [
        { name: "get_storage_value", description: "Get a value from storage" },
        { name: "set_storage_value", description: "Set a value in storage" },
        { name: "get_extension_settings", description: "Get extension settings" },
        { name: "get_ai_config", description: "Get AI configuration" }
      ]
    },
    {
      category: "Utilities",
      description: "Utility functions for browser and system information",
      tools: [
        { name: "get_browser_info", description: "Get browser information" },
        { name: "get_system_info", description: "Get system information" },
        { name: "get_current_datetime", description: "Get current date and time" },
        { name: "validate_url", description: "Validate if a URL is properly formatted" },
        { name: "extract_domain", description: "Extract domain from URL" },
        { name: "get_text_stats", description: "Get text statistics including word count, reading time, etc." },
        { name: "check_permissions", description: "Check if all required permissions are available for the extension" }
      ]
    },
    {
      category: "Extensions",
      description: "Manage browser extensions",
      tools: [
        { name: "get_all_extensions", description: "Get all installed extensions with their details" },
        { name: "get_extension", description: "Get extension details by ID" },
        { name: "set_extension_enabled", description: "Enable or disable an extension" },
        { name: "uninstall_extension", description: "Uninstall an extension" },
        { name: "get_extension_permissions", description: "Get extension permissions" }
      ]
    },
    {
      category: "Downloads",
      description: "Manage browser downloads",
      tools: [
        { name: "get_all_downloads", description: "Get all downloads with their status and progress" },
        { name: "get_download", description: "Get download details by ID" },
        { name: "pause_download", description: "Pause a download" },
        { name: "resume_download", description: "Resume a paused download" },
        { name: "cancel_download", description: "Cancel a download" },
        { name: "remove_download", description: "Remove a download from history" },
        { name: "open_download", description: "Open a downloaded file" },
        { name: "show_download_in_folder", description: "Show a download in its folder" },
        { name: "get_download_stats", description: "Get download statistics" }
      ]
    },
    {
      category: "Sessions",
      description: "Manage browser sessions and device information",
      tools: [
        { name: "get_all_sessions", description: "Get all recently closed sessions" },
        { name: "get_session", description: "Get session details by ID" },
        { name: "restore_session", description: "Restore a closed session" },
        { name: "get_current_device", description: "Get current device information" },
        { name: "get_all_devices", description: "Get all devices information" }
      ]
    },
    {
      category: "Context Menus",
      description: "Manage browser context menu items",
      tools: [
        { name: "create_context_menu_item", description: "Create a new context menu item" },
        { name: "update_context_menu_item", description: "Update an existing context menu item" },
        { name: "remove_context_menu_item", description: "Remove a context menu item" },
        { name: "remove_all_context_menu_items", description: "Remove all context menu items" },
        { name: "get_context_menu_items", description: "Get all context menu items (limited by Chrome API)" }
      ]
    }
  ]

  const totalToolsCount = availableTools.reduce((sum, category) => sum + category.tools.length, 0)

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
      const isNearBottom = distanceFromBottom < 100 // Reduced threshold for better UX
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Detect user scrolling away from bottom
      if (scrollDirection === 'up' && !isNearBottom) {
        setUserScrolled(true)
        setShouldAutoScroll(false) // Disable auto-scroll when user scrolls away
        
        // Reset user scrolled state after inactivity - longer timeout for better UX
        scrollTimeoutRef.current = setTimeout(() => {
          setUserScrolled(false)
          setShouldAutoScroll(true) // Re-enable auto-scroll after timeout
        }, 3000) // 3 seconds timeout
      } else if (isNearBottom) {
        // If user scrolls back to bottom, immediately reset the scrolled state
        setUserScrolled(false)
        setHasNewMessages(false)
        setShouldAutoScroll(true) // Re-enable auto-scroll when user is at bottom
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

  // Auto-scroll function with smooth animation
  const scrollToBottom = useCallback((force = false) => {
    if (!messagesEndRef.current) return
    
    messagesEndRef.current.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    })
  }, [])

  // Manual scroll to bottom (for button click)
  const handleScrollToBottom = useCallback(() => {
    setUserScrolled(false)
    setHasNewMessages(false)
    setShouldAutoScroll(true)
    scrollToBottom()
  }, [scrollToBottom])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && shouldAutoScroll) {
      if (!userScrolled && !loading) {
        // Auto-scroll to bottom if user hasn't scrolled away AND AI is not currently responding
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ 
              behavior: 'smooth',
              block: 'end'
            })
          }
        }, 100)
      } else if (userScrolled && !loading) {
        // Show new message indicator if user is scrolled up AND AI is not currently responding
        setHasNewMessages(true)
        // Auto-hide indicator after 5 seconds
        setTimeout(() => setHasNewMessages(false), 5000)
      }
    }
  }, [messages, userScrolled, loading, shouldAutoScroll])

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
      } else if (message.request === 'ai-chat-tools-step') {
        const { messageId, step } = message as { messageId: string; step: ToolStep }
        setStepsByMessageId(prev => {
          const prevSteps = prev[messageId] || []
          return { ...prev, [messageId]: [...prevSteps, step] }
        })
      } else if (message.request === 'ai-chat-tools-final') {
        const { messageId, content } = message as { messageId: string; content: string }
        // flush final content to the assistant message and mark done
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content, streaming: false }
            : msg
        ))
        setLoading(false)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      } else if (message.request === 'ai-chat-planning-step') {
        const { messageId, step } = message as { messageId: string; step: PlanningStep }
        setPlanningStepsByMessageId(prev => {
          const prevSteps = prev[messageId] || []
          return { ...prev, [messageId]: [...prevSteps, step] }
        })
      } else if (message.request === 'ai-chat-planning-complete') {
        const { messageId } = message as { messageId: string }
        // Mark planning as complete
        setPlanningStepsByMessageId(prev => {
          const steps = prev[messageId] || []
          return { ...prev, [messageId]: steps.map(step => ({ ...step, status: 'completed' as const })) }
        })
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
    
    // If user hasn't scrolled away, allow auto-scroll for the new AI response
    if (!userScrolled) {
      setShouldAutoScroll(true)
    }
    
    // prepare steps container for this message
    setStepsByMessageId(prev => ({ ...prev, [aiMessageId]: [] }))
    // prepare planning steps container for this message
    setPlanningStepsByMessageId(prev => ({ ...prev, [aiMessageId]: [] }))

    try {
      // Use MCP client for tool-enabled AI chat
      const conversationContext = buildContext(updatedMessages)
      const response = await chrome.runtime.sendMessage({
        request: "ai-chat-with-tools",
        prompt: message,
        context: conversationContext,
        messageId: aiMessageId
      })
      if (!response || !response.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: `Error: Failed to start AI chat`, streaming: false }
            : msg
        ))
        setLoading(false)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    } catch (error: any) {
      console.error('AI response failed:', error)
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `Error: ${error?.message || 'Unknown error'}`, streaming: false }
          : msg
      ))
      setLoading(false)
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
    setHasNewMessages(false)
    setShouldAutoScroll(true)
    setStepsByMessageId({})
    setPlanningStepsByMessageId({})
  }, [])



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
        <div className="text-center">
          <button
            onClick={() => setShowToolsInfo(!showToolsInfo)}
            className="inline-flex flex-col items-center hover:bg-gray-50 rounded-lg px-3 py-1 transition-colors"
            title="Click to view available tools"
          >
            <h2 className="text-xl font-bold text-gray-900">AI Chat</h2>
            <span className="text-sm text-blue-600 font-medium">({totalToolsCount} tools)</span>
          </button>
        </div>
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
      {/* Removed top quick actions bar for organize/ungroup on chat page */}
      
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
                    className={`px-4 py-2 rounded-lg text-white font-semibold ${isSaving ? 'bg-gray-300 disabled:cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
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
      ) : showToolsInfo ? (
        // Tools Information View
        <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-slate-50">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Available AI Tools</h3>
              <p className="text-gray-600">AIpex provides {totalToolsCount} tools to enhance AI capabilities</p>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {availableTools.map((category, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900">{category.category}</h4>
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {category.tools.map((tool, toolIndex) => (
                      <div key={toolIndex} className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:bg-gray-100 transition-colors">
                        <div className="font-mono text-sm text-blue-600 font-semibold mb-1">{tool.name}</div>
                        <div className="text-sm text-gray-700 leading-relaxed">{tool.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Total Tools Available: {totalToolsCount}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                These tools enable the AI to perform various browser automation and management tasks
              </p>
              <button
                onClick={() => setShowToolsInfo(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Back to Chat
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages area - takes up remaining space */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto min-h-0 relative bg-gradient-to-b from-blue-50 to-white"
          >
            {messages.length > 0 ? (
              <div className="p-6">
                <Thread messages={messages}>
                  {(message) => (
                    message.role === 'assistant' ? (
                      <div className="flex flex-col gap-4">
                        {planningStepsByMessageId[message.id]?.length ? (
                          <PlanningAgent 
                            steps={planningStepsByMessageId[message.id]} 
                            isActive={true}
                          />
                        ) : null}
                        {stepsByMessageId[message.id]?.length ? (
                          <CallTool steps={stepsByMessageId[message.id]} />
                        ) : null}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                          <MarkdownRenderer content={message.content} streaming={message.streaming} />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-sm p-6 font-medium">
                        {message.content}
                      </div>
                    )
                  )}
                </Thread>
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              !showSettings && (
                <div className="p-8">
                  <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to AIpex</h3>
                      <p className="text-gray-600">Choose a quick action or ask anything to get started</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        onClick={() => handleSubmit('Please organize my open tabs by topic and purpose')}
                        className="w-full text-left p-6 rounded-2xl border border-blue-200 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 bg-white/70 backdrop-blur-sm"
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
                        className="w-full text-left p-6 rounded-2xl border border-blue-200 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 bg-white/70 backdrop-blur-sm"
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
                        onClick={() => handleSubmit('Find all my GitHub tabs and organize them into a group')}
                        className="w-full text-left p-6 rounded-2xl border border-blue-200 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 bg-white/70 backdrop-blur-sm"
                      >
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                            </svg>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">Smart Grouping</div>
                        </div>
                        <div className="text-xs text-gray-600">Find specific tabs and create targeted groups</div>
                      </button>
                      <button
                        onClick={() => handleSubmit('What tabs do I have open? Show me a detailed overview')}
                        className="w-full text-left p-6 rounded-2xl border border-blue-200 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 bg-white/70 backdrop-blur-sm"
                      >
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mr-3">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">Tab Overview</div>
                        </div>
                        <div className="text-xs text-gray-600">Get detailed analysis of all open tabs</div>
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
            
            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                onClick={handleScrollToBottom}
                className={`absolute bottom-6 right-6 w-12 h-12 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center z-10 hover:scale-105 ${
                  hasNewMessages 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 animate-pulse' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                }`}
                title={hasNewMessages ? "New message - Scroll to bottom" : "Scroll to bottom"}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            )}
            
            {/* New message indicator when user is scrolled up */}
            {userScrolled && hasNewMessages && (
              <div className="absolute bottom-20 right-6 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg animate-bounce">
                New message
              </div>
            )}
          </div>
          
          {/* Input area fixed at bottom */}
          <div className="px-6 py-4 border-t border-blue-200 bg-white/90 backdrop-blur-sm flex-shrink-0">
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