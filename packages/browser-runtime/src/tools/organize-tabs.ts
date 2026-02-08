/**
 * AI-powered tab organization module
 *
 * This module provides the logic to group tabs using AI or fallback to domain-based grouping.
 * The AI integration uses a configurable callback pattern, allowing the extension to inject
 * the actual LLM call implementation.
 */

import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface TabData {
  id: number;
  title: string;
  url: string;
  hostname: string;
}

export interface TabGroupResult {
  emoji: string;
  category: string;
  color: chrome.tabGroups.ColorEnum;
  tabIds: number[];
}

export interface OrganizeTabsResult {
  success: boolean;
  groupedTabs?: number;
  groups?: number;
  error?: string;
}

/**
 * LLM response schema for tab grouping
 */
export const TabGroupingResponseSchema = z.object({
  groups: z.array(
    z.object({
      emoji: z.string(),
      category: z.string(),
      color: z.enum([
        "blue",
        "red",
        "yellow",
        "green",
        "orange",
        "purple",
        "pink",
        "cyan",
        "grey",
      ]),
      tabIds: z.array(z.number()),
    }),
  ),
});

export type TabGroupingResponse = z.infer<typeof TabGroupingResponseSchema>;

/**
 * Callback type for AI-powered tab classification.
 * The extension should provide this when AI is available.
 */
export type TabClassificationCallback = (
  tabData: TabData[],
  language: "en" | "zh",
) => Promise<TabGroupingResponse>;

// ============================================================================
// Module State
// ============================================================================

let aiClassificationCallback: TabClassificationCallback | null = null;

/**
 * Set the AI classification callback for tab organization.
 * This should be called by the extension when the agent is ready.
 */
export function setTabClassificationCallback(
  callback: TabClassificationCallback | null,
): void {
  aiClassificationCallback = callback;
}

// ============================================================================
// Helper Functions
// ============================================================================

const VALID_COLORS: chrome.tabGroups.ColorEnum[] = [
  "blue",
  "red",
  "yellow",
  "green",
  "orange",
  "purple",
  "pink",
  "cyan",
  "grey",
];

function getRandomColor(): chrome.tabGroups.ColorEnum {
  return VALID_COLORS[Math.floor(Math.random() * VALID_COLORS.length)]!;
}

/**
 * Sanitize string for AI request - remove problematic characters
 */
function sanitizeForAI(str: string): string {
  return str
    .replace(/[\uD800-\uDFFF]/g, "") // Remove surrogate pairs
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Remove emoji ranges
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[^\x20-\x7E\u4e00-\u9fff]/g, "") // Keep ASCII and Chinese
    .trim();
}

/**
 * Sanitize category string for display
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/[^\x20-\x7E\u4e00-\u9fff]/g, "")
    .trim();
}

/**
 * Validate emoji - more permissive but safe
 */
function validateEmoji(emoji: string | undefined): string {
  if (!emoji || typeof emoji !== "string") {
    return "📁";
  }
  const trimmed = emoji.trim();
  if (trimmed.length === 0 || trimmed.includes("\u0000")) {
    return "📁";
  }
  return trimmed;
}

/**
 * Extract hostname from URL safely
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    const match = url.match(/:\/\/([^/]+)/);
    return match?.[1] || url.split("://")[0] || "";
  }
}

// ============================================================================
// Fallback: Domain-Based Grouping
// ============================================================================

interface DomainGroup {
  domain: string;
  category: string;
  emoji: string;
  color: chrome.tabGroups.ColorEnum;
}

const DOMAIN_CATEGORIES: DomainGroup[] = [
  // Development
  { domain: "github.com", category: "Dev", emoji: "💻", color: "grey" },
  { domain: "gitlab.com", category: "Dev", emoji: "💻", color: "grey" },
  { domain: "stackoverflow.com", category: "Dev", emoji: "💻", color: "grey" },
  { domain: "npmjs.com", category: "Dev", emoji: "💻", color: "grey" },
  { domain: "vercel.com", category: "Dev", emoji: "💻", color: "grey" },

  // Google
  { domain: "google.com", category: "Google", emoji: "🔍", color: "blue" },
  { domain: "youtube.com", category: "Video", emoji: "🎬", color: "red" },
  { domain: "gmail.com", category: "Mail", emoji: "📧", color: "red" },
  { domain: "docs.google.com", category: "Docs", emoji: "📄", color: "blue" },

  // Social
  { domain: "twitter.com", category: "Social", emoji: "🐦", color: "cyan" },
  { domain: "x.com", category: "Social", emoji: "🐦", color: "cyan" },
  { domain: "linkedin.com", category: "Social", emoji: "💼", color: "blue" },
  { domain: "facebook.com", category: "Social", emoji: "👥", color: "blue" },
  { domain: "reddit.com", category: "Social", emoji: "🗨️", color: "orange" },

  // Shopping
  { domain: "amazon.com", category: "Shop", emoji: "🛒", color: "yellow" },
  { domain: "ebay.com", category: "Shop", emoji: "🛒", color: "yellow" },
  { domain: "taobao.com", category: "Shop", emoji: "🛒", color: "orange" },
  { domain: "jd.com", category: "Shop", emoji: "🛒", color: "red" },

  // News
  { domain: "cnn.com", category: "News", emoji: "📰", color: "red" },
  { domain: "bbc.com", category: "News", emoji: "📰", color: "red" },
  { domain: "reuters.com", category: "News", emoji: "📰", color: "blue" },

  // AI
  { domain: "openai.com", category: "AI", emoji: "🤖", color: "green" },
  { domain: "anthropic.com", category: "AI", emoji: "🤖", color: "orange" },
  { domain: "claude.ai", category: "AI", emoji: "🤖", color: "orange" },
  { domain: "chatgpt.com", category: "AI", emoji: "🤖", color: "green" },
];

function getDomainCategory(hostname: string): DomainGroup | null {
  const lowerHost = hostname.toLowerCase();
  for (const category of DOMAIN_CATEGORIES) {
    if (lowerHost.includes(category.domain)) {
      return category;
    }
  }
  return null;
}

/**
 * Fallback grouping by domain when AI is not available
 */
function groupTabsByDomain(tabs: TabData[]): TabGroupResult[] {
  const groups = new Map<
    string,
    {
      category: string;
      emoji: string;
      color: chrome.tabGroups.ColorEnum;
      tabIds: number[];
    }
  >();

  const otherTabs: number[] = [];

  for (const tab of tabs) {
    const domainInfo = getDomainCategory(tab.hostname);
    if (domainInfo) {
      const key = domainInfo.category;
      const existing = groups.get(key);
      if (existing) {
        existing.tabIds.push(tab.id);
      } else {
        groups.set(key, {
          category: domainInfo.category,
          emoji: domainInfo.emoji,
          color: domainInfo.color,
          tabIds: [tab.id],
        });
      }
    } else {
      // Group remaining tabs by root domain
      const rootDomain =
        tab.hostname.split(".").slice(-2).join(".") || tab.hostname;
      if (rootDomain) {
        const key = `domain:${rootDomain}`;
        const existing = groups.get(key);
        if (existing) {
          existing.tabIds.push(tab.id);
        } else {
          groups.set(key, {
            category: rootDomain.split(".")[0] || "Other",
            emoji: "🌐",
            color: getRandomColor(),
            tabIds: [tab.id],
          });
        }
      } else {
        otherTabs.push(tab.id);
      }
    }
  }

  // Convert to results, excluding single-tab groups
  const results: TabGroupResult[] = [];
  for (const [, group] of groups) {
    if (group.tabIds.length >= 2) {
      results.push(group);
    } else {
      otherTabs.push(...group.tabIds);
    }
  }

  // Add "Other" group if there are uncategorized tabs
  if (otherTabs.length >= 2) {
    results.push({
      category: "Other",
      emoji: "📁",
      color: "grey",
      tabIds: otherTabs,
    });
  }

  return results;
}

// ============================================================================
// Main Implementation
// ============================================================================

/**
 * Use AI to automatically group tabs by topic/purpose.
 * Falls back to domain-based grouping if AI is not available.
 */
export async function groupTabsByAI(): Promise<OrganizeTabsResult> {
  try {
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const validTabs = tabs.filter((tab) => tab.url && tab.id);

    if (validTabs.length === 0) {
      return { success: true, groupedTabs: 0, groups: 0 };
    }

    // Get active tab for collapse logic
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Prepare tab data
    const tabData: TabData[] = validTabs.map((tab) => ({
      id: tab.id!,
      title: sanitizeForAI(tab.title || ""),
      url: tab.url!,
      hostname: sanitizeForAI(getHostname(tab.url!)),
    }));

    let groupingResult: TabGroupResult[];

    // Try AI classification if callback is available
    if (aiClassificationCallback) {
      try {
        // Detect language - simple heuristic
        const hasChineseChars = tabData.some(
          (t) => /[\u4e00-\u9fff]/.test(t.title) || t.hostname.endsWith(".cn"),
        );
        const language = hasChineseChars ? "zh" : "en";

        const aiResponse = await aiClassificationCallback(tabData, language);
        const parsed = TabGroupingResponseSchema.safeParse(aiResponse);

        if (parsed.success) {
          groupingResult = parsed.data.groups.map((g) => ({
            emoji: validateEmoji(g.emoji),
            category: sanitizeString(g.category),
            color: VALID_COLORS.includes(g.color) ? g.color : getRandomColor(),
            tabIds: g.tabIds.filter((id) =>
              validTabs.some((t) => t.id === id),
            ),
          }));
        } else {
          console.warn(
            "[organize_tabs] AI response parsing failed, using fallback:",
            parsed.error,
          );
          groupingResult = groupTabsByDomain(tabData);
        }
      } catch (aiError) {
        console.warn(
          "[organize_tabs] AI classification failed, using fallback:",
          aiError,
        );
        groupingResult = groupTabsByDomain(tabData);
      }
    } else {
      // No AI available, use domain-based fallback
      console.log(
        "[organize_tabs] No AI callback set, using domain-based grouping",
      );
      groupingResult = groupTabsByDomain(tabData);
    }

    // Apply groups to tabs
    const windowId = validTabs[0]!.windowId;
    let groupCount = 0;

    for (const group of groupingResult) {
      if (group.tabIds.length === 0) continue;

      const displayName = `${group.emoji} ${group.category}`;

      try {
        // Check for existing group with same name
        const existingGroups = await chrome.tabGroups.query({ windowId });
        const existingGroup = existingGroups.find(
          (g) => g.title === displayName,
        );

        if (existingGroup) {
          // Add tabs to existing group
          await chrome.tabs.group({
            tabIds: group.tabIds as [number, ...number[]],
            groupId: existingGroup.id,
          });
          // Collapse unless it contains active tab
          const containsActiveTab = group.tabIds.includes(activeTab?.id ?? -1);
          await chrome.tabGroups.update(existingGroup.id, {
            collapsed: !containsActiveTab,
          });
        } else {
          // Create new group
          const groupId = await chrome.tabs.group({
            createProperties: { windowId },
            tabIds: group.tabIds as [number, ...number[]],
          });
          await chrome.tabGroups.update(groupId, {
            title: displayName,
            color: group.color,
          });
          // Collapse unless it contains active tab
          const containsActiveTab = group.tabIds.includes(activeTab?.id ?? -1);
          await chrome.tabGroups.update(groupId, {
            collapsed: !containsActiveTab,
          });
        }
        groupCount++;
      } catch (groupError) {
        console.warn(`[organize_tabs] Failed to create group:`, groupError);
      }
    }

    return {
      success: true,
      groupedTabs: validTabs.length,
      groups: groupCount,
    };
  } catch (error) {
    console.error("[organize_tabs] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Prompt Template for AI Classification
// ============================================================================

/**
 * Generate the prompt for AI tab classification.
 * This can be used by the extension to create the appropriate AI request.
 */
export function generateTabClassificationPrompt(
  tabData: TabData[],
  language: "en" | "zh",
): string {
  const languageInstructions =
    language === "zh"
      ? {
          categoryInstruction: "简单的分类名称（1-2个中文字）",
          exampleCategories: ["新闻", "购物", "工作"],
          languageNote: "使用简单的中文词汇作为分类名称。",
        }
      : {
          categoryInstruction: "A simple category name (1-2 words in English)",
          exampleCategories: ["News", "Shopping", "Work"],
          languageNote: "Use simple English words for categories.",
        };

  return `Classify these browser tabs into 3-7 meaningful groups based on their content, purpose, or topic. For each group, provide an appropriate emoji, color, and a simple category name.

Tab data:
${JSON.stringify(tabData, null, 2)}

You must return a JSON object with a "groups" key containing an array where each item has:
1. "emoji": A single emoji that represents the group content 
2. "category": ${languageInstructions.categoryInstruction}
3. "color": A color from this list: blue, red, yellow, green, orange, purple, pink, cyan, grey
4. "tabIds": Array of tab IDs that belong to this group

Example response format:
{
  "groups": [
    {
      "emoji": "[emoji]",
      "category": "${languageInstructions.exampleCategories[0]}",
      "color": "blue",
      "tabIds": [123, 124, 125]
    },
    {
      "emoji": "[emoji]",
      "category": "${languageInstructions.exampleCategories[1]}", 
      "color": "green",
      "tabIds": [126, 127]
    },
    {
      "emoji": "[emoji]",
      "category": "${languageInstructions.exampleCategories[2]}",
      "color": "purple",
      "tabIds": [128, 129]
    }
  ]
}

Important: Use only common, standard emojis and ${languageInstructions.languageNote} Choose colors that match the content theme.`;
}
