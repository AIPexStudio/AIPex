/**
 * Get page metadata and content
 */
export async function getPageMetadata(): Promise<{
  title: string
  url: string
  description?: string
  keywords?: string
  author?: string
  ogImage?: string
  favicon?: string
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

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

      return {
        title: document.title || "",
        url: location.href,
        description: getMetaContent("description") || getMetaContent("og:description", "og:description"),
        keywords: getMetaContent("keywords"),
        author: getMetaContent("author") || getMetaContent("og:author", "og:author"),
        ogImage: getMetaContent("og:image", "og:image"),
        favicon: (document.querySelector('link[rel="icon"]') as HTMLLinkElement)?.href || 
                (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement)?.href
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Extract text content from the current page
 */
export async function extractPageText(): Promise<{
  title: string
  url: string
  text: string
  wordCount: number
  readingTime: number
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style, nav, header, footer, aside')
      scripts.forEach(el => el.remove())

      // Get main content areas
      const mainContent = document.querySelector('main, article, .content, .post, .entry') || document.body
      const text = mainContent.innerText || mainContent.textContent || ""
      
      // Clean up text
      const cleanedText = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
      
      const wordCount = cleanedText.split(/\s+/).length
      const readingTime = Math.ceil(wordCount / 200) // Average reading speed

      return {
        title: document.title || "",
        url: location.href,
        text: cleanedText,
        wordCount,
        readingTime
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Get all links from the current page
 */
export async function getPageLinks(): Promise<{
  title: string
  url: string
  links: Array<{ text: string; href: string; title?: string }>
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(link => ({
          text: link.textContent?.trim() || "",
          href: (link as HTMLAnchorElement).href,
          title: (link as HTMLAnchorElement).title || undefined
        }))
        .filter(link => link.text && link.href && !link.href.startsWith('javascript:'))

      return {
        title: document.title || "",
        url: location.href,
        links
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Get all images from the current page
 */
export async function getPageImages(): Promise<{
  title: string
  url: string
  images: Array<{ src: string; alt: string; title?: string; width?: number; height?: number }>
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const images = Array.from(document.querySelectorAll('img[src]'))
        .map(img => ({
          src: (img as HTMLImageElement).src,
          alt: (img as HTMLImageElement).alt || "",
          title: (img as HTMLImageElement).title || undefined,
          width: (img as HTMLImageElement).width || undefined,
          height: (img as HTMLImageElement).height || undefined
        }))
        .filter(img => img.src && !img.src.startsWith('data:'))

      return {
        title: document.title || "",
        url: location.href,
        images
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Search for text on the current page
 */
export async function searchPageText(query: string): Promise<{
  title: string
  url: string
  matches: Array<{ text: string; context: string; index: number }>
  totalMatches: number
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [query],
    func: (searchQuery: string) => {
      const text = document.body.innerText || document.body.textContent || ""
      const matches: Array<{ text: string; context: string; index: number }> = []
      
      if (!searchQuery || !text) {
        return { title: document.title || "", url: location.href, matches, totalMatches: 0 }
      }

      const regex = new RegExp(searchQuery, 'gi')
      let match
      let count = 0
      
      while ((match = regex.exec(text)) !== null && count < 50) {
        const start = Math.max(0, match.index - 50)
        const end = Math.min(text.length, match.index + match[0].length + 50)
        const context = text.substring(start, end)
        
        matches.push({
          text: match[0],
          context: context.replace(/\n/g, ' ').trim(),
          index: match.index
        })
        count++
      }

      return {
        title: document.title || "",
        url: location.href,
        matches,
        totalMatches: matches.length
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Get page performance metrics
 */
export async function getPagePerformance(): Promise<{
  title: string
  url: string
  loadTime?: number
  domContentLoaded?: number
  firstPaint?: number
  firstContentfulPaint?: number
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        title: document.title || "",
        url: location.href,
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : undefined,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : undefined,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Get page accessibility information
 */
export async function getPageAccessibility(): Promise<{
  title: string
  url: string
  headings: Array<{ level: number; text: string; id?: string }>
  landmarks: Array<{ role: string; text: string }>
  formControls: number
  images: { total: number; withAlt: number; withoutAlt: number }
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Get headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(heading => ({
          level: parseInt(heading.tagName.charAt(1)),
          text: heading.textContent?.trim() || "",
          id: heading.id || undefined
        }))

      // Get landmarks
      const landmarks = Array.from(document.querySelectorAll('[role], main, nav, header, footer, aside'))
        .map(landmark => ({
          role: landmark.getAttribute('role') || landmark.tagName.toLowerCase(),
          text: landmark.textContent?.trim().substring(0, 100) || ""
        }))

      // Get form controls
      const formControls = document.querySelectorAll('input, select, textarea, button').length

      // Get images
      const images = document.querySelectorAll('img')
      const imagesWithAlt = Array.from(images).filter(img => img.alt && img.alt.trim()).length

      return {
        title: document.title || "",
        url: location.href,
        headings,
        landmarks,
        formControls,
        images: {
          total: images.length,
          withAlt: imagesWithAlt,
          withoutAlt: images.length - imagesWithAlt
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}
