import { useState, useEffect, useCallback } from "react";
import { JellyfinUserWithToken } from "../types/jellyfin";

interface AuthState {
  serverUrl: string | null;
  user: JellyfinUserWithToken | null;
  timestamp: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface UseAuthReturn extends AuthState {
  login: (serverUrl: string, user: JellyfinUserWithToken) => void;
  logout: () => void;
  refreshAuthData: () => void;
  isTokenExpired: () => boolean;
}

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

// Helper function to parse auth data from cookie
function parseAuthData(): {
  serverUrl: string | null;
  user: JellyfinUserWithToken | null;
  timestamp: number | null;
} {
  try {
    const authCookie = getCookie("jellyfin-auth");
    if (!authCookie) {
      return { serverUrl: null, user: null, timestamp: null };
    }

    const decoded = decodeURIComponent(authCookie);
    const authData = JSON.parse(decoded);

    return {
      serverUrl: authData.serverUrl || null,
      user: authData.user || null,
      timestamp: authData.timestamp || null,
    };
  } catch (error) {
    console.error("Error parsing auth data:", error);
    return { serverUrl: null, user: null, timestamp: null };
  }
}

// Helper function to get server URL from cookie
function getServerUrl(): string | null {
  try {
    const serverUrlCookie = getCookie("jellyfin-server-url");
    return serverUrlCookie ? decodeURIComponent(serverUrlCookie) : null;
  } catch (error) {
    console.error("Error getting server URL:", error);
    return null;
  }
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>({
    serverUrl: null,
    user: null,
    timestamp: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshAuthData = useCallback(() => {
    const authData = parseAuthData();
    const serverUrl = authData.serverUrl || getServerUrl();
    const isAuthenticated = !!(authData.user && serverUrl);

    setAuthState({
      serverUrl,
      user: authData.user,
      timestamp: authData.timestamp,
      isAuthenticated,
      isLoading: false,
    });
  }, []);

  const secure = import.meta.env.VITE_SECURE_COOKIE
    ? import.meta.env.VITE_SECURE_COOKIE.toLowerCase() === "true"
    : import.meta.env.MODE === "production";

  const login = useCallback(
    (serverUrl: string, user: JellyfinUserWithToken) => {
      const timestamp = Date.now();

      // Set cookies
      const authData = JSON.stringify({
        serverUrl,
        user,
        timestamp,
      });

      const maxAge = 60 * 60 * 24 * 30; // 30 days
      const cookieOptions = `path=/; max-age=${maxAge}; samesite=lax${secure}`;

      document.cookie = `jellyfin-auth=${encodeURIComponent(
        authData
      )}; ${cookieOptions}`;
      document.cookie = `jellyfin-server-url=${encodeURIComponent(
        serverUrl
      )}; ${cookieOptions}`;

      // Update state
      setAuthState({
        serverUrl,
        user,
        timestamp,
        isAuthenticated: true,
        isLoading: false,
      });
    },
    []
  );

  const logout = useCallback(() => {
    // Clear cookies
    document.cookie =
      "jellyfin-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "jellyfin-server-url=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

    // Update state
    setAuthState({
      serverUrl: null,
      user: null,
      timestamp: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Redirect to login
    window.location.href = "/login";
  }, []);

  const isTokenExpired = useCallback((): boolean => {
    if (!authState.timestamp) return true;

    // Check if token is older than 30 days
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - authState.timestamp > thirtyDaysMs;
  }, [authState.timestamp]);

  // Initialize auth state on mount
  useEffect(() => {
    refreshAuthData();
  }, [refreshAuthData]);

  // Listen for storage changes (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === "jellyfin-auth" ||
        event.key === "jellyfin-server-url"
      ) {
        refreshAuthData();
      }
    };

    // Listen for cookie changes by polling (since there's no native cookie change event)
    const checkCookieChanges = () => {
      const currentAuth = parseAuthData();
      const currentServerUrl = getServerUrl();

      if (
        currentAuth.serverUrl !== authState.serverUrl ||
        currentAuth.user?.Id !== authState.user?.Id ||
        currentAuth.timestamp !== authState.timestamp
      ) {
        refreshAuthData();
      }
    };

    // Check for cookie changes every 5 seconds
    const interval = setInterval(checkCookieChanges, 5000);

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [
    refreshAuthData,
    authState.serverUrl,
    authState.user?.Id,
    authState.timestamp,
  ]);

  return {
    ...authState,
    login,
    logout,
    refreshAuthData,
    isTokenExpired,
  };
}
