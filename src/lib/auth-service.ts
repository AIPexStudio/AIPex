import { Storage } from "@plasmohq/storage"

export interface User {
  id: string
  name: string
  email: string
  image?: string
  provider: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
}

class AuthService {
  private storage = new Storage()
  private readonly WEBSITE_URL = "http://localhost:3000" // 在生产环境中替换为实际域名
  private readonly TOKEN_KEY = "authToken"
  private readonly USER_KEY = "user"

  async checkAuthStatus(): Promise<AuthState> {
    try {
      const [token, user] = await Promise.all([
        this.storage.get(this.TOKEN_KEY),
        this.storage.get(this.USER_KEY)
      ])

      if (!token || !user) {
        return { isAuthenticated: false, user: null, token: null }
      }

      // 验证token是否有效
      const isValid = await this.verifyToken(token)
      if (!isValid) {
        await this.clearAuth()
        return { isAuthenticated: false, user: null, token: null }
      }

      return { isAuthenticated: true, user, token }
    } catch (error) {
      console.error("Auth status check failed:", error)
      return { isAuthenticated: false, user: null, token: null }
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.WEBSITE_URL}/api/auth/verify`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      return response.ok
    } catch (error) {
      console.error("Token verification failed:", error)
      return false
    }
  }

  async login(): Promise<void> {
    // 直接打开登录页面，使用postMessage通信
    const loginUrl = `${this.WEBSITE_URL}/auth/signin?source=extension`
    
    console.log('Opening login URL:', loginUrl)
    const tab = await chrome.tabs.create({ url: loginUrl })
    
    // 监听来自登录页面的消息
    this.listenForAuthMessage(tab.id!)
  }

  private listenForAuthMessage(tabId: number): void {
    console.log('Listening for auth messages from tab:', tabId)
    
    // 监听来自标签页的消息
    const messageListener = (message: any, sender: chrome.runtime.MessageSender) => {
      if (sender.tab?.id === tabId && message.type === 'AUTH_SUCCESS') {
        console.log('Received auth success message:', message)
        
        // 保存认证信息
        this.storage.set(this.TOKEN_KEY, message.token)
        this.storage.set(this.USER_KEY, message.user)
        
        // 通知UI更新
        this.notifyAuthStateChange()
        
        // 关闭登录标签页
        chrome.tabs.remove(tabId)
        
        // 移除消息监听器
        chrome.runtime.onMessage.removeListener(messageListener)
      }
    }
    
    chrome.runtime.onMessage.addListener(messageListener)
    
    // 定期检查localStorage中的token（作为备用方案）
    const checkInterval = setInterval(async () => {
      try {
        const success = await this.extractTokenFromWebsite()
        if (success) {
          console.log('Token extracted from localStorage successfully')
          // 通知UI更新
          this.notifyAuthStateChange()
          
          // 关闭登录标签页
          chrome.tabs.remove(tabId)
          
          // 清理定时器和监听器
          clearInterval(checkInterval)
          chrome.runtime.onMessage.removeListener(messageListener)
        }
      } catch (error) {
        console.error('Error checking localStorage for token:', error)
      }
    }, 1000) // 每秒检查一次
    
    // 5分钟后自动移除监听器和定时器
    setTimeout(() => {
      clearInterval(checkInterval)
      chrome.runtime.onMessage.removeListener(messageListener)
    }, 300000)
  }

  private async extractTokenFromWebsite(): Promise<boolean> {
    try {
      const tabs = await chrome.tabs.query({
        url: `${this.WEBSITE_URL}/*`
      })

      console.log('Found tabs:', tabs.length)
      if (tabs.length === 0) return false

      const tab = tabs[0]
      console.log('Checking tab:', tab.url)
      
      // 执行脚本获取localStorage中的token
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: () => {
          const token = localStorage.getItem('extension_auth_token')
          const user = localStorage.getItem('extension_user')
          console.log('LocalStorage check:', { hasToken: !!token, hasUser: !!user })
          return { token, user }
        }
      })

      const result = results[0]?.result
      console.log('Extraction result:', { hasToken: !!result?.token, hasUser: !!result?.user })
      
      if (result?.token && result?.user) {
        console.log('Saving token and user to extension storage')
        // 保存到插件storage
        await this.storage.set(this.TOKEN_KEY, result.token)
        await this.storage.set(this.USER_KEY, JSON.parse(result.user))
        
        // 清理网站localStorage
        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: () => {
            localStorage.removeItem('extension_auth_token')
            localStorage.removeItem('extension_user')
          }
        })

        return true
      }

      return false
    } catch (error) {
      console.error("Token extraction failed:", error)
      return false
    }
  }

  async logout(): Promise<void> {
    await this.clearAuth()
    this.notifyAuthStateChange()
  }

  private async clearAuth(): Promise<void> {
    await Promise.all([
      this.storage.remove(this.TOKEN_KEY),
      this.storage.remove(this.USER_KEY)
    ])
  }

  private notifyAuthStateChange(): void {
    // 发送消息通知UI更新
    chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED' })
  }

  async getUser(): Promise<User | null> {
    const user = await this.storage.get(this.USER_KEY)
    return user || null
  }

  async getToken(): Promise<string | null> {
    const token = await this.storage.get(this.TOKEN_KEY)
    return token || null
  }
}

export const authService = new AuthService()

