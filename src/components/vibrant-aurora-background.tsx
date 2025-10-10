import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Vibrant } from "node-vibrant/browser";
import { AuroraBackground } from "../components/aurora-background";
import { auroraColorsAtom, updateAuroraColorsAtom } from "../lib/atoms";

interface VibrantAuroraBackgroundProps {
  posterUrl?: string;
  className?: string;
  amplitude?: number;
  blend?: number;
}

export function VibrantAuroraBackground({
  posterUrl,
  className = "fixed inset-0 z-0 pointer-events-none opacity-30",
  amplitude = 0.8,
  blend = 0.4,
}: VibrantAuroraBackgroundProps) {
  const [colorStops] = useAtom(auroraColorsAtom);
  const updateColors = useSetAtom(updateAuroraColorsAtom);

  useEffect(() => {
    if (!posterUrl) return;

    const extractColors = async () => {
      try {
        const palette = await Vibrant.from(posterUrl).getPalette();

        // Extract vibrant colors from the palette
        const vibrantColors: string[] = [];

        // Add vibrant color if available
        if (palette.Vibrant) {
          vibrantColors.push(palette.Vibrant.hex);
        }

        // Add dark vibrant for depth
        if (palette.DarkVibrant) {
          vibrantColors.push(palette.DarkVibrant.hex);
        }

        // Add muted color for balance
        if (palette.Muted) {
          vibrantColors.push(palette.Muted.hex);
        }

        // Add light vibrant for highlights
        if (palette.LightVibrant) {
          vibrantColors.push(palette.LightVibrant.hex);
        }

        // Ensure we have at least 3 colors for the aurora
        if (vibrantColors.length >= 2) {
          // Create a nice gradient with the extracted colors
          const finalColors = [
            vibrantColors[0], // Primary vibrant
            vibrantColors[1], // Secondary (dark vibrant or muted)
            vibrantColors[0], // Back to primary for smooth loop
          ];

          // If we have more colors, use them for a richer palette
          if (vibrantColors.length >= 3) {
            finalColors[1] = vibrantColors[2]; // Use muted or third color
            if (vibrantColors.length >= 4) {
              finalColors.push(vibrantColors[3]); // Add fourth color
            }
          }

          updateColors(finalColors);
        }
      } catch (error) {
        console.warn("Failed to extract colors from poster:", error);
        // Keep previous colors on error - they're already in the atom
      }
    };

    extractColors();
  }, [posterUrl]);

  return (
    <AuroraBackground
      colorStops={colorStops}
      amplitude={amplitude}
      blend={blend}
      className={className}
    />
  );
}
