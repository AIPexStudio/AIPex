/**
 * Host Access Manager
 * Controls which hosts the extension can interact with
 */

import { STORAGE_KEYS } from "@aipexstudio/aipex-core";
import { ChromeStorageAdapter } from "@aipexstudio/browser-runtime";

export type HostAccessMode = "whitelist" | "blocklist" | "include-all";

export interface HostAccessConfig {
  mode: HostAccessMode;
  whitelist: string[];
  blocklist: string[];
}

export class HostAccessManager {
  private static instance: HostAccessManager;
  private config: HostAccessConfig;
  private storage: ChromeStorageAdapter<HostAccessConfig>;

  private constructor() {
    this.storage = new ChromeStorageAdapter<HostAccessConfig>();
    this.config = {
      mode: "include-all",
      whitelist: [],
      blocklist: [],
    };
  }

  public static getInstance(): HostAccessManager {
    if (!HostAccessManager.instance) {
      HostAccessManager.instance = new HostAccessManager();
    }
    return HostAccessManager.instance;
  }

  private async loadConfig(): Promise<HostAccessConfig> {
    try {
      const storedConfig = await this.storage.load(
        STORAGE_KEYS.HOST_ACCESS_CONFIG,
      );
      if (storedConfig) {
        this.config = storedConfig;
        return this.config;
      }
    } catch (e) {
      console.warn("Failed to load host access config from storage:", e);
    }

    try {
      const response = await fetch(
        chrome.runtime.getURL("host-access-config.json"),
      );
      const defaultConfig = await response.json();
      this.config = defaultConfig;
      return this.config;
    } catch (e) {
      console.error("Failed to load default host access config:", e);
      return this.config;
    }
  }

  public async saveConfig(config: HostAccessConfig): Promise<void> {
    this.config = config;
    await this.storage.save(STORAGE_KEYS.HOST_ACCESS_CONFIG, config);
  }

  private extractHostname(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch (_e) {
      console.warn("Invalid URL:", url);
      return null;
    }
  }

  public async isHostAllowed(
    url: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const config = await this.loadConfig();
    const hostname = this.extractHostname(url);

    if (!hostname) {
      return { allowed: false, reason: "Invalid URL" };
    }

    switch (config.mode) {
      case "include-all":
        return { allowed: true };

      case "whitelist": {
        const isWhitelisted = config.whitelist.some((allowedHost) => {
          const normalizedAllowed = allowedHost.toLowerCase();

          if (normalizedAllowed.startsWith("*.")) {
            const domain = normalizedAllowed.slice(2);
            return hostname === domain || hostname.endsWith(`.${domain}`);
          }

          return (
            hostname === normalizedAllowed ||
            hostname.endsWith(`.${normalizedAllowed}`)
          );
        });
        return {
          allowed: isWhitelisted,
          reason: isWhitelisted
            ? undefined
            : `Host ${hostname} is not in whitelist`,
        };
      }

      case "blocklist": {
        const isBlocked = config.blocklist.some((blockedHost) => {
          const normalizedBlocked = blockedHost.toLowerCase();

          if (normalizedBlocked.startsWith("*.")) {
            const domain = normalizedBlocked.slice(2);
            return hostname === domain || hostname.endsWith(`.${domain}`);
          }

          return (
            hostname === normalizedBlocked ||
            hostname.endsWith(`.${normalizedBlocked}`)
          );
        });
        return {
          allowed: !isBlocked,
          reason: isBlocked ? `Host ${hostname} is in blocklist` : undefined,
        };
      }

      default:
        return { allowed: false, reason: "Invalid configuration mode" };
    }
  }

  public async getConfig(): Promise<HostAccessConfig> {
    return await this.loadConfig();
  }

  public async updateConfig(updates: Partial<HostAccessConfig>): Promise<void> {
    const currentConfig = await this.loadConfig();
    const newConfig = { ...currentConfig, ...updates };
    await this.saveConfig(newConfig);
  }
}

export const hostAccessManager = HostAccessManager.getInstance();
