import { UserLibraryApi } from "@jellyfin/sdk/lib/generated-client/api/user-library-api";
import { getUserViewsApi } from "@jellyfin/sdk/lib/utils/api/user-views-api";
import { getSystemApi } from "@jellyfin/sdk/lib/utils/api/system-api";
import {
  BaseItemDto,
  LogFile,
} from "@jellyfin/sdk/lib/generated-client/models";
import axios from "axios";
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

export async function getImageUrl(
  itemId: string,
  imageType: string = "Primary",
  quality?: number,
  tag?: string,
  maxWidth?: number,
  maxHeight?: number
): Promise<string> {
  const { serverUrl } = await getAuthData();

  const params = new URLSearchParams();

  // Set defaults based on image type
  if (imageType.toLowerCase() === "backdrop") {
    // Keep backdrops at high quality for full-screen display
    params.set("maxWidth", (maxWidth ?? 1920).toString());
    params.set("maxHeight", (maxHeight ?? 1080).toString());
    params.set("quality", (quality ?? 95).toString());
  } else if (imageType.toLowerCase() === "logo") {
    // Keep logos at high quality for crisp display
    params.set("maxWidth", (maxWidth ?? 800).toString());
    params.set("maxHeight", (maxHeight ?? 400).toString());
    params.set("quality", (quality ?? 95).toString());
  } else {
    // Optimize other image types (Primary, Thumb, etc.) for faster loading
    params.set("maxWidth", (maxWidth ?? 400).toString());
    params.set("maxHeight", (maxHeight ?? 600).toString());
    params.set("quality", (quality ?? 80).toString());
  }

  if (tag) {
    params.set("tag", tag);
  }

  return `${serverUrl}/Items/${itemId}/Images/${imageType}?${params.toString()}`;
}

export async function getLiveTVStreamUrl(
  item_id: string
): Promise<string | undefined> {
  try {
    const { serverUrl, user } = await getAuthData();
    const playbackInfoUrl = `${serverUrl}/Items/${item_id}/PlaybackInfo?api_key=${user.AccessToken}`;
    const playbackInfo = await axios.post(playbackInfoUrl);
    if (
      playbackInfo.data &&
      playbackInfo.data.MediaSources &&
      playbackInfo.data.MediaSources.length > 0 &&
      playbackInfo.data.MediaSources[0].Path
    ) {
      const streamUrl = playbackInfo.data.MediaSources[0].Path;
      return streamUrl;
    } else {
      throw new Error("No media sources found for live TV item");
    }
  } catch (error) {
    console.error("Playback Info: ERROR", error);
  }
}

export async function getUserImageUrl(itemId: string): Promise<string> {
  const { serverUrl } = await getAuthData();

  const params = new URLSearchParams();

  // Optimize other image types (Primary, Thumb, etc.) for faster loading
  params.set("maxWidth", "200");
  params.set("maxHeight", "200");
  params.set("quality", "80");

  return `${serverUrl}/Users/${itemId}/Images/Primary?${params.toString()}`;
}

export async function getDownloadUrl(itemId: string): Promise<string> {
  const { serverUrl, user } = await getAuthData();

  return `${serverUrl}/Items/${itemId}/Download?api_key=${user.AccessToken}`;
}

export async function getStreamUrl(
  itemId: string,
  mediaSourceId: string,
  quality?: string,
  videoBitrate?: number,
  audioStreamIndex: number = 1
): Promise<string> {
  const { serverUrl, user } = await getAuthData();

  // Generate a unique PlaySessionId for each stream request
  const playSessionId = crypto.randomUUID();

  let url = `${serverUrl}/Videos/${itemId}/master.m3u8?api_key=${user.AccessToken}&MediaSourceId=${mediaSourceId}&PlaySessionId=${playSessionId}&VideoCodec=h264,hevc&AudioCodec=aac,mp3&TranscodingProfile=Default&AudioStreamIndex=${audioStreamIndex}`;

  // Apply custom bitrate if specified (takes precedence over quality presets)
  if (videoBitrate && videoBitrate > 0) {
    url += `&videoBitRate=${videoBitrate}`;
  } else if (quality) {
    // Fallback to existing quality presets if no custom bitrate is set
    switch (quality) {
      case "2160p":
        url += "&width=3840&height=2160&videoBitRate=20000000";
        break;
      case "1080p":
        url += "&width=1920&height=1080&videoBitRate=8000000";
        break;
      case "720p":
        url += "&width=1280&height=720&videoBitRate=4000000";
        break;
    }
  }

  return url;
}

export async function getSubtitleTracks(
  itemId: string,
  mediaSourceId: string
): Promise<
  Array<{
    kind: string;
    label: string;
    language: string;
    src: string;
    default?: boolean;
  }>
> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  try {
    // First get the media item to find subtitle streams
    const userLibraryApi = new UserLibraryApi(api.configuration);
    const { data: item } = await userLibraryApi.getItem({
      userId: user.Id,
      itemId: itemId,
    });

    const mediaSource = item.MediaSources?.find(
      (ms) => ms.Id === mediaSourceId
    );
    const subtitleStreams =
      mediaSource?.MediaStreams?.filter(
        (stream) => stream.Type === "Subtitle"
      ) || [];
    const subtitleTracks = subtitleStreams.map((stream) => {
      const src = `${serverUrl}/Videos/${itemId}/${mediaSourceId}/Subtitles/${stream.Index}/Stream.js?api_key=${user.AccessToken}`;
      return {
        kind: "subtitles",
        label:
          stream.DisplayTitle || stream.Language || `Track ${stream.Index}`,
        language: stream.Language || "unknown",
        src: src,
        default: stream.IsDefault || false,
      };
    });

    console.log("Subtitle tracks:", subtitleTracks);

    return subtitleTracks;
  } catch (error) {
    console.error("Failed to fetch subtitle tracks:", error);
    return [];
  }
}

export async function getAudioTracks(
  itemId: string,
  mediaSourceId: string
): Promise<
  Array<{
    id: number | undefined;
    label: string;
    language: string;
    codec: string | null | undefined;
    channels: number | null | undefined;
    default: boolean;
  }>
> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  try {
    const userLibraryApi = new UserLibraryApi(api.configuration);
    const { data: item } = await userLibraryApi.getItem({
      userId: user.Id,
      itemId: itemId,
    });

    const mediaSource = item.MediaSources?.find(
      (ms) => ms.Id === mediaSourceId
    );

    // 🔊 Get all audio streams
    const audioStreams =
      mediaSource?.MediaStreams?.filter((stream) => stream.Type === "Audio") ||
      [];

    const audioTracks = audioStreams.map((stream) => ({
      id: stream.Index,
      label:
        stream.DisplayTitle ||
        stream.Language ||
        `${stream.Codec || "Audio"} Track ${stream.Index}`,
      language: stream.Language || "unknown",
      codec: stream.Codec,
      channels: stream.Channels,
      default: stream.IsDefault || false,
    }));

    console.log("Audio tracks:", audioTracks);

    return audioTracks;
  } catch (error) {
    console.error("Failed to fetch audio tracks:", error);
    return [];
  }
}
export async function getUserLibraries(): Promise<BaseItemDto[]> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getUserViewsApi(api).getUserViews({
      userId: user.Id,
      includeExternalContent: true,
    });

    // Filter for movie and TV show libraries only
    const supportedLibraries = (data.Items || []).filter((library: any) => {
      const type = library.CollectionType?.toLowerCase();
      return (
        type === "movies" ||
        type === "tvshows" ||
        type === "boxsets" ||
        type === "livetv"
      );
    });

    return supportedLibraries;
  } catch (error) {
    console.error("Failed to fetch user libraries:", error);
    return [];
  }
}

export async function getLibraryById(
  libraryId: string
): Promise<BaseItemDto | null> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getUserViewsApi(api).getUserViews({
      userId: user.Id,
      includeExternalContent: false,
    });

    const library = (data.Items || []).find((lib: any) => lib.Id === libraryId);
    return library || null;
  } catch (error) {
    console.error("Failed to fetch library by ID:", error);
    return null;
  }
}

export interface RemoteImage {
  ProviderName: string;
  CommunityRating: number;
  Height: number;
  Width: number;
  Language: string;
  RatingType: string;
  Type: string;
  Url: string;
  VoteCount: number;
}

export interface RemoteImagesResponse {
  Images: RemoteImage[];
}

export async function fetchRemoteImages(
  itemId: string,
  type: "Primary" | "Backdrop" | "Logo" | "Thumb" = "Primary",
  startIndex: number = 0,
  limit: number = 30,
  includeAllLanguages: boolean = false
): Promise<RemoteImagesResponse> {
  const { serverUrl, user } = await getAuthData();

  const params = new URLSearchParams({
    type,
    startIndex: startIndex.toString(),
    limit: limit.toString(),
    IncludeAllLanguages: includeAllLanguages.toString(),
  });

  const url = `${serverUrl}/Items/${itemId}/RemoteImages?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `MediaBrowser Token="${user.AccessToken}"`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch remote images: ${response.statusText}`);
  }

  return response.json();
}

export async function downloadRemoteImage(
  itemId: string,
  imageType: "Primary" | "Backdrop" | "Logo" | "Thumb",
  imageUrl: string,
  providerName: string
): Promise<void> {
  const { serverUrl, user } = await getAuthData();

  const params = new URLSearchParams({
    Type: imageType,
    ImageUrl: imageUrl,
    ProviderName: providerName,
  });

  const url = `${serverUrl}/Items/${itemId}/RemoteImages/Download?${params.toString()}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `MediaBrowser Token="${user.AccessToken}"`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download remote image: ${response.statusText}`);
  }
}

export interface CurrentImage {
  ImageType: string;
  ImageIndex?: number;
  ImageTag: string;
  Path: string;
  BlurHash: string;
  Height: number;
  Width: number;
  Size: number;
}

export async function fetchCurrentImages(
  itemId: string
): Promise<CurrentImage[]> {
  const { serverUrl, user } = await getAuthData();

  const url = `${serverUrl}/Items/${itemId}/Images`;

  const response = await fetch(url, {
    headers: {
      Authorization: `MediaBrowser Token="${user.AccessToken}"`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch current images: ${response.statusText}`);
  }

  return response.json();
}

export async function reorderBackdropImage(
  itemId: string,
  currentIndex: number,
  newIndex: number
): Promise<void> {
  const { serverUrl, user } = await getAuthData();
  console.log(
    `Reordering backdrop image for item ${itemId} from index ${currentIndex} to ${newIndex}`
  );

  const url = `${serverUrl}/Items/${itemId}/Images/Backdrop/${currentIndex}/Index?newIndex=${newIndex}`;
  console.log(`Reorder URL: ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `MediaBrowser Token="${user.AccessToken}"`,
    },
  });

  console.log(`Reorder response status: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Failed to reorder backdrop image: ${response.statusText}`);
  }
}

export async function deleteImage(
  itemId: string,
  imageType: string,
  imageIndex?: number
): Promise<void> {
  const { serverUrl, user } = await getAuthData();

  let url = `${serverUrl}/Items/${itemId}/Images/${imageType}`;
  if (imageIndex !== undefined) {
    url += `/${imageIndex}`;
  }

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `MediaBrowser Token="${user.AccessToken}"`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to delete ${imageType} image: ${response.statusText}`
    );
  }
}

export interface UserPolicy {
  IsAdministrator: boolean;
  EnableMediaConversion: boolean;
  EnableContentDeletion: boolean;
}

export interface UserWithPolicy {
  Name: string;
  ServerId: string;
  Id: string;
  HasPassword: boolean;
  HasConfiguredPassword: boolean;
  HasConfiguredEasyPassword: boolean;
  EnableAutoLogin: boolean;
  LastLoginDate: string;
  LastActivityDate: string;
  Configuration: any;
  Policy: UserPolicy;
}

export async function getUserWithPolicy(
  userId: string,
  itemId: string
): Promise<UserWithPolicy | null> {
  const { serverUrl, user } = await getAuthData();

  const url = `${serverUrl}/Users/${userId}/Items/${itemId}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `MediaBrowser Token="${user.AccessToken}"`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch user policy: ${response.statusText}`);
      return null;
    }

    // The API endpoint you provided actually returns item data with user context
    // Let's get the current user data instead, which includes the policy
    const userUrl = `${serverUrl}/Users/${userId}`;
    const userResponse = await fetch(userUrl, {
      headers: {
        Authorization: `MediaBrowser Token="${user.AccessToken}"`,
      },
    });

    if (!userResponse.ok) {
      console.error(`Failed to fetch user data: ${userResponse.statusText}`);
      return null;
    }

    return userResponse.json();
  } catch (error) {
    console.error("Failed to fetch user with policy:", error);
    return null;
  }
}

export async function fetchScheduledTasks(): Promise<any[]> {
  const { serverUrl, user } = await getAuthData();

  const url = `${serverUrl}/ScheduledTasks`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `MediaBrowser Token="${user.AccessToken}"`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch scheduled tasks: ${response.statusText}`
      );
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching scheduled tasks:", error);
    return [];
  }
}

// Types for Jellyfin logs
export interface JellyfinLog {
  DateCreated: string;
  DateModified: string;
  Size: number;
  Name: string;
}

export async function fetchJellyfinLogs(): Promise<LogFile[]> {
  const { serverUrl, user } = await getAuthData();
  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  if (!user.AccessToken) throw new Error("No access token found");

  api.accessToken = user.AccessToken;

  try {
    const systemApi = getSystemApi(api);
    const { data } = await systemApi.getServerLogs();

    return data || [];
  } catch (error) {
    console.error("Failed to fetch Jellyfin logs:", error);
    return [];
  }
}

export async function fetchLogContent(logName: string): Promise<string> {
  const { serverUrl, user } = await getAuthData();
  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  if (!user.AccessToken) throw new Error("No access token found");

  api.accessToken = user.AccessToken;

  try {
    const systemApi = getSystemApi(api);
    const response = await systemApi.getLogFile({
      name: logName,
    });

    return response.data as unknown as string;
  } catch (error) {
    console.error("Failed to fetch log content:", error);
    throw new Error("Could not fetch log content");
  }
}
