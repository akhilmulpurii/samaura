import { useState, useEffect, useCallback } from "react";
import { JellyfinUserWithToken } from "../types/jellyfin";
import { StoreServerURL } from "../actions/store/store-server-url";
import { StoreAuthData } from "../actions/store/store-auth-data";

interface AuthState {
  serverUrl: string | null;
  user: JellyfinUserWithToken | null;
  timestamp: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

async function parseAuthData(): Promise<{
  serverUrl: string | null;
  user: JellyfinUserWithToken | null;
  timestamp: number | null;
}> {
  try {
    const authData = await StoreAuthData.get();
    if (!authData) {
      return { serverUrl: null, user: null, timestamp: null };
    }
    return {
      serverUrl: authData.serverUrl,
      user: authData.user,
      timestamp: authData.timestamp,
    };
  } catch (error) {
    console.error("Error parsing auth data:", error);
    return { serverUrl: null, user: null, timestamp: null };
  }
}

export async function getServerUrl(): Promise<string | null> {
  return await StoreServerURL.get();
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    serverUrl: null,
    user: null,
    timestamp: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshAuthData = useCallback(async () => {
    try {
      const authData = await parseAuthData();
      const serverUrl = authData.serverUrl || (await getServerUrl());
      const isAuthenticated = !!(authData.user && serverUrl);

      setAuthState({
        serverUrl,
        user: authData.user,
        timestamp: authData.timestamp,
        isAuthenticated,
        isLoading: false,
      });
    } catch (error) {}
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    refreshAuthData();
  }, [refreshAuthData]);

  return {
    ...authState,
  };
}
