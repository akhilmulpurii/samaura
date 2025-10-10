import React, { useState, useEffect } from "react";
import { Skeleton } from "../components/ui/skeleton";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { Play } from "lucide-react";
import { useMediaPlayer } from "../contexts/MediaPlayerContext";

import { decode } from "blurhash";
import { Link } from "react-router-dom";

export function MediaCard({
  item,
  serverUrl,
  percentageWatched = 0,
  continueWatching = false,
  showProgress = false,
  resumePosition,
  fullWidth = false,
}: {
  item: BaseItemDto;
  serverUrl: string;
  percentageWatched?: number;
  continueWatching?: boolean;
  showProgress?: boolean;
  resumePosition?: number;
  fullWidth?: boolean;
}) {
  const { playMedia, setIsPlayerVisible } = useMediaPlayer();

  let linkHref = "";
  if (item.Type === "Movie") {
    linkHref = `/movie/${item.Id}`;
  } else if (item.Type === "Episode") {
    linkHref = `/episode/${item.Id}`;
  } else if (item.Type === "Season") {
    linkHref = `/season/${item.Id}`;
  } else if (item.Type === "BoxSet") {
    linkHref = `/boxset/${item.Id}`;
  } else {
    linkHref = `/series/${item.Id}`;
  }

  // Determine image type based on continueWatching
  const imageType = continueWatching ? "Thumb" : "Primary";

  // Determine item ID based on type and continueWatching
  let imageItemId = item.Id;
  if (item.Type === "Episode" && continueWatching) {
    imageItemId = item.ParentThumbItemId || item.Id;
  }

  const [imageLoaded, setImageLoaded] = useState(false);
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null);

  // Adjust image URL parameters based on container type
  const imageUrl = continueWatching
    ? `${serverUrl}/Items/${imageItemId}/Images/${imageType}?maxHeight=324&maxWidth=576&quality=100`
    : `${serverUrl}/Items/${imageItemId}/Images/${imageType}?maxHeight=432&maxWidth=288&quality=100`;

  // Get blur hash
  const imageTag =
    item.Type === "Episode"
      ? item.ParentThumbImageTag
      : item.ImageTags?.[imageType]!;
  const blurHash = item.ImageBlurHashes?.[imageType]?.[imageTag!] || "";

  // Decode blur hash
  useEffect(() => {
    if (blurHash && !blurDataUrl) {
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

  // Calculate progress percentage from resume position
  let progressPercentage = percentageWatched;
  if (showProgress && resumePosition && item.RunTimeTicks) {
    progressPercentage = (resumePosition / item.RunTimeTicks) * 100;
  }

  // For continue watching, use landscape aspect ratio and larger width
  const isResumeItem = showProgress && resumePosition;

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (item && item.Type !== "BoxSet") {
      await playMedia({
        id: item.Id!,
        name: item.Name!,
        type: item.Type as "Movie" | "Series" | "Episode",
        resumePositionTicks:
          resumePosition || item.UserData?.PlaybackPositionTicks,
      });
      setIsPlayerVisible(true);
    }
  };

  const lightSpeedUrl = imageUrl?.includes("192.168.")
    ? imageUrl
    : "https://lightspeed.ac/?url=" + imageUrl;

  return (
    <div
      className={`cursor-pointer group overflow-hidden transition select-none ${
        continueWatching ? "w-72" : fullWidth ? "w-full" : "w-36"
      }`}
    >
      <div
        className={`relative w-full border rounded-md overflow-hidden active:scale-[0.98] transition ${
          continueWatching ? "aspect-video" : "aspect-[2/3]"
        }`}
      >
        <Link to={linkHref} draggable={false} className="block w-full h-full">
          {serverUrl ? (
            <>
              {/* Blur hash placeholder */}
              {blurDataUrl && !imageLoaded && (
                <div
                  className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
                    progressPercentage > 0 ? "rounded-t-md" : "rounded-md"
                  }`}
                  style={{
                    backgroundImage: `url(${blurDataUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(0px)",
                  }}
                />
              )}
              {/* Actual image */}
              <img
                src={lightSpeedUrl}
                alt={item.Name || ""}
                className={`w-full h-full object-cover transition-opacity duration-300 shadow-lg group-hover:shadow-md ${
                  progressPercentage > 0 ? "rounded-t-md" : "rounded-md"
                } opacity-100`}
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
            className={`absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center pointer-events-none ${
              progressPercentage > 0 ? "rounded-t-md" : "rounded-md"
            }`}
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

        {/* Progress bar overlay at bottom of image */}
        {progressPercentage > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 overflow-hidden"
            style={{
              borderBottomLeftRadius: "6px",
              borderBottomRightRadius: "6px",
            }}
          >
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${Math.min(Math.max(progressPercentage, 0), 100)}%`,
              }}
            ></div>
          </div>
        )}
      </div>
      <Link to={linkHref} draggable={false}>
        <div className="px-1">
          <div className="mt-2.5 text-sm font-medium text-foreground truncate group-hover:underline">
            {item.Name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.Type === "Movie" ||
            item.Type === "Series" ||
            item.Type === "Season"
              ? item.ProductionYear
              : item.SeriesName}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.Type === "Episode"
              ? `S${item.ParentIndexNumber} • E${item.IndexNumber}`
              : ""}
          </div>
        </div>
      </Link>
    </div>
  );
}
