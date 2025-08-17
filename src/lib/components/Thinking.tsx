import React from "react"

interface ThinkingProps {
  isThinking: boolean
  children?: React.ReactNode
}

const Thinking: React.FC<ThinkingProps> = ({ isThinking, children }) => {
  if (!isThinking) return null

  return (
    <div className="flex items-center space-x-3 text-gray-600 text-sm bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex space-x-1">
        <div 
          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" 
          style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
        />
        <div 
          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" 
          style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
        />
        <div 
          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" 
          style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
        />
      </div>
      <span className="font-medium">{children || "AI is thinking..."}</span>
    </div>
  )
}

export default Thinking
