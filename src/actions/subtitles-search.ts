"use server";

import { UserLibraryApi } from "@jellyfin/sdk/lib/generated-client/api/user-library-api";
import { createJellyfinInstance } from "@/src/lib/utils";
import { getAuthData } from "./utils";

export interface InstalledSubtitle {
  index: number;
  language: string;
  displayTitle: string;
  codec: string;
  isExternal: boolean;
  isForced: boolean;
  isDefault: boolean;
  isHearingImpaired: boolean;
  title: string;
  path: string | null;
}

// Lists the subtitle streams Jellyfin currently knows about for a media source,
// with enough detail to show status and decide what can be deleted (only
// external/sidecar subtitles can be removed; embedded ones cannot).
export async function getInstalledSubtitles(
  itemId: string,
  mediaSourceId: string,
): Promise<InstalledSubtitle[]> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const jellyfinInstance = createJellyfinInstance();
  const api = jellyfinInstance.createApi(serverUrl);
  api.accessToken = user.AccessToken;

  const userLibraryApi = new UserLibraryApi(api.configuration);
  const { data: item } = await userLibraryApi.getItem({
    userId: user.Id,
    itemId,
  });

  const mediaSource =
    item.MediaSources?.find((ms) => ms.Id === mediaSourceId) ||
    item.MediaSources?.[0];

  const streams = mediaSource?.MediaStreams ?? [];
  return streams
    .filter((s) => s.Type === "Subtitle")
    .map((s) => ({
      index: s.Index ?? -1,
      language: s.Language || "",
      displayTitle: s.DisplayTitle || s.Title || s.Language || "Subtitle",
      codec: s.Codec || "",
      isExternal: !!s.IsExternal,
      isForced: !!s.IsForced,
      isDefault: !!s.IsDefault,
      isHearingImpaired: !!(s as { IsHearingImpaired?: boolean })
        .IsHearingImpaired,
      title: s.Title || "",
      path: (s as { Path?: string }).Path || null,
    }));
}

export interface UploadSubtitleInput {
  language: string; // ISO 639 code, e.g. "en"
  format: string; // "srt", "ass", ...
  contentBase64: string;
  isForced?: boolean;
  isHearingImpaired?: boolean;
}

// Hands a subtitle file to Jellyfin's own upload endpoint. Jellyfin writes it
// as an external sidecar next to the media file (in your existing media path)
// and re-indexes it as a selectable track. This is why aperture never needs
// filesystem access to the media volume.
export async function uploadSubtitleToJellyfin(
  itemId: string,
  input: UploadSubtitleInput,
): Promise<{ success: boolean; message?: string }> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const url = `${serverUrl.replace(/\/+$/, "")}/Videos/${itemId}/Subtitles`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `MediaBrowser Token="${user.AccessToken}"`,
    },
    body: JSON.stringify({
      Language: input.language,
      Format: input.format,
      IsForced: input.isForced ?? false,
      IsHearingImpaired: input.isHearingImpaired ?? false,
      Data: input.contentBase64,
    }),
  });

  if (!res.ok) {
    let message = `Upload failed: ${res.status} ${res.statusText}`;
    try {
      const text = await res.text();
      if (text) message = `${message} – ${text.slice(0, 200)}`;
    } catch {}
    return { success: false, message };
  }

  return { success: true };
}

// Removes an external subtitle by its stream index. Embedded subtitle streams
// cannot be deleted (they are part of the container) and will error.
export async function deleteJellyfinSubtitle(
  itemId: string,
  index: number,
): Promise<{ success: boolean; message?: string }> {
  const { serverUrl, user } = await getAuthData();
  if (!user.AccessToken) throw new Error("No access token found");

  const url = `${serverUrl.replace(/\/+$/, "")}/Videos/${itemId}/Subtitles/${index}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `MediaBrowser Token="${user.AccessToken}"`,
    },
  });

  if (!res.ok) {
    return {
      success: false,
      message: `Delete failed: ${res.status} ${res.statusText}`,
    };
  }

  return { success: true };
}
