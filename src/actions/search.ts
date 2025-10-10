import { ItemsApi } from "@jellyfin/sdk/lib/generated-client/api/items-api";
import { PersonsApi } from "@jellyfin/sdk/lib/generated-client/api/persons-api";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models/base-item-dto";
import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models/base-item-kind";
import { ItemFields } from "@jellyfin/sdk/lib/generated-client/models/item-fields";
import { AUTH_COOKIE_NAME, createJellyfinInstance } from "../lib/utils";
import Cookies from "js-cookie";
import { JellyfinUserWithToken } from "../types/jellyfin";

// Type aliases for easier use
type JellyfinItem = BaseItemDto;

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

export async function searchItems(query: string): Promise<JellyfinItem[]> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  if (!query.trim()) return [];

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  try {
    // Search for media items (movies, series, episodes)
    const itemsApi = new ItemsApi(api.configuration);
    const mediaSearchPromise = itemsApi.getItems({
      userId: user.Id,
      searchTerm: query,
      includeItemTypes: [
        BaseItemKind.Movie,
        BaseItemKind.Series,
        BaseItemKind.Episode,
      ],
      recursive: true,
      limit: 40, // Reduced limit to make room for person results
      fields: [
        ItemFields.CanDelete,
        ItemFields.PrimaryImageAspectRatio,
        ItemFields.Overview,
      ],
    });

    // Search for people
    const personsApi = new PersonsApi(api.configuration);
    const personSearchPromise = personsApi.getPersons({
      searchTerm: query,
      userId: user.Id,
      limit: 10, // Limit person results
      fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.Overview],
      enableImages: true,
    });

    // Execute both searches in parallel
    const [mediaResponse, personResponse] = await Promise.all([
      mediaSearchPromise,
      personSearchPromise,
    ]);

    const mediaItems = mediaResponse.data.Items || [];
    const personItems = personResponse.data.Items || [];

    // Combine results
    const allItems = [...mediaItems, ...personItems];

    // Sort items to prioritize Movies and Series over People and Episodes
    return allItems.sort((a: JellyfinItem, b: JellyfinItem) => {
      const typePriority = { Movie: 1, Series: 2, Person: 3, Episode: 4 };
      const aPriority = typePriority[a.Type as keyof typeof typePriority] || 5;
      const bPriority = typePriority[b.Type as keyof typeof typePriority] || 5;
      return aPriority - bPriority;
    });
  } catch (error) {
    console.error("Failed to search items:", error);
    return [];
  }
}

// Separate function to search only people for testing
export async function searchPeople(query: string): Promise<JellyfinItem[]> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  if (!query.trim()) return [];

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  try {
    const personsApi = new PersonsApi(api.configuration);
    const { data } = await personsApi.getPersons({
      searchTerm: query,
      userId: user.Id,
      limit: 20,
      fields: [ItemFields.PrimaryImageAspectRatio, ItemFields.Overview],
      enableImages: true,
    });

    return data.Items || [];
  } catch (error) {
    console.error("Failed to search people:", error);
    return [];
  }
}
