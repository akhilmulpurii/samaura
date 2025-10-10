import { UserLibraryApi } from "@jellyfin/sdk/lib/generated-client/api/user-library-api";
import { AUTH_COOKIE_NAME, createJellyfinInstance } from "../lib/utils";
import Cookies from "js-cookie";
import { JellyfinUserWithToken } from "../types/jellyfin";

// Helper function to get auth data from cookies
export function getAuthData(): {
  serverUrl: string;
  user: JellyfinUserWithToken;
} {
  const authData = Cookies.get(AUTH_COOKIE_NAME);

  if (!authData) {
    throw new Error("Not authenticated");
  }

  try {
    const parsed = JSON.parse(authData);
    return {
      serverUrl: parsed.serverUrl,
      user: parsed.user,
    };
  } catch {
    throw new Error("Invalid auth data");
  }
}

interface SubtitleEntry {
  timestamp: number;
  timestampFormatted: string;
  text: string;
}

interface SubtitleContentResult {
  success: boolean;
  subtitles: SubtitleEntry[];
  error?: string;
}

// Convert Jellyfin ticks to seconds (1 tick = 100 nanoseconds)
function ticksToSeconds(ticks: number): number {
  return ticks / 10000000;
}

// Format seconds to readable timestamp
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
}

// Parse JSON subtitle content and return all subtitle entries
function parseJsonSubtitles(jsonContent: string): SubtitleEntry[] {
  try {
    const data = JSON.parse(jsonContent);
    const trackEvents = data.TrackEvents || [];

    return trackEvents.map((event: any) => {
      const timestampSeconds = ticksToSeconds(event.StartPositionTicks);
      return {
        timestamp: timestampSeconds,
        timestampFormatted: formatTimestamp(timestampSeconds),
        text: event.Text || "",
      };
    });
  } catch (error) {
    console.error("Failed to parse JSON subtitle content:", error);
    return [];
  }
}

export async function getSubtitleContent(
  itemId: string,
  mediaSourceId: string,
  subtitleIndex: number = 0
): Promise<SubtitleContentResult> {
  try {
    const { serverUrl, user } = await getAuthData();
    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    if (!user.AccessToken) throw new Error("No access token found");

    api.accessToken = user.AccessToken;

    // First get the media item to find subtitle streams
    const userLibraryApi = new UserLibraryApi(api.configuration);
    const { data: item } = await userLibraryApi.getItem({
      userId: user.Id,
      itemId: itemId,
    });

    const mediaSource = item.MediaSources?.find(
      (ms) => ms.Id === mediaSourceId
    );

    if (!mediaSource) {
      return {
        success: false,
        subtitles: [],
        error: "Media source not found",
      };
    }

    const subtitleStreams =
      mediaSource.MediaStreams?.filter(
        (stream) => stream.Type === "Subtitle"
      ) || [];

    if (subtitleStreams.length === 0) {
      return {
        success: false,
        subtitles: [],
        error: "No subtitle streams found for this media",
      };
    }

    if (subtitleIndex >= subtitleStreams.length) {
      return {
        success: false,
        subtitles: [],
        error: `Subtitle index ${subtitleIndex} not found. Available subtitle streams: ${subtitleStreams.length}`,
      };
    }

    const subtitleStream = subtitleStreams[subtitleIndex];

    // Fetch the subtitle content in JSON format
    const subtitleUrl = `${serverUrl}/Videos/${itemId}/${mediaSourceId}/Subtitles/${subtitleStream.Index}/Stream.js?api_key=${user.AccessToken}`;

    console.log("Fetching subtitles from:", subtitleUrl);

    const response = await fetch(subtitleUrl);

    if (!response.ok) {
      return {
        success: false,
        subtitles: [],
        error: `Failed to fetch subtitles: ${response.status} ${response.statusText}`,
      };
    }

    const jsonContent = await response.text();
    console.log("JSON Content length:", jsonContent.length);

    // Parse all subtitle entries
    const subtitles = parseJsonSubtitles(jsonContent);

    console.log(`Parsed ${subtitles.length} subtitle entries`);

    return {
      success: true,
      subtitles: subtitles,
    };
  } catch (error) {
    console.error("Failed to search subtitle content:", error);
    return {
      success: false,
      subtitles: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
