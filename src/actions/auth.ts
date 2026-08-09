import { SystemApi } from "@jellyfin/sdk/lib/generated-client/api/system-api";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { getQuickConnectApi } from "@jellyfin/sdk/lib/utils/api/quick-connect-api";
import { Configuration } from "@jellyfin/sdk/lib/generated-client/configuration";
import type { UserDto } from "@jellyfin/sdk/lib/generated-client/models/user-dto";
import { createJellyfinInstance } from "../lib/utils";
import { getDeviceId } from "../lib/device-id";
import { StoreServerURL } from "./store/store-server-url";
import { StoreAuthData } from "./store/store-auth-data";
import { StoreSeerrData } from "./store/store-seerr-data";
import { isAuthError } from "./media";

// Type aliases for easier use
type JellyfinUserWithToken = UserDto & { AccessToken?: string };

const CLIENT_NAME = "Aperture";
const CLIENT_VERSION = "1.0.0";
const DEVICE_NAME = "Aperture Web Client";

export interface QuickConnectResult {
  Authenticated?: boolean;
  Secret?: string;
  Code?: string;
  DeviceId?: string;
  DeviceName?: string;
  AppName?: string;
  AppVersion?: string;
  DateAdded?: string;
}

function buildAuthorizationHeader(
  additional?: Record<string, string | undefined>,
) {
  const parts = [
    `MediaBrowser Client="${CLIENT_NAME}"`,
    `Device="${DEVICE_NAME}"`,
    `DeviceId="${getDeviceId()}"`,
    `Version="${CLIENT_VERSION}"`,
  ];

  if (additional) {
    Object.entries(additional).forEach(([key, value]) => {
      if (value) {
        parts.push(`${key}="${value}"`);
      }
    });
  }

  return parts.join(", ");
}

export async function setServerUrl(url: string) {
  await StoreServerURL.set(url);
}

export async function getServerUrl(): Promise<string | null> {
  return await StoreServerURL.get();
}

export async function checkServerHealth(
  url: string,
): Promise<{ success: boolean; finalUrl?: string; error?: string }> {
  // Helper function to test a URL
  const testUrl = async (testUrl: string): Promise<boolean> => {
    try {
      const systemApi = new SystemApi(new Configuration({ basePath: testUrl }));
      const { data } = await systemApi.getPublicSystemInfo();
      return Boolean(data.ServerName);
    } catch (error) {
      console.log(`Connection failed for ${testUrl}:`, error);
      return false;
    }
  };

  // If URL already has a protocol, try it directly
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const success = await testUrl(url);
    if (success) {
      return { success: true, finalUrl: url };
    }
    return {
      success: false,
      error:
        "Unable to connect to server. Please check the URL and ensure the server is running.",
    };
  }

  // If no protocol, try HTTPS first (more secure), then HTTP as fallback
  const httpsUrl = `https://${url}`;
  const httpUrl = `http://${url}`;

  // Try HTTPS first
  const httpsSuccess = await testUrl(httpsUrl);
  if (httpsSuccess) {
    return { success: true, finalUrl: httpsUrl };
  }

  // Try HTTP if HTTPS failed
  const httpSuccess = await testUrl(httpUrl);
  if (httpSuccess) {
    return { success: true, finalUrl: httpUrl };
  }

  return {
    success: false,
    error:
      "Unable to connect to server. Please check the URL and ensure the server is running.",
  };
}

export async function authenticateUser(
  username: string,
  password: string,
  rememberMe: boolean = false,
): Promise<boolean> {
  const serverUrl = await getServerUrl();
  if (!serverUrl) {
    console.error("No server URL configured");
    return false;
  }

  // First try with the SDK
  try {
    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);

    // Log the request details for debugging
    console.log("Authentication request details:", {
      serverUrl,
      username: username,
      clientInfo: jellyfinInstance.clientInfo,
      deviceInfo: jellyfinInstance.deviceInfo,
    });

    const { data: result } = await api.authenticateUserByName(
      username,
      password,
    );

    console.log("Authentication successful, received result:", {
      hasAccessToken: !!result.AccessToken,
      hasUser: !!result.User,
      userId: result.User?.Id,
    });

    if (result.AccessToken) {
      const userWithToken = { ...result.User, AccessToken: result.AccessToken };

      await StoreAuthData.set(
        {
          serverUrl,
          user: userWithToken,
          timestamp: Date.now(), // track token age
        },
        { persistent: rememberMe },
      );

      // Keep the server URL cookie lifetime aligned with the session choice.
      await StoreServerURL.set(serverUrl, { persistent: rememberMe });

      return true;
    } else {
      console.error("Authentication response missing AccessToken");
    }
  } catch (error: any) {
    console.error("SDK Authentication failed with error:", {
      message: error.message,
      status: error.status || error.response?.status,
      statusText: error.statusText || error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
      },
    });

    // If it's a network/connection error
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      console.error(
        "Network connection error - check if Jellyfin server is running and accessible",
      );
      return false;
    }

    // Try alternative authentication method with direct fetch
    console.log("Trying alternative authentication method...");

    try {
      const response = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Emby-Authorization": buildAuthorizationHeader(),
        },
        body: JSON.stringify({
          Username: username,
          Pw: password,
        }),
      });

      console.log("Alternative auth response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Alternative authentication successful:", {
          hasAccessToken: !!result.AccessToken,
          hasUser: !!result.User,
          userId: result.User?.Id,
        });

        if (result.AccessToken) {
          const userWithToken = {
            ...result.User,
            AccessToken: result.AccessToken,
          };

          await StoreAuthData.set(
            {
              serverUrl,
              user: userWithToken,
              timestamp: Date.now(), // track token age
            },
            { persistent: rememberMe },
          );

          // Keep the server URL cookie lifetime aligned with the session choice.
          await StoreServerURL.set(serverUrl, { persistent: rememberMe });

          return true;
        }
      } else {
        const errorText = await response.text();
        console.error("Alternative authentication failed:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
      }
    } catch (fetchError: any) {
      console.error("Alternative authentication fetch failed:", fetchError);
    }
  }
  return false;
}

async function fetchQuickConnectEnabledPublic(
  serverUrl: string,
): Promise<boolean | null> {
  try {
    const response = await fetch(`${serverUrl}/QuickConnect/Enabled`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Emby-Authorization": buildAuthorizationHeader(),
      },
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (!text) return null;

    try {
      return Boolean(JSON.parse(text));
    } catch {
      return text.trim().toLowerCase() === "true";
    }
  } catch (error) {
    console.error("Quick Connect availability check failed:", error);
    return null;
  }
}

async function fetchQuickConnectEnabledWithAuth(
  serverUrl: string,
): Promise<boolean | null> {
  try {
    const authData = await StoreAuthData.get();
    if (!authData?.user) {
      return null;
    }

    const storedUser = authData.user as JellyfinUserWithToken;
    if (!storedUser.AccessToken) {
      return null;
    }

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = storedUser.AccessToken;

    const quickConnectApi = getQuickConnectApi(api);
    const { data } = await quickConnectApi.getQuickConnectEnabled();
    return Boolean(data);
  } catch (error) {
    console.error(
      "Authenticated Quick Connect availability check failed:",
      error,
    );
    return null;
  }
}

export async function isQuickConnectEnabled(
  allowAuthenticatedFallback: boolean = false,
): Promise<boolean> {
  const serverUrl = await getServerUrl();
  if (!serverUrl) return false;

  const publicResult = await fetchQuickConnectEnabledPublic(serverUrl);
  if (publicResult !== null) {
    return publicResult;
  }

  if (allowAuthenticatedFallback) {
    const authenticatedResult =
      await fetchQuickConnectEnabledWithAuth(serverUrl);
    if (authenticatedResult !== null) {
      return authenticatedResult;
    }
  }

  return false;
}

export async function initiateQuickConnect(): Promise<QuickConnectResult | null> {
  const serverUrl = await getServerUrl();
  if (!serverUrl) return null;

  try {
    const response = await fetch(`${serverUrl}/QuickConnect/Initiate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "X-Emby-Authorization": buildAuthorizationHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Quick Connect initiate failed with status ${response.status}`,
      );
    }

    const result = (await response.json()) as QuickConnectResult;
    if (!result || !result.Secret || !result.Code) {
      throw new Error(
        "Quick Connect did not return a valid code. Please try again or use your password.",
      );
    }

    return result;
  } catch (error) {
    console.error("Failed to initiate Quick Connect:", error);
    throw error;
  }
}

export async function getQuickConnectStatus(
  secret: string,
): Promise<QuickConnectResult | null> {
  const serverUrl = await getServerUrl();
  if (!serverUrl || !secret) return null;

  try {
    const params = new URLSearchParams({ secret });
    const response = await fetch(
      `${serverUrl}/QuickConnect/Connect?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Emby-Authorization": buildAuthorizationHeader(),
        },
      },
    );

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Quick Connect status failed with status ${response.status} ${response.statusText}`,
      );
    }

    const result = (await response.json()) as QuickConnectResult;
    return result ?? null;
  } catch (error) {
    console.error("Failed to retrieve Quick Connect status:", error);
    throw error;
  }
}

export async function authenticateWithQuickConnect(
  secret: string,
  rememberMe: boolean = false,
): Promise<boolean> {
  const serverUrl = await getServerUrl();
  if (!serverUrl || !secret) return false;

  try {
    const response = await fetch(
      `${serverUrl}/Users/AuthenticateWithQuickConnect`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Emby-Authorization": buildAuthorizationHeader(),
        },
        body: JSON.stringify({ Secret: secret }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Quick Connect authentication failed (${response.status}): ${errorBody}`,
      );
    }

    const result = await response.json();
    if (result?.AccessToken && result?.User) {
      const userWithToken = {
        ...result.User,
        AccessToken: result.AccessToken,
      };

      await StoreAuthData.set(
        {
          serverUrl,
          user: userWithToken,
          timestamp: Date.now(),
        },
        { persistent: rememberMe },
      );

      // Keep the server URL cookie lifetime aligned with the session choice.
      await StoreServerURL.set(serverUrl, { persistent: rememberMe });

      return true;
    }

    throw new Error("Quick Connect response missing authentication details.");
  } catch (error) {
    console.error("Quick Connect authentication error:", error);
    return false;
  }
}

export async function logout(
  navigate: (redirectPath: string) => void,
): Promise<void> {
  // Non-blocking server-side token revocation to keep jellyfin sessions clean.
  try {
    const authData = await StoreAuthData.get();
    if (authData?.serverUrl && (authData.user as any)?.AccessToken) {
      await fetch(`${authData.serverUrl}/Sessions/Logout`, {
        method: "POST",
        headers: {
          Authorization: `MediaBrowser Token="${(authData.user as any).AccessToken}"`,
        },
      });
    }
  } catch {}

  await Promise.all([StoreAuthData.remove(), StoreSeerrData.remove()]);

  navigate("/login");
}

export async function getUser(): Promise<JellyfinUserWithToken | null> {
  try {
    const authData = await StoreAuthData.get();
    if (!authData) return null;
    return authData.user || null;
  } catch {
    return null;
  }
}

export async function changeUserPassword(
  currentPassword?: string,
  newPassword?: string,
  targetUserId?: string,
  resetPassword?: boolean,
): Promise<void> {
  const authData = await StoreAuthData.get();

  if (!authData?.serverUrl || !authData.user) {
    throw new Error("You must be signed in to update your password.");
  }

  const storedUser = authData.user as JellyfinUserWithToken;

  if (!storedUser?.Id) {
    throw new Error("We couldn't determine which user to update.");
  }

  if (!storedUser.AccessToken) {
    throw new Error("Missing authentication token. Please sign in again.");
  }

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(authData.serverUrl);
  api.accessToken = storedUser.AccessToken;
  const userApi = getUserApi(api);

  try {
    const userIdToUpdate = targetUserId || storedUser.Id;

    await userApi.updateUserPassword({
      userId: userIdToUpdate,
      updateUserPassword: {
        CurrentPw: currentPassword,
        NewPw: newPassword,
        ResetPassword: resetPassword,
      },
    });
  } catch (error: any) {
    console.error("Failed to update password:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    const serverMessage =
      error?.response?.data?.Message ||
      error?.response?.data?.ErrorMessage ||
      error?.response?.data?.message;

    throw new Error(
      serverMessage || "Unable to update password. Please try again.",
    );
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  const serverUrl = await getServerUrl();
  return !!(user && serverUrl && user.AccessToken);
}

export async function authorizeQuickConnectCode(code: string): Promise<void> {
  if (!code.trim()) {
    throw new Error("Enter a valid Quick Connect code.");
  }

  const authData = await StoreAuthData.get();
  if (!authData?.serverUrl || !authData.user) {
    throw new Error("You must be signed in to approve Quick Connect requests.");
  }

  const storedUser = authData.user as JellyfinUserWithToken;
  if (!storedUser.Id || !storedUser.AccessToken) {
    throw new Error("Missing account information. Please sign in again.");
  }

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(authData.serverUrl);
  api.accessToken = storedUser.AccessToken;

  const quickConnectApi = getQuickConnectApi(api);

  try {
    await quickConnectApi.authorizeQuickConnect({
      code,
      userId: storedUser.Id,
    });
  } catch (error: any) {
    console.error("Quick Connect authorization failed:", error);
    const serverMessage =
      error?.response?.data?.Message ||
      error?.response?.data?.ErrorMessage ||
      error?.response?.data?.message;

    throw new Error(
      serverMessage ||
        "We couldn't authorize that code. Double-check it and try again.",
    );
  }
}

// Debug function to test server connection and get server info
export async function debugServerConnection(): Promise<void> {
  const serverUrl = await getServerUrl();
  if (!serverUrl) {
    console.error("No server URL configured");
    return;
  }

  console.log(`Testing connection to: ${serverUrl}`);

  try {
    const systemApi = new SystemApi(new Configuration({ basePath: serverUrl }));
    const { data: systemInfo } = await systemApi.getPublicSystemInfo();

    console.log("Server connection successful!", {
      serverName: systemInfo.ServerName,
      version: systemInfo.Version,
      id: systemInfo.Id,
    });

    // Test authentication endpoint specifically
    const response = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization": buildAuthorizationHeader(),
      },
      body: JSON.stringify({
        Username: "test",
        Pw: "test",
      }),
    });

    console.log("Auth endpoint test response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Auth endpoint error response body:", errorText);
    }
  } catch (error: any) {
    console.error("Server connection failed:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
  }
}
