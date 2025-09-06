import React, { useState, useEffect, useRef } from 'react'
import { MarkdownRenderer } from './index'

export interface StreamingToolCallStep {
  type: 'text' | 'tool_call' | 'tool_result' | 'thinking' | 'planning'
  content?: string
  name?: string
  args?: any
  result?: string
  status?: 'pending' | 'in-progress' | 'completed' | 'failed'
  timestamp: number
  duration?: number
  error?: string
}

export interface StreamingToolCallProps {
  messageId: string
  isActive: boolean
  onStepComplete?: (stepIndex: number) => void
}

const StreamingToolCall: React.FC<StreamingToolCallProps> = ({ 
  messageId, 
  isActive, 
  onStepComplete 
}) => {
  const [steps, setSteps] = useState<StreamingToolCallStep[]>([])
  const [currentStep, setCurrentStep] = useState<StreamingToolCallStep | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const stepStartTimeRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Listen for streaming messages
  useEffect(() => {
    const handleStreamMessage = (message: any) => {
      if (message.messageId !== messageId) return

      switch (message.request) {
        case 'ai-chat-stream':
          // Handle text streaming
          setSteps(prev => {
            const lastStep = prev[prev.length - 1]
            if (lastStep && lastStep.type === 'text') {
              // Update existing text step
              return prev.map((step, idx) => 
                idx === prev.length - 1 
                  ? { ...step, content: (step.content || '') + message.chunk }
                  : step
              )
            } else {
              // Create new text step
              return [...prev, {
                type: 'text',
                content: message.chunk,
                timestamp: Date.now(),
                status: 'in-progress'
              }]
            }
          })
          break

        case 'ai-chat-tools-step':
          // Handle tool call steps
          const { step } = message
          setSteps(prev => {
            if (step.type === 'call_tool') {
              // Start new tool call
              stepStartTimeRef.current = Date.now()
              setCurrentStep({
                type: 'tool_call',
                name: step.name,
                args: step.args,
                timestamp: Date.now(),
                status: 'in-progress'
              })
              
              // Start timer for current step
              intervalRef.current = setInterval(() => {
                setCurrentStep(prev => prev ? {
                  ...prev,
                  duration: Date.now() - stepStartTimeRef.current
                } : null)
              }, 100)

              return [...prev, {
                type: 'tool_call',
                name: step.name,
                args: step.args,
                timestamp: Date.now(),
                status: 'in-progress'
              }]
            } else if (step.type === 'tool_result') {
              // Complete tool call with result
              if (intervalRef.current) {
                clearInterval(intervalRef.current)
              }
              
              setCurrentStep(null)
              return prev.map((s, idx) => 
                idx === prev.length - 1 && s.type === 'tool_call'
                  ? { ...s, status: 'completed', result: step.result }
                  : s
              )
            } else if (step.type === 'think') {
              // Add thinking step
              return [...prev, {
                type: 'thinking',
                content: step.content,
                timestamp: Date.now(),
                status: 'completed'
              }]
            }
            return prev
          })
          break

        case 'ai-chat-planning-step':
          // Handle planning steps
          const { step: planningStep } = message
          setSteps(prev => [...prev, {
            type: 'planning',
            content: planningStep.content,
            timestamp: Date.now(),
            status: planningStep.status || 'completed'
          }])
          break

        case 'ai-chat-complete':
          // Mark all steps as completed
          setSteps(prev => prev.map(step => ({ ...step, status: 'completed' })))
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          setCurrentStep(null)
          break
      }
    }

    chrome.runtime.onMessage.addListener(handleStreamMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleStreamMessage)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [messageId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  if (!isActive || steps.length === 0) {
    return null
  }

  const getStepIcon = (type: StreamingToolCallStep['type']) => {
    switch (type) {
      case 'text': return '💬'
      case 'tool_call': return '🔧'
      case 'tool_result': return '✅'
      case 'thinking': return '🧠'
      case 'planning': return '📋'
      default: return '•'
    }
  }

  const getStepColor = (type: StreamingToolCallStep['type'], status?: string) => {
    const baseColors = {
      text: 'text-blue-600 bg-blue-50 border-blue-200',
      tool_call: 'text-green-600 bg-green-50 border-green-200',
      tool_result: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      thinking: 'text-purple-600 bg-purple-50 border-purple-200',
      planning: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    }

    const statusColors = {
      'in-progress': 'ring-2 ring-blue-300 animate-pulse',
      'completed': '',
      'failed': 'ring-2 ring-red-300'
    }

    return `${baseColors[type] || 'text-gray-600 bg-gray-50 border-gray-200'} ${statusColors[status || 'completed']}`
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 text-lg">⚡</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Streaming AI Response</h3>
            <p className="text-xs text-gray-600">Real-time tool execution and reasoning</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-8 h-8 rounded-full bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center transition-all duration-200"
        >
          <svg 
            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Current step indicator */}
      {currentStep && (
        <div className="mb-3 p-3 bg-blue-100 rounded-lg border border-blue-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-blue-700">
                Executing: {currentStep.name}
              </span>
            </div>
            {currentStep.duration && (
              <span className="text-xs text-blue-600">
                {formatDuration(currentStep.duration)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Steps list */}
      {isExpanded && (
        <div className="space-y-3 border-t border-blue-200 pt-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border transition-all duration-200 ${getStepColor(step.type, step.status)}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    step.status === 'completed' ? 'bg-green-100 text-green-600' :
                    step.status === 'failed' ? 'bg-red-100 text-red-600' :
                    step.status === 'in-progress' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {step.status === 'completed' ? '✓' :
                     step.status === 'failed' ? '✗' :
                     step.status === 'in-progress' ? '⟳' : index + 1}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <span className="text-lg mr-2">{getStepIcon(step.type)}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {step.type === 'text' ? 'Text Response' :
                       step.type === 'tool_call' ? `Tool: ${step.name}` :
                       step.type === 'tool_result' ? 'Tool Result' :
                       step.type === 'thinking' ? 'Thinking' :
                       step.type === 'planning' ? 'Planning' : 'Step'}
                    </span>
                    {step.status && (
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        step.status === 'completed' ? 'bg-green-100 text-green-700' :
                        step.status === 'failed' ? 'bg-red-100 text-red-700' :
                        step.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {step.status}
                      </span>
                    )}
                  </div>
                  
                  {step.content && (
                    <div className="text-sm text-gray-700">
                      <MarkdownRenderer content={step.content} />
                    </div>
                  )}

                  {step.type === 'tool_call' && step.args && Object.keys(step.args).length > 0 && (
                    <div className="mt-2 p-2 bg-white/50 rounded border">
                      <div className="text-xs font-mono text-gray-600">
                        Args: {JSON.stringify(step.args, null, 2)}
                      </div>
                    </div>
                  )}

                  {step.type === 'tool_result' && step.result && (
                    <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                      <div className="text-xs text-green-700">
                        Result: {step.result}
                      </div>
                    </div>
                  )}

                  {step.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                      <div className="text-xs text-red-700">
                        Error: {step.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          {steps.length} steps • {
            steps.filter(s => s.status === 'completed').length
          } completed
        </span>
        {steps.some(s => s.status === 'in-progress') && (
          <span className="text-blue-600">Processing...</span>
        )}
      </div>
    </div>
  )
}

export default StreamingToolCall
