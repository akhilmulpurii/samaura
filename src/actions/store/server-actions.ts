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
  // Present only for non-remembered sessions. Absolute idle-expiry so the
  // session ends even if the browser restores its session cookie.
  expiresAt?: number;
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

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year — auth tokens live until revoked
// Login preferences contain no secrets. Keep them much longer so prefill data survives auth-cookie expiry.
const LOGIN_PREFS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

// Idle window for non-remembered ("Keep me signed in" unchecked) sessions.
// Even if the browser restores a session cookie (e.g. Chrome "Continue where
// you left off"), the session is treated as expired after this much inactivity.
const SESSION_MAX_IDLE_SECONDS = 60 * 60 * 8; // 8 hours

function getPersistentCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

function getLoginPrefsCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOGIN_PREFS_MAX_AGE_SECONDS,
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

export async function setServerUrl(
  value: string,
  options?: { persistent?: boolean },
) {
  const cookieOptions =
    options?.persistent === false
      ? getSessionCookieOptions()
      : getPersistentCookieOptions();
  (await cookies()).set(SERVER_URL_KEY, value, cookieOptions);
}

export async function getServerUrl(): Promise<string | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(SERVER_URL_KEY);
  if (val?.value) {
    return val.value;
  }
  const envDefault = process.env.DEFAULT_SERVER_URL?.trim();
  return envDefault || null;
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
    getLoginPrefsCookieOptions(),
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
  const persistent = options?.persistent === true;
  const dataToStore: AuthData = persistent
    ? { ...value, expiresAt: undefined }
    : { ...value, expiresAt: Date.now() + SESSION_MAX_IDLE_SECONDS * 1000 };

  const cookieOptions = persistent
    ? getPersistentCookieOptions()
    : getSessionCookieOptions();

  (await cookies()).set(
    AUTH_DATA_KEY,
    JSON.stringify(dataToStore),
    cookieOptions,
  );
}

export async function getAuthData(): Promise<AuthData | null> {
  const cookieStore = await cookies();
  const val = cookieStore.get(AUTH_DATA_KEY);
  if (!val || !val.value) return null;

  try {
    const parsed = JSON.parse(val.value) as AuthData;
    // Non-remembered sessions carry an idle-expiry. If the expiry has passed,
    // clear only auth so server URL preference can still be reused.
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      cookieStore.delete(AUTH_DATA_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function removeAuthData() {
  (await cookies()).delete(AUTH_DATA_KEY);
}

// Slide the auth cookie TTL on each authenticated visit so active users never
// get logged out while the Jellyfin token is still valid.
// Only applies persistent TTL if the user opted in via "Keep me signed in".
export async function refreshAuthCookieTTL(): Promise<void> {
  const cookieStore = await cookies();
  const val = cookieStore.get(AUTH_DATA_KEY);
  if (!val?.value) return;

  let parsed: AuthData;
  try {
    parsed = JSON.parse(val.value) as AuthData;
  } catch {
    return;
  }

  const prefRaw = cookieStore.get(PREF_KEY);
  let rememberMe = false;
  if (prefRaw?.value) {
    try {
      const prefs = JSON.parse(prefRaw.value) as LoginPreferences;
      rememberMe = prefs.rememberMe === true;
    } catch {}
  }

  if (rememberMe) {
    // Stay signed in: drop any idle-expiry and slide the long TTL forward on
    // auth, server URL, and login preferences
    const persistentData = { ...parsed };
    delete persistentData.expiresAt;
    cookieStore.set(
      AUTH_DATA_KEY,
      JSON.stringify(persistentData),
      getPersistentCookieOptions(),
    );
    const serverUrl = cookieStore.get(SERVER_URL_KEY);
    if (serverUrl?.value) {
      cookieStore.set(
        SERVER_URL_KEY,
        serverUrl.value,
        getPersistentCookieOptions(),
      );
    }
    if (prefRaw?.value) {
      cookieStore.set(PREF_KEY, prefRaw.value, getLoginPrefsCookieOptions());
    }
    return;
  }

  // Non-remembered: if the idle window already passed, leave it to expire.
  if (parsed.expiresAt && Date.now() > parsed.expiresAt) return;

  // Otherwise slide the idle-expiry forward while keeping session-scoped cookies.
  const refreshed: AuthData = {
    ...parsed,
    expiresAt: Date.now() + SESSION_MAX_IDLE_SECONDS * 1000,
  };
  cookieStore.set(
    AUTH_DATA_KEY,
    JSON.stringify(refreshed),
    getSessionCookieOptions(),
  );
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
            getLoginPrefsCookieOptions(),
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
