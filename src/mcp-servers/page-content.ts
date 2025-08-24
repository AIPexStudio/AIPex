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
      const text = (mainContent as HTMLElement).innerText || mainContent.textContent || ""
      
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
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style, nav, header, footer, aside')
      scripts.forEach(el => el.remove())

      // Get main content areas
      const mainContent = document.querySelector('main, article, .content, .post, .entry') || document.body
      const text = (mainContent as HTMLElement).innerText || mainContent.textContent || ""
      
      // Clean up text
      const cleanedText = text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
      
      const wordCount = cleanedText.split(/\s+/).length
      const readingTime = Math.ceil(wordCount / 200) // Average reading speed

      // Extract key points (headings and important text)
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.textContent?.trim())
        .filter(h => h && h.length > 0)
        .slice(0, 10)

      // Extract important content (first few paragraphs)
      const paragraphs = Array.from(document.querySelectorAll('p'))
        .map(p => p.textContent?.trim())
        .filter(p => p && p.length > 50)
        .slice(0, 5)

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
