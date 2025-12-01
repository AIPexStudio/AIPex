/**
 * Utility functions for browser tools
 */

/**
 * Get the currently active tab
 * @throws Error if no active tab is found
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  return tab;
}

/**
 * Execute a script in the active tab
 * @param func - Function to execute in the tab context
 * @param args - Arguments to pass to the function
 * @returns The result of the script execution
 */
export async function executeScriptInActiveTab<T, Args extends any[]>(
  func: (...args: Args) => T,
  args: Args,
): Promise<T> {
  const tab = await getActiveTab();

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func,
    args,
  });

  return results[0]?.result as T;
}

/**
 * Execute a script in a specific tab
 * @param tabId - The ID of the tab to execute the script in
 * @param func - Function to execute in the tab context
 * @param args - Arguments to pass to the function
 * @returns The result of the script execution
 */
export async function executeScriptInTab<T, Args extends any[]>(
  tabId: number,
  func: (...args: Args) => T,
  args: Args,
): Promise<T> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });

  return results[0]?.result as T;
}
