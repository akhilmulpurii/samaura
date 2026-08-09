"use server";

import { cookies } from "next/headers";
import { AuthenticationResult } from "@jellyfin/sdk/lib/generated-client/models";

// --- Types ---
export interface LoginPreferences {
  username?: string;
  serverUrl?: string;
  rememberMe?: boolean;
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

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getPersistentCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

// --- StoreServerURL actions ---
const SERVER_URL_KEY = "jellyfin-server-url";

export async function setServerUrl(value: string) {
  (await cookies()).set(SERVER_URL_KEY, value, getPersistentCookieOptions());
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
  (await cookies()).set(
    PREF_KEY,
    JSON.stringify(value),
    getPersistentCookieOptions(),
  );
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

export async function setAuthData(
  value: AuthData,
  options?: { persistent?: boolean },
) {
  const cookieOptions = options?.persistent
    ? getPersistentCookieOptions()
    : getSessionCookieOptions();

  (await cookies()).set(AUTH_DATA_KEY, JSON.stringify(value), cookieOptions);
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
      let existingPrefs: LoginPreferences = {};
      const existingPrefsCookie = cookieStore.get(PREF_KEY);
      if (existingPrefsCookie?.value) {
        try {
          existingPrefs = JSON.parse(
            existingPrefsCookie.value,
          ) as LoginPreferences;
        } catch {
          existingPrefs = {};
        }
      }

      const val = cookieStore.get(AUTH_DATA_KEY);
      if (val && val.value) {
        const parsed = JSON.parse(val.value) as AuthData;
        const userName =
          (parsed?.user as any)?.Name || parsed?.user?.User?.Name;
        if (userName) {
          cookieStore.set(
            PREF_KEY,
            JSON.stringify({ ...existingPrefs, username: userName }),
            getPersistentCookieOptions(),
          );
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

export async function setSeerrData(
  value: SeerrAuthData,
  options?: { persistent?: boolean },
) {
  const cookieOptions = options?.persistent
    ? getPersistentCookieOptions()
    : getSessionCookieOptions();

  (await cookies()).set(SEERR_DATA_KEY, JSON.stringify(value), cookieOptions);
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
