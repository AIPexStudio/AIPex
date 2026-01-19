import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { getActiveTab } from "./index";
/**
 * Get page metadata including title, description, keywords, etc.
 */
export const getPageMetadataTool = tool({
    name: "get_page_metadata",
    description: "Get page metadata including title, description, keywords, etc.",
    parameters: z.object({}),
    execute: async () => {
        const tab = await getActiveTab();
        if (!tab.id) {
            return null;
        }
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const getMetaContent = (name, property) => {
                    const selector = property
                        ? `meta[property="${property}"]`
                        : `meta[name="${name}"]`;
                    const element = document.querySelector(selector);
                    return element?.content || undefined;
                };
                return {
                    title: document.title || "",
                    url: location.href,
                    description: getMetaContent("description") ||
                        getMetaContent("og:description", "og:description"),
                    keywords: getMetaContent("keywords"),
                    author: getMetaContent("author") ||
                        getMetaContent("og:author", "og:author"),
                    ogImage: getMetaContent("og:image", "og:image"),
                    favicon: document.querySelector('link[rel="icon"]')
                        ?.href ||
                        document.querySelector('link[rel="shortcut icon"]')?.href,
                };
            },
        });
        return results[0]?.result || null;
    },
});
/**
 * Scroll to a DOM element and center it in the viewport
 */
export const scrollToElementTool = tool({
    name: "scroll_to_element",
    description: "Scroll to a DOM element and center it in the viewport",
    parameters: z.object({
        selector: z.string().describe("CSS selector of the element to scroll to"),
    }),
    execute: async ({ selector }) => {
        const tab = await getActiveTab();
        if (!tab.id) {
            return null;
        }
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [selector],
            func: (selector) => {
                try {
                    const element = document.querySelector(selector);
                    if (!element) {
                        return {
                            success: false,
                            message: `Element with selector "${selector}" not found`,
                            title: document.title || "",
                            url: location.href,
                        };
                    }
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                    return {
                        success: true,
                        message: `Successfully scrolled to and centered element "${selector}"`,
                        title: document.title || "",
                        url: location.href,
                    };
                }
                catch (error) {
                    return {
                        success: false,
                        message: `Error scrolling to element: ${error}`,
                        title: document.title || "",
                        url: location.href,
                    };
                }
            },
        });
        return results[0]?.result || null;
    },
});
/**
 * Permanently highlight DOM elements with drop shadow effect
 */
export const highlightElementTool = tool({
    name: "highlight_element",
    description: "Permanently highlight DOM elements with drop shadow effect",
    parameters: z.object({
        selector: z.string().describe("CSS selector of the element to highlight"),
        color: z
            .string()
            .nullable()
            .optional()
            .describe("Shadow color (e.g., '#00d4ff')"),
        duration: z
            .number()
            .nullable()
            .optional()
            .describe("Duration in milliseconds (0 = permanent)"),
        intensity: z
            .enum(["subtle", "normal", "strong"])
            .nullable()
            .optional()
            .describe("Highlight intensity"),
        persist: z
            .boolean()
            .nullable()
            .optional()
            .describe("Whether to keep the highlight permanently"),
    }),
    execute: async ({ selector, color, duration, intensity = "normal", persist = true, }) => {
        const tab = await getActiveTab();
        if (!tab.id) {
            return null;
        }
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [selector, { color, duration, intensity, persist }],
            func: (selector, options) => {
                try {
                    const element = document.querySelector(selector);
                    if (!element) {
                        return {
                            success: false,
                            message: `Element with selector "${selector}" not found`,
                            title: document.title || "",
                            url: location.href,
                        };
                    }
                    const highlightDuration = options.duration || 0;
                    const intensity = options.intensity || "normal";
                    const persistHighlight = options.persist !== false;
                    // Intensity presets
                    const intensityMap = {
                        subtle: { blur: 8, spread: 2, opacity: 0.3 },
                        normal: { blur: 15, spread: 4, opacity: 0.5 },
                        strong: { blur: 25, spread: 8, opacity: 0.7 },
                    };
                    const { blur, spread, opacity } = intensityMap[intensity];
                    const shadowColor = options.color || "#00d4ff";
                    // Apply shadow
                    element.style.boxShadow = `0 0 ${blur}px ${spread}px ${shadowColor}${Math.round(opacity * 255)
                        .toString(16)
                        .padStart(2, "0")}`;
                    element.style.transition = "box-shadow 0.3s ease";
                    // Remove after duration if not persistent
                    if (!persistHighlight && highlightDuration > 0) {
                        setTimeout(() => {
                            element.style.boxShadow = "";
                        }, highlightDuration);
                    }
                    return {
                        success: true,
                        message: `Successfully highlighted element "${selector}"`,
                        title: document.title || "",
                        url: location.href,
                    };
                }
                catch (error) {
                    return {
                        success: false,
                        message: `Error highlighting element: ${error}`,
                        title: document.title || "",
                        url: location.href,
                    };
                }
            },
        });
        return results[0]?.result || null;
    },
});
/**
 * Highlight specific words or phrases within text content using inline styling
 */
export const highlightTextInlineTool = tool({
    name: "highlight_text_inline",
    description: "Highlight specific words or phrases within text content using inline styling",
    parameters: z.object({
        selector: z
            .string()
            .describe("CSS selector of the element(s) containing the text to search"),
        searchText: z.string().describe("The text or phrase to highlight"),
        caseSensitive: z
            .boolean()
            .nullable()
            .optional()
            .describe("Case sensitive search"),
        wholeWords: z
            .boolean()
            .nullable()
            .optional()
            .describe("Match whole words only"),
        highlightColor: z.string().nullable().optional().describe("Text color"),
        backgroundColor: z
            .string()
            .nullable()
            .optional()
            .describe("Background color"),
        fontWeight: z.string().nullable().optional().describe("Font weight"),
        persist: z
            .boolean()
            .nullable()
            .optional()
            .describe("Whether to keep the highlight permanently"),
    }),
    execute: async ({ selector, searchText, caseSensitive = false, wholeWords = false, highlightColor = "#DC143C", backgroundColor = "transparent", fontWeight = "bold", persist = true, }) => {
        const tab = await getActiveTab();
        if (!tab.id) {
            return null;
        }
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [
                selector,
                searchText,
                {
                    caseSensitive,
                    wholeWords,
                    highlightColor,
                    backgroundColor,
                    fontWeight,
                    persist,
                },
            ],
            func: (selector, searchText, options) => {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length === 0) {
                        return {
                            success: false,
                            message: `No elements found with selector "${selector}"`,
                            title: document.title || "",
                            url: location.href,
                        };
                    }
                    const caseSensitive = options.caseSensitive || false;
                    const wholeWords = options.wholeWords || false;
                    const highlightColor = options.highlightColor || "#DC143C";
                    const backgroundColor = options.backgroundColor || "transparent";
                    const fontWeight = options.fontWeight || "bold";
                    let totalMatches = 0;
                    // Create highlight styles if not already present
                    if (!document.getElementById("aipex-text-highlight-styles")) {
                        const styleSheet = document.createElement("style");
                        styleSheet.id = "aipex-text-highlight-styles";
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
            `;
                        document.head.appendChild(styleSheet);
                    }
                    // Function to highlight text in a text node
                    const highlightInTextNode = (textNode) => {
                        const text = textNode.textContent || "";
                        if (!text.trim())
                            return 0;
                        let pattern;
                        if (wholeWords) {
                            const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                            pattern = new RegExp(`\\b${escapedText}\\b`, caseSensitive ? "g" : "gi");
                        }
                        else {
                            const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                            pattern = new RegExp(escapedText, caseSensitive ? "g" : "gi");
                        }
                        const matches = text.match(pattern);
                        if (!matches)
                            return 0;
                        const parent = textNode.parentNode;
                        if (!parent)
                            return 0;
                        const fragment = document.createDocumentFragment();
                        let lastIndex = 0;
                        text.replace(pattern, (match, offset) => {
                            // Add text before match
                            if (offset > lastIndex) {
                                fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
                            }
                            // Add highlighted match
                            const span = document.createElement("span");
                            span.className = "aipex-text-highlight";
                            span.textContent = match;
                            fragment.appendChild(span);
                            lastIndex = offset + match.length;
                            return match;
                        });
                        // Add remaining text
                        if (lastIndex < text.length) {
                            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                        }
                        parent.replaceChild(fragment, textNode);
                        return matches.length;
                    };
                    // Process each element
                    elements.forEach((element) => {
                        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
                        const textNodes = [];
                        let node = walker.nextNode();
                        while (node) {
                            textNodes.push(node);
                            node = walker.nextNode();
                        }
                        textNodes.forEach((textNode) => {
                            totalMatches += highlightInTextNode(textNode);
                        });
                    });
                    return {
                        success: true,
                        message: `Successfully highlighted ${totalMatches} occurrence(s) of "${searchText}"`,
                        title: document.title || "",
                        url: location.href,
                        matchCount: totalMatches,
                    };
                }
                catch (error) {
                    return {
                        success: false,
                        message: `Error highlighting text: ${error}`,
                        title: document.title || "",
                        url: location.href,
                    };
                }
            },
        });
        return results[0]?.result || null;
    },
});
