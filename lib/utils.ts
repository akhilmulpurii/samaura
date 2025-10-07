import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Jellyfin } from "@jellyfin/sdk";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to get or create a unique device ID
function getDeviceId(): string {
  return crypto.randomUUID();
}

// Create Jellyfin SDK instance with unique device ID
export function createJellyfinInstance() {
  return new Jellyfin({
    clientInfo: {
      name: "SamAura",
      version: "1.0.0",
    },
    deviceInfo: {
      name: "SamAura Web Client",
      id: getDeviceId(),
    },
  });
}

export const getMediaDetailsFromName = (name: string) => {
  const resolutionMatch = name.match(/(\d+p)/i);
  const hdrMatch = name.match(/(HDR|DV|Dolby Vision)/i);
  const audioMatch = name.match(
    /(DDP5[.\s]1|TrueHD|DTS-HD MA|DTS-HD|DTS|AAC|AC3|FLAC|Opus)/i
  );

  const details: string[] = [];

  if (resolutionMatch) details.push(resolutionMatch[1]);

  if (audioMatch) {
    let audioDetail = audioMatch[1];
    if (audioDetail.toLowerCase() === "ddp5 1") {
      audioDetail = "DDP5.1";
    }
    details.push(audioDetail);
  }

  if (hdrMatch) {
    details.push(hdrMatch[1].toUpperCase());
  }

  return details.length > 0 ? details.join(" • ") : "Unknown";
};

export const cutOffText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export const formatRuntime = (runTimeTicks?: number) => {
  if (!runTimeTicks) return null;
  const totalMinutes = Math.round(runTimeTicks / 600000000); // Convert from ticks to minutes
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const convertToWebVTT = (trackEvents: {
  TrackEvents: {
    Id: string;
    Text: string;
    StartPositionTicks: number;
    EndPositionTicks: number;
  }[];
}): string => {
  const convertTicksToTime = (ticks: number): string => {
    const totalSeconds = ticks / 10000000;
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toFixed(3).padStart(6, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  let vtt = "WEBVTT\n\n";
  trackEvents.TrackEvents.forEach((event) => {
    const start = convertTicksToTime(event.StartPositionTicks);
    const end = convertTicksToTime(event.EndPositionTicks);
    vtt += `${event.Id}\n${start} --> ${end}\n${event.Text}\n\n`;
  });
  return vtt;
};

// Convert timestamp string (HH:MM:SS or MM:SS) to seconds
export const convertTimestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(":");

  if (parts.length === 2) {
    // MM:SS format
    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // If format is not recognized, try to parse as float (assume it's already in seconds)
  const parsed = parseFloat(timestamp);
  return isNaN(parsed) ? 0 : parsed;
};

// Convert ticks to formatted time string (HH:MM:SS or MM:SS)
export const formatPlaybackPosition = (ticks: number): string => {
  const totalSeconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
