import { useEffect, useState } from "react";
import { Vibrant } from "node-vibrant/browser";

interface VibrantBackdropProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function VibrantBackdrop({
  src,
  alt,
  className = "w-full h-full object-cover",
  width = 1920,
  height = 1080,
}: VibrantBackdropProps) {
  const [shadowColor, setShadowColor] = useState<string>("");

  useEffect(() => {
    const extractColors = async () => {
      try {
        const vibrant = new Vibrant(src);
        const palette = await vibrant.getPalette();

        // Get the most vibrant color available
        const vibrantColor =
          palette.Vibrant?.hex ||
          palette.LightVibrant?.hex ||
          palette.DarkVibrant?.hex ||
          palette.Muted?.hex;

        if (vibrantColor) {
          setShadowColor(vibrantColor);
        }
      } catch (error) {
        console.error("Error extracting colors from backdrop:", error);
      }
    };

    if (src) {
      extractColors();
    }
  }, [src]);

  const dynamicStyle = shadowColor
    ? {
        filter: `drop-shadow(0 20px 80px ${shadowColor}90) drop-shadow(0 40px 160px ${shadowColor}70) drop-shadow(0 60px 240px ${shadowColor}50) drop-shadow(0 80px 320px ${shadowColor}30)`,
        transition: "filter 0.5s ease-in-out",
      }
    : {};

  return (
    <img
      className={className}
      src={src}
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
              const vibrantColor =
                palette.Vibrant?.hex ||
                palette.LightVibrant?.hex ||
                palette.DarkVibrant?.hex ||
                palette.Muted?.hex;
              if (vibrantColor) {
                setShadowColor(vibrantColor);
              }
            } catch (error) {
              console.error("Error extracting colors from backdrop:", error);
            }
          };
          extractColors();
        }
      }}
    />
  );
}
