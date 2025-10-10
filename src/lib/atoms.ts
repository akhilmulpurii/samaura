import { atom } from "jotai";
import { MediaSourceInfo } from "../types/jellyfin";

// Fullscreen state
export const isFullscreenAtom = atom(false);

// Electron state
export const isTauriMacAtom = atom(false);
export const isTauriFullscreenAtom = atom((get) => {
  const isElectronMac = get(isTauriMacAtom);
  const isFullscreen = get(isFullscreenAtom);
  return isElectronMac && isFullscreen;
});

// Media Player state
export interface MediaToPlay {
  id: string;
  name: string;
  type: "Movie" | "Series" | "Episode" | "TvChannel";
  resumePositionTicks?: number;
  selectedVersion?: MediaSourceInfo;
}

export interface CurrentMediaWithSource {
  id: string;
  name: string;
  type: "Movie" | "Series" | "Episode" | "TvChannel";
  mediaSourceId?: string | null;
}

export const isPlayerVisibleAtom = atom(false);
export const currentMediaAtom = atom<MediaToPlay | null>(null);
export const currentMediaWithSourceAtom = atom<CurrentMediaWithSource | null>(
  null
);
export const skipTimestampAtom = atom<number | null>(null);
export const currentTimestampAtom = atom(0);

// Derived atom for playing media
export const playMediaAtom = atom(null, (get, set, media: MediaToPlay) => {
  set(currentMediaAtom, media);
  set(isPlayerVisibleAtom, true);
});

// Derived atom for skipping to timestamp
export const skipToTimestampAtom = atom(null, (get, set, timestamp: number) => {
  set(skipTimestampAtom, timestamp);
  // Clear the timestamp after a short delay to allow the player to consume it
  setTimeout(() => set(skipTimestampAtom, null), 100);
});

// Aurora background colors with transition support
export const auroraColorsAtom = atom<string[]>([
  "#AA5CC3",
  "#00A4DC",
  "#AA5CC3",
]);

export const previousAuroraColorsAtom = atom<string[]>([
  "#AA5CC3",
  "#00A4DC",
  "#AA5CC3",
]);

// Derived atom for updating colors with transition
export const updateAuroraColorsAtom = atom(
  null,
  (get, set, newColors: string[]) => {
    const currentColors = get(auroraColorsAtom);
    set(previousAuroraColorsAtom, currentColors);
    set(auroraColorsAtom, newColors);
  }
);
