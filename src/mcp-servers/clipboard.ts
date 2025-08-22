/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<{ success: boolean; error?: string }> {
  try {
    await navigator.clipboard.writeText(text)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Read text from clipboard
 */
export async function readFromClipboard(): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const text = await navigator.clipboard.readText()
    return { success: true, text }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Copy current page URL to clipboard
 */
export async function copyCurrentPageUrl(): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url) {
      return { success: false, error: "No active tab found" }
    }
    
    await navigator.clipboard.writeText(tab.url)
    return { success: true, url: tab.url }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Copy current page title to clipboard
 */
export async function copyCurrentPageTitle(): Promise<{ success: boolean; title?: string; error?: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.title) {
      return { success: false, error: "No active tab found" }
    }
    
    await navigator.clipboard.writeText(tab.title)
    return { success: true, title: tab.title }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Copy selected text from current page
 */
export async function copySelectedText(): Promise<{ success: boolean; text?: string; error?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") {
    return { success: false, error: "No active tab found" }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection()
        return selection ? selection.toString() : ""
      }
    })

    const [{ result }] = results
    const selectedText = result || ""
    
    if (!selectedText.trim()) {
      return { success: false, error: "No text selected" }
    }

    await navigator.clipboard.writeText(selectedText)
    return { success: true, text: selectedText }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Copy page content as markdown
 */
export async function copyPageAsMarkdown(): Promise<{ success: boolean; markdown?: string; error?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") {
    return { success: false, error: "No active tab found" }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title || ""
        const url = location.href
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || ""
        
        let markdown = `# ${title}\n\n`
        if (description) {
          markdown += `${description}\n\n`
        }
        markdown += `Source: [${url}](${url})\n\n`
        
        // Get main content
        const mainContent = document.querySelector('main, article, .content, .post, .entry') || document.body
        
        // Convert headings
        const headings = mainContent.querySelectorAll('h1, h2, h3, h4, h5, h6')
        headings.forEach(heading => {
          const level = parseInt(heading.tagName.charAt(1))
          const text = heading.textContent?.trim() || ""
          if (text) {
            markdown += `${'#'.repeat(level)} ${text}\n\n`
          }
        })
        
        // Get paragraphs
        const paragraphs = mainContent.querySelectorAll('p')
        paragraphs.forEach(p => {
          const text = p.textContent?.trim() || ""
          if (text && text.length > 50) { // Only include substantial paragraphs
            markdown += `${text}\n\n`
          }
        })
        
        return markdown.trim()
      }
    })

    const [{ result }] = results
    const markdown = result || ""
    
    if (!markdown.trim()) {
      return { success: false, error: "Could not extract content" }
    }

    await navigator.clipboard.writeText(markdown)
    return { success: true, markdown }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Copy page content as plain text
 */
export async function copyPageAsText(): Promise<{ success: boolean; text?: string; error?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") {
    return { success: false, error: "No active tab found" }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title || ""
        const url = location.href
        
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, nav, header, footer, aside')
        scripts.forEach(el => el.remove())

        // Get main content
        const mainContent = document.querySelector('main, article, .content, .post, .entry') || document.body
        const text = mainContent.innerText || mainContent.textContent || ""
        
        // Clean up text
        const cleanedText = text
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, '\n')
          .trim()
        
        return `${title}\n\n${cleanedText}\n\nSource: ${url}`
      }
    })

    const [{ result }] = results
    const text = result || ""
    
    if (!text.trim()) {
      return { success: false, error: "Could not extract content" }
    }

    await navigator.clipboard.writeText(text)
    return { success: true, text }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Copy all links from current page
 */
export async function copyPageLinks(): Promise<{ success: boolean; links?: string; error?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") {
    return { success: false, error: "No active tab found" }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(link => {
            const text = link.textContent?.trim() || ""
            const href = (link as HTMLAnchorElement).href
            return text && href && !href.startsWith('javascript:') ? `${text}: ${href}` : null
          })
          .filter(Boolean)
          .join('\n')
        
        return links
      }
    })

    const [{ result }] = results
    const links = result || ""
    
    if (!links.trim()) {
      return { success: false, error: "No links found" }
    }

    await navigator.clipboard.writeText(links)
    return { success: true, links }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Copy page metadata
 */
export async function copyPageMetadata(): Promise<{ success: boolean; metadata?: string; error?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") {
    return { success: false, error: "No active tab found" }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getMetaContent = (name: string, property?: string) => {
          const selector = property 
            ? `meta[property="${property}"]` 
            : `meta[name="${name}"]`
          const element = document.querySelector(selector) as HTMLMetaElement
          return element?.content || undefined
        }

        const title = document.title || ""
        const url = location.href
        const description = getMetaContent("description") || getMetaContent("og:description", "og:description")
        const keywords = getMetaContent("keywords")
        const author = getMetaContent("author") || getMetaContent("og:author", "og:author")
        const ogImage = getMetaContent("og:image", "og:image")
        
        let metadata = `Title: ${title}\nURL: ${url}\n`
        if (description) metadata += `Description: ${description}\n`
        if (keywords) metadata += `Keywords: ${keywords}\n`
        if (author) metadata += `Author: ${author}\n`
        if (ogImage) metadata += `Image: ${ogImage}\n`
        
        return metadata.trim()
      }
    })

    const [{ result }] = results
    const metadata = result || ""
    
    if (!metadata.trim()) {
      return { success: false, error: "Could not extract metadata" }
    }

    await navigator.clipboard.writeText(metadata)
    return { success: true, metadata }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}
