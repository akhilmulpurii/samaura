"use client";

import React, { useState, useEffect } from "react";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { decode } from "blurhash";

interface PosterImageProps {
  movie: BaseItemDto;
  posterImage: string;
  className?: string;
  width?: number;
  height?: number;
}

export function PosterImage({
  movie,
  posterImage,
  className = "w-full h-auto rounded-lg shadow-2xl",
  width = 500,
  height = 750,
}: PosterImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null);

  // Get blur hash for primary/poster image
  const primaryImageTag = movie.ImageTags?.["Primary"];
  const blurHash = movie.ImageBlurHashes?.["Primary"]?.[primaryImageTag!] || "";

  const lightSpeedUrl = posterImage?.includes("192.168.")
    ? posterImage
    : "https://lightspeed.ac/?url=" + posterImage;

  // Decode blur hash
  useEffect(() => {
    if (blurHash && !blurDataUrl) {
      try {
        const pixels = decode(blurHash, 32, 48); // 2:3 aspect ratio for poster
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 48;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const imageData = ctx.createImageData(32, 48);
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
    <>
      {/* Blur hash placeholder or loading placeholder */}
      {!imageLoaded && (
        <div
          className={`${className} transition-opacity duration-300 ${
            blurDataUrl ? "" : "bg-gray-800"
          }`}
          style={{
            aspectRatio: `${width} / ${height}`,
            ...(blurDataUrl
              ? {
                  backgroundImage: `url(${blurDataUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(0px)",
                }
              : {}),
          }}
        />
      )}

      {/* Actual poster image */}
      <img
        className={`${className} transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        } ${!imageLoaded ? "absolute top-0 left-0" : ""}`}
        src={lightSpeedUrl}
        alt={`${movie.Name} poster`}
        width={width}
        height={height}
        onLoad={() => {
          setImageLoaded(true);
        }}
        onError={() => {
          console.error("Failed to load poster image");
        }}
        ref={(img) => {
          // Check if image is already loaded (cached)
          if (img && img.complete && img.naturalHeight !== 0) {
            setImageLoaded(true);
          }
        }}
      />
    </>
  );
}
