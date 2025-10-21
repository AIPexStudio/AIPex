import { Storage } from "~/lib/storage"

export type HostAccessMode = "whitelist" | "blocklist" | "include-all"

export interface HostAccessConfig {
    mode: HostAccessMode
    whitelist: string[]
    blocklist: string[]
}

export class HostAccessManager {
    private static instance: HostAccessManager
    private config: HostAccessConfig
    private storage: Storage

    private constructor() {
        this.storage = new Storage()
        this.config = {
            mode: "include-all",
            whitelist: [],
            blocklist: []
        }
    }

    public static getInstance(): HostAccessManager {
        if (!HostAccessManager.instance) {
            HostAccessManager.instance = new HostAccessManager()
        }
        return HostAccessManager.instance
    }

    /**
     * Load configuration from storage, fallback to default config file
     */
    private async loadConfig(): Promise<HostAccessConfig> {
        try {
            // Try to load from storage first
            const storedConfig = await this.storage.get("hostAccessConfig")
            if (storedConfig) {
                this.config = storedConfig as HostAccessConfig
                return this.config
            }
        } catch (e) {
            console.warn("Failed to load host access config from storage:", e)
        }

        // Fallback to default config
        try {
            const response = await fetch(chrome.runtime.getURL('host-access-config.json'))
            const defaultConfig = await response.json()
            this.config = defaultConfig
            return this.config
        } catch (e) {
            console.error("Failed to load default host access config:", e)
            // Keep the default config that was set in constructor
            return this.config
        }
    }

    /**
     * Save configuration to storage
     */
    public async saveConfig(config: HostAccessConfig): Promise<void> {
        this.config = config
        await this.storage.set("hostAccessConfig", config)
    }

    /**
     * Extract hostname from URL
     */
    private extractHostname(url: string): string | null {
        try {
            const urlObj = new URL(url)
            return urlObj.hostname.toLowerCase()
        } catch (e) {
            console.warn("Invalid URL:", url)
            return null
        }
    }

    /**
     * Check if a host is allowed based on current configuration
     */
    public async isHostAllowed(url: string): Promise<{ allowed: boolean; reason?: string }> {
        const config = await this.loadConfig()
        const hostname = this.extractHostname(url)

        if (!hostname) {
            return { allowed: false, reason: "Invalid URL" }
        }

        switch (config.mode) {
            case "include-all":
                return { allowed: true }

            case "whitelist":
                const isWhitelisted = config.whitelist.some(allowedHost => {
                    const normalizedAllowed = allowedHost.toLowerCase()

                    // Handle wildcard patterns (*.domain.com)
                    if (normalizedAllowed.startsWith('*.')) {
                        const domain = normalizedAllowed.slice(2) // Remove '*.'
                        return hostname === domain || hostname.endsWith('.' + domain)
                    }

                    // Exact match or subdomain match for non-wildcard entries
                    return hostname === normalizedAllowed || hostname.endsWith('.' + normalizedAllowed)
                })
                return {
                    allowed: isWhitelisted,
                    reason: isWhitelisted ? undefined : `Host ${hostname} is not in whitelist`
                }

            case "blocklist":
                const isBlocked = config.blocklist.some(blockedHost => {
                    const normalizedBlocked = blockedHost.toLowerCase()

                    // Handle wildcard patterns (*.domain.com)
                    if (normalizedBlocked.startsWith('*.')) {
                        const domain = normalizedBlocked.slice(2) // Remove '*.'
                        return hostname === domain || hostname.endsWith('.' + domain)
                    }

                    // Exact match or subdomain match for non-wildcard entries
                    return hostname === normalizedBlocked || hostname.endsWith('.' + normalizedBlocked)
                })
                return {
                    allowed: !isBlocked,
                    reason: isBlocked ? `Host ${hostname} is in blocklist` : undefined
                }

            default:
                return { allowed: false, reason: "Invalid configuration mode" }
        }
    }

    /**
     * Get current configuration
     */
    public async getConfig(): Promise<HostAccessConfig> {
        return await this.loadConfig()
    }

    /**
     * Update configuration
     */
    public async updateConfig(updates: Partial<HostAccessConfig>): Promise<void> {
        const currentConfig = await this.loadConfig()
        const newConfig = { ...currentConfig, ...updates }
        await this.saveConfig(newConfig)
    }
}

export const hostAccessManager = HostAccessManager.getInstance()