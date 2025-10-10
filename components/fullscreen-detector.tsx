"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { isFullscreenAtom, isTauriMacAtom } from "@/lib/atoms";
import { isTauri } from "@tauri-apps/api/tauri"; // Checks if running in Tauri
import { app } from "@tauri-apps/api/os"; // For OS info
import { appWindow } from "@tauri-apps/api/window";

export function FullscreenDetector() {
  const [, setIsFullscreen] = useAtom(isFullscreenAtom);
  const [, setIsTauriMac] = useAtom(isTauriMacAtom);

  useEffect(() => {
    const checkTauriMac = async () => {
      // Check if running in Tauri
      const runningInTauri = isTauri;

      // Check OS platform
      const platform = await app.platform(); // Returns "darwin" on macOS
      const isMac = platform.toLowerCase() === "darwin";

      console.log("runningInTauri:", runningInTauri);
      console.log("isMac:", isMac);

      setIsTauriMac(runningInTauri && isMac);
    };

    checkTauriMac();
  }, []);

  useEffect(() => {
    const setupWebFullscreen = () => {
      const handleFullscreenChange = () => {
        const isFullscreen = !!document.fullscreenElement;
        console.log("Web API fullscreen changed:", isFullscreen);
        setIsFullscreen(isFullscreen);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.addEventListener("mozfullscreenchange", handleFullscreenChange);
      document.addEventListener("MSFullscreenChange", handleFullscreenChange);

      const initialFullscreen = !!document.fullscreenElement;
      console.log("Initial web API fullscreen state:", initialFullscreen);
      setIsFullscreen(initialFullscreen);

      return () => {
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "webkitfullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "mozfullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "MSFullscreenChange",
          handleFullscreenChange
        );
      };
    };

    if (isTauri) {
      console.log("Setting up Tauri fullscreen listeners");

      // Get initial fullscreen state
      appWindow.isFullscreen().then((isFullscreen) => {
        console.log("Initial Tauri fullscreen state:", isFullscreen);
        setIsFullscreen(isFullscreen);
      });

      const listener = appWindow.onFullscreenChanged(({ payload }) => {
        console.log("Tauri fullscreen changed:", payload);
        setIsFullscreen(payload);
      });

      return () => {
        console.log("Cleaning up Tauri fullscreen listeners");
        listener.then((unlisten) => unlisten());
      };
    } else {
      console.log("Setting up web API fullscreen listeners");
      return setupWebFullscreen();
    }
  }, [setIsFullscreen]);

  return null; // This component doesn't render anything
}
