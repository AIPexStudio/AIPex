import React, { useState, useEffect } from "react"
import AIChatSidebar from "~features/ai-chat"
import "~style.css"
import iconUrl from "url:~/assets/icon.png"

const NewTabPage = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time as HH:MM
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Format date as Day of Week, Month Day
  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col">
      {/* Header with time and date */}
      <div className="w-full p-6 flex flex-col items-center">
        <div className="flex items-center mb-4">
          <img src={iconUrl} alt="AIpex" className="w-8 h-8 mr-2" />
          <h1 className="text-2xl font-bold text-gray-800">AIpex</h1>
        </div>
        <div className="text-4xl font-bold text-gray-800">{formattedTime}</div>
        <div className="text-lg text-gray-600">{formattedDate}</div>
      </div>
      
      {/* Main content with AI chat */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg h-[calc(100vh-180px)] overflow-hidden">
          <AIChatSidebar />
        </div>
      </div>
      
      {/* Footer */}
      <div className="w-full p-4 text-center text-sm text-gray-500">
        AIpex - Your AI Assistant
      </div>
    </div>
  )
}

export default NewTabPage 