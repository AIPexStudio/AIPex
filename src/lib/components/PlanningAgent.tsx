import React, { useState } from "react"
import { MarkdownRenderer } from "./index"
import { useTranslation } from "~/lib/i18n/hooks"

export interface PlanningStep {
  type: 'analysis' | 'plan' | 'think' | 'act' | 'observe' | 'reason' | 'complete' | 'retry' | 'error'
  content: string
  timestamp: number
  status?: 'pending' | 'in-progress' | 'completed' | 'failed' | 'retrying'
  toolCall?: {
    name: string
    args: any
    result?: any
    error?: string
  }
  error?: {
    type: string
    message: string
    recovery: string
  }
  retry?: {
    attempt: number
    maxAttempts: number
    backoff: number
  }
}

export interface PlanningAgentProps {
  steps: PlanningStep[]
  isActive: boolean
  onStepComplete?: (stepIndex: number) => void
}

const PlanningAgent: React.FC<PlanningAgentProps> = ({ steps, isActive, onStepComplete }) => {
  const { t } = useTranslation()
  const getStepIcon = (type: PlanningStep['type']) => {
    switch (type) {
      case 'analysis':
        return '📋'
      case 'plan':
        return '📝'
      case 'think':
        return '🧠'
      case 'act':
        return '⚡'
      case 'observe':
        return '👁️'
      case 'reason':
        return '💭'
      case 'complete':
        return '✅'
      case 'retry':
        return '🔄'
      case 'error':
        return '❌'
      default:
        return '•'
    }
  }

  const getStepColor = (type: PlanningStep['type']) => {
    switch (type) {
      case 'analysis':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'plan':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'think':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'act':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'observe':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'reason':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'complete':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'retry':
        return 'text-cyan-600 bg-cyan-50 border-cyan-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStepTitle = (type: PlanningStep['type']) => {
    switch (type) {
      case 'analysis':
        return 'Task Analysis'
      case 'plan':
        return 'Execution Plan'
      case 'think':
        return 'Thinking'
      case 'act':
        return 'Action'
      case 'observe':
        return 'Observation'
      case 'reason':
        return 'Reasoning'
      case 'complete':
        return 'Completed'
      case 'retry':
        return 'Retry'
      case 'error':
        return 'Error'
      default:
        return 'Step'
    }
  }

  if (!isActive || steps.length === 0) {
    return null
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
          <span className="text-blue-600 text-lg">🤖</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t("ai.planningAgent")}</h3>
          <p className="text-xs text-gray-600">{t("ai.enhancedPlanning")}</p>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border transition-all duration-200 ${getStepColor(step.type)} ${
              step.status === 'in-progress' ? 'ring-2 ring-blue-300' : ''
            }`}
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
                    {getStepTitle(step.type)}
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
                
                <div className="text-sm text-gray-700">
                  <MarkdownRenderer content={step.content} />
                </div>

                {step.toolCall && (
                  <div className="mt-2 p-2 bg-white/50 rounded border">
                    <div className="text-xs font-mono text-gray-600 mb-1">
                      Tool: {step.toolCall.name}
                    </div>
                    {step.toolCall.args && Object.keys(step.toolCall.args).length > 0 && (
                      <div className="text-xs text-gray-500 mb-1">
                        Args: {JSON.stringify(step.toolCall.args, null, 2)}
                      </div>
                    )}
                    {step.toolCall.result && (
                      <div className="text-xs text-green-600">
                        Result: {typeof step.toolCall.result === 'string' 
                          ? step.toolCall.result.slice(0, 200) + (step.toolCall.result.length > 200 ? '...' : '')
                          : JSON.stringify(step.toolCall.result, null, 2).slice(0, 200) + '...'
                        }
                      </div>
                    )}
                    {step.toolCall.error && (
                      <div className="text-xs text-red-600">
                        Error: {step.toolCall.error}
                      </div>
                    )}
                  </div>
                )}

                {step.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="text-xs font-semibold text-red-700 mb-1">
                      Error: {step.error.type}
                    </div>
                    <div className="text-xs text-red-600 mb-1">
                      {step.error.message}
                    </div>
                    <div className="text-xs text-red-500">
                      Recovery: {step.error.recovery}
                    </div>
                  </div>
                )}

                {step.retry && (
                  <div className="mt-2 p-2 bg-cyan-50 rounded border border-cyan-200">
                    <div className="text-xs font-semibold text-cyan-700 mb-1">
                      Retry Attempt {step.retry.attempt}/{step.retry.maxAttempts}
                    </div>
                    <div className="text-xs text-cyan-600">
                      Backoff: {step.retry.backoff}ms
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {steps.some(step => step.status === 'in-progress') && (
        <div className="mt-3 p-2 bg-blue-100 rounded-lg">
          <div className="flex items-center text-sm text-blue-700">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
            Planning in progress...
          </div>
        </div>
      )}

      {steps.every(step => step.status === 'completed') && (
        <div className="mt-3 p-2 bg-green-100 rounded-lg">
          <div className="flex items-center text-sm text-green-700">
            <span className="mr-2">✅</span>
            Planning completed successfully
          </div>
        </div>
      )}
    </div>
  )
}

export default PlanningAgent
