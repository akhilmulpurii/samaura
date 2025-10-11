import React, { useRef, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { MediaCard } from "../components/media-card";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { LiveChannelCard } from "./live-channel-card";
import { Link } from "react-router-dom";

interface MediaSectionProps {
  sectionName: string;
  mediaItems: BaseItemDto[] | any[];
  serverUrl: string;
  library?: any;
  continueWatching?: boolean;
  hideViewAll?: boolean;
}

export function MediaSection({
  sectionName,
  mediaItems,
  serverUrl,
  library,
  continueWatching = false,
  hideViewAll = false,
}: MediaSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find the ScrollArea viewport after component mounts
    if (scrollRef.current) {
      const viewport = scrollRef.current
        .closest('[data-slot="scroll-area"]')
        ?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement;
      if (viewport) {
        viewportRef.current = viewport;
      }
    }
  }, []);

  const scrollLeft = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const href =
    library && library.Id
      ? library?.CollectionType === "livetv"
        ? `/livetv/`
        : `/library/${library.Id}`
      : "#";

  return (
    <section className="relative z-10 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold text-foreground font-poppins">
          {sectionName}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-background/10 border-border text-foreground hover:bg-accent p-2"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/10 border-border text-foreground hover:bg-accent p-2"
            onClick={scrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!hideViewAll ? (
            <Link
              to={href}
              className="border-border flex items-center justify-center text-foreground hover:bg-accent border bg-background shadow-xs  hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"
            >
              View All
            </Link>
          ) : null}
        </div>
      </div>
      {mediaItems.length > 0 ? (
        <ScrollArea className="w-full pb-6">
          <div className="flex gap-4 w-max h-fit" ref={scrollRef}>
            {mediaItems.map((item) => (
              <div key={item.Id} className="flex-shrink-0">
                {item?.Type === "TvChannel" ? (
                  <LiveChannelCard item={item} serverUrl={serverUrl} />
                ) : (
                  <MediaCard
                    item={item}
                    serverUrl={serverUrl}
                    percentageWatched={item.UserData?.PlayedPercentage || 0}
                    continueWatching={continueWatching}
                  />
                )}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-8 text-center">
            <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No {sectionName.toLowerCase()} found in your library
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
