import { SystemApi } from "@jellyfin/sdk/lib/generated-client/api/system-api";
import { Configuration } from "@jellyfin/sdk/lib/generated-client/configuration";
import type { UserDto } from "@jellyfin/sdk/lib/generated-client/models/user-dto";
import { createJellyfinInstance } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { StoreServerURL } from "./store/store-server-url";
import { StoreAuthData } from "./store/store-auth-data";

// Type aliases for easier use
type JellyfinUserWithToken = UserDto & { AccessToken?: string };

// Function to get or create a unique device ID for fallback auth
function getDeviceId(): string {
  return uuidv4();
}

export async function setServerUrl(url: string) {
  await StoreServerURL.set(url);
}

export async function getServerUrl(): Promise<string | null> {
  return await StoreServerURL.get();
}

export async function checkServerHealth(
  url: string
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
  password: string
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
      password
    );

    console.log("Authentication successful, received result:", {
      hasAccessToken: !!result.AccessToken,
      hasUser: !!result.User,
      userId: result.User?.Id,
    });

    if (result.AccessToken) {
      const userWithToken = { ...result.User, AccessToken: result.AccessToken };

      await StoreAuthData.set({
        serverUrl,
        user: userWithToken,
        timestamp: Date.now(), // track token age
      });

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
        "Network connection error - check if Jellyfin server is running and accessible"
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
          "X-Emby-Authorization": `MediaBrowser Client="SamAura", Device="SamAura Web Client", DeviceId="${getDeviceId()}", Version="1.0.0"`,
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

          await StoreAuthData.set({
            serverUrl,
            user: userWithToken,
            timestamp: Date.now(), // track token age
          });

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

export function logout(navigate: ReturnType<typeof useNavigate>) {
  Promise.all([StoreAuthData.remove(), StoreServerURL.remove()]).then(() => {
    navigate("/login");
  });
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

export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  const serverUrl = await getServerUrl();
  return !!(user && serverUrl);
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
        Authorization: `MediaBrowser Client="SamAura", Device="SamAura Web Client", DeviceId="${getDeviceId()}", Version="1.0.0"`,
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
