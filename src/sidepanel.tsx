import React from "react"
import AIChatSidebar from "~features/ai-chat"
import cssText from "data-text:~style.css"

// Inject Tailwind only into the sidepanel document (does not affect host pages)
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16
  let updatedCssText = cssText
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })
  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText
  return styleElement
}

const PlasmoSidepanel = () => <AIChatSidebar />

export default PlasmoSidepanel 