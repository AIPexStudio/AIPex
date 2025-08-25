import React, { useState, useEffect, useCallback, useRef } from 'react'
import { StreamChunk } from '../streaming-parser'

export interface StreamingState {
  isStreaming: boolean
  content: string
  toolCalls: any[]
  currentToolCall: any | null
  steps: StreamChunk[]
  error: string | null
  startTime: number | null
  endTime: number | null
}

export interface StreamingStateManagerProps {
  messageId: string
  onStateChange?: (state: StreamingState) => void
  onComplete?: (finalState: StreamingState) => void
  onError?: (error: string) => void
}

export const useStreamingState = (messageId: string) => {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    toolCalls: [],
    currentToolCall: null,
    steps: [],
    error: null,
    startTime: null,
    endTime: null
  })

  const startTimeRef = useRef<number>(0)
  const toolCallStartTimeRef = useRef<number>(0)

  // Update state with new chunk
  const addChunk = useCallback((chunk: StreamChunk) => {
    setState(prev => {
      const newState = { ...prev }
      
      switch (chunk.type) {
        case 'text':
          newState.content += chunk.content || ''
          newState.steps.push(chunk)
          break
          
        case 'tool_call':
          newState.currentToolCall = {
            name: chunk.name,
            args: chunk.args,
            startTime: Date.now()
          }
          newState.toolCalls.push(chunk)
          newState.steps.push(chunk)
          toolCallStartTimeRef.current = Date.now()
          break
          
        case 'tool_result':
          newState.currentToolCall = null
          newState.steps.push(chunk)
          break
          
        case 'thinking':
        case 'planning':
          newState.steps.push(chunk)
          break
          
        case 'complete':
          newState.isStreaming = false
          newState.endTime = Date.now()
          newState.steps.push(chunk)
          break
          
        case 'error':
          newState.error = chunk.error || 'Unknown error'
          newState.isStreaming = false
          newState.endTime = Date.now()
          newState.steps.push(chunk)
          break
      }
      
      return newState
    })
  }, [])

  // Start streaming
  const startStreaming = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStreaming: true,
      startTime: Date.now(),
      error: null
    }))
    startTimeRef.current = Date.now()
  }, [])

  // Stop streaming
  const stopStreaming = useCallback((error?: string) => {
    setState(prev => ({
      ...prev,
      isStreaming: false,
      endTime: Date.now(),
      error: error || prev.error
    }))
  }, [])

  // Add tool result
  const addToolResult = useCallback((name: string, result: any, error?: string) => {
    const chunk: StreamChunk = {
      type: 'tool_result',
      name,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      error,
      timestamp: Date.now(),
      messageId
    }
    addChunk(chunk)
  }, [addChunk, messageId])

  // Add thinking step
  const addThinking = useCallback((content: string) => {
    const chunk: StreamChunk = {
      type: 'thinking',
      content,
      timestamp: Date.now(),
      messageId
    }
    addChunk(chunk)
  }, [addChunk, messageId])

  // Add planning step
  const addPlanning = useCallback((content: string) => {
    const chunk: StreamChunk = {
      type: 'planning',
      content,
      timestamp: Date.now(),
      messageId
    }
    addChunk(chunk)
  }, [addChunk, messageId])

  // Reset state
  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      content: '',
      toolCalls: [],
      currentToolCall: null,
      steps: [],
      error: null,
      startTime: null,
      endTime: null
    })
  }, [])

  // Listen for streaming messages
  useEffect(() => {
    const handleStreamMessage = (message: any) => {
      if (message.messageId !== messageId) return

      switch (message.request) {
        case 'ai-chat-stream':
          addChunk({
            type: 'text',
            content: message.chunk,
            timestamp: Date.now(),
            messageId
          })
          break

        case 'ai-chat-tools-step':
          const { step } = message
          if (step.type === 'call_tool') {
            addChunk({
              type: 'tool_call',
              name: step.name,
              args: step.args,
              timestamp: Date.now(),
              messageId
            })
          } else if (step.type === 'tool_result') {
            addToolResult(step.name || '', step.result, step.error)
          } else if (step.type === 'think') {
            addThinking(step.content || '')
          }
          break

        case 'ai-chat-planning-step':
          const { step: planningStep } = message
          addPlanning(planningStep.content || '')
          break

        case 'ai-chat-complete':
          addChunk({
            type: 'complete',
            timestamp: Date.now(),
            messageId
          })
          break

        case 'ai-chat-error':
          addChunk({
            type: 'error',
            error: message.error,
            timestamp: Date.now(),
            messageId
          })
          break
      }
    }

    chrome.runtime.onMessage.addListener(handleStreamMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleStreamMessage)
    }
  }, [messageId, addChunk, addToolResult, addThinking, addPlanning])

  return {
    state,
    addChunk,
    startStreaming,
    stopStreaming,
    addToolResult,
    addThinking,
    addPlanning,
    reset
  }
}

const StreamingStateManager: React.FC<StreamingStateManagerProps> = ({
  messageId,
  onStateChange,
  onComplete,
  onError
}) => {
  const { state } = useStreamingState(messageId)

  // Notify state changes
  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  // Notify completion
  useEffect(() => {
    if (!state.isStreaming && state.endTime && !state.error) {
      onComplete?.(state)
    }
  }, [state.isStreaming, state.endTime, state.error, onComplete])

  // Notify errors
  useEffect(() => {
    if (state.error) {
      onError?.(state.error)
    }
  }, [state.error, onError])

  return null // This component doesn't render anything
}

export default StreamingStateManager
