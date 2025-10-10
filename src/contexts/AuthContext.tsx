import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { JellyfinUserWithToken } from "../types/jellyfin";

interface AuthContextType {
  serverUrl: string | null;
  user: JellyfinUserWithToken | null;
  timestamp: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (serverUrl: string, user: JellyfinUserWithToken) => void;
  logout: () => void;
  refreshAuthData: () => void;
  isTokenExpired: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// Export the hook directly for convenience
export { useAuth };
