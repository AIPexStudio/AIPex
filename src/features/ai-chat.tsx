import React from "react"

const AIChatSidebar = () => {
  return (
    <div className="w-[350px] h-full bg-white text-black p-4 flex flex-col">
      <h2 className="text-xl font-bold mb-4">AI Chat</h2>
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {/* 聊天内容区域 */}
        <div className="flex-1 text-gray-700">这里是AI对话内容...</div>
      </div>
      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-2 py-1"
          placeholder="输入你的问题..."
        />
        <button className="bg-blue-600 text-white px-4 py-1 rounded">发送</button>
      </div>
    </div>
  )
}

export default AIChatSidebar 