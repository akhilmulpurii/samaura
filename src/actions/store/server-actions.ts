"use server";

import { cookies } from "next/headers";
import { AuthenticationResult } from "@jellyfin/sdk/lib/generated-client/models";

// --- Types ---
export interface LoginPreferences {
  username?: string;
  serverUrl?: string;
}

export interface AuthData {
  serverUrl: string;
  user: AuthenticationResult & { AccessToken: string };
  timestamp: number;
}

export type SeerrAuthType = "api-key" | "jellyfin-user" | "local-user";

export type SeerrAuthData =
  | { authType: "api-key"; serverUrl: string; apiKey: string }
  | {
      authType: "jellyfin-user" | "local-user";
      serverUrl: string;
      username: string;
      password: string;
    };

export interface OpenSubtitlesConfig {
  apiKey: string;
  username: string;
  password: string;
  // Comma separated ISO 639 language codes preferred for searches, e.g. "en,es"
  languages?: string;
}

// --- StoreServerURL actions ---
const SERVER_URL_KEY = "jellyfin-server-url";

export async function setServerUrl(value: string) {
  (await cookies()).set(SERVER_URL_KEY, value);
}

export async function getServerUrl(): Promise<string | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(SERVER_URL_KEY);
  return val ? val.value : null;
}

export async function removeServerUrl() {
  (await cookies()).delete(SERVER_URL_KEY);
}

// --- StoreLoginPreferences actions ---
const PREF_KEY = "login-preferences";

export async function setLoginPreferences(value: LoginPreferences) {
  (await cookies()).set(PREF_KEY, JSON.stringify(value));
}

export async function getLoginPreferences(): Promise<LoginPreferences | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PREF_KEY);
  if (!raw || !raw.value) return null;
  try {
    return JSON.parse(raw.value) as LoginPreferences;
  } catch {
    return null;
  }
}

export async function removeLoginPreferences() {
  (await cookies()).delete(PREF_KEY);
}

// --- StoreAuthData actions ---
const AUTH_DATA_KEY = "jellyfin-auth";

export async function setAuthData(value: AuthData) {
  (await cookies()).set(AUTH_DATA_KEY, JSON.stringify(value));
}

export async function getAuthData(): Promise<AuthData | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(AUTH_DATA_KEY);
  if (!val || !val.value) return null;

  try {
    const parsed = JSON.parse(val.value);
    return parsed as AuthData;
  } catch {
    return null;
  }
}

export async function removeAuthData() {
  (await cookies()).delete(AUTH_DATA_KEY);
}

export async function executeClearAuthDataAction(
  preservePrefs: boolean = true,
) {
  const cookieStore = await cookies();
  
  if (preservePrefs) {
    try {
      const val = cookieStore.get(AUTH_DATA_KEY);
      if (val && val.value) {
        const parsed = JSON.parse(val.value) as AuthData;
        const userName =
          (parsed?.user as any)?.Name || parsed?.user?.User?.Name;
        if (userName) {
          cookieStore.set(PREF_KEY, JSON.stringify({ username: userName }));
        }
      }
    } catch (err) {
      console.warn("Failed to save login preferences on auth error:", err);
    }
    cookieStore.delete(AUTH_DATA_KEY);
  } else {
    cookieStore.delete(AUTH_DATA_KEY);
    cookieStore.delete(SERVER_URL_KEY);
  }
}

// --- StoreSeerrData actions ---
const SEERR_DATA_KEY = "seerr-config";

export async function setSeerrData(value: SeerrAuthData) {
  (await cookies()).set(SEERR_DATA_KEY, JSON.stringify(value));
}

export async function getSeerrData(): Promise<SeerrAuthData | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(SEERR_DATA_KEY);
  if (!val || !val.value) return null;

  try {
    const parsed = JSON.parse(val.value);
    return parsed as SeerrAuthData;
  } catch {
    return null;
  }
}

export async function removeSeerrData() {
  (await cookies()).delete(SEERR_DATA_KEY);
}

// --- StoreOpenSubtitlesData actions ---
// Unlike the other config cookies above, this one holds an API key + password
// for a third-party service, so it is stored httpOnly: the value is only ever
// read server-side (the /api/subtitles/* route handlers) and never exposed to
// client-side JavaScript via document.cookie.
const OPENSUBTITLES_DATA_KEY = "opensubtitles-config";

export async function setOpenSubtitlesConfig(value: OpenSubtitlesConfig) {
  (await cookies()).set(OPENSUBTITLES_DATA_KEY, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function getOpenSubtitlesConfig(): Promise<OpenSubtitlesConfig | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(OPENSUBTITLES_DATA_KEY);
  if (!val || !val.value) return null;

  try {
    return JSON.parse(val.value) as OpenSubtitlesConfig;
  } catch {
    return null;
  }
}

export async function removeOpenSubtitlesConfig() {
  (await cookies()).delete(OPENSUBTITLES_DATA_KEY);
}

// Returns just enough for the settings UI to render its "configured" state
// without pulling the secret values into client memory.
export async function getOpenSubtitlesStatus(): Promise<{
  configured: boolean;
  username: string;
  languages: string;
}> {
  const config = await getOpenSubtitlesConfig();
  return {
    configured: !!(config?.apiKey && config?.username && config?.password),
    username: config?.username ?? "",
    languages: config?.languages ?? "en",
  };
}
