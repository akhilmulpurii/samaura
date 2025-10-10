// types/jellyfin.d.ts
// This file is deprecated. Use @jellyfin/sdk types directly instead.

// Re-export types from the Jellyfin SDK for backward compatibility
export type { BaseItemDto as JellyfinItem } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto'
export type { UserDto as JellyfinUser } from '@jellyfin/sdk/lib/generated-client/models/user-dto'
export type { MediaSourceInfo } from '@jellyfin/sdk/lib/generated-client/models/media-source-info'
export type { MediaStream } from '@jellyfin/sdk/lib/generated-client/models/media-stream'
export type { BaseItemPerson as PersonInfo } from '@jellyfin/sdk/lib/generated-client/models/base-item-person'

// Import UserDto for the extended type
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto'

// Extended type for user with access token
export type JellyfinUserWithToken = UserDto & { AccessToken?: string }

// For backward compatibility, keep the old interface definitions as aliases
// These are now deprecated and should be migrated to use the SDK types

// @deprecated Use JellyfinUserWithToken from '../jellyfin-sdk-types' instead
interface JellyfinUser {
  Id: string;
  Name: string;
  AccessToken: string;
}

// @deprecated Use JellyfinItem from '../jellyfin-sdk-types' instead
interface JellyfinItem {
  Id: string;
  Name: string;
  Type: string;
  ProductionYear?: number;
  Overview?: string;
  ImageTags?: {
    Primary?: string;
    Backdrop?: string;
  };
  BackdropImageTags?: string[];
  CommunityRating?: number;
  RunTimeTicks?: number;
  OfficialRating?: string;
  MediaSources?: MediaSourceInfo[];
  People?: PersonInfo[];
}

// @deprecated Use MediaSourceInfo from '../jellyfin-sdk-types' instead
interface MediaSourceInfo {
  Id: string;
  Name: string;
  Path: string;
  Container: string;
  Size: number;
  MediaStreams: MediaStream[];
}

// @deprecated Use MediaStream from '../jellyfin-sdk-types' instead
interface MediaStream {
  Type: string;
  Codec: string;
  Language?: string;
  Channels?: number;
  BitRate?: number;
  Width?: number;
  Height?: number;
  AverageFrameRate?: number;
}

// @deprecated Use PersonInfo from '../jellyfin-sdk-types' instead
interface PersonInfo {
  Id: string;
  Name: string;
  PrimaryImageTag?: string;
  Role?: string;
}
