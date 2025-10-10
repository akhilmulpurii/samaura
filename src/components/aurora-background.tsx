import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";
import { useAtom } from "jotai";
import AuroraTransition from "../components/Aurora/AuroraTransition";
import { auroraColorsAtom, previousAuroraColorsAtom } from "../lib/atoms";

interface AuroraBackgroundProps {
  imageUrl?: string;
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  className?: string;
}

export function AuroraBackground({
  imageUrl,
  colorStops = ["#AA5CC3", "#00A4DC", "#AA5CC3"],
  amplitude = 0.8,
  blend = 0.4,
  className = "fixed inset-0 z-0 pointer-events-none opacity-20",
}: AuroraBackgroundProps) {
  const [currentColors] = useAtom(auroraColorsAtom);
  const [previousColors] = useAtom(previousAuroraColorsAtom);
  const [transitionProgress, setTransitionProgress] = useState(1.0);

  // Start transition when colors change
  useEffect(() => {
    if (JSON.stringify(currentColors) !== JSON.stringify(previousColors)) {
      setTransitionProgress(0);

      // Animate transition over 3 seconds
      const startTime = Date.now();
      const duration = 3000;

      const animateTransition = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Use easing function for smoother transition
        const easedProgress = progress * progress * (3 - 2 * progress);
        setTransitionProgress(easedProgress);

        if (progress < 1) {
          requestAnimationFrame(animateTransition);
        }
      };

      requestAnimationFrame(animateTransition);
    }
  }, [currentColors, previousColors]);

  // Use provided colorStops or fall back to atom colors
  const finalCurrentColors =
    colorStops !== undefined &&
    JSON.stringify(colorStops) !==
      JSON.stringify(["#AA5CC3", "#00A4DC", "#AA5CC3"])
      ? colorStops
      : currentColors;
  const finalPreviousColors =
    colorStops !== undefined &&
    JSON.stringify(colorStops) !==
      JSON.stringify(["#AA5CC3", "#00A4DC", "#AA5CC3"])
      ? colorStops
      : previousColors;

  const [mounted, setMounted] = useState(false);
  const [themeResolved, setThemeResolved] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait for theme to be resolved
  useEffect(() => {
    if (
      mounted &&
      (theme === "dark" ||
        theme === "light" ||
        (theme === "system" && resolvedTheme))
    ) {
      // Add a small delay to ensure theme is fully applied
      const timer = setTimeout(() => setThemeResolved(true), 50);
      return () => clearTimeout(timer);
    }
  }, [mounted, theme, resolvedTheme]);

  // Only show aurora in dark mode or when system theme resolves to dark
  const shouldShowAurora =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark");

  // Don't render anything if not in dark mode and theme is resolved
  if (mounted && themeResolved && !shouldShowAurora) {
    return null;
  }

  // During initialization, don't render anything to prevent hydration mismatch
  // This ensures server and client render the same content initially
  if (!mounted || !themeResolved) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        backgroundColor: "transparent",
        transition: "opacity 0.5s ease-in-out",
      }}
    >
      <AuroraTransition
        colorStopsFrom={finalPreviousColors}
        colorStopsTo={finalCurrentColors}
        transition={transitionProgress}
        amplitude={amplitude}
        blend={blend}
      />
    </div>
  );
}
