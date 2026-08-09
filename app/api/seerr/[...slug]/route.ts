import { NextRequest, NextResponse } from "next/server";
import { SeerrMediaItem } from "@/src/types/seerr-types";

// Shared map to track pending logins per user/server
// Note: In serverless environments, this map might be reset frequently.
const loginPromises = new Map<string, Promise<string | null>>();

async function seerrFetch<T>(
  req: NextRequest,
  endpoint: string,
  options: RequestInit = {},
): Promise<{
  success: boolean;
  data?: T;
  message?: string;
  headers?: Headers;
}> {
  const serverUrl = req.headers.get("x-seerr-url");
  if (!serverUrl) {
    return { success: false, message: "No Server URL provided in headers" };
  }

  let baseUrl = serverUrl.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }
  const fullUrl = `${baseUrl}${endpoint}`;

  // Credentials for Auto-Login
  const username = req.headers.get("x-seerr-username");
  const password = req.headers.get("x-seerr-password");
  const authType = req.headers.get("x-seerr-auth-type");

  // Helper: Perform Request
  const makeRequest = async (cookie?: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      ...((options.headers as Record<string, string>) || {}),
    };

    const apiKey = req.headers.get("x-api-key");
    if (apiKey) {
      headers["X-Api-Key"] = apiKey;
    }
    if (cookie) {
      headers["Cookie"] = cookie;
    }

    return fetch(fullUrl, { ...options, headers });
  };

  // Helper: Perform Login (Deduplicated via loginPromises)
  const performLogin = async (): Promise<string | null> => {
    try {
      const authEndpoint =
        authType === "jellyfin-user"
          ? "/api/v1/auth/jellyfin"
          : "/api/v1/auth/local";

      const body =
        authType === "jellyfin-user"
          ? { username, password }
          : { email: username, password };

      const response = await fetch(`${baseUrl}${authEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const setCookie = response.headers.getSetCookie
          ? response.headers.getSetCookie()
          : response.headers.get("set-cookie");

        if (Array.isArray(setCookie)) return setCookie.join("; ");
        return setCookie || null;
      }
    } catch (e) {
      console.error("[SeerrFetch] Auto-login error:", e);
    }
    return null;
  };

  try {
    // 1. Attempt Initial Request
    let response = await makeRequest(req.headers.get("cookie") || undefined);

    // 2. Handle 401 with Auto-Login Retry
    if (response.status === 401 && username && password) {
      const loginKey = `${username}@${baseUrl}`;

      if (!loginPromises.has(loginKey)) {
        // Start new login if none pending
        loginPromises.set(
          loginKey,
          performLogin().finally(() => loginPromises.delete(loginKey)),
        );
      }

      // Wait for the pending login (ours or shared)
      const newCookie = await loginPromises.get(loginKey);

      if (newCookie) {
        response = await makeRequest(newCookie);
      }
    }

    // 3. Handle Response
    if (response.status === 204) {
      return { success: true, headers: response.headers };
    }

    if (response.ok) {
      const data = await response.json();
      return { success: true, data, headers: response.headers };
    }

    // Attempt to parse error message
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.message) errorMessage = errorJson.message;
    } catch {}

    return {
      success: false,
      message: errorMessage,
      headers: response.headers,
    };
  } catch (error) {
    console.error("Seerr Server Fetch Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

function normalizeSeerrItems(results: any[]): SeerrMediaItem[] {
  if (!Array.isArray(results)) return [];
  return results.map((item: any) => ({
    ...item,
    tmdbId: item.tmdbId || item.id,
  })) as SeerrMediaItem[];
}

async function hydrateSeerrItems(
  req: NextRequest,
  results: any[],
): Promise<SeerrMediaItem[]> {
  return Promise.all(
    results.map(async (item: any) => {
      const tmdbId = item.tmdbId || item.id;
      if (!tmdbId) return item as SeerrMediaItem;

      const type = item.mediaType || "movie";
      const detailEndpoint = `/api/v1/${type}/${tmdbId}`;
      const detailResponse = await seerrFetch<any>(req, detailEndpoint);

      if (detailResponse.success && detailResponse.data) {
        const merged = { ...item, ...detailResponse.data };
        merged.tmdbId = tmdbId;
        return merged as SeerrMediaItem;
      }
      return item as SeerrMediaItem;
    }),
  );
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string[] }> },
) {
  const params = await props.params;
  const slug = params.slug;
  const path = slug.join("/");

  if (path === "recently-added") {
    const result = await seerrFetch<{ results: any[]; pageInfo?: any }>(
      req,
      "/api/v1/media?filter=allavailable&take=20&sort=mediaAdded",
      { method: "GET" },
    );

    if (result.success && result.data) {
      const hydrated = await hydrateSeerrItems(req, result.data.results);
      return NextResponse.json({ ...result.data, results: hydrated });
    }
    return NextResponse.json(result, { status: 500 });
  }

  if (path === "trending") {
    const result = await seerrFetch<{ results: any[]; pageInfo?: any }>(
      req,
      "/api/v1/discover/trending?page=1",
      { method: "GET" },
    );

    if (result.success && result.data) {
      const normalized = normalizeSeerrItems(result.data.results);
      return NextResponse.json({ ...result.data, results: normalized });
    }
    return NextResponse.json(result, { status: 500 });
  }

  if (path === "popular-movies") {
    const currentDate = new Date().toISOString().split("T")[0];
    const result = await seerrFetch<{ results: any[]; pageInfo?: any }>(
      req,
      `/api/v1/discover/movies?page=1&primaryReleaseDateGte=${currentDate}`,
      { method: "GET" },
    );

    if (result.success && result.data) {
      const normalized = normalizeSeerrItems(result.data.results);
      return NextResponse.json({ ...result.data, results: normalized });
    }
    return NextResponse.json(result, { status: 500 });
  }

  if (path === "popular-tv") {
    const result = await seerrFetch<{ results: any[]; pageInfo?: any }>(
      req,
      `/api/v1/discover/tv?page=1`,
      { method: "GET" },
    );

    if (result.success && result.data) {
      const normalized = normalizeSeerrItems(result.data.results);
      return NextResponse.json({ ...result.data, results: normalized });
    }
    return NextResponse.json(result, { status: 500 });
  }

  if (path === "recent-requests") {
    const result = await seerrFetch<{ results: any[]; pageInfo?: any }>(
      req,
      "/api/v1/request?filter=all&take=10&sort=modified&skip=0",
      { method: "GET" },
    );

    if (result.success && result.data) {
      const requests = result.data.results;
      const hydratedRequests = await Promise.all(
        requests.map(async (request: any) => {
          if (request.media?.tmdbId && request.type) {
            const detailEndpoint = `/api/v1/${request.type}/${request.media.tmdbId}`;
            const detailResponse = await seerrFetch<any>(req, detailEndpoint);

            if (detailResponse.success && detailResponse.data) {
              return {
                ...request,
                mediaMetadata: {
                  ...detailResponse.data,
                  mediaType: request.type,
                },
              };
            }
          }
          return request;
        }),
      );
      return NextResponse.json({ ...result.data, results: hydratedRequests });
    }
    return NextResponse.json(result, { status: 500 });
  }

  if (path === "discover") {
    try {
      const results = await Promise.allSettled([
        // Recent
        (async () => {
          const r = await seerrFetch<{ results: any[] }>(
            req,
            "/api/v1/media?filter=allavailable&take=20&sort=mediaAdded",
          );
          if (r.success && r.data) {
            return {
              ...r.data,
              results: await hydrateSeerrItems(req, r.data.results),
            };
          }
          throw new Error(r.message || "Failed to fetch recent");
        })(),
        // Trending
        (async () => {
          const r = await seerrFetch<{ results: any[] }>(
            req,
            "/api/v1/discover/trending?page=1",
          );
          if (r.success && r.data) {
            return {
              ...r.data,
              results: normalizeSeerrItems(r.data.results),
            };
          }
          throw new Error(r.message || "Failed to fetch trending");
        })(),
        // Popular Movies
        (async () => {
          const currentDate = new Date().toISOString().split("T")[0];
          const r = await seerrFetch<{ results: any[] }>(
            req,
            `/api/v1/discover/movies?page=1&primaryReleaseDateGte=${currentDate}`,
          );
          if (r.success && r.data) {
            return {
              ...r.data,
              results: normalizeSeerrItems(r.data.results),
            };
          }
          throw new Error(r.message || "Failed to fetch popular movies");
        })(),
        // Popular TV
        (async () => {
          const r = await seerrFetch<{ results: any[] }>(
            req,
            `/api/v1/discover/tv?page=1`,
          );
          if (r.success && r.data) {
            return {
              ...r.data,
              results: normalizeSeerrItems(r.data.results),
            };
          }
          throw new Error(r.message || "Failed to fetch popular tv");
        })(),
        // Recent Requests
        (async () => {
          const r = await seerrFetch<{ results: any[] }>(
            req,
            "/api/v1/request?filter=all&take=10&sort=modified&skip=0",
          );
          if (r.success && r.data) {
            const hydrated = await Promise.all(
              r.data.results.map(async (reqItem: any) => {
                if (reqItem.media?.tmdbId && reqItem.type) {
                  const d = await seerrFetch<any>(
                    req,
                    `/api/v1/${reqItem.type}/${reqItem.media.tmdbId}`,
                  );
                  if (d.success && d.data) {
                    return {
                      ...reqItem,
                      mediaMetadata: { ...d.data, mediaType: reqItem.type },
                    };
                  }
                }
                return reqItem;
              }),
            );
            return { ...r.data, results: hydrated };
          }
          throw new Error(r.message || "Failed to fetch recent requests");
        })(),
      ]);

      const [recent, trending, movies, tv, requests] = results;

      return NextResponse.json({
        recent: recent.status === "fulfilled" ? recent.value : null,
        trending: trending.status === "fulfilled" ? trending.value : null,
        popularMovies: movies.status === "fulfilled" ? movies.value : null,
        popularTv: tv.status === "fulfilled" ? tv.value : null,
        recentRequests: requests.status === "fulfilled" ? requests.value : null,
      });
    } catch (e) {
      console.error("Discovery error", e);
      return NextResponse.json(
        { message: "Internal Server Error during discovery" },
        { status: 500 },
      );
    }
  }

  if (path === "search") {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");
    if (!query) return NextResponse.json([]);

    const r = await seerrFetch<{ results: any[] }>(
      req,
      `/api/v1/search?query=${encodeURIComponent(query)}&page=1`,
    );
    if (r.success && r.data) {
      return NextResponse.json(normalizeSeerrItems(r.data.results));
    }
    return NextResponse.json([], { status: 500 });
  }

  if (path === "auth/me") {
    const r = await seerrFetch(req, "/api/v1/auth/me");
    if (r.success) return NextResponse.json(r.data);
    return NextResponse.json(r, { status: 401 });
  }

  if (slug[0] === "details" && slug.length === 3) {
    const type = slug[1];
    const id = slug[2];
    const r = await seerrFetch(req, `/api/v1/${type}/${id}`);
    if (r.success) return NextResponse.json(r.data);
    return NextResponse.json(r, { status: 404 });
  }

  if (path === "settings/radarr") {
    const r = await seerrFetch(req, "/api/v1/settings/radarr");
    if (r.success) return NextResponse.json(r.data);
    return NextResponse.json(r, { status: 500 });
  }

  if (
    slug[0] === "settings" &&
    slug[1] === "radarr" &&
    slug[3] === "profiles"
  ) {
    const id = slug[2];
    const r = await seerrFetch(req, `/api/v1/settings/radarr/${id}/profiles`);
    if (r.success) return NextResponse.json(r.data);
    return NextResponse.json(r, { status: 500 });
  }

  if (path === "settings/sonarr") {
    const r = await seerrFetch(req, "/api/v1/settings/sonarr");
    if (r.success) return NextResponse.json(r.data);
    return NextResponse.json(r, { status: 500 });
  }

  if (
    slug[0] === "settings" &&
    slug[1] === "sonarr" &&
    slug[3] === "profiles"
  ) {
    const id = slug[2];
    const r = await seerrFetch(req, `/api/v1/settings/sonarr/${id}/profiles`);
    if (r.success) return NextResponse.json(r.data);
    return NextResponse.json(r, { status: 500 });
  }

  return NextResponse.json({ message: "Not Found" }, { status: 404 });
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ slug: string[] }> },
) {
  const params = await props.params;
  const slug = params.slug;
  const path = slug.join("/");

  if (path === "request") {
    const body = await req.json();
    const r = await seerrFetch(req, "/api/v1/request", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (r.success) return NextResponse.json(r.data);
    return NextResponse.json(r, { status: 500 });
  }

  // request/[id]/approve
  if (slug[0] === "request" && slug[2] === "approve") {
    const id = slug[1];
    const r = await seerrFetch(req, `/api/v1/request/${id}/approve`, {
      method: "POST",
    });
    if (r.success) return NextResponse.json({ success: true });
    return NextResponse.json(r, { status: 500 });
  }

  // request/[id]/decline
  if (slug[0] === "request" && slug[2] === "decline") {
    const id = slug[1];
    const r = await seerrFetch(req, `/api/v1/request/${id}/decline`, {
      method: "POST",
    });
    if (r.success) return NextResponse.json({ success: true });
    return NextResponse.json(r, { status: 500 });
  }

  // test-connection or login
  if (path === "test-connection" || path === "login") {
    const body = await req.json();
    const { authType, username, password } = body;

    let endpoint = "";
    let method = "GET";
    let reqBody: any = undefined;

    if (authType === "api-key") {
      endpoint = "/api/v1/auth/me";
    } else if (authType === "local-user") {
      endpoint = "/api/v1/auth/local";
      method = "POST";
      reqBody = { email: username, password };
    } else if (authType === "jellyfin-user") {
      endpoint = "/api/v1/auth/jellyfin";
      method = "POST";
      reqBody = { username, password };
    } else {
      return NextResponse.json(
        { success: false, message: "Unknown auth type" },
        { status: 400 },
      );
    }

    const r = await seerrFetch(req, endpoint, {
      method,
      body: reqBody ? JSON.stringify(reqBody) : undefined,
    });

    if (r.success) {
      const resp = NextResponse.json({
        success: true,
        message: "Connection Successful",
      });

      if (r.headers) {
        const setCookie = r.headers.getSetCookie
          ? r.headers.getSetCookie()
          : r.headers.get("set-cookie");

        if (Array.isArray(setCookie)) {
          setCookie.forEach((c) => resp.headers.append("Set-Cookie", c));
        } else if (setCookie) {
          resp.headers.set("Set-Cookie", setCookie);
        }
      }
      return resp;
    } else {
      return NextResponse.json(r, { status: 401 });
    }
  }

  return NextResponse.json({ message: "Not Found" }, { status: 404 });
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ slug: string[] }> },
) {
  const params = await props.params;
  const slug = params.slug;

  // request/[id]
  if (slug[0] === "request" && slug.length === 2) {
    const id = slug[1];
    const r = await seerrFetch(req, `/api/v1/request/${id}`, {
      method: "DELETE",
    });
    if (r.success) return NextResponse.json({ success: true });
    return NextResponse.json(r, { status: 500 });
  }

  return NextResponse.json({ message: "Not Found" }, { status: 404 });
}
