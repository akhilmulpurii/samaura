import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models/base-item-dto";
import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models/base-item-kind";
import { ItemFields } from "@jellyfin/sdk/lib/generated-client/models/item-fields";
import { ItemSortBy } from "@jellyfin/sdk/lib/generated-client/models/item-sort-by";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models/sort-order";
import { UserLibraryApi } from "@jellyfin/sdk/lib/generated-client/api/user-library-api";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { getLiveTvApi } from "@jellyfin/sdk/lib/utils/api/live-tv-api";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api/library-api";
import { LibraryStructureApi } from "@jellyfin/sdk/lib/generated-client/api/library-structure-api";
import { getGenresApi } from "@jellyfin/sdk/lib/utils/api/genres-api";
import { VirtualFolderInfo } from "@jellyfin/sdk/lib/generated-client/models/virtual-folder-info";
import { LibraryOptionsResultDto } from "@jellyfin/sdk/lib/generated-client/models/library-options-result-dto";
import { getTvShowsApi } from "@jellyfin/sdk/lib/utils/api/tv-shows-api";
import { createJellyfinInstance } from "../lib/utils";
import { JellyfinUserWithToken } from "../types/jellyfin";
import { StoreAuthData } from "./store/store-auth-data";
import { StoreServerURL } from "./store/store-server-url";
import { LibraryOptions } from "@jellyfin/sdk/lib/generated-client/models";

// Type aliases for easier use
type JellyfinItem = BaseItemDto;

export interface MediaSegment {
  Id: string;
  ItemId: string;
  Type: "Commercial" | "Intro" | "Outro" | "Preview" | "Recap" | "Unknown";
  StartTicks: number;
  EndTicks: number;
}

interface MediaSegmentsResponse {
  Items: MediaSegment[];
  TotalRecordCount: number;
  StartIndex: number;
}

export async function getAuthData(): Promise<{
  serverUrl: string;
  user: JellyfinUserWithToken;
}> {
  try {
    const authData = await StoreAuthData.get();

    if (!authData) {
      throw new Error("Not authenticated");
    }

    return {
      serverUrl: authData.serverUrl,
      user: authData.user,
    };
  } catch {
    throw new Error("Invalid auth data");
  }
}
// Helper function to check if an error is authentication-related
export function isAuthError(error: any): boolean {
  return (
    error?.response?.status === 401 ||
    error?.response?.status === 403 ||
    error?.status === 401 ||
    error?.status === 403
  );
}

export async function fetchMovies(
  limit: number = 20,
  genreIds?: string[],
): Promise<JellyfinItem[]> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getItemsApi(api).getItems({
      userId: user.Id,
      includeItemTypes: [BaseItemKind.Movie],
      recursive: true,
      sortBy: [ItemSortBy.DateCreated],
      sortOrder: [SortOrder.Descending],
      limit,
      genreIds,
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
      ],
    });
    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch movies:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return [];
  }
}
export async function fetchMovieByCollection(
  collectionId: string,
): Promise<JellyfinItem[]> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getItemsApi(api).getItems({
      userId: user.Id,
      includeItemTypes: [BaseItemKind.Movie],
      recursive: true,
      sortBy: [ItemSortBy.DateCreated],
      sortOrder: [SortOrder.Descending],
      parentId: collectionId,
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
      ],
    });
    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch movies:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return [];
  }
}

export async function fetchTVShows(
  limit: number = 20,
  genreIds?: string[],
): Promise<JellyfinItem[]> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getItemsApi(api).getItems({
      userId: user.Id,
      includeItemTypes: [BaseItemKind.Series],
      recursive: true,
      sortBy: [ItemSortBy.DateCreated],
      sortOrder: [SortOrder.Descending],
      limit,
      genreIds,
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
      ],
    });
    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch TV shows:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return [];
  }
}

export async function fetchMediaDetails(
  mediaItemId: string,
): Promise<JellyfinItem | null> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const itemsApi = getItemsApi(api);
    const { data } = await itemsApi.getItems({
      userId: user.Id,
      ids: [mediaItemId],
      fields: [
        ItemFields.MediaSources,
        ItemFields.MediaStreams,
        ItemFields.CanDownload,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.Taglines,
        ItemFields.Genres,
        ItemFields.People,
        ItemFields.Studios,
        ItemFields.Trickplay,
        ItemFields.Chapters,
        ItemFields.ProviderIds,
      ],
    });
    return data.Items?.[0] ?? null;
  } catch (error) {
    console.error("Failed to fetch media details:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return null;
  }
}

export async function fetchPersonDetails(
  personId: string,
): Promise<JellyfinItem | null> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const userLibraryApi = new UserLibraryApi(api.configuration);
    const { data } = await userLibraryApi.getItem({
      userId: user.Id,
      itemId: personId,
    });
    return data;
  } catch (error) {
    console.error("Failed to fetch person details:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return null;
  }
}

export async function fetchPersonFilmography(
  personId: string,
): Promise<JellyfinItem[]> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getItemsApi(api).getItems({
      userId: user.Id,
      includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
      recursive: true,
      personIds: [personId],
      sortBy: [ItemSortBy.ProductionYear],
      sortOrder: [SortOrder.Descending],
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.People,
      ],
    });
    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch person filmography:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return [];
  }
}

export async function fetchResumeItems() {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);

    api.accessToken = user.AccessToken;

    const itemsApi = getItemsApi(api);

    const { data } = await itemsApi.getResumeItems({
      userId: user.Id,
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
      ],
      enableImages: true,
    });
    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch resume items:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    return [];
  }
}

export async function fetchNextUpItems() {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const tvShowsApi = getTvShowsApi(api);
    const { data } = await tvShowsApi.getNextUp({
      userId: user.Id,
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
      ],
      enableImages: true,
    });

    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch next up episodes:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    return [];
  }
}

// Progress tracking functions
export async function reportPlaybackStart(
  itemId: string,
  mediaSourceId: string,
  playSessionId: string,
): Promise<boolean> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const response = await fetch(`${serverUrl}/Sessions/Playing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `MediaBrowser Token="${user.AccessToken}"`,
      },
      body: JSON.stringify({
        ItemId: itemId,
        MediaSourceId: mediaSourceId,
        PlaySessionId: playSessionId,
        CanSeek: true,
        QueueableMediaTypes: ["Video", "Audio"],
        PlayMethod: "Transcode",
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to report playback start:", error);
    return false;
  }
}

export async function reportPlaybackProgress(
  itemId: string,
  mediaSourceId: string,
  playSessionId: string,
  positionTicks: number,
  isPaused: boolean = false,
): Promise<boolean> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const response = await fetch(`${serverUrl}/Sessions/Playing/Progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `MediaBrowser Token="${user.AccessToken}"`,
      },
      body: JSON.stringify({
        ItemId: itemId,
        MediaSourceId: mediaSourceId,
        PlaySessionId: playSessionId,
        PositionTicks: positionTicks,
        IsPaused: isPaused,
        PlayMethod: "Transcode",
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to report playback progress:", error);
    return false;
  }
}

export async function reportPlaybackStopped(
  itemId: string,
  mediaSourceId: string,
  playSessionId: string,
  positionTicks: number,
): Promise<boolean> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const response = await fetch(`${serverUrl}/Sessions/Playing/Stopped`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `MediaBrowser Token="${user.AccessToken}"`,
      },
      body: JSON.stringify({
        ItemId: itemId,
        MediaSourceId: mediaSourceId,
        PlaySessionId: playSessionId,
        PositionTicks: positionTicks,
        PlayMethod: "Transcode",
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to report playback stopped:", error);
    return false;
  }
}

export async function fetchLibraryItems(
  libraryDetails: { id: string; collectionType?: string | undefined },
  limit: number = 50,
  startIndex: number = 0,
): Promise<{ items: JellyfinItem[]; totalRecordCount: number }> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getItemsApi(api).getItems({
      userId: user.Id,
      parentId: libraryDetails.id,
      includeItemTypes: [
        BaseItemKind.Movie,
        BaseItemKind.Series,
        BaseItemKind.BoxSet,
      ],
      recursive: true,
      sortBy: [ItemSortBy.SortName],
      sortOrder: [SortOrder.Ascending],
      limit,
      startIndex,
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.DateCreated,
      ],
    });

    // need to filter out duplicates for boxSets
    let uniqueItems = data.Items || [];
    if (libraryDetails.collectionType === "boxsets") {
      const seenItemIds = new Set<string>();
      uniqueItems = (data.Items || []).filter((item) => {
        if (!item?.Id) return true;
        if (seenItemIds.has(item.Id)) return false;
        seenItemIds.add(item.Id);
        return true;
      });
    }

    return {
      items: uniqueItems,
      totalRecordCount: data.TotalRecordCount || 0,
    };
  } catch (error) {
    console.error("Failed to fetch library items:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return { items: [], totalRecordCount: 0 };
  }
}
export async function fetchLiveTVItems(
  isFavorite: boolean | undefined = undefined,
): Promise<{
  items: JellyfinItem[];
  totalRecordCount: number;
}> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getLiveTvApi(api).getLiveTvChannels({
      userId: user.Id,
      enableImages: true,
      isFavorite,
      sortBy: [ItemSortBy.IsFavoriteOrLiked],
      sortOrder: SortOrder.Ascending,

      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.DateCreated,
      ],
    });

    return {
      items: data.Items || [],
      totalRecordCount: data.TotalRecordCount || 0,
    };
  } catch (error) {
    console.error("Failed to fetch library items:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return { items: [], totalRecordCount: 0 };
  }
}

export async function fetchSimilarItems(itemId: string, limit: number = 12) {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getLibraryApi(api).getSimilarItems({
      itemId: itemId,
      userId: user.Id,
      limit,
    });

    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch library items:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return [];
  }
}

export async function fetchMediaSegments(
  itemId: string,
): Promise<MediaSegmentsResponse | null> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { getMediaSegmentsApi } =
      await import("@jellyfin/sdk/lib/utils/api/media-segments-api");
    const mediaSegmentsApi = getMediaSegmentsApi(api);

    const { data } = await mediaSegmentsApi.getItemSegments({
      itemId,
    });

    return data as any as MediaSegmentsResponse;
  } catch (error) {
    console.error("Failed to fetch media segments:", error);

    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return null;
  }
}

export async function fetchTrickplayTileImageUrl(
  itemId: string,
  width: number,
  index: number,
  mediaSourceId?: string,
): Promise<string | null> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const url = new URL(
      `${serverUrl}/Videos/${itemId}/Trickplay/${width}/${index}.jpg`,
    );

    if (mediaSourceId) {
      url.searchParams.set("mediaSourceId", mediaSourceId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `MediaBrowser Token="${user.AccessToken}"`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    if (
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return null;
    }
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Failed to fetch trickplay tile:", error);

    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return null;
  }
}

export async function scanLibrary(libraryId?: string): Promise<void> {
  try {
    const { serverUrl, user } = await getAuthData();

    let url = `${serverUrl}/Library/Refresh`;

    // If libraryId is provided, scan only that specific library
    if (libraryId) {
      url = `${serverUrl}/Items/${libraryId}/Refresh`;
    }

    // Use direct API call to trigger library scan
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `MediaBrowser Token="${user.AccessToken}"`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to scan library:", error);

    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    throw new Error("Failed to scan library");
  }
}

export async function fetchGenres() {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getGenresApi(api).getGenres({
      userId: user.Id,
    });
    return data;
  } catch (error) {
    console.error("Failed to fetch genres:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return { Items: [], TotalRecordCount: 0, StartIndex: 0 };
  }
}

export async function fetchGenre(genreName: string) {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const { data } = await getGenresApi(api).getGenre({
      userId: user.Id,
      genreName: genreName,
    });
    return data;
  } catch (error) {
    console.error("Failed to fetch genres:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return { Items: [], TotalRecordCount: 0, StartIndex: 0 };
  }
}

export async function fetchHeroItems(): Promise<JellyfinItem[]> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const itemsApi = getItemsApi(api);

    // parallel fetching of different categories
    const [resumeData, latestMovies, latestShows, trendingData] =
      await Promise.all([
        // 1. Resume Items (Connect back to what they were watching)
        itemsApi.getResumeItems({
          userId: user.Id,
          limit: 5,
          fields: [
            ItemFields.PrimaryImageAspectRatio,
            ItemFields.Overview,
            ItemFields.Taglines,
            ItemFields.Genres,
            "ProductionYear" as ItemFields,
            "CommunityRating" as ItemFields,
            "OfficialRating" as ItemFields,
          ],
          enableImages: true,
          mediaTypes: [BaseItemKind.Movie, BaseItemKind.Series] as any,
        }),
        // 2. Latest Movies
        itemsApi.getItems({
          userId: user.Id,
          includeItemTypes: [BaseItemKind.Movie],
          recursive: true,
          sortBy: [ItemSortBy.DateCreated],
          sortOrder: [SortOrder.Descending],
          limit: 5,
          fields: [
            ItemFields.PrimaryImageAspectRatio,
            ItemFields.Overview,
            ItemFields.Taglines,
            ItemFields.Genres,
            "ProductionYear" as ItemFields,
            "CommunityRating" as ItemFields,
            "OfficialRating" as ItemFields,
          ],
          enableImages: true,
        }),
        // 3. Latest TV Shows
        itemsApi.getItems({
          userId: user.Id,
          includeItemTypes: [BaseItemKind.Series],
          recursive: true,
          sortBy: [ItemSortBy.DateCreated],
          sortOrder: [SortOrder.Descending],
          limit: 5,
          fields: [
            ItemFields.PrimaryImageAspectRatio,
            ItemFields.Overview,
            ItemFields.Taglines,
            ItemFields.Genres,
            "ProductionYear" as ItemFields,
            "CommunityRating" as ItemFields,
            "OfficialRating" as ItemFields,
          ],
          enableImages: true,
        }),
        // 4. Trending/High Rated (Discovery)
        itemsApi.getItems({
          userId: user.Id,
          includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Series],
          recursive: true,
          sortBy: [ItemSortBy.CommunityRating],
          sortOrder: [SortOrder.Descending],
          limit: 10,
          filters: [
            /* You might want 'IsUnplayed' here if you want new discoveries */
          ],
          fields: [
            ItemFields.PrimaryImageAspectRatio,
            ItemFields.Overview,
            ItemFields.Taglines,
            ItemFields.Genres,
            "ProductionYear" as ItemFields,
            "CommunityRating" as ItemFields,
            "OfficialRating" as ItemFields,
          ],
          enableImages: true,
        }),
      ]);

    const allItems = [
      ...(resumeData.data.Items || []),
      ...(latestMovies.data.Items || []),
      ...(latestShows.data.Items || []),
      ...(trendingData.data.Items || []),
    ];

    // Deduplicate by Id
    const uniqueItems = Array.from(
      new Map(allItems.map((item) => [item.Id, item])).values(),
    );

    // Smart Shuffle / Priority Sort
    // We want a mix: Resume first, then a mix of new and trending
    // Simple approach: Resume items first, then shuffle the rest
    const resumeIds = new Set((resumeData.data.Items || []).map((i) => i.Id));

    const resumeContent = uniqueItems.filter((i) => resumeIds.has(i.Id));
    const discoveryContent = uniqueItems.filter((i) => !resumeIds.has(i.Id));

    // Fisher-Yates shuffle for discovery content
    for (let i = discoveryContent.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [discoveryContent[i], discoveryContent[j]] = [
        discoveryContent[j],
        discoveryContent[i],
      ];
    }

    // Combine: Resume (max 3) + Discovery (max 7) = 10 items for carousel
    return [...resumeContent.slice(0, 3), ...discoveryContent].slice(0, 10);
  } catch (error) {
    console.error("Failed to fetch hero items:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    return [];
  }
}
// ... existing code ...

export async function markFavorite(itemId: string): Promise<boolean> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const response = await fetch(
      `${serverUrl}/Users/${user.Id}/FavoriteItems/${itemId}`,
      {
        method: "POST",
        headers: {
          Authorization: `MediaBrowser Token="${user.AccessToken}"`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.ok;
  } catch (error) {
    console.error("Failed to mark favorite:", error);
    return false;
  }
}

export async function unmarkFavorite(itemId: string): Promise<boolean> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const response = await fetch(
      `${serverUrl}/Users/${user.Id}/FavoriteItems/${itemId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `MediaBrowser Token="${user.AccessToken}"`,
        },
      },
    );

    return response.ok;
  } catch (error) {
    console.error("Failed to unmark favorite:", error);
    return false;
  }
}

export async function fetchVirtualFolders(): Promise<VirtualFolderInfo[]> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const libraryStructureApi = new LibraryStructureApi(api.configuration);
    const { data } = await libraryStructureApi.getVirtualFolders();
    return data || [];
  } catch (error) {
    console.error("Failed to fetch virtual folders:", error);

    // If it's an authentication error, throw an error with a special flag
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }

    return [];
  }
}

export async function removeVirtualFolder(
  name: string,
  refreshLibrary: boolean = false,
): Promise<void> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const libraryStructureApi = new LibraryStructureApi(api.configuration);
    await libraryStructureApi.removeVirtualFolder({ name, refreshLibrary });
  } catch (error) {
    console.error("Failed to remove virtual folder:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    throw error;
  }
}

export async function renameVirtualFolder(
  name: string,
  newName: string,
  refreshLibrary: boolean = false,
): Promise<void> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const libraryStructureApi = new LibraryStructureApi(api.configuration);
    await libraryStructureApi.renameVirtualFolder({
      name,
      newName,
      refreshLibrary,
    });
  } catch (error) {
    console.error("Failed to rename virtual folder:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    throw error;
  }
}

export async function fetchLibraryOptionsInfo(
  contentType: string = "movies",
  isNewLibrary: boolean = false,
): Promise<LibraryOptionsResultDto> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const response = await fetch(
      `${serverUrl}/Libraries/AvailableOptions?LibraryContentType=${contentType}&IsNewLibrary=${isNewLibrary}`,
      {
        method: "GET",
        headers: {
          Authorization: `MediaBrowser Token="${user.AccessToken}"`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch library options:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    // Return empty DTO structure if failed
    return {
      MetadataSavers: [],
      MetadataReaders: [],
      SubtitleFetchers: [],
      LyricFetchers: [],
      TypeOptions: [],
    };
  }
}

export async function addLibrary(
  name: string,
  collectionType: string,
  paths: string[],
  libraryOptions: LibraryOptions,
): Promise<void> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const libraryStructureApi = new LibraryStructureApi(api.configuration);

    await libraryStructureApi.addVirtualFolder({
      name,
      collectionType,
      refreshLibrary: true,
      addVirtualFolderDto: {
        LibraryOptions: {
          ...libraryOptions,
          PathInfos: paths.map((path) => ({ Path: path })),
        },
      },
    } as any);
  } catch (error) {
    console.error("Failed to add library:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    throw error;
  }
}

export async function updateLibraryOptions(
  id: string,
  libraryOptions: LibraryOptions,
): Promise<void> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const libraryStructureApi = new LibraryStructureApi(api.configuration);

    await libraryStructureApi.updateLibraryOptions({
      updateLibraryOptionsDto: {
        Id: id,
        LibraryOptions: libraryOptions,
      },
    } as any);
  } catch (error) {
    console.error("Failed to update library options:", error);
    if (isAuthError(error)) {
      const authError = new Error(
        "Authentication expired. Please sign in again.",
      );
      (authError as any).isAuthError = true;
      throw authError;
    }
    throw error;
  }
}

export async function fetchSeasons(tvShowId: string): Promise<JellyfinItem[]> {
  try {
    const { serverUrl, user } = await getAuthData();
    if (!user.AccessToken) throw new Error("No access token found");

    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;
    const itemsApi = getItemsApi(api);
    const { data } = await itemsApi.getItems({
      userId: user.Id,
      parentId: tvShowId,
      includeItemTypes: [BaseItemKind.Season],
      recursive: false,
      sortBy: [ItemSortBy.SortName],
      sortOrder: [SortOrder.Ascending],
    });
    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch seasons:", error);
    return [];
  }
}

export async function fetchEpisodes(seasonId: string): Promise<JellyfinItem[]> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  try {
    const itemsApi = getItemsApi(api);
    const { data } = await itemsApi.getItems({
      userId: user.Id,
      parentId: seasonId,
      includeItemTypes: [BaseItemKind.Episode],
      recursive: false,
      sortBy: [ItemSortBy.SortName],
      sortOrder: [SortOrder.Ascending],
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.MediaSources,
      ],
    });
    return data.Items || [];
  } catch (error) {
    console.error("Failed to fetch episodes:", error);
    return [];
  }
}

export async function getNextEpisode(
  seasonId: string,
  episodeNumber: number | null | undefined,
): Promise<JellyfinItem | null> {
  if (!seasonId || !episodeNumber) {
    throw new Error("Missing seasonId or episodeNumber");
  }
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  try {
    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const itemsApi = getItemsApi(api);
    const { data } = await itemsApi.getItems({
      userId: user.Id,
      parentId: seasonId,
      includeItemTypes: [BaseItemKind.Episode],
      recursive: false,
      sortBy: [ItemSortBy.SortName],
      sortOrder: [SortOrder.Ascending],
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.MediaSources,
      ],
    });

    if (!data.Items || data.Items.length === 0) {
      return null;
    }

    const currentIndex = data.Items.findIndex(
      (ep: any) => ep.IndexNumber == episodeNumber,
    );

    if (currentIndex >= 0 && currentIndex < data.Items.length - 1) {
      const nextEpisode = data.Items[currentIndex + 1];
      return nextEpisode;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch next episode:", error);
    return null;
  }
}

export async function getPreviousEpisode(
  seasonId: string,
  episodeNumber: number | null | undefined,
): Promise<JellyfinItem | null> {
  if (!seasonId || !episodeNumber) {
    throw new Error("Missing seasonId or episodeNumber");
  }
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  try {
    const jellyfinInstance = createJellyfinInstance();
    const api = jellyfinInstance.createApi(serverUrl);
    api.accessToken = user.AccessToken;

    const itemsApi = getItemsApi(api);
    const { data } = await itemsApi.getItems({
      userId: user.Id,
      parentId: seasonId,
      includeItemTypes: [BaseItemKind.Episode],
      recursive: false,
      sortBy: [ItemSortBy.SortName],
      sortOrder: [SortOrder.Ascending],
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.MediaSources,
      ],
    });

    if (!data.Items || data.Items.length === 0) {
      return null;
    }

    const currentIndex = data.Items.findIndex(
      (ep: any) => ep.IndexNumber == episodeNumber,
    );

    if (currentIndex > 0) {
      const previousEpisode = data.Items[currentIndex - 1];
      return previousEpisode;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch previous episode:", error);
    return null;
  }
}

export async function fetchTVShowDetails(
  tvShowId: string,
): Promise<JellyfinItem | null> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  try {
    const userLibraryApi = new UserLibraryApi(api.configuration);
    const { data } = await userLibraryApi.getItem({
      userId: user.Id,
      itemId: tvShowId,
    });
    return data;
  } catch (error) {
    console.error("Failed to fetch TV show details:", error);
    return null;
  }
}

export async function fetchEpisodeDetails(
  episodeId: string,
): Promise<JellyfinItem | null> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  try {
    const itemsApi = getItemsApi(api);
    const { data } = await itemsApi.getItems({
      userId: user.Id,
      ids: [episodeId],
      fields: [
        ItemFields.MediaSources,
        ItemFields.MediaStreams,
        ItemFields.CanDownload,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.Taglines,
        ItemFields.Genres,
        ItemFields.People,
        ItemFields.Studios,
      ],
    });
    return data.Items?.[0] ?? null;
  } catch (error) {
    console.error("Failed to fetch episode details:", error);
    return null;
  }
}

export async function getNextEpisodeForSeries(
  seriesId: string,
): Promise<JellyfinItem | null> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  try {
    const itemsApi = getItemsApi(api);

    // Get all episodes for the series with user data
    const { data } = await itemsApi.getItems({
      userId: user.Id,
      parentId: seriesId,
      includeItemTypes: [BaseItemKind.Episode],
      recursive: true,
      sortBy: [ItemSortBy.ParentIndexNumber, ItemSortBy.IndexNumber],
      sortOrder: [SortOrder.Ascending, SortOrder.Ascending],
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
        ItemFields.MediaSources,
      ],
    });

    if (!data.Items || data.Items.length === 0) {
      return null;
    }

    // First, look for episodes with resume positions (partially watched)
    const resumableEpisodes = data.Items.filter(
      (episode) =>
        episode.UserData?.PlaybackPositionTicks &&
        episode.UserData.PlaybackPositionTicks > 0 &&
        !episode.UserData.Played,
    );

    if (resumableEpisodes.length > 0) {
      // Return the most recently partially watched episode
      return resumableEpisodes[0];
    }

    // If no resumable episodes, find the first unwatched episode
    const unwatchedEpisodes = data.Items.filter(
      (episode) => !episode.UserData?.Played,
    );

    if (unwatchedEpisodes.length > 0) {
      return unwatchedEpisodes[0];
    }

    // If all episodes are watched, return the first episode for rewatching
    return data.Items[0] || null;
  } catch (error) {
    console.error("Failed to get next episode for series:", error);
    return null;
  }
}
