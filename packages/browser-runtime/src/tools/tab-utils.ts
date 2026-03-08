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
 * Execute a script in a specific tab
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

/**
 * Execute a script in the active tab
 */
export async function executeScriptInActiveTab<T, Args extends any[]>(
  func: (...args: Args) => T,
  args: Args,
): Promise<T> {
  const tab = await getActiveTab();
  return await executeScriptInTab(tab.id!, func, args);
}
