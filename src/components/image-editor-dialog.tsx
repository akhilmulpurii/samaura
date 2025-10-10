import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Skeleton } from "../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Edit, Download, Star, Users, Image as ImageIcon } from "lucide-react";
import {
  fetchRemoteImages,
  downloadRemoteImage,
  RemoteImage,
} from "../actions";
import { TmdbIcon } from "../components/icons/tmdb";
import { Flag } from "../components/ui/flag";
import { toast } from "sonner";

interface ImageEditorDialogProps {
  itemId: string;
  itemName: string;
}

type ImageType = "Primary" | "Backdrop" | "Logo" | "Thumb";
type SortBy = "resolution" | "rating" | "votes";

const IMAGE_TYPES = [
  { key: "Primary" as ImageType, label: "Primary", icon: ImageIcon },
  { key: "Backdrop" as ImageType, label: "Backdrop", icon: ImageIcon },
  { key: "Logo" as ImageType, label: "Logo", icon: ImageIcon },
  { key: "Thumb" as ImageType, label: "Thumbnail", icon: ImageIcon },
];

export function ImageEditorDialog({
  itemId,
  itemName,
}: ImageEditorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ImageType>("Primary");
  const [images, setImages] = useState<Record<ImageType, RemoteImage[]>>({
    Primary: [],
    Backdrop: [],
    Logo: [],
    Thumb: [],
  });
  const [loading, setLoading] = useState<Record<ImageType, boolean>>({
    Primary: false,
    Backdrop: false,
    Logo: false,
    Thumb: false,
  });
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("resolution");

  const loadImages = async (type: ImageType) => {
    if (images[type].length > 0) return; // Already loaded

    setLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const response = await fetchRemoteImages(itemId, type, 0, 30, false);
      setImages((prev) => ({ ...prev, [type]: response.Images }));
    } catch (error) {
      console.error(`Failed to fetch ${type} images:`, error);
      toast.error(`Failed to fetch ${type.toLowerCase()} images`);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDownloadImage = async (image: RemoteImage) => {
    const downloadKey = `${image.Type}-${image.Url}`;
    setDownloading(downloadKey);

    try {
      await downloadRemoteImage(
        itemId,
        image.Type as ImageType,
        image.Url,
        image.ProviderName
      );
      toast.success(`${image.Type} image downloaded successfully`);
      console.log(`Downloaded ${image.Type} image:`, image);
    } catch (error) {
      console.error("Failed to download image:", error);
      toast.error("Failed to download image");
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadImages(selectedType);
    }
  }, [isOpen, selectedType]);

  const formatFileSize = (width: number, height: number) => {
    return `${width} × ${height}`;
  };

  const getLanguageDisplay = (language: string) => {
    if (!language || language === "null") return "No Language";
    return language.toUpperCase();
  };

  const sortImages = (images: RemoteImage[], sortBy: SortBy): RemoteImage[] => {
    return [...images].sort((a, b) => {
      switch (sortBy) {
        case "resolution":
          const aResolution = a.Width * a.Height;
          const bResolution = b.Width * b.Height;
          return bResolution - aResolution; // Highest resolution first
        case "rating":
          const aRating = a.CommunityRating || 0;
          const bRating = b.CommunityRating || 0;
          return bRating - aRating; // Highest rating first
        case "votes":
          const aVotes = a.VoteCount || 0;
          const bVotes = b.VoteCount || 0;
          return bVotes - aVotes; // Most votes first
        default:
          return 0;
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] dark:bg-background/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Edit Images - {itemName}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={selectedType}
          onValueChange={(value) => setSelectedType(value as ImageType)}
        >
          <div className="flex items-center justify-between w-full">
            <TabsList className="flex-1">
              {IMAGE_TYPES.map(({ key, label, icon: Icon }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortBy)}
            >
              <SelectTrigger className="w-[180px] ml-4">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="z-[100000]">
                <SelectItem value="resolution">Resolution</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="votes">Votes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {IMAGE_TYPES.map(({ key }) => (
            <TabsContent key={key} value={key} className="mt-4">
              <ScrollArea className="h-[60vh]">
                {loading[key] ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {Array.from({ length: 6 }).map((_, index) => {
                      // Determine aspect ratio based on image type for skeleton
                      const getSkeletonAspectRatio = (type: string) => {
                        switch (type.toLowerCase()) {
                          case "primary":
                            return "aspect-[2/3]"; // Poster ratio
                          case "backdrop":
                            return "aspect-video"; // 16:9 ratio
                          case "logo":
                            return "aspect-[3/1]"; // Wide logo ratio
                          case "thumb":
                            return "aspect-video"; // 16:9 ratio
                          default:
                            return "aspect-video";
                        }
                      };

                      return (
                        <Card
                          key={index}
                          className="overflow-hidden py-0 gap-0"
                        >
                          <div
                            className={`relative ${getSkeletonAspectRatio(
                              key
                            )} p-3`}
                          >
                            <Skeleton className="w-full h-full rounded-lg" />
                          </div>
                          <CardContent className="p-3">
                            <div className="space-y-3">
                              {/* Provider and Language */}
                              <div className="flex gap-2">
                                <Skeleton className="h-6 flex-1" />
                                <Skeleton className="h-6 flex-1" />
                              </div>

                              {/* Dimensions */}
                              <div className="flex items-center">
                                <Skeleton className="h-6 w-full" />
                              </div>

                              {/* Rating and Votes */}
                              <div className="flex gap-2">
                                <Skeleton className="h-6 flex-1" />
                                <Skeleton className="h-6 flex-1" />
                              </div>

                              {/* Download Button */}
                              <Skeleton className="h-8 w-full mt-2" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : images[key].length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No {key.toLowerCase()} images available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {sortImages(images[key], sortBy).map((image, index) => {
                      // Determine aspect ratio based on image type
                      const getAspectRatio = (type: string) => {
                        switch (type.toLowerCase()) {
                          case "primary":
                            return "aspect-[2/3]"; // Poster ratio
                          case "backdrop":
                            return "aspect-video"; // 16:9 ratio
                          case "logo":
                            return "aspect-[3/1]"; // Wide logo ratio
                          case "thumb":
                            return "aspect-video"; // 16:9 ratio
                          default:
                            return "aspect-video";
                        }
                      };

                      return (
                        <Card
                          key={index}
                          className="overflow-hidden py-0 gap-0"
                        >
                          <div
                            className={`relative ${getAspectRatio(key)} p-3`}
                          >
                            <img
                              src={image.Url}
                              alt={`${key} option ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                              loading="lazy"
                            />
                          </div>
                          <CardContent className="p-3">
                            <div className="space-y-3">
                              {/* Provider and Language */}
                              <div className="flex gap-2">
                                {image.ProviderName === "TheMovieDb" ? (
                                  <Badge
                                    variant="secondary"
                                    className="flex-1 text-xs flex items-center justify-center gap-1"
                                  >
                                    <TmdbIcon size={12} />
                                    TMDB
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="flex-1 text-xs flex items-center justify-center"
                                  >
                                    {image.ProviderName}
                                  </Badge>
                                )}
                                {image.Language &&
                                  image.Language !== "null" && (
                                    <Badge
                                      variant="outline"
                                      className="flex-1 text-xs flex items-center justify-center gap-1"
                                    >
                                      <Flag
                                        language={image.Language}
                                        size={12}
                                      />
                                      {getLanguageDisplay(image.Language)}
                                    </Badge>
                                  )}
                              </div>

                              {/* Dimensions */}
                              <div className="flex items-center">
                                <Badge
                                  variant="outline"
                                  className="w-full text-xs font-mono flex items-center justify-center gap-1"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  {formatFileSize(image.Width, image.Height)}
                                </Badge>
                              </div>

                              {/* Rating and Votes */}
                              <div className="flex gap-2">
                                <Badge
                                  variant="secondary"
                                  className="flex-1 text-xs flex items-center justify-center gap-1"
                                >
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {image.CommunityRating?.toFixed(1) || "N/A"}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="flex-1 text-xs flex items-center justify-center gap-1"
                                >
                                  <Users className="h-3 w-3" />
                                  {image.VoteCount || 0}
                                </Badge>
                              </div>

                              {/* Download Button */}
                              <Button
                                onClick={() => handleDownloadImage(image)}
                                disabled={
                                  downloading === `${image.Type}-${image.Url}`
                                }
                                className="w-full mt-2"
                                size="sm"
                                variant={"outline"}
                              >
                                <Download className="h-4 w-4" />
                                {downloading === `${image.Type}-${image.Url}`
                                  ? "Downloading..."
                                  : "Download"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
