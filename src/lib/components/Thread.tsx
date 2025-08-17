import React from "react"
import { Bubble } from "@ant-design/x"

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  streaming?: boolean
}

interface ThreadProps {
  messages: Message[]
  children?: (message: Message) => React.ReactNode
}

const Thread: React.FC<ThreadProps> = ({ messages, children }) => {
  const items = messages.map(msg => ({
    key: msg.id,
    content: children ? children(msg) : (
      <div className="text-gray-800">{msg.content}</div>
    ),
    role: msg.role,
    placement: (msg.role === 'user' ? 'end' : 'start') as 'end' | 'start'
  }))

  return <Bubble.List items={items} />
}

export default Thread
export type { Message }
