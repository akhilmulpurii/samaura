"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { Antenna, Play } from "lucide-react";
import { useMediaPlayer } from "@/contexts/MediaPlayerContext";

import { decode } from "blurhash";

export function LiveChannelCard({
  item,
  serverUrl,
}: {
  item: BaseItemDto;
  serverUrl: string;
}) {
  const { playMedia, setIsPlayerVisible } = useMediaPlayer();

  // WIP - Link logic for TV channels
  let linkHref = "/livetv/" + item.Id;

  // Determine image type based on continueWatching

  let imageItemId = item.Id;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null);

  // Adjust image URL parameters based on container type
  const imageUrl = item.ImageTags?.["Primary"]
    ? `${serverUrl}/Items/${imageItemId}/Images/Primary?maxHeight=256&maxWidth=256&quality=100`
    : null;

  // Get blur hash
  const imageTag =
    item.Type === "Episode"
      ? item.ParentThumbImageTag
      : item.ImageTags?.["Primary"]!;
  const blurHash = item.ImageBlurHashes?.["Primary"]?.[imageTag!] || "";

  // Decode blur hash
  useEffect(() => {
    if (blurHash && !blurDataUrl && imageUrl) {
      try {
        const pixels = decode(blurHash, 32, 32);
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const imageData = ctx.createImageData(32, 32);
          imageData.data.set(pixels);
          ctx.putImageData(imageData, 0, 0);
          setBlurDataUrl(canvas.toDataURL());
        }
      } catch (error) {
        console.error("Error decoding blur hash:", error);
      }
    }
  }, [blurHash, blurDataUrl]);

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (item && item.Type !== "BoxSet") {
      await playMedia({
        id: item.Id!,
        name: item.Name!,
        type: item.Type as "Movie" | "Series" | "Episode",
        resumePositionTicks: item.UserData?.PlaybackPositionTicks,
      });
      setIsPlayerVisible(true);
    }
  };

  const lightSpeedUrl = imageUrl
    ? imageUrl?.includes("192.168.")
      ? imageUrl
      : "https://lightspeed.ac/?url=" + imageUrl
    : null;

  return (
    <div
      className={`cursor-pointer group overflow-hidden transition select-none w-36`}
    >
      <div
        className={`relative w-full border rounded-md overflow-hidden active:scale-[0.98] transition aspect-square`}
      >
        <Link href={linkHref} draggable={false} className="block w-full h-full">
          {serverUrl ? (
            <>
              {/* Blur hash placeholder */}
              {blurDataUrl && !imageLoaded && (
                <div
                  className={`absolute inset-0 w-full h-full transition-opacity duration-300 rounded-md`}
                  style={{
                    backgroundImage: `url(${blurDataUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(0px)",
                  }}
                />
              )}
              {/* Actual image */}
              {lightSpeedUrl ? (
                <img
                  src={lightSpeedUrl}
                  alt={item.Name || ""}
                  className={`w-full h-full object-cover transition-opacity duration-300 shadow-lg shadow-sm group-hover:shadow-md rounded-md opacity-100`}
                  onLoad={(e) => {
                    setImageLoaded(true);
                  }}
                  draggable={false}
                  ref={(img) => {
                    // Check if image is already loaded (cached)
                    if (img && img.complete && img.naturalHeight !== 0) {
                      setImageLoaded(true);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-lg shadow-lg p-8">
                  <Antenna className="text-gray-100 dark:text-gray-700 w-full h-full object-cover transition-opacity duration-300 shadow-lg shadow-sm group-hover:shadow-md rounded-md opacity-100" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-lg shadow-lg">
              <div className="text-white/60 text-sm">No Image</div>
            </div>
          )}
        </Link>

        {/* Play button overlay */}
        {item?.Type !== "BoxSet" && (
          <div
            className={`absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center pointer-events-none rounded-md`}
          >
            <div className="invisible group-hover:visible transition-opacity duration-300 pointer-events-auto">
              <button
                onClick={handlePlayClick}
                className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition active:scale-[0.97] hover:cursor-pointer"
              >
                <Play className="h-6 w-6 text-white fill-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Link href={linkHref} draggable={false}>
        <div className="px-1">
          <div className="mt-2.5 text-sm font-medium text-foreground truncate group-hover:underline">
            {item.Name}
          </div>
        </div>
      </Link>
    </div>
  );
}
