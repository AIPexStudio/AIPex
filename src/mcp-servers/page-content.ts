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
      // Use a completely read-only approach to avoid any DOM modification
      const getTextContent = (element: Element): string => {
        let text = ''
        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || ''
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element
            // Skip script, style, nav, header, footer, aside elements
            if (['SCRIPT', 'STYLE', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(el.tagName)) {
              continue
            }
            text += getTextContent(el)
          }
        }
        return text
      }

      // Get main content areas without modifying DOM
      const mainContent = document.querySelector('main, article, .content, .post, .entry') || document.body
      const text = getTextContent(mainContent)
      
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

/**
 * Get interactive elements from the current page
 */
export async function getInteractiveElements(): Promise<{
  title: string
  url: string
  elements: Array<{
    type: string
    text: string
    selector: string
    href?: string
    value?: string
    placeholder?: string
    isVisible: boolean
    isClickable: boolean
  }>
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const getSelector = (element: Element): string => {
        if (element.id) return `#${element.id}`
        if (element.className) {
          const classes = element.className.split(' ').filter(c => c.trim())
          if (classes.length > 0) return `.${classes.join('.')}`
        }
        return element.tagName.toLowerCase()
      }

      const isVisible = (element: Element): boolean => {
        const style = window.getComputedStyle(element)
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               (element as HTMLElement).offsetWidth > 0 && 
               (element as HTMLElement).offsetHeight > 0
      }

      const isClickable = (element: Element): boolean => {
        const tag = element.tagName.toLowerCase()
        return ['a', 'button', 'input', 'select', 'textarea'].includes(tag) ||
               (element as HTMLElement).onclick !== null ||
               element.getAttribute('role') === 'button' ||
               element.getAttribute('tabindex') !== null
      }

      const interactiveElements: Array<{
        type: string
        text: string
        selector: string
        href?: string
        value?: string
        placeholder?: string
        isVisible: boolean
        isClickable: boolean
      }> = []

      // Get all interactive elements
      const elements = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [onclick], [tabindex]')
      
      elements.forEach((element, index) => {
        const tag = element.tagName.toLowerCase()
        const text = element.textContent?.trim() || 
                    (element as HTMLInputElement).placeholder ||
                    (element as HTMLInputElement).value ||
                    element.getAttribute('aria-label') ||
                    element.getAttribute('title') ||
                    ''
        
        if (text && isVisible(element)) {
          interactiveElements.push({
            type: tag,
            text: text.substring(0, 100), // Limit text length
            selector: getSelector(element),
            href: (element as HTMLAnchorElement).href,
            value: (element as HTMLInputElement).value,
            placeholder: (element as HTMLInputElement).placeholder,
            isVisible: isVisible(element),
            isClickable: isClickable(element)
          })
        }
      })

      return {
        title: document.title || "",
        url: location.href,
        elements: interactiveElements.slice(0, 50) // Limit to 50 elements
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Click an element on the current page
 */
export async function clickElement(selector: string): Promise<{
  success: boolean
  message: string
  title: string
  url: string
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [selector],
    func: (selector: string) => {
      try {
        const element = document.querySelector(selector)
        if (!element) {
          return {
            success: false,
            message: `Element with selector "${selector}" not found`,
            title: document.title || "",
            url: location.href
          }
        }

        // Check if element is visible and clickable
        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden') {
          return {
            success: false,
            message: `Element with selector "${selector}" is not visible`,
            title: document.title || "",
            url: location.href
          }
        }

        // Click the element
        (element as HTMLElement).click()
        
        return {
          success: true,
          message: `Successfully clicked element with selector "${selector}"`,
          title: document.title || "",
          url: location.href
        }
      } catch (error) {
        return {
          success: false,
          message: `Error clicking element: ${error}`,
          title: document.title || "",
          url: location.href
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Summarize the current page content
 */
export async function summarizePage(): Promise<{
  title: string
  url: string
  summary: string
  keyPoints: string[]
  wordCount: number
  readingTime: number
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Use a completely read-only approach to avoid any DOM modification
      const getTextContent = (element: Element): string => {
        let text = ''
        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || ''
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element
            // Skip script, style, nav, header, footer, aside elements
            if (['SCRIPT', 'STYLE', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'].includes(el.tagName)) {
              continue
            }
            text += getTextContent(el)
          }
        }
        return text
      }

      // Get main content areas without modifying DOM
      const mainContent = document.querySelector('main, article, .content, .post, .entry') || document.body
      const text = getTextContent(mainContent)
      
      // Clean up text
      const cleanedText = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
      
      const wordCount = cleanedText.split(/\s+/).length
      const readingTime = Math.ceil(wordCount / 200) // Average reading speed

      // Extract key points (headings and important text) - read-only approach
      const getHeadings = (element: Element): string[] => {
        const headings: string[] = []
        const headingElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
        for (const h of headingElements) {
          const text = h.textContent?.trim()
          if (text && text.length > 0) {
            headings.push(text)
          }
        }
        return headings.slice(0, 10)
      }

      // Extract important content (first few paragraphs) - read-only approach
      const getParagraphs = (element: Element): string[] => {
        const paragraphs: string[] = []
        const paragraphElements = element.querySelectorAll('p')
        for (const p of paragraphElements) {
          const text = p.textContent?.trim()
          if (text && text.length > 50) {
            paragraphs.push(text)
          }
        }
        return paragraphs.slice(0, 5)
      }

      const headings = getHeadings(mainContent)
      const paragraphs = getParagraphs(mainContent)

      const keyPoints = [...headings, ...paragraphs].slice(0, 8)

      // Create a simple summary
      const summary = cleanedText.length > 500 
        ? cleanedText.substring(0, 500) + "..."
        : cleanedText

      return {
        title: document.title || "",
        url: location.href,
        summary,
        keyPoints,
        wordCount,
        readingTime
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Fill an input field with text
 */
export async function fillInput(selector: string, text: string): Promise<{
  success: boolean
  message: string
  title: string
  url: string
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [selector, text],
    func: (selector: string, text: string) => {
      try {
        const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement
        if (!element) {
          return {
            success: false,
            message: `Input element with selector "${selector}" not found`,
            title: document.title || "",
            url: location.href
          }
        }

        // Check if element is an input or textarea
        if (element.tagName.toLowerCase() !== 'input' && element.tagName.toLowerCase() !== 'textarea') {
          return {
            success: false,
            message: `Element with selector "${selector}" is not an input field`,
            title: document.title || "",
            url: location.href
          }
        }

        // Check if element is visible
        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden') {
          return {
            success: false,
            message: `Input element with selector "${selector}" is not visible`,
            title: document.title || "",
            url: location.href
          }
        }

        // Focus and fill the input
        element.focus()
        element.value = text
        
        // Trigger input and change events to simulate user input
        element.dispatchEvent(new Event('input', { bubbles: true }))
        element.dispatchEvent(new Event('change', { bubbles: true }))
        
        return {
          success: true,
          message: `Successfully filled input "${selector}" with text: "${text}"`,
          title: document.title || "",
          url: location.href
        }
      } catch (error) {
        return {
          success: false,
          message: `Error filling input: ${error}`,
          title: document.title || "",
          url: location.href
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Clear an input field
 */
export async function clearInput(selector: string): Promise<{
  success: boolean
  message: string
  title: string
  url: string
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [selector],
    func: (selector: string) => {
      try {
        const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement
        if (!element) {
          return {
            success: false,
            message: `Input element with selector "${selector}" not found`,
            title: document.title || "",
            url: location.href
          }
        }

        // Check if element is an input or textarea
        if (element.tagName.toLowerCase() !== 'input' && element.tagName.toLowerCase() !== 'textarea') {
          return {
            success: false,
            message: `Element with selector "${selector}" is not an input field`,
            title: document.title || "",
            url: location.href
          }
        }

        // Focus and clear the input
        element.focus()
        element.value = ''
        
        // Trigger input and change events
        element.dispatchEvent(new Event('input', { bubbles: true }))
        element.dispatchEvent(new Event('change', { bubbles: true }))
        
        return {
          success: true,
          message: `Successfully cleared input "${selector}"`,
          title: document.title || "",
          url: location.href
        }
      } catch (error) {
        return {
          success: false,
          message: `Error clearing input: ${error}`,
          title: document.title || "",
          url: location.href
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Get the value of an input field
 */
export async function getInputValue(selector: string): Promise<{
  success: boolean
  value?: string
  message: string
  title: string
  url: string
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [selector],
    func: (selector: string) => {
      try {
        const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement
        if (!element) {
          return {
            success: false,
            message: `Input element with selector "${selector}" not found`,
            title: document.title || "",
            url: location.href
          }
        }

        // Check if element is an input or textarea
        if (element.tagName.toLowerCase() !== 'input' && element.tagName.toLowerCase() !== 'textarea') {
          return {
            success: false,
            message: `Element with selector "${selector}" is not an input field`,
            title: document.title || "",
            url: location.href
          }
        }

        return {
          success: true,
          value: element.value,
          message: `Successfully retrieved value from input "${selector}"`,
          title: document.title || "",
          url: location.href
        }
      } catch (error) {
        return {
          success: false,
          message: `Error getting input value: ${error}`,
          title: document.title || "",
          url: location.href
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Submit a form
 */
export async function submitForm(selector: string): Promise<{
  success: boolean
  message: string
  title: string
  url: string
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [selector],
    func: (selector: string) => {
      try {
        const form = document.querySelector(selector) as HTMLFormElement
        if (!form) {
          return {
            success: false,
            message: `Form with selector "${selector}" not found`,
            title: document.title || "",
            url: location.href
          }
        }

        // Check if element is a form
        if (form.tagName.toLowerCase() !== 'form') {
          return {
            success: false,
            message: `Element with selector "${selector}" is not a form`,
            title: document.title || "",
            url: location.href
          }
        }

        // Submit the form
        form.submit()
        
        return {
          success: true,
          message: `Successfully submitted form "${selector}"`,
          title: document.title || "",
          url: location.href
        }
      } catch (error) {
        return {
          success: false,
          message: `Error submitting form: ${error}`,
          title: document.title || "",
          url: location.href
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Get all form elements on the current page
 */
export async function getFormElements(): Promise<{
  title: string
  url: string
  forms: Array<{
    selector: string
    action: string
    method: string
    inputs: Array<{
      type: string
      name: string
      id: string
      placeholder: string
      value: string
      required: boolean
      selector: string
    }>
  }>
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try {
        const forms = Array.from(document.querySelectorAll('form'))
        
        const formData = forms.map((form, formIndex) => {
          const inputs = Array.from(form.querySelectorAll('input, textarea, select'))
          
          const inputData = inputs.map((input, inputIndex) => {
                         const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
             return {
               type: element.type || element.tagName.toLowerCase(),
               name: element.name || '',
               id: element.id || '',
               placeholder: (element as HTMLInputElement | HTMLTextAreaElement).placeholder || '',
               value: element.value || '',
               required: element.required || false,
               selector: `form:nth-of-type(${formIndex + 1}) ${element.tagName.toLowerCase()}:nth-of-type(${inputIndex + 1})`
             }
          })

          return {
            selector: `form:nth-of-type(${formIndex + 1})`,
            action: form.action || '',
            method: form.method || 'get',
            inputs: inputData
          }
        })

        return {
          title: document.title || "",
          url: location.href,
          forms: formData
        }
      } catch (error) {
        return {
          title: document.title || "",
          url: location.href,
          forms: []
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Scroll to a DOM element and center it in the viewport
 */
export async function scrollToElement(selector: string): Promise<{
  success: boolean
  message: string
  title: string
  url: string
  elementInfo?: {
    tagName: string
    text: string
    position: { x: number; y: number }
  }
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [selector],
    func: (selector: string) => {
      try {
        const element = document.querySelector(selector) as HTMLElement
        if (!element) {
          return {
            success: false,
            message: `Element with selector "${selector}" not found`,
            title: document.title || "",
            url: location.href
          }
        }

        // Get element position and size
        const rect = element.getBoundingClientRect()
        const elementCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        }

        // Calculate scroll position to center the element
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        
        const scrollX = window.scrollX + elementCenter.x - viewportWidth / 2
        const scrollY = window.scrollY + elementCenter.y - viewportHeight / 2

        // Smooth scroll to the calculated position
        window.scrollTo({
          left: Math.max(0, scrollX),
          top: Math.max(0, scrollY),
          behavior: 'smooth'
        })

        // Get element info
        const elementInfo = {
          tagName: element.tagName.toLowerCase(),
          text: element.textContent?.trim()?.substring(0, 100) || '',
          position: { 
            x: rect.left + window.scrollX, 
            y: rect.top + window.scrollY 
          }
        }

        return {
          success: true,
          message: `Successfully scrolled to and centered element "${selector}"`,
          title: document.title || "",
          url: location.href,
          elementInfo
        }
      } catch (error) {
        return {
          success: false,
          message: `Error scrolling to element: ${error}`,
          title: document.title || "",
          url: location.href
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Highlight a DOM element with visual emphasis
 */
export async function highlightElement(selector: string, options?: {
  color?: string
  duration?: number
  style?: 'glow' | 'pulse' | 'shine' | 'bounce' | 'outline' | 'background' | 'border' | 'shadow' | 'gradient' | 'neon' | 'overlay' | 'cursor' | 'spotlight' | 'frame' | 'pointer'
  intensity?: 'subtle' | 'normal' | 'strong'
  animation?: boolean
  persist?: boolean
  customCSS?: string
}): Promise<{
  success: boolean
  message: string
  title: string
  url: string
  elementInfo?: {
    tagName: string
    text: string
    position: { x: number; y: number }
    size: { width: number; height: number }
  }
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [selector, options || {}],
    func: (selector: string, options: {
      color?: string
      duration?: number
      style?: 'glow' | 'pulse' | 'shine' | 'bounce' | 'outline' | 'background' | 'border' | 'shadow' | 'gradient' | 'neon' | 'overlay' | 'cursor' | 'spotlight' | 'frame' | 'pointer'
      intensity?: 'subtle' | 'normal' | 'strong'
      animation?: boolean
      persist?: boolean
      customCSS?: string
    }) => {
      try {
        const element = document.querySelector(selector) as HTMLElement
        if (!element) {
          return {
            success: false,
            message: `Element with selector "${selector}" not found`,
            title: document.title || "",
            url: location.href
          }
        }

        // Default options - changed to permanent highlighting by default
        const highlightDuration = options.duration || 0
        const highlightStyle = options.style || 'glow'
        const intensity = options.intensity || 'normal'
        const enableAnimation = options.animation !== false
        const persistHighlight = options.persist !== false // changed to default true
        const customCSS = options.customCSS || ''

        // Helper function to convert hex to rgb
        const hexToRgb = (hex: string): {r: number, g: number, b: number} | null => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null
        }

        // Convert RGB to hex
        const rgbToHex = (r: number, g: number, b: number): string => {
          return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16)
            return hex.length === 1 ? '0' + hex : hex
          }).join('')
        }

        // Parse CSS color string to RGB
        const parseColor = (colorStr: string): {r: number, g: number, b: number} | null => {
          if (!colorStr || colorStr === 'transparent') return null
          
          // Handle hex colors
          if (colorStr.startsWith('#')) {
            return hexToRgb(colorStr)
          }
          
          // Handle rgb/rgba colors
          const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
          if (rgbMatch) {
            return {
              r: parseInt(rgbMatch[1]),
              g: parseInt(rgbMatch[2]), 
              b: parseInt(rgbMatch[3])
            }
          }
          
          return null
        }

        // Calculate relative luminance of a color
        const getLuminance = (r: number, g: number, b: number): number => {
          const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
          })
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
        }

        // Calculate contrast ratio between two colors
        const getContrastRatio = (color1: {r: number, g: number, b: number}, color2: {r: number, g: number, b: number}): number => {
          const lum1 = getLuminance(color1.r, color1.g, color1.b)
          const lum2 = getLuminance(color2.r, color2.g, color2.b)
          const brightest = Math.max(lum1, lum2)
          const darkest = Math.min(lum1, lum2)
          return (brightest + 0.05) / (darkest + 0.05)
        }

        // Get the dominant colors of an element
        const getElementColors = (el: HTMLElement): {background: {r: number, g: number, b: number} | null, text: {r: number, g: number, b: number} | null} => {
          const computedStyle = window.getComputedStyle(el)
          
          // Get background color, walk up the DOM tree if transparent
          let bgColor = null
          let currentEl = el
          while (currentEl && currentEl !== document.body && !bgColor) {
            const bg = window.getComputedStyle(currentEl).backgroundColor
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              bgColor = parseColor(bg)
              break
            }
            currentEl = currentEl.parentElement as HTMLElement
          }
          
          // Default to white background if none found
          if (!bgColor) {
            bgColor = {r: 255, g: 255, b: 255}
          }
          
          // Get text color
          let textColor = parseColor(computedStyle.color)
          if (!textColor) {
            textColor = {r: 0, g: 0, b: 0} // Default to black text
          }
          
          return {background: bgColor, text: textColor}
        }

        // Generate high contrast color candidates
        const getHighContrastColors = (baseColor: {r: number, g: number, b: number}): string[] => {
          const candidates = [
            '#FF0000', // Bright Red
            '#00FF00', // Bright Green  
            '#0000FF', // Bright Blue
            '#FFFF00', // Bright Yellow
            '#FF00FF', // Bright Magenta
            '#00FFFF', // Bright Cyan
            '#FF4500', // Orange Red
            '#8A2BE2', // Blue Violet
            '#32CD32', // Lime Green
            '#FF1493', // Deep Pink
            '#FF6347', // Tomato
            '#4169E1', // Royal Blue
            '#FFD700', // Gold
            '#DC143C', // Crimson
            '#00CED1', // Dark Turquoise
            '#FF8C00', // Dark Orange
            '#9932CC', // Dark Orchid
            '#228B22', // Forest Green
            '#FF69B4', // Hot Pink
            '#1E90FF', // Dodger Blue
            '#FFFFFF', // White
            '#000000', // Black
          ]
          
          return candidates.map(hex => {
            const rgb = hexToRgb(hex)!
            const contrast = getContrastRatio(baseColor, rgb)
            return { color: hex, contrast }
          })
          .filter(item => item.contrast >= 3.0) // Only include colors with good contrast
          .sort((a, b) => b.contrast - a.contrast) // Sort by highest contrast first
          .map(item => item.color)
        }

        // Auto-select the best highlight color
        const getOptimalHighlightColor = (element: HTMLElement): string => {
          const colors = getElementColors(element)
          const baseColor = colors.background || {r: 255, g: 255, b: 255}
          
          const candidates = getHighContrastColors(baseColor)
          
          if (candidates.length === 0) {
            // Fallback if no good contrast found
            return '#FF0000'
          }
          
          // Prefer vibrant colors with very high contrast (>7.0 for AAA level)
          const highContrastCandidates = candidates.filter(color => {
            const rgb = hexToRgb(color)!
            return getContrastRatio(baseColor, rgb) >= 7.0
          })
          
          if (highContrastCandidates.length > 0) {
            // Among high contrast colors, avoid pure black/white unless necessary
            for (const candidate of highContrastCandidates) {
              if (candidate !== '#FFFFFF' && candidate !== '#000000') {
                return candidate
              }
            }
            return highContrastCandidates[0]
          }
          
          // Use the best available contrast (minimum 3.0)
          return candidates[0] || '#FF0000'
        }

        // Create or get top-level overlay container
        const getOverlayContainer = (): HTMLElement => {
          let container = document.getElementById('aipex-overlay-container')
          if (!container) {
            container = document.createElement('div')
            container.id = 'aipex-overlay-container'
            container.className = 'aipex-overlay-container'
            document.body.appendChild(container)
          }
          return container
        }

        // Create independent overlay element with position tracking
        const createOverlayElement = (
          elementRect: DOMRect,
          className: string,
          content: string = '',
          offsetX: number = 0,
          offsetY: number = 0,
          width?: number,
          height?: number
        ): HTMLElement => {
          const container = getOverlayContainer()
          const overlayEl = document.createElement('div')
          overlayEl.className = className
          overlayEl.setAttribute('data-highlight-id', highlightId)
          
          if (content) overlayEl.textContent = content

          // Calculate position relative to viewport
          const left = elementRect.left + offsetX
          const top = elementRect.top + offsetY
          
          overlayEl.style.left = left + 'px'
          overlayEl.style.top = top + 'px'
          
          if (width !== undefined) overlayEl.style.width = width + 'px'
          if (height !== undefined) overlayEl.style.height = height + 'px'
          
          container.appendChild(overlayEl)
          return overlayEl
        }

        // Update overlay positions on scroll/resize
        const updateOverlayPositions = () => {
          const currentRect = element.getBoundingClientRect()
          const overlays = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`)
          
          overlays.forEach((overlay) => {
            const overlayEl = overlay as HTMLElement
            const offsetX = parseFloat(overlayEl.dataset.offsetX || '0')
            const offsetY = parseFloat(overlayEl.dataset.offsetY || '0')
            overlayEl.style.left = (currentRect.left + offsetX) + 'px'
            overlayEl.style.top = (currentRect.top + offsetY) + 'px'
          })
        }

        // Store original styles to restore later
        const originalStyles: { [key: string]: string } = {}

        // Auto-select optimal color if none specified
        const autoColor = getOptimalHighlightColor(element)
        const highlightColor = options.color || autoColor // Use auto-detected color if none specified

        // Debug info for color selection
        const elementColors = getElementColors(element)
        console.log('AIPex Color Detection:', {
          element: element.tagName + (element.className ? '.' + element.className : ''),
          detectedBackground: elementColors.background,
          detectedText: elementColors.text,
          selectedHighlight: highlightColor,
          userSpecified: !!options.color
        })

        // Create unique highlight ID
        const highlightId = `aipex-highlight-${Date.now()}`
        element.setAttribute('data-highlight-id', highlightId)

        // Get element position for overlay calculations
        const elementRect = element.getBoundingClientRect()

        // Insert CSS styles if not already present
        if (!document.getElementById('aipex-highlight-styles')) {
          const styleSheet = document.createElement('style')
          styleSheet.id = 'aipex-highlight-styles'
          styleSheet.textContent = `
            .aipex-highlight-glow {
              position: relative;
              z-index: 9999;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .aipex-highlight-glow.subtle {
              box-shadow: 0 0 10px rgba(0, 212, 255, 0.4), 0 0 20px rgba(0, 212, 255, 0.2);
            }
            
            .aipex-highlight-glow.normal {
              box-shadow: 0 0 15px rgba(0, 212, 255, 0.6), 0 0 30px rgba(0, 212, 255, 0.4), 0 0 45px rgba(0, 212, 255, 0.2);
            }
            
            .aipex-highlight-glow.strong {
              box-shadow: 0 0 20px rgba(0, 212, 255, 0.8), 0 0 40px rgba(0, 212, 255, 0.6), 0 0 60px rgba(0, 212, 255, 0.4), 0 0 80px rgba(0, 212, 255, 0.2);
            }
            
            @keyframes aipex-pulse {
              0%, 100% { 
                transform: scale(1);
                box-shadow: 0 0 15px rgba(0, 212, 255, 0.6), 0 0 30px rgba(0, 212, 255, 0.4);
              }
              50% { 
                transform: scale(1.05);
                box-shadow: 0 0 25px rgba(0, 212, 255, 0.8), 0 0 50px rgba(0, 212, 255, 0.6);
              }
            }
            
            .aipex-highlight-pulse {
              animation: aipex-pulse 2s ease-in-out infinite;
              transition: all 0.3s ease;
            }
            
            @keyframes aipex-shine {
              0% { background-position: -100% 0; }
              100% { background-position: 100% 0; }
            }
            
            .aipex-highlight-shine {
              position: relative;
              overflow: hidden;
            }
            
            .aipex-highlight-shine::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
              animation: aipex-shine 2s ease-in-out infinite;
              z-index: 1;
            }
            
            @keyframes aipex-bounce {
              0%, 20%, 53%, 80%, 100% { transform: translate3d(0, 0, 0); }
              40%, 43% { transform: translate3d(0, -8px, 0); }
              70% { transform: translate3d(0, -4px, 0); }
              90% { transform: translate3d(0, -2px, 0); }
            }
            
            .aipex-highlight-bounce {
              animation: aipex-bounce 1.5s ease-in-out infinite;
            }
            
            .aipex-highlight-neon {
              color: #ffffff !important;
              text-shadow: 
                0 0 5px currentColor,
                0 0 10px currentColor,
                0 0 15px currentColor,
                0 0 20px #00d4ff,
                0 0 35px #00d4ff,
                0 0 40px #00d4ff;
              border: 2px solid #00d4ff;
              border-radius: 8px;
              background: rgba(0, 212, 255, 0.1);
            }
            
            .aipex-highlight-gradient {
              background: linear-gradient(45deg, #00d4ff, #ff00d4, #d4ff00, #00d4ff) !important;
              background-size: 400% 400% !important;
              animation: aipex-gradient 3s ease infinite;
              color: white !important;
              border-radius: 8px;
              padding: 4px 8px;
            }
            
            @keyframes aipex-gradient {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            
            .aipex-highlight-shadow {
              filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.8));
              transition: all 0.3s ease;
            }
            
            .aipex-highlight-outline {
              outline: 3px solid #00d4ff;
              outline-offset: 4px;
              border-radius: 6px;
              transition: all 0.3s ease;
            }
            
            .aipex-highlight-border {
              border: 3px solid #00d4ff !important;
              border-radius: 8px;
              position: relative;
              transition: all 0.3s ease;
            }
            
            .aipex-highlight-background {
              background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 212, 255, 0.1)) !important;
              border-radius: 6px;
              backdrop-filter: blur(2px);
              transition: all 0.3s ease;
            }
            
            /* New overlay styles - independent elements */
            .aipex-overlay-container {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              pointer-events: none;
              z-index: 2147483647;
            }
            
            .aipex-overlay-border {
              position: absolute;
              border: 3px solid #00d4ff;
              border-radius: 8px;
              pointer-events: none;
              animation: aipex-overlay-pulse 2s ease-in-out infinite;
            }
            
            .aipex-cursor-arrow {
              position: absolute;
              color: #00d4ff;
              font-size: 20px;
              font-weight: bold;
              pointer-events: none;
              animation: aipex-cursor-bounce 1.5s ease-in-out infinite;
              text-shadow: 0 0 10px rgba(0, 212, 255, 0.8);
            }
            
            .aipex-pointer-arrow {
              position: absolute;
              width: 0;
              height: 0;
              border-left: 15px solid transparent;
              border-right: 15px solid transparent;
              border-top: 25px solid #00d4ff;
              pointer-events: none;
              animation: aipex-pointer-wiggle 1s ease-in-out infinite;
              filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.8));
            }
            
            .aipex-spotlight-bg {
              position: absolute;
              background: radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.7) 70%);
              border-radius: 50%;
              pointer-events: none;
            }
            
            .aipex-spotlight-ring {
              position: absolute;
              border: 2px solid #00d4ff;
              border-radius: 50%;
              pointer-events: none;
              animation: aipex-spotlight-rotate 3s linear infinite;
            }
            
            .aipex-frame-border {
              position: absolute;
              border: 4px solid transparent;
              background: linear-gradient(45deg, #00d4ff, #ff00d4, #d4ff00, #00d4ff) border-box;
              border-radius: 12px;
              pointer-events: none;
              animation: aipex-frame-glow 2s ease-in-out infinite;
            }
            
            @keyframes aipex-overlay-pulse {
              0%, 100% { 
                border-color: rgba(0, 212, 255, 0.8);
                box-shadow: 0 0 10px rgba(0, 212, 255, 0.4);
              }
              50% { 
                border-color: rgba(0, 212, 255, 1);
                box-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
              }
            }
            
            @keyframes aipex-cursor-bounce {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-5px); }
            }
            
            @keyframes aipex-spotlight-rotate {
              0% { transform: rotate(0deg) scale(1); }
              50% { transform: rotate(180deg) scale(1.1); }
              100% { transform: rotate(360deg) scale(1); }
            }
            
            @keyframes aipex-frame-glow {
              0%, 100% { 
                filter: brightness(1) drop-shadow(0 0 10px rgba(0, 212, 255, 0.5));
              }
              50% { 
                filter: brightness(1.3) drop-shadow(0 0 20px rgba(0, 212, 255, 0.8));
              }
            }
            
            @keyframes aipex-pointer-wiggle {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-5deg); }
              75% { transform: rotate(5deg); }
            }

          `
          document.head.appendChild(styleSheet)
        }

        // Save original styles that might be modified
        const stylesToSave = ['boxShadow', 'outline', 'outlineOffset', 'border', 'borderRadius', 'backgroundColor', 'color', 'textShadow', 'filter', 'transform', 'animation', 'transition']
        stylesToSave.forEach(prop => {
          originalStyles[prop] = (element.style as any)[prop] || ''
        })

        // Apply custom CSS if provided
        if (customCSS) {
          element.style.cssText += '; ' + customCSS
        } else {
          // Apply highlight style
          const colorWithAlpha = highlightColor.startsWith('#') 
            ? `${highlightColor}${intensity === 'subtle' ? '66' : intensity === 'strong' ? 'CC' : '99'}`
            : highlightColor

          element.classList.add('aipex-highlighted')
          
          switch (highlightStyle) {
            case 'glow':
              element.classList.add('aipex-highlight-glow', intensity)
              if (highlightColor !== '#00d4ff') {
                const rgb = hexToRgb(highlightColor) || {r: 0, g: 212, b: 255}
                const intensityValues = {
                  subtle: '0 0 10px rgba({r}, {g}, {b}, 0.4), 0 0 20px rgba({r}, {g}, {b}, 0.2)',
                  normal: '0 0 15px rgba({r}, {g}, {b}, 0.6), 0 0 30px rgba({r}, {g}, {b}, 0.4), 0 0 45px rgba({r}, {g}, {b}, 0.2)',
                  strong: '0 0 20px rgba({r}, {g}, {b}, 0.8), 0 0 40px rgba({r}, {g}, {b}, 0.6), 0 0 60px rgba({r}, {g}, {b}, 0.4), 0 0 80px rgba({r}, {g}, {b}, 0.2)'
                }
                element.style.boxShadow = intensityValues[intensity].replace(/{r}/g, rgb.r.toString()).replace(/{g}/g, rgb.g.toString()).replace(/{b}/g, rgb.b.toString())
              }
              break
              
            case 'pulse':
              element.classList.add('aipex-highlight-pulse')
              if (enableAnimation && highlightColor !== '#00d4ff') {
                const rgb = hexToRgb(highlightColor) || {r: 0, g: 212, b: 255}
                const keyframes = `
                  @keyframes aipex-pulse-${highlightId} {
                    0%, 100% { 
                      transform: scale(1);
                      box-shadow: 0 0 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6), 0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4);
                    }
                    50% { 
                      transform: scale(1.05);
                      box-shadow: 0 0 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8), 0 0 50px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6);
                    }
                  }
                `
                const style = document.createElement('style')
                style.textContent = keyframes
                document.head.appendChild(style)
                element.style.animation = `aipex-pulse-${highlightId} 2s ease-in-out infinite`
              }
              break
              
            case 'shine':
              element.classList.add('aipex-highlight-shine')
              break
              
            case 'bounce':
              element.classList.add('aipex-highlight-bounce')
              break
              
            case 'neon':
              element.classList.add('aipex-highlight-neon')
              if (highlightColor !== '#00d4ff') {
                element.style.borderColor = highlightColor
                element.style.backgroundColor = `${colorWithAlpha}1A`
                element.style.textShadow = `
                  0 0 5px currentColor,
                  0 0 10px currentColor,
                  0 0 15px currentColor,
                  0 0 20px ${highlightColor},
                  0 0 35px ${highlightColor},
                  0 0 40px ${highlightColor}
                `
              }
              break
              
            case 'gradient':
              element.classList.add('aipex-highlight-gradient')
              break
              
            case 'shadow':
              element.classList.add('aipex-highlight-shadow')
              if (highlightColor !== '#00d4ff') {
                const rgb = hexToRgb(highlightColor) || {r: 0, g: 212, b: 255}
                element.style.filter = `drop-shadow(0 0 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8))`
              }
              break
              
            case 'outline':
              element.classList.add('aipex-highlight-outline')
              if (highlightColor !== '#00d4ff') {
                element.style.outline = `3px solid ${highlightColor}`
              }
              break
              
            case 'border':
              element.classList.add('aipex-highlight-border')
              if (highlightColor !== '#00d4ff') {
                element.style.border = `3px solid ${highlightColor} !important`
              }
              break
              
            case 'background':
              element.classList.add('aipex-highlight-background')
              if (highlightColor !== '#00d4ff') {
                const rgb = hexToRgb(highlightColor) || {r: 0, g: 212, b: 255}
                element.style.background = `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)) !important`
              }
              break
              
            case 'overlay':
              // Create independent overlay border
              const overlayBorder = createOverlayElement(
                elementRect,
                'aipex-overlay-border',
                '',
                -4, // offsetX
                -4, // offsetY  
                elementRect.width + 8, // width
                elementRect.height + 8  // height
              )
              overlayBorder.dataset.offsetX = '-4'
              overlayBorder.dataset.offsetY = '-4'
              
              if (highlightColor !== '#00d4ff') {
                const rgb = hexToRgb(highlightColor) || {r: 0, g: 212, b: 255}
                overlayBorder.style.borderColor = highlightColor
                overlayBorder.style.boxShadow = `0 0 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
              }
              break
              
            case 'cursor':
              // Create independent cursor arrow
              const cursorArrow = createOverlayElement(
                elementRect,
                'aipex-cursor-arrow',
                '→',
                elementRect.width / 2 - 10, // center horizontally
                -25 // above element
              )
              cursorArrow.dataset.offsetX = (elementRect.width / 2 - 10).toString()
              cursorArrow.dataset.offsetY = '-25'
              
              if (highlightColor !== '#00d4ff') {
                cursorArrow.style.color = highlightColor
                cursorArrow.style.textShadow = `0 0 10px ${highlightColor}`
              }
              break
              
            case 'spotlight':
              // Create spotlight background
              const spotlightBg = createOverlayElement(
                elementRect,
                'aipex-spotlight-bg',
                '',
                -20, // offsetX
                -20, // offsetY
                elementRect.width + 40, // width
                elementRect.height + 40  // height
              )
              spotlightBg.dataset.offsetX = '-20'
              spotlightBg.dataset.offsetY = '-20'
              
              // Create spotlight ring
              const spotlightRing = createOverlayElement(
                elementRect,
                'aipex-spotlight-ring',
                '',
                -10, // offsetX
                -10, // offsetY
                elementRect.width + 20, // width
                elementRect.height + 20  // height
              )
              spotlightRing.dataset.offsetX = '-10'
              spotlightRing.dataset.offsetY = '-10'
              
              if (highlightColor !== '#00d4ff') {
                spotlightRing.style.borderColor = highlightColor
              }
              break
              
            case 'frame':
              // Create frame border
              const frameBorder = createOverlayElement(
                elementRect,
                'aipex-frame-border',
                '',
                -8, // offsetX
                -8, // offsetY
                elementRect.width + 16, // width
                elementRect.height + 16  // height
              )
              frameBorder.dataset.offsetX = '-8'
              frameBorder.dataset.offsetY = '-8'
              
              if (highlightColor !== '#00d4ff') {
                const rgb = hexToRgb(highlightColor) || {r: 0, g: 212, b: 255}
                frameBorder.style.background = `linear-gradient(45deg, ${highlightColor}, #ff00d4, #d4ff00, ${highlightColor}) border-box`
                frameBorder.style.filter = `brightness(1) drop-shadow(0 0 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5))`
              }
              break
              
            case 'pointer':
              // Create pointer arrow
              const pointerArrow = createOverlayElement(
                elementRect,
                'aipex-pointer-arrow',
                '',
                elementRect.width / 2 - 15, // center horizontally
                -30 // above element
              )
              pointerArrow.dataset.offsetX = (elementRect.width / 2 - 15).toString()
              pointerArrow.dataset.offsetY = '-30'
              
              if (highlightColor !== '#00d4ff') {
                const rgb = hexToRgb(highlightColor) || {r: 0, g: 212, b: 255}
                pointerArrow.style.borderTopColor = highlightColor
                pointerArrow.style.filter = `drop-shadow(0 0 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8))`
              }
              break
          }
        }

        // Add scroll and resize listeners for position updates
        if (['overlay', 'cursor', 'spotlight', 'frame', 'pointer'].includes(highlightStyle)) {
          window.addEventListener('scroll', updateOverlayPositions, true)
          window.addEventListener('resize', updateOverlayPositions)
          
          // Store listeners for cleanup
          element.setAttribute('data-has-overlay-listeners', 'true')
        }

        // Remove highlight after duration (unless persist is true)
        if (!persistHighlight && highlightDuration > 0) {
          setTimeout(() => {
            // Restore original styles
            Object.entries(originalStyles).forEach(([property, value]) => {
              (element.style as any)[property] = value
            })
            
            // Remove all highlight classes
            element.classList.remove('aipex-highlighted', 'aipex-highlight-glow', 'aipex-highlight-pulse', 'aipex-highlight-shine', 'aipex-highlight-bounce', 'aipex-highlight-neon', 'aipex-highlight-gradient', 'aipex-highlight-shadow', 'aipex-highlight-outline', 'aipex-highlight-border', 'aipex-highlight-background', 'aipex-highlight-overlay', 'aipex-highlight-cursor', 'aipex-highlight-spotlight', 'aipex-highlight-frame', 'aipex-highlight-pointer', 'subtle', 'normal', 'strong')
            
            // Remove independent overlay elements
            const overlayElements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`)
            overlayElements.forEach(overlay => {
              if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay)
              }
            })
            
            // Remove event listeners if they were added
            if (element.hasAttribute('data-has-overlay-listeners')) {
              window.removeEventListener('scroll', updateOverlayPositions, true)
              window.removeEventListener('resize', updateOverlayPositions)
              element.removeAttribute('data-has-overlay-listeners')
            }
            
            element.removeAttribute('data-highlight-id')
            
            // Remove custom keyframe styles
            const customStyle = document.querySelector(`style:has([contains(text(), "aipex-pulse-${highlightId}")])`)
            if (customStyle) {
              customStyle.remove()
            }
          }, highlightDuration)
        }

        // Get element info
        const rect = element.getBoundingClientRect()
        const elementInfo = {
          tagName: element.tagName.toLowerCase(),
          text: element.textContent?.trim()?.substring(0, 100) || '',
          position: { 
            x: rect.left + window.scrollX, 
            y: rect.top + window.scrollY 
          },
          size: {
            width: rect.width,
            height: rect.height
          }
        }

        const persistMessage = persistHighlight ? ' (persistent)' : ` for ${highlightDuration}ms`
        const colorInfo = options.color ? `using custom color ${highlightColor}` : `using auto-detected color ${highlightColor} (contrast optimized)`
        return {
          success: true,
          message: `Successfully highlighted element "${selector}" with ${highlightStyle} style (${intensity} intensity)${persistMessage}, ${colorInfo}`,
          title: document.title || "",
          url: location.href,
          elementInfo
        }
      } catch (error) {
        return {
          success: false,
          message: `Error highlighting element: ${error}`,
          title: document.title || "",
          url: location.href
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

/**
 * Highlight specific text within elements with inline styling (bold + red)
 */
export async function highlightTextInline(selector: string, searchText: string, options?: {
  caseSensitive?: boolean
  wholeWords?: boolean
  highlightColor?: string
  backgroundColor?: string
  fontWeight?: string
  persist?: boolean
}): Promise<{
  success: boolean
  message: string
  title: string
  url: string
  matchCount?: number
} | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [selector, searchText, options || {}],
    func: (selector: string, searchText: string, options: {
      caseSensitive?: boolean
      wholeWords?: boolean
      highlightColor?: string
      backgroundColor?: string
      fontWeight?: string
      persist?: boolean
    }) => {
      try {
        const elements = document.querySelectorAll(selector)
        if (elements.length === 0) {
          return {
            success: false,
            message: `No elements found with selector "${selector}"`,
            title: document.title || "",
            url: location.href
          }
        }

        // Default options
        const caseSensitive = options.caseSensitive || false
        const wholeWords = options.wholeWords || false
        const highlightColor = options.highlightColor || '#DC143C' // Crimson red
        const backgroundColor = options.backgroundColor || 'transparent'
        const fontWeight = options.fontWeight || 'bold'
        const persist = options.persist !== false

        let totalMatches = 0

        // Create highlight styles if not already present
        if (!document.getElementById('aipex-text-highlight-styles')) {
          const styleSheet = document.createElement('style')
          styleSheet.id = 'aipex-text-highlight-styles'
          styleSheet.textContent = `
            .aipex-text-highlight {
              color: ${highlightColor} !important;
              background-color: ${backgroundColor} !important;
              font-weight: ${fontWeight} !important;
              padding: 1px 2px;
              border-radius: 2px;
              transition: all 0.2s ease;
            }
            
            .aipex-text-highlight:hover {
              background-color: rgba(220, 20, 60, 0.1) !important;
            }
          `
          document.head.appendChild(styleSheet)
        }

        // Function to highlight text in a text node
        const highlightInTextNode = (textNode: Text): number => {
          const text = textNode.textContent || ''
          if (!text.trim()) return 0

          // Create search pattern
          let pattern: RegExp
          if (wholeWords) {
            const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            pattern = new RegExp(`\\b${escapedText}\\b`, caseSensitive ? 'g' : 'gi')
          } else {
            const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            pattern = new RegExp(escapedText, caseSensitive ? 'g' : 'gi')
          }

          const matches = text.match(pattern)
          if (!matches) return 0

          // Create replacement HTML
          const highlightedText = text.replace(pattern, (match) => {
            return `<span class="aipex-text-highlight" data-highlight-text="${searchText}">${match}</span>`
          })

          // Replace the text node with highlighted HTML
          const wrapper = document.createElement('span')
          wrapper.innerHTML = highlightedText
          
          if (textNode.parentNode) {
            textNode.parentNode.insertBefore(wrapper, textNode)
            textNode.parentNode.removeChild(textNode)
          }

          return matches.length
        }

        // Function to process all text nodes in an element
        const processElement = (element: Element): number => {
          let matchCount = 0
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                // Skip script, style, and already highlighted content
                const parent = node.parentElement
                if (!parent) return NodeFilter.FILTER_REJECT
                
                const tagName = parent.tagName.toLowerCase()
                if (['script', 'style', 'noscript'].includes(tagName)) {
                  return NodeFilter.FILTER_REJECT
                }
                
                if (parent.classList.contains('aipex-text-highlight')) {
                  return NodeFilter.FILTER_REJECT
                }
                
                return NodeFilter.FILTER_ACCEPT
              }
            }
          )

          const textNodes: Text[] = []
          let node: Node | null
          while (node = walker.nextNode()) {
            textNodes.push(node as Text)
          }

          // Process text nodes
          for (const textNode of textNodes) {
            matchCount += highlightInTextNode(textNode)
          }

          return matchCount
        }

        // Process all matching elements
        elements.forEach(element => {
          totalMatches += processElement(element)
        })

        // Clean up function if not persistent
        if (!persist) {
          setTimeout(() => {
            const highlights = document.querySelectorAll('.aipex-text-highlight')
            highlights.forEach(highlight => {
              const parent = highlight.parentNode
              if (parent) {
                parent.insertBefore(document.createTextNode(highlight.textContent || ''), highlight)
                parent.removeChild(highlight)
              }
            })
          }, 5000) // Remove after 5 seconds
        }

        return {
          success: true,
          message: `Successfully highlighted ${totalMatches} instances of "${searchText}" in ${elements.length} element(s)`,
          title: document.title || "",
          url: location.href,
          matchCount: totalMatches
        }
      } catch (error) {
        return {
          success: false,
          message: `Error highlighting text: ${error}`,
          title: document.title || "",
          url: location.href
        }
      }
    }
  })

  const [{ result }] = results
  return result || null
}
