import React, { useState } from "react";
import { Skeleton } from "../components/ui/skeleton";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { Play } from "lucide-react";
import { useMediaPlayer } from "../contexts/MediaPlayerContext";
import { Link } from "react-router-dom";

export function EpisodeCard({
  item,
  serverUrl,
  percentageWatched = 0,
  showProgress = false,
  resumePosition,
}: {
  item: BaseItemDto;
  serverUrl: string;
  percentageWatched?: number;
  showProgress?: boolean;
  resumePosition?: number;
}) {
  const { playMedia, setIsPlayerVisible } = useMediaPlayer();

  const linkHref = `/episode/${item.Id}`;

  // Use thumbnail image for episodes (16:9 aspect ratio)
  const imageItemId = item.ParentThumbItemId || item.Id;
  const imageUrl = `${serverUrl}/Items/${imageItemId}/Images/Thumb?fillHeight=270&fillWidth=480&quality=50`;

  // Calculate progress percentage from resume position
  let progressPercentage = percentageWatched;
  if (showProgress && resumePosition && item.RunTimeTicks) {
    progressPercentage = (resumePosition / item.RunTimeTicks) * 100;
  }

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (item) {
      await playMedia({
        id: item.Id!,
        name: item.Name!,
        type: "Episode",
        resumePositionTicks:
          resumePosition || item.UserData?.PlaybackPositionTicks,
      });
      setIsPlayerVisible(true);
    }
  };

  return (
    <div className="cursor-pointer group overflow-hidden transition select-none w-64">
      <div className="relative w-full border rounded-md overflow-hidden active:scale-[0.98] transition aspect-video">
        <Link to={linkHref} draggable={false} className="block w-full h-full">
          {serverUrl ? (
            <img
              src={imageUrl}
              className={`w-full h-full object-cover transition duration-200 shadow-lg hover:brightness-85 group-hover:shadow-md ${
                progressPercentage > 0 ? "rounded-t-md" : "rounded-md"
              }`}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              draggable="false"
              alt={item.Name || "Episode"}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-lg shadow-lg">
              <div className="text-white/60 text-sm">No Image</div>
            </div>
          )}
        </Link>

        {/* Play button overlay */}
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
          <div className="mt-2.5 text-sm font-medium text-foreground line-clamp-2 group-hover:underline">
            {item.Name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.SeriesName}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.ParentIndexNumber && item.IndexNumber
              ? `S${item.ParentIndexNumber} • E${item.IndexNumber}`
              : ""}
          </div>
        </div>
      </Link>
    </div>
  );
}
