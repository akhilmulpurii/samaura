"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Jellyfin } from "@jellyfin/sdk";
import { SystemApi } from "@jellyfin/sdk/lib/generated-client/api/system-api";
import { Configuration } from "@jellyfin/sdk/lib/generated-client/configuration";
import { UserDto } from "@jellyfin/sdk/lib/generated-client/models/user-dto";
import { createJellyfinInstance } from "@/lib/utils";

const secure = process.env.SECURE_COOKIE
  ? process.env.SECURE_COOKIE.toLowerCase() === "true"
  : process.env.NODE_ENV === "production";

// Type aliases for easier use
type JellyfinUserWithToken = UserDto & { AccessToken?: string };

// Function to get or create a unique device ID for fallback auth
function getDeviceId(): string {
  return crypto.randomUUID();
}

export async function setServerUrl(url: string) {
  const cookieStore = await cookies();
  cookieStore.set("jellyfin-server-url", url, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
    secure,
  });
}

export async function getServerUrl(): Promise<string | null> {
  const cookieStore = await cookies();
  const serverUrl = cookieStore.get("jellyfin-server-url");
  return serverUrl?.value || null;
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

      // Save auth data to cookies
      const cookieStore = await cookies();
      cookieStore.set(
        "jellyfin-auth",
        JSON.stringify({
          serverUrl,
          user: userWithToken,
          timestamp: Date.now(), // Add timestamp to track token age
        }),
        {
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days - extended from 7 days
          sameSite: "lax",
          secure,
        }
      );

      console.log("Authentication data saved to cookies successfully");
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

          // Save auth data to cookies
          const cookieStore = await cookies();
          cookieStore.set(
            "jellyfin-auth",
            JSON.stringify({
              serverUrl,
              user: userWithToken,
              timestamp: Date.now(),
            }),
            {
              path: "/",
              maxAge: 60 * 60 * 24 * 30,
              sameSite: "lax",
              secure,
            }
          );

          console.log(
            "Alternative authentication data saved to cookies successfully"
          );
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

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("jellyfin-auth");
  cookieStore.delete("jellyfin-server-url");
  redirect("/login");
}

export async function getUser(): Promise<JellyfinUserWithToken | null> {
  const cookieStore = await cookies();
  const authData = cookieStore.get("jellyfin-auth");

  if (!authData?.value) {
    return null;
  }

  try {
    const parsed = JSON.parse(authData.value);
    return parsed.user || null;
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
