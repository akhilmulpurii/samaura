import React, { useState, useEffect } from "react";
import { JellyfinItem } from "../types/jellyfin";
import { Button } from "../components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { getNextEpisodeForSeries } from "../actions/tv-shows";
import { useMediaPlayer } from "../contexts/MediaPlayerContext";
import { Skeleton } from "./ui/skeleton";

interface SeriesPlayButtonProps {
  series: JellyfinItem;
}

export function SeriesPlayButton({ series }: SeriesPlayButtonProps) {
  const [nextEpisode, setNextEpisode] = useState<JellyfinItem | null>(null);
  const [loading, setLoading] = useState(true);
  const { playMedia, setIsPlayerVisible } = useMediaPlayer();

  useEffect(() => {
    async function fetchNextEpisode() {
      if (!series.Id) return;

      setLoading(true);
      try {
        const episode = await getNextEpisodeForSeries(series.Id);
        setNextEpisode(episode);
      } catch (error) {
        console.error("Failed to fetch next episode:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNextEpisode();
  }, [series.Id]);

  const handlePlay = async () => {
    if (!nextEpisode) return;

    try {
      await playMedia({
        id: nextEpisode.Id!,
        name: nextEpisode.Name!,
        type: "Episode",
        resumePositionTicks: nextEpisode.UserData?.PlaybackPositionTicks,
        selectedVersion: nextEpisode.MediaSources?.[0] || undefined,
      });
      setIsPlayerVisible(true);
    } catch (error) {
      console.error("Failed to play episode:", error);
    }
  };

  if (loading) {
    return (
      <Button variant="default" disabled size="lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!nextEpisode) {
    return null;
  }

  // Determine if this is a resume or new play
  const hasProgress =
    nextEpisode.UserData?.PlaybackPositionTicks &&
    nextEpisode.UserData.PlaybackPositionTicks > 0 &&
    !nextEpisode.UserData.Played;
  const buttonText = hasProgress ? "Resume" : "Play";

  // Debug logging
  console.log("Next episode:", nextEpisode.Name);
  console.log("Has progress:", hasProgress);
  console.log("UserData:", nextEpisode.UserData);
  console.log(
    "PlaybackPositionTicks:",
    nextEpisode.UserData?.PlaybackPositionTicks
  );
  console.log("Played:", nextEpisode.UserData?.Played);

  return (
    <Button variant="default" onClick={handlePlay} className="gap-2" size="lg">
      <Play className="h-4 w-4" />
      {buttonText}
      {nextEpisode && (
        <span className="hidden sm:inline text-sm opacity-75">
          S{nextEpisode.ParentIndexNumber} • E{nextEpisode.IndexNumber}
        </span>
      )}
    </Button>
  );
}
