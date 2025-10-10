import React, { useEffect, useState } from "react";
import { getImageUrl } from "../actions";
import { Film, PlayCircle, Tv, Calendar, Star, User } from "lucide-react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { useAuth } from "../hooks/useAuth";
import { decode } from "blurhash";

interface Item {
  Id: string;
  Name: string;
  Type: string;
  ImageTags?: {
    Primary?: string;
  };
  ImageBlurHashes?: {
    Primary?: Record<string, string>;
  };
  ProductionYear?: number;
  RunTimeTicks?: number;
  CommunityRating?: number;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  SeriesName?: string;
  Overview?: string;
}

interface SearchSuggestionItemProps {
  item: Item;
  onClick: () => void;
  formatRuntime: (runTimeTicks?: number) => string | null;
}

export function SearchSuggestionItem({
  item,
  onClick,
  formatRuntime,
}: SearchSuggestionItemProps) {
  const { serverUrl } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null);

  const imageUrl = `${serverUrl}/Items/${item.Id}/Images/Primary`;

  // Get blur hash
  const imageTag = item.ImageTags?.Primary;
  const blurHash =
    (imageTag && item.ImageBlurHashes?.Primary?.[imageTag]) || "";

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

  return (
    <div
      key={item.Id}
      onClick={onClick}
      className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
    >
      {/* Image/Avatar */}
      {item.Type === "Person" ? (
        <div className="relative size-[43px] flex-shrink-0 rounded-full overflow-hidden">
          {/* Blur hash placeholder for avatar */}
          {blurDataUrl && !imageLoaded && (
            <div
              className="absolute inset-0 w-full h-full transition-opacity duration-300 border z-50"
              style={{
                backgroundImage: `url(${blurDataUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(0px)",
              }}
            />
          )}
          <Avatar className="size-[43px] flex-shrink-0 border">
            <AvatarImage
              src={imageUrl}
              alt={item.Name}
              className="object-cover transition-opacity duration-300"
              onLoad={() => setImageLoaded(true)}
              ref={(img) => {
                // Check if image is already loaded (cached)
                if (img && img.complete && img.naturalHeight !== 0) {
                  setImageLoaded(true);
                }
              }}
            />
            <AvatarFallback>
              <User className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        </div>
      ) : (
        <div
          className={`aspect-[2/3] h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative`}
        >
          {imageUrl ? (
            <>
              {/* Blur hash placeholder */}
              {blurDataUrl && !imageLoaded && (
                <div
                  className="absolute inset-0 w-full h-full rounded transition-opacity duration-300"
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
                src={imageUrl}
                alt={item.Name}
                className="w-full h-full object-cover transition-opacity duration-300"
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                ref={(img) => {
                  // Check if image is already loaded (cached)
                  if (img && img.complete && img.naturalHeight !== 0) {
                    setImageLoaded(true);
                  }
                }}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {item.Type === "Movie" ? (
                <Film className="h-6 w-6 text-muted-foreground" />
              ) : item.Type === "Episode" ? (
                <PlayCircle className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Tv className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-foreground font-medium truncate">{item.Name}</h4>
          {item.Type === "Movie" ? (
            <Badge variant={"outline"} className="bg-background/50">
              <Film className="h-3 w-3 mr-0.5 text-blue-400" />
              Movie
            </Badge>
          ) : item.Type === "Series" ? (
            <Badge variant={"outline"} className="bg-background/50">
              <Tv className="h-3 w-3 mr-0.5 text-emerald-400" />
              Series
            </Badge>
          ) : item.Type === "Person" ? (
            <Badge variant={"outline"} className="bg-background/50">
              <User className="h-3 w-3 mr-0.5 text-purple-400" />
              Person
            </Badge>
          ) : item.Type === "Episode" ? (
            <Badge variant={"outline"} className="bg-background/50">
              <PlayCircle className="h-3 w-3 mr-0.5 text-orange-400" />
              Episode
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {item.ProductionYear && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {item.ProductionYear}
            </div>
          )}

          {item.CommunityRating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" /> {item.CommunityRating.toFixed(1)}
            </div>
          )}

          {/* Show episode/season/series info for episodes */}
          {item.Type === "Episode" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {typeof item.ParentIndexNumber === "number" &&
                typeof item.IndexNumber === "number" && (
                  <span>
                    S{item.ParentIndexNumber} • E{item.IndexNumber}
                  </span>
                )}
              {/* Show name of parent show if available */}
              {item.SeriesName && (
                <span className="truncate max-w-[120px]">
                  {item.SeriesName}
                </span>
              )}
            </div>
          )}
        </div>

        {item.Overview && (
          <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 truncate">
            {item.Overview.substring(0, 80)}
            {item.Overview.length > 80 ? "..." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
