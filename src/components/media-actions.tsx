"use client";
import { useState, useEffect } from "react";
import { JellyfinItem, MediaSourceInfo, MediaStream } from "../types/jellyfin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { MediaInfoDialog } from "../components/media-info-dialog";
import { ImageEditorDialog } from "../components/image-editor-dialog";
import { SubtitleManagerDialog } from "../components/subtitles/subtitle-manager-dialog";
import {
  Info,
  Download,
  Play,
  Layers,
  ChevronDown,
  Music,
  Check,
} from "lucide-react";
import {
  getAuthData,
  getDownloadUrl,
  getUserWithPolicy,
  getUser,
} from "../actions";
import { getMediaDetailsFromName, formatRuntime } from "../lib/utils";
import { usePlayback } from "../hooks/usePlayback";
import { useIsMobile } from "../hooks/use-mobile";
import { DolbyDigital, DolbyTrueHd, DolbyVision, DtsHd } from "./icons/codecs";
import { UserPolicy } from "@jellyfin/sdk/lib/generated-client/models";

interface MediaActionsProps {
  movie?: JellyfinItem;
  show?: JellyfinItem;
  episode?: JellyfinItem;
  onBeforePlay?: () => void;
}

export function MediaActions({
  movie,
  show,
  episode,
  onBeforePlay,
}: MediaActionsProps) {
  const media = movie || show || episode;
  const { play } = usePlayback();
  const isMobile = useIsMobile();
  const [selectedVersion, setSelectedVersion] =
    useState<MediaSourceInfo | null>(null);
  const [selectedAudioStreamIndex, setSelectedAudioStreamIndex] = useState<
    number | undefined
  >(undefined);
  const [userPolicy, setUserPolicy] = useState<UserPolicy | null>(null);

  // Determine if this is a resume or new play
  const hasProgress =
    media?.UserData?.PlaybackPositionTicks &&
    media.UserData.PlaybackPositionTicks > 0 &&
    !media.UserData.Played;
  const totalRuntimeTicks = media?.RunTimeTicks || 0;
  const resumePositionTicks = media?.UserData?.PlaybackPositionTicks || 0;
  const timeLeftTicks = totalRuntimeTicks - resumePositionTicks;
  const timeLeft = formatRuntime(timeLeftTicks);

  // Initialize selectedVersion and Audio Stream when media changes
  useEffect(() => {
    if (media?.MediaSources && media.MediaSources.length > 0) {
      const defaultSource = media.MediaSources[0];
      setSelectedVersion(defaultSource);

      // Select default audio stream
      if (defaultSource.MediaStreams) {
        let defaultAudio: MediaStream | undefined;
        getAuthData()
          .then(({ user }) => {
            if (user && user.Configuration) {
              if (
                !user.Configuration.PlayDefaultAudioTrack &&
                user.Configuration.AudioLanguagePreference
              )
                defaultAudio = defaultSource.MediaStreams!.find(
                  (s) =>
                    s.Type === "Audio" &&
                    s.Language === user.Configuration!.AudioLanguagePreference,
                );
              else
                defaultAudio = defaultSource!.MediaStreams!.find(
                  (s) => s.Type === "Audio" && s.IsDefault,
                );
              if (defaultAudio) setSelectedAudioStreamIndex(defaultAudio.Index);
            }
          })
          .finally(() => {
            if (defaultAudio === undefined) {
              // Fallback to first audio stream
              const firstAudio = defaultSource!.MediaStreams!.find(
                (s) => s.Type === "Audio",
              );
              setSelectedAudioStreamIndex(firstAudio?.Index);
            }
          });
      }
    }
  }, [media]);

  // Update selected audio when version changes
  useEffect(() => {
    if (selectedVersion?.MediaStreams) {
      const defaultAudio = selectedVersion.MediaStreams.find(
        (s) => s.Type === "Audio" && s.IsDefault,
      );
      if (defaultAudio) {
        setSelectedAudioStreamIndex(defaultAudio.Index);
      } else {
        const firstAudio = selectedVersion.MediaStreams.find(
          (s) => s.Type === "Audio",
        );
        setSelectedAudioStreamIndex(firstAudio?.Index);
      }
    }
  }, [selectedVersion]);

  // Fetch user policy when component mounts
  useEffect(() => {
    const fetchUserPolicy = async () => {
      try {
        const currentUser = await getUser();
        if (currentUser?.Id && media?.Id) {
          const userWithPolicy = await getUserWithPolicy(
            currentUser.Id,
            media.Id,
          );
          if (userWithPolicy?.Policy) {
            setUserPolicy(userWithPolicy.Policy);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user policy:", error);
      }
    };

    if (media?.Id) {
      fetchUserPolicy();
    }
  }, [media?.Id]);

  if (!media) {
    return null;
  }

  // If episode doesn't have MediaSources but has an Id, show basic play button
  if (!media.MediaSources || media.MediaSources.length === 0) {
    if (episode && media.Id) {
      return (
        <div className="mb-4 flex items-center">
          <Button
            variant="outline"
            className="gap-0"
            onClick={() => {
              // Could redirect to a streaming service or handle differently
              onBeforePlay?.();
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            {hasProgress ? "Resume" : "Play"} Episode
            {hasProgress && (
              <span className="text-sm opacity-75">{timeLeft} left</span>
            )}
          </Button>
        </div>
      );
    }
    return null;
  }

  if (!selectedVersion) {
    return null;
  }

  const hasMultipleVersions = media.MediaSources.length > 1;

  const download = async () => {
    window.open(await getDownloadUrl(selectedVersion.Id!), "_blank");
  };

  // Helper function to get display name for a media source
  const getMediaSourceDisplayName = (source: MediaSourceInfo) => {
    const detailsFromName = getMediaDetailsFromName(source.Name!);

    // If we can't parse details from the name, try to use DisplayTitle from video stream
    if (detailsFromName === "Unknown" && source.MediaStreams) {
      const videoStream = source.MediaStreams.find(
        (stream) => stream.Type === "Video",
      );
      if (videoStream?.DisplayTitle) {
        return getMediaDetailsFromName(videoStream.DisplayTitle);
      }
    }

    return detailsFromName;
  };

  const getVersionName = (source: MediaSourceInfo) => {
    const name = source.Name?.trim();
    if (name) {
      const bracketMatch = name.match(/\[[^\]]+\]/);
      if (bracketMatch) {
        return bracketMatch[0];
      }
      return name;
    }
    return getMediaSourceDisplayName(source);
  };

  const renderSourceLabel = (source: MediaSourceInfo, isDropdown = false) => {
    const techName = getMediaSourceDisplayName(source);
    const verName = getVersionName(source);

    const isBracketed = verName.startsWith("[") && verName.endsWith("]");
    const cleanVerName = isBracketed ? verName.replace(/[\[\]]/g, "") : verName;

    const isRedundant =
      !isBracketed &&
      (verName === techName ||
        techName.toLowerCase().includes(verName.toLowerCase()));

    if (isRedundant) {
      return techName;
    }

    if (isDropdown) {
      return (
        <div className="flex flex-col items-start gap-0.5 leading-tight">
          <span className="font-medium text-[0.8rem] text-primary">
            {cleanVerName}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            {techName}
          </span>
        </div>
      );
    }

    return (
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-primary opacity-90">
          {cleanVerName}
        </span>
        <span className="opacity-50">•</span>
        <span>{techName}</span>
      </span>
    );
  };

  // Helper function to check if media has Dolby Digital audio
  const hasDolbyDigital = (source: MediaSourceInfo) => {
    if (!source.MediaStreams) {
      return false;
    }

    const result = source.MediaStreams.some(
      (stream) =>
        stream.Type === "Audio" &&
        (stream.Codec?.toLowerCase().includes("ac3") ||
          stream.Codec?.toLowerCase().includes("dolby") ||
          stream.DisplayTitle?.toLowerCase().includes("dolby")),
    );

    return result;
  };

  // Helper function to check if media has Dolby TrueHD audio
  const hasDolbyTrueHD = (source: MediaSourceInfo) => {
    if (!source.MediaStreams) {
      return false;
    }

    const result = source.MediaStreams.some(
      (stream) =>
        stream.Type === "Audio" &&
        (stream.Codec?.toLowerCase().includes("truehd") ||
          stream.DisplayTitle?.toLowerCase().includes("truehd")),
    );

    return result;
  };

  // Helper function to check if media has Dolby Vision video
  const hasDolbyVision = (source: MediaSourceInfo) => {
    if (!source.MediaStreams) {
      return false;
    }

    const result = source.MediaStreams.some(
      (stream) =>
        stream.Type === "Video" &&
        (stream.VideoRange?.toLowerCase().includes("dovi") ||
          stream.DisplayTitle?.toLowerCase().includes("dolby vision") ||
          stream.Profile?.toLowerCase().includes("dolby")),
    );

    return result;
  };

  const getAudioStreamDisplayName = (stream: any, includeTitle = true) => {
    // 1. codec cleaning
    const codecMap: Record<string, string> = {
      ac3: "Dolby Digital",
      eac3: "Dolby Digital Plus",
      dca: "DTS",
      dts: "DTS",
      dtshd: "DTS-HD",
      truehd: "TrueHD",
      aac: "AAC",
      mp3: "MP3",
      flac: "FLAC",
      opus: "Opus",
      vorbis: "Vorbis",
      pcm: "PCM",
    };

    const rawCodec = (stream.Codec || "").toLowerCase();
    const codec =
      codecMap[rawCodec] || stream.Codec?.toUpperCase() || "Unknown";

    // 2. channel cleaning
    const channels =
      stream.ChannelLayout || (stream.Channels ? `${stream.Channels}ch` : "");

    // 3. title/commentary extraction
    const explicitTitle = stream.Title;

    const parts = [codec];
    if (channels) parts.push(channels);

    const techLabel = parts.join(" ");

    if (includeTitle && explicitTitle) {
      return `${explicitTitle} (${techLabel})`;
    }

    return techLabel;
  };

  const hasDtsHd = (source: MediaSourceInfo) => {
    if (!source.MediaStreams) {
      return false;
    }

    const result = source.MediaStreams.some(
      (stream) =>
        stream.Type === "Audio" &&
        (stream.Codec?.toLowerCase().includes("dts-hd") ||
          stream.DisplayTitle?.toLowerCase().includes("dts-hd")),
    );
    return result;
  };

  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          variant="default"
          onClick={() => {
            if (media) {
              onBeforePlay?.();
              play({
                id: media.Id!,
                name: media.Name!,
                type: media.Type as
                  | "Movie"
                  | "Series"
                  | "Episode"
                  | "TvChannel",
                resumePositionTicks: media.UserData?.PlaybackPositionTicks,
                selectedVersion: selectedVersion,
                audioStreamIndex: selectedAudioStreamIndex,
              });
            }
          }}
          className="gap-2 w-full sm:w-auto justify-center sm:justify-start"
        >
          <Play className="h-4 w-4" />
          {hasProgress ? "Resume" : "Play"}
          {hasProgress ? (
            <span className="text-sm opacity-75 pr-1">{timeLeft} left</span>
          ) : null}
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {hasMultipleVersions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="truncate">
                <Button
                  variant="outline"
                  className="overflow-hidden whitespace-nowrap text-ellipsis fill-foreground gap-1.5 px-4 w-full sm:w-auto justify-between sm:justify-start"
                >
                  {renderSourceLabel(selectedVersion)}
                  <ChevronDown className="h-4 w-4 opacity-50 ml-1 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isMobile ? "center" : "start"}
                className={isMobile ? "w-[calc(100vw-2rem)]" : "min-w-56"}
              >
                {media.MediaSources.map((source: MediaSourceInfo) => (
                  <DropdownMenuItem
                    key={source.Id}
                    onSelect={() => {
                      setSelectedVersion(source);
                      // onStreamUrlChange(null); // Clear stream URL when changing version
                    }}
                    className="fill-foreground gap-3 flex justify-between"
                  >
                    {renderSourceLabel(source, true)}
                    <Badge variant="outline" className="bg-sidebar">
                      {source.Size
                        ? `${(source.Size / 1024 ** 3).toFixed(2)} GB`
                        : "Unknown size"}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              className="overflow-hidden whitespace-nowrap text-ellipsis fill-foreground gap-1.5 px-4 w-full sm:w-auto justify-between sm:justify-start"
            >
              {getMediaSourceDisplayName(selectedVersion)}
            </Button>
          )}
        </div>

        {/* Audio Stream Selector */}
        {selectedVersion?.MediaStreams &&
          (() => {
            const audioStreams = selectedVersion.MediaStreams?.filter(
              (s) => s.Type === "Audio",
            );
            if (audioStreams && audioStreams.length > 1) {
              const currentAudio = audioStreams.find(
                (s) => s.Index === selectedAudioStreamIndex,
              );
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="overflow-hidden whitespace-nowrap text-ellipsis fill-foreground gap-1.5 px-4 w-full sm:w-auto sm:max-w-50 justify-between sm:justify-start"
                    >
                      <Music className="h-4 w-4 opacity-70" />
                      <span className="truncate">
                        {currentAudio
                          ? getAudioStreamDisplayName(currentAudio)
                          : "Audio"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 ml-1 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align={isMobile ? "center" : "start"}
                    className={isMobile ? "w-[calc(100vw-2rem)]" : "min-w-56"}
                  >
                    {audioStreams.map((stream) => (
                      <DropdownMenuItem
                        key={stream.Index}
                        onSelect={() =>
                          setSelectedAudioStreamIndex(stream.Index)
                        }
                        className="fill-foreground gap-3 flex justify-between"
                      >
                        <div className="flex flex-col">
                          <span>
                            {stream.DisplayTitle ||
                              stream.Language ||
                              `Track ${stream.Index}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {stream.Language && (
                              <span className="mr-1">
                                [{stream.Language.toUpperCase()}]
                              </span>
                            )}
                            {getAudioStreamDisplayName(stream, false)}
                          </span>
                        </div>
                        {stream.IsDefault && (
                          <Badge variant="secondary" className="text-[0.6rem]">
                            Default
                          </Badge>
                        )}
                        {stream.Index === selectedAudioStreamIndex && (
                          <Badge variant="secondary">
                            <Check className="size-[0.6rem]" />
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            return null;
          })()}

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={download}
            className="flex-1 sm:flex-none sm:h-9 sm:w-9 sm:px-0 sm:gap-0"
          >
            <Download className="h-4 w-4" />
            <span className="ml-2 text-sm sm:hidden">Download</span>
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none sm:h-9 sm:w-9 sm:px-0 sm:gap-0"
              >
                <Info className="h-4 w-4" />
                <span className="ml-2 text-sm sm:hidden">Info</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl dark:bg-background/30 backdrop-blur-md z-9999999999">
              <DialogHeader>
                <DialogTitle>Media Info</DialogTitle>
              </DialogHeader>
              <MediaInfoDialog mediaSource={selectedVersion} />
            </DialogContent>
          </Dialog>

          <SubtitleManagerDialog
            media={media}
            mediaSource={selectedVersion}
            triggerClassName="flex-1 sm:flex-none sm:h-9 sm:w-9 sm:px-0 sm:gap-0"
          />

          {userPolicy?.IsAdministrator && (
            <ImageEditorDialog
              itemId={media.Id!}
              itemName={media.Name || "Unknown"}
              triggerClassName="flex-1 sm:flex-none sm:h-9 sm:w-9 sm:px-0 sm:gap-0"
              triggerLabel="Edit"
              triggerLabelClassName="ml-2 text-sm sm:hidden"
            />
          )}
        </div>
      </div>
      {hasMultipleVersions && (
        <div className="ml-1 flex flex-col gap-1.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-3 w-3 text-primary" />
            <span className="font-medium">
              {media.MediaSources.length} versions available
            </span>
          </div>
        </div>
      )}

      {(hasDolbyDigital(selectedVersion) ||
        hasDolbyTrueHD(selectedVersion) ||
        hasDolbyVision(selectedVersion) ||
        hasDtsHd(selectedVersion)) && (
        <div className="flex gap-4 ml-1 h-8 items-center mt-4 -mb-2">
          {hasDolbyDigital(selectedVersion) && <DolbyDigital />}
          {hasDolbyTrueHD(selectedVersion) && <DolbyTrueHd />}
          {hasDolbyVision(selectedVersion) && <DolbyVision />}
          {hasDtsHd(selectedVersion) && <DtsHd />}
        </div>
      )}
    </div>
  );
}
