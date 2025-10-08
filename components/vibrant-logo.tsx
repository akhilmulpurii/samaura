"use client";

import { useEffect, useState } from "react";
import { Vibrant } from "node-vibrant/browser";

interface VibrantLogoProps {
  src: string;
  alt: string;
  movieName: string;
  className?: string;
  width?: number;
  height?: number;
}

export function VibrantLogo({
  src,
  alt,
  movieName,
  className = "max-h-20 md:max-h-24 w-auto object-contain",
  width = 300,
  height = 96,
}: VibrantLogoProps) {
  const [shadowColor, setShadowColor] = useState<string>("");

  const lightSpeedUrl = src?.includes("192.168.")
    ? src
    : "https://lightspeed.ac/?url=" + src;

  useEffect(() => {
    const extractColors = async () => {
      try {
        const vibrant = new Vibrant(src);
        const palette = await vibrant.getPalette();

        // Get the LightVibrant color, fallback to Vibrant if not available
        const lightVibrant = palette.LightVibrant?.hex || palette.Vibrant?.hex;

        if (lightVibrant) {
          setShadowColor(lightVibrant);
        }
      } catch (error) {
        console.error("Error extracting colors from logo:", error);
      }
    };

    if (src) {
      extractColors();
    }
  }, [src]);

  const dynamicStyle = shadowColor
    ? {
        filter: `drop-shadow(0 8px 60px ${shadowColor}80) drop-shadow(0 16px 120px ${shadowColor}60) drop-shadow(0 32px 200px ${shadowColor}40)`,
        transition: "filter 0.3s ease-in-out",
      }
    : {};

  return (
    <img
      className={className}
      src={lightSpeedUrl}
      alt={alt}
      width={width}
      height={height}
      style={dynamicStyle}
      onLoad={() => {
        // Re-extract colors when image loads to ensure accuracy
        if (!shadowColor) {
          const extractColors = async () => {
            try {
              const vibrant = new Vibrant(src);
              const palette = await vibrant.getPalette();
              const lightVibrant =
                palette.LightVibrant?.hex || palette.Vibrant?.hex;
              if (lightVibrant) {
                setShadowColor(lightVibrant);
              }
            } catch (error) {
              console.error("Error extracting colors from logo:", error);
            }
          };
          extractColors();
        }
      }}
    />
  );
}
