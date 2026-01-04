import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";

interface SessionTab {
  id: number;
  windowId: number;
  title: string;
  url: string;
}

interface SessionData {
  sessionId: string;
  tab: SessionTab | null;
  lastModified: number;
}

interface DeviceInfo {
  id: string;
  name: string;
  type: string;
  os: string;
}

/**
 * Get all sessions
 */
export async function getAllSessions(): Promise<{
  success: boolean;
  sessions?: SessionData[];
  error?: string;
}> {
  try {
    const sessions = await chrome.sessions.getRecentlyClosed();

    const sessionData = sessions.map((session, index) => ({
      sessionId: `session_${index}`,
      tab: session.tab
        ? {
            id: session.tab.id || 0,
            windowId: session.tab.windowId || 0,
            title: session.tab.title || "",
            url: session.tab.url || "",
          }
        : null,
      lastModified: session.lastModified || 0,
    }));

    return { success: true, sessions: sessionData };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<{
  success: boolean;
  session?: SessionData;
  error?: string;
}> {
  try {
    const session = await chrome.sessions.restore(sessionId);

    return {
      success: true,
      session: {
        sessionId: sessionId,
        tab: session.tab
          ? {
              id: session.tab.id || 0,
              windowId: session.tab.windowId || 0,
              title: session.tab.title || "",
              url: session.tab.url || "",
            }
          : null,
        lastModified: session.lastModified || 0,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Restore session
 */
export async function restoreSession(sessionId: string): Promise<{
  success: boolean;
  session?: {
    sessionId: string;
    tab: SessionTab | null;
  };
  error?: string;
}> {
  try {
    const session = await chrome.sessions.restore(sessionId);

    return {
      success: true,
      session: {
        sessionId: sessionId,
        tab: session.tab
          ? {
              id: session.tab.id || 0,
              windowId: session.tab.windowId || 0,
              title: session.tab.title || "",
              url: session.tab.url || "",
            }
          : null,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get current device
 */
export async function getCurrentDevice(): Promise<{
  success: boolean;
  device?: DeviceInfo;
  error?: string;
}> {
  try {
    return {
      success: true,
      device: {
        id: "current_device",
        name: "Current Device",
        type: "desktop",
        os: "unknown",
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get all devices
 */
export async function getAllDevices(): Promise<{
  success: boolean;
  devices?: DeviceInfo[];
  error?: string;
}> {
  try {
    return {
      success: true,
      devices: [
        {
          id: "current_device",
          name: "Current Device",
          type: "desktop",
          os: "unknown",
        },
      ],
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const getAllSessionsTool = tool({
  name: "get_all_sessions",
  description: "Get all recently closed sessions",
  parameters: z.object({}),
  execute: async () => {
    return await getAllSessions();
  },
});

export const getSessionTool = tool({
  name: "get_session",
  description: "Get session by ID",
  parameters: z.object({
    sessionId: z.string().describe("Session ID"),
  }),
  execute: async ({ sessionId }: { sessionId: string }) => {
    return await getSession(sessionId);
  },
});

export const restoreSessionTool = tool({
  name: "restore_session",
  description: "Restore a previously closed session",
  parameters: z.object({
    sessionId: z.string().describe("Session ID to restore"),
  }),
  execute: async ({ sessionId }: { sessionId: string }) => {
    return await restoreSession(sessionId);
  },
});

export const getCurrentDeviceTool = tool({
  name: "get_current_device",
  description: "Get current device information",
  parameters: z.object({}),
  execute: async () => {
    return await getCurrentDevice();
  },
});

export const getAllDevicesTool = tool({
  name: "get_all_devices",
  description: "Get all synced devices",
  parameters: z.object({}),
  execute: async () => {
    return await getAllDevices();
  },
});
