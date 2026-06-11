import type { OpenSubtitlesConfig } from "@/src/actions/store/server-actions";

// Thin server-side client for the OpenSubtitles.com REST API.
// Docs: https://opensubtitles.stoplight.io/docs/opensubtitles-api
//
// All credentials stay on the server: this module is only ever imported by the
// /api/subtitles/* route handlers, which read them from the httpOnly
// `opensubtitles-config` cookie and pass them in here.

const DEFAULT_BASE_URL = "https://api.opensubtitles.com/api/v1";
// OpenSubtitles requires a descriptive, app-specific User-Agent.
const USER_AGENT = "Aperture Subtitle Finder v1.0";

interface CachedLogin {
  token: string;
  baseUrl: string;
  expiresAt: number;
}

// Module-level cache. Aperture runs as a long-lived `bun run start` server, so
// this persists across requests and avoids re-logging-in (which counts against
// the account) on every search/download. Keyed by apiKey+username.
const loginCache = new Map<string, CachedLogin>();
// Login tokens are valid ~24h; refresh a little early to be safe.
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;

function loginKey(config: OpenSubtitlesConfig): string {
  return `${config.apiKey}::${config.username}`;
}

function baseHeaders(apiKey: string): Record<string, string> {
  return {
    "Api-Key": apiKey,
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export class OpenSubtitlesError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = "OpenSubtitlesError";
  }
}

async function login(config: OpenSubtitlesConfig): Promise<CachedLogin> {
  const cached = loginCache.get(loginKey(config));
  if (cached && cached.expiresAt > nowMs()) {
    return cached;
  }

  const res = await fetch(`${DEFAULT_BASE_URL}/login`, {
    method: "POST",
    headers: baseHeaders(config.apiKey),
    body: JSON.stringify({
      username: config.username,
      password: config.password,
    }),
  });

  if (!res.ok) {
    const detail = await safeError(res);
    throw new OpenSubtitlesError(
      `OpenSubtitles login failed: ${detail}`,
      res.status === 401 ? 401 : 502,
    );
  }

  const data = (await res.json()) as {
    token?: string;
    base_url?: string;
  };

  if (!data.token) {
    throw new OpenSubtitlesError("OpenSubtitles login returned no token", 502);
  }

  // The API may hand back a dedicated base_url (e.g. a VIP subdomain) that
  // should be used for subsequent authenticated calls like /download.
  const baseUrl = data.base_url
    ? `https://${data.base_url.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/api/v1`
    : DEFAULT_BASE_URL;

  const entry: CachedLogin = {
    token: data.token,
    baseUrl,
    expiresAt: nowMs() + TOKEN_TTL_MS,
  };
  loginCache.set(loginKey(config), entry);
  return entry;
}

export interface SubtitleSearchParams {
  imdbId?: string;
  tmdbId?: string;
  query?: string;
  languages?: string; // comma separated, lower-case ISO 639
  year?: string;
  seasonNumber?: string;
  episodeNumber?: string;
}

export interface SubtitleResult {
  fileId: number | null;
  fileName: string;
  language: string;
  release: string;
  fps: number | null;
  downloadCount: number;
  ratings: number;
  fromTrusted: boolean;
  hearingImpaired: boolean;
  hd: boolean;
  aiTranslated: boolean;
  machineTranslated: boolean;
  uploadDate: string | null;
}

export async function searchSubtitles(
  config: OpenSubtitlesConfig,
  params: SubtitleSearchParams,
): Promise<SubtitleResult[]> {
  const search = new URLSearchParams();
  if (params.imdbId) search.set("imdb_id", stripImdb(params.imdbId));
  if (params.tmdbId) search.set("tmdb_id", params.tmdbId);
  if (params.query) search.set("query", params.query);
  if (params.languages) search.set("languages", params.languages.toLowerCase());
  if (params.year) search.set("year", params.year);
  if (params.seasonNumber) search.set("season_number", params.seasonNumber);
  if (params.episodeNumber) search.set("episode_number", params.episodeNumber);
  // Most-downloaded first tends to surface the well-synced releases.
  search.set("order_by", "download_count");

  // Search works unauthenticated, but sending the token (when we have one
  // cached) is harmless and keeps behaviour consistent.
  const headers = baseHeaders(config.apiKey);
  const cached = loginCache.get(loginKey(config));
  if (cached && cached.expiresAt > nowMs()) {
    headers["Authorization"] = `Bearer ${cached.token}`;
  }

  const res = await fetch(`${DEFAULT_BASE_URL}/subtitles?${search.toString()}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const detail = await safeError(res);
    throw new OpenSubtitlesError(
      `OpenSubtitles search failed: ${detail}`,
      res.status === 401 ? 401 : 502,
    );
  }

  const json = (await res.json()) as { data?: any[] };
  const items = Array.isArray(json.data) ? json.data : [];

  return items.map((item): SubtitleResult => {
    const attr = item?.attributes ?? {};
    const file = Array.isArray(attr.files) ? attr.files[0] : undefined;
    return {
      fileId: typeof file?.file_id === "number" ? file.file_id : null,
      fileName: file?.file_name || attr.release || "subtitle",
      language: attr.language || "",
      release: attr.release || "",
      fps: typeof attr.fps === "number" && attr.fps > 0 ? attr.fps : null,
      downloadCount:
        typeof attr.download_count === "number" ? attr.download_count : 0,
      ratings: typeof attr.ratings === "number" ? attr.ratings : 0,
      fromTrusted: !!attr.from_trusted,
      hearingImpaired: !!attr.hearing_impaired,
      hd: !!attr.hd,
      aiTranslated: !!attr.ai_translated,
      machineTranslated: !!attr.machine_translated,
      uploadDate: attr.upload_date || null,
    };
  });
}

export interface DownloadedSubtitle {
  // Base64-encoded subtitle file content, ready for Jellyfin's upload endpoint.
  contentBase64: string;
  fileName: string;
  format: string; // e.g. "srt", "ass"
  remaining: number | null; // remaining daily download quota
}

export async function downloadSubtitle(
  config: OpenSubtitlesConfig,
  fileId: number,
): Promise<DownloadedSubtitle> {
  // Download requires authentication and consumes daily quota.
  const session = await login(config);

  const res = await fetch(`${session.baseUrl}/download`, {
    method: "POST",
    headers: {
      ...baseHeaders(config.apiKey),
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!res.ok) {
    const detail = await safeError(res);
    throw new OpenSubtitlesError(
      `OpenSubtitles download request failed: ${detail}`,
      res.status === 401 ? 401 : 502,
    );
  }

  const data = (await res.json()) as {
    link?: string;
    file_name?: string;
    remaining?: number;
  };

  if (!data.link) {
    throw new OpenSubtitlesError(
      "OpenSubtitles did not return a download link (daily quota may be exhausted)",
      429,
    );
  }

  // The link is a temporary, pre-signed URL to the actual subtitle file.
  const fileRes = await fetch(data.link);
  if (!fileRes.ok) {
    throw new OpenSubtitlesError(
      `Failed to fetch subtitle file: ${fileRes.status}`,
      502,
    );
  }

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const fileName = data.file_name || "subtitle.srt";

  return {
    contentBase64: buffer.toString("base64"),
    fileName,
    format: formatFromName(fileName),
    remaining: typeof data.remaining === "number" ? data.remaining : null,
  };
}

export interface QuotaInfo {
  allowed: number | null;
  remaining: number | null;
  resetTime: string | null;
  level: string | null;
}

// Validates credentials by logging in, then reads the account's quota.
export async function testConnection(
  config: OpenSubtitlesConfig,
): Promise<QuotaInfo> {
  // Force a fresh login so a saved-but-now-invalid key is actually re-checked.
  loginCache.delete(loginKey(config));
  const session = await login(config);

  const res = await fetch(`${session.baseUrl}/infos/user`, {
    method: "GET",
    headers: {
      ...baseHeaders(config.apiKey),
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (!res.ok) {
    // Login already succeeded, so credentials are valid even if this lookup
    // fails for some reason; report unknown quota rather than erroring.
    return { allowed: null, remaining: null, resetTime: null, level: null };
  }

  const json = (await res.json()) as { data?: any };
  const d = json.data ?? {};
  return {
    allowed: typeof d.allowed_downloads === "number" ? d.allowed_downloads : null,
    remaining:
      typeof d.remaining_downloads === "number" ? d.remaining_downloads : null,
    resetTime: d.reset_time || null,
    level: d.level || null,
  };
}

// --- helpers ---

function nowMs(): number {
  // Date.now() is fine in app code (the restriction is only on workflow scripts).
  return Date.now();
}

function stripImdb(id: string): string {
  // OpenSubtitles expects a numeric IMDb id; Jellyfin stores it as "tt0133093".
  return id.replace(/^tt/i, "").replace(/^0+/, "");
}

function formatFromName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const known = ["srt", "ass", "ssa", "vtt", "sub", "smi"];
  return known.includes(ext) ? ext : "srt";
}

async function safeError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return json?.message || json?.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}
