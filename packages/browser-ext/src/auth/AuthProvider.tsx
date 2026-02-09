/**
 * Authentication Provider for browser extension
 * Manages user authentication state, cookie sync, and login/logout flows
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { WEBSITE_URL, AUTH_COOKIE_NAMES } from "../services/web-auth";

/**
 * User data structure
 */
export interface User {
  id: string;
  name: string;
  email: string;
  image: string;
  provider: string;
}

/**
 * Auth context type
 */
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authChecked: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Chrome storage wrapper for user data
 */
class AuthStorage {
  private area = chrome.storage.local;

  async getUser(): Promise<User | null> {
    try {
      const result = await this.area.get("user");
      const user = result.user as User | undefined;
      return user ?? null;
    } catch (error) {
      console.error("[AuthProvider] Failed to get user from storage");
      return null;
    }
  }

  async setUser(user: User): Promise<void> {
    try {
      await this.area.set({ user });
    } catch (error) {
      console.error("[AuthProvider] Failed to save user to storage");
    }
  }

  async removeUser(): Promise<void> {
    try {
      await this.area.remove("user");
    } catch (error) {
      console.error("[AuthProvider] Failed to remove user from storage");
    }
  }
}

const storage = new AuthStorage();

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  /**
   * Save user data to storage and state
   */
  const saveUserData = useCallback(async (newUser: User) => {
    await storage.setUser(newUser);
    setUser(newUser);
  }, []);

  /**
   * Clear authentication data
   */
  const clearAuthData = useCallback(async () => {
    await storage.removeUser();
    setUser(null);
  }, []);

  /**
   * Check authentication via API
   */
  const checkCookieAuth = useCallback(async (): Promise<boolean> => {
    try {
      console.log("[AuthProvider] Checking authentication via API...");

      // Get all claudechrome.com cookies
      const cookies = await chrome.cookies.getAll({
        url: WEBSITE_URL,
      });

      // Log only cookie count, not values (security)
      console.log("[AuthProvider] Found cookies:", cookies.length);

      // Check if there are auth-related cookies
      const hasAuthCookie = cookies.some(
        (c) =>
          c.name.includes("better-auth") || c.name.includes("session"),
      );

      if (!hasAuthCookie) {
        console.log("[AuthProvider] No authentication cookies found");
        return false;
      }

      // Call website's auth verify API
      try {
        const response = await fetch(`${WEBSITE_URL}/api/auth/verify`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const sessionData = await response.json();
          // Log only success status, not user data (PII)
          console.log(
            "[AuthProvider] API check successful:",
            sessionData?.authenticated,
          );

          if (sessionData?.authenticated && sessionData?.user) {
            const userData: User = {
              id: sessionData.user.id || sessionData.user.email,
              name: sessionData.user.name || sessionData.user.email,
              email: sessionData.user.email,
              image: sessionData.user.image || "",
              provider: sessionData.user.provider || "email",
            };

            await saveUserData(userData);
            console.log("[AuthProvider] User loaded from API");
            return true;
          }
        } else {
          console.log("[AuthProvider] API returned:", response.status);
        }
      } catch (apiError) {
        console.log("[AuthProvider] Direct API call failed");
      }

      // If direct API call fails, try tab injection method
      const tabs = await chrome.tabs.query({ url: `${WEBSITE_URL}/*` });
      const targetTab = tabs[0];

      if (targetTab?.id) {
        // Inject script to get session data
        const results = await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: async () => {
            try {
              const response = await fetch("/api/auth/verify", {
                method: "GET",
                credentials: "include",
              });
              if (response.ok) {
                return await response.json();
              }
              return null;
            } catch {
              return null;
            }
          },
        });

        const sessionData = results?.[0]?.result;
        if (sessionData?.authenticated && sessionData?.user) {
          const userData: User = {
            id: sessionData.user.id || sessionData.user.email,
            name: sessionData.user.name || sessionData.user.email,
            email: sessionData.user.email,
            image: sessionData.user.image || "",
            provider: sessionData.user.provider || "email",
          };

          await saveUserData(userData);
          console.log("[AuthProvider] User loaded from tab injection");
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("[AuthProvider] Failed to check cookie auth");
      return false;
    }
  }, [saveUserData]);

  // Listen for message from auth success page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== WEBSITE_URL) return;

      if (event.data.type === "AUTH_SUCCESS") {
        const { user: newUser } = event.data;
        // Validate user structure before saving
        if (
          newUser &&
          typeof newUser.email === "string" &&
          newUser.email.length > 0 &&
          newUser.email.length < 256
        ) {
          saveUserData(newUser);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [saveUserData]);

  // Listen for tab updates to detect auth success page
  useEffect(() => {
    const handleTabUpdate = (
      tabId: number,
      changeInfo: chrome.tabs.OnUpdatedInfo,
      tab: chrome.tabs.Tab,
    ) => {
      if (
        changeInfo.status === "complete" &&
        tab.url &&
        tab.url.includes("/auth/extension-success")
      ) {
        // Delay check to ensure localStorage is set
        setTimeout(async () => {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                const token = localStorage.getItem("extension_auth_token");
                const userStr = localStorage.getItem("extension_user");
                if (token && userStr) {
                  try {
                    const user = JSON.parse(userStr);
                    // Clear localStorage
                    localStorage.removeItem("extension_auth_token");
                    localStorage.removeItem("extension_user");
                    return { token, user };
                  } catch {
                    return null;
                  }
                }
                return null;
              },
            });

            const result = results?.[0]?.result;
            if (
              result?.user &&
              typeof result.user.email === "string" &&
              result.user.email.length > 0
            ) {
              console.log("[AuthProvider] Got auth data from tab");
              await saveUserData(result.user);
            }
          } catch (error) {
            console.error("[AuthProvider] Error checking auth on tab");
          }
        }, 1000);
      }
    };

    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.onUpdated.addListener(handleTabUpdate);
      return () => {
        chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      };
    }
  }, [saveUserData]);

  // Listen for cookie changes to sync website login state
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.cookies) return;

    const handleCookieChange = async (
      changeInfo: chrome.cookies.CookieChangeInfo,
    ) => {
      // Only care about claudechrome.com domain auth cookies
      if (!changeInfo.cookie.domain.includes("claudechrome.com")) return;
      if (!AUTH_COOKIE_NAMES.includes(changeInfo.cookie.name)) return;

      console.log("[AuthProvider] Auth cookie changed:", {
        name: changeInfo.cookie.name,
        removed: changeInfo.removed,
      });

      if (changeInfo.removed) {
        // Cookie was removed, user may have logged out on website
        console.log("[AuthProvider] Auth cookie removed, checking...");
        setTimeout(async () => {
          const hasAuthCookie = await chrome.cookies
            .getAll({ url: WEBSITE_URL })
            .then((cookies) =>
              cookies.some((c) => AUTH_COOKIE_NAMES.includes(c.name)),
            );

          if (!hasAuthCookie && user) {
            console.log("[AuthProvider] No auth cookies found, logging out");
            await clearAuthData();
          }
        }, 500);
      } else {
        // Cookie was set or updated, user may have logged in
        console.log("[AuthProvider] Auth cookie set, checking auth...");
        setTimeout(async () => {
          const success = await checkCookieAuth();
          if (success) {
            console.log("[AuthProvider] Successfully synced auth");
          }
        }, 500);
      }
    };

    chrome.cookies.onChanged.addListener(handleCookieChange);

    return () => {
      chrome.cookies.onChanged.removeListener(handleCookieChange);
    };
  }, [user, checkCookieAuth, clearAuthData]);

  // Initialize: load auth data from storage, check cookie if needed
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const savedUser = await storage.getUser();

        if (savedUser) {
          setUser(savedUser);
          // Async validate cookie, don't block UI
          checkCookieAuth()
            .then((isValid) => {
              if (!isValid) {
                setUser(null);
                storage.removeUser();
              }
            })
            .catch(() => {
              console.error("[AuthProvider] Failed to validate cookie");
            });
        } else {
          // Async check cookie
          checkCookieAuth().catch(() => {
            console.error("[AuthProvider] Failed to check cookie auth");
          });
        }
      } catch (error) {
        console.error("[AuthProvider] Failed to load auth data");
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    };

    loadAuthData();
  }, [checkCookieAuth]);

  const login = useCallback(async () => {
    console.log("[AuthProvider] Login function called");
    try {
      const authUrl = `${WEBSITE_URL}/auth/login?source=extension`;
      console.log("[AuthProvider] Opening auth URL");

      let tabCreated = false;

      if (typeof chrome !== "undefined" && chrome.tabs) {
        try {
          await chrome.tabs.create({ url: authUrl });
          console.log("[AuthProvider] Tab created successfully");
          tabCreated = true;
        } catch (chromeError) {
          console.error("[AuthProvider] chrome.tabs.create failed");
        }
      }

      // Fallback if Chrome API fails
      if (!tabCreated) {
        console.log("[AuthProvider] Using fallback method");
        try {
          window.open(authUrl, "_blank");
        } catch {
          window.location.href = authUrl;
        }
      }
    } catch (error) {
      console.error("[AuthProvider] Login failed");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // 1. Clear local extension data
      await clearAuthData();

      // 2. Clear website cookies
      const cookies = await chrome.cookies.getAll({
        url: WEBSITE_URL,
      });

      for (const cookie of cookies) {
        if (
          cookie.name.includes("better-auth") ||
          cookie.name.includes("session")
        ) {
          await chrome.cookies.remove({
            url: WEBSITE_URL,
            name: cookie.name,
          });
        }
      }

      // 3. Notify website to sign out
      try {
        await fetch(`${WEBSITE_URL}/api/auth/signout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch {
        console.warn("[AuthProvider] Failed to sign out from website");
      }

      // 4. Clear all related localStorage data
      if (typeof chrome !== "undefined" && chrome.tabs) {
        try {
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            if (tab.id && tab.url && tab.url.includes(WEBSITE_URL)) {
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: () => {
                    localStorage.removeItem("extension_user");
                    Object.keys(localStorage).forEach((key) => {
                      if (key.startsWith("better-auth")) {
                        localStorage.removeItem(key);
                      }
                    });
                  },
                });
              } catch {
                // Ignore inaccessible tabs
              }
            }
          }
        } catch {
          console.warn("[AuthProvider] Failed to clear localStorage");
        }
      }

      console.log("[AuthProvider] Logout completed successfully");
    } catch (error) {
      console.error("[AuthProvider] Logout failed");
    }
  }, [clearAuthData]);

  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading && !authChecked, // Only show loading when not checked
    authChecked,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

/**
 * Hook to access auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
