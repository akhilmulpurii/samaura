import { useEffect } from "react";
import { useAtom } from "jotai";
import { isFullscreenAtom, isTauriMacAtom } from "../lib/atoms";
import { isTauri } from "@tauri-apps/api/core"; // Checks if running in Tauri
import { platform } from "@tauri-apps/plugin-os";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";

export function FullscreenDetector() {
  const [, setIsFullscreen] = useAtom(isFullscreenAtom);
  const [, setIsTauriMac] = useAtom(isTauriMacAtom);

  useEffect(() => {
    const checkTauriMac = async () => {
      try {
        // Check if running in Tauri
        const runningInTauri = isTauri();

        if (runningInTauri) {
          // Check OS platform
          const appPlatform = platform(); // Returns "darwin" on macOS
          const isMac = appPlatform.toLowerCase() === "darwin";

          console.log("runningInTauri:", runningInTauri);
          console.log("isMac:", isMac);

          setIsTauriMac(runningInTauri && isMac);
        }
      } catch (error) {
        console.log("Probably not a Tauri environment", error);
      }
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

    if (isTauri()) {
      const appWindow = getCurrentWindow();
      let unlisten: (() => void) | null = null;

      console.log("Setting up Tauri fullscreen listeners");

      // Get initial fullscreen state
      appWindow.isFullscreen().then((isFullscreen) => {
        console.log("Initial Tauri fullscreen state:", isFullscreen);
        setIsFullscreen(isFullscreen);
      });

      (async () => {
        // Initial state
        setIsFullscreen(await appWindow.isFullscreen());

        // Listen for any resize event (fullscreen toggles trigger this)
        unlisten = await listen("tauri://resize", async () => {
          const full = await appWindow.isFullscreen();
          console.log("Tauri fullscreen changed:", full);
          setIsFullscreen(full);
        });
      })();

      // Cleanup
      return () => {
        console.log("Cleaning up Tauri fullscreen listeners");
        if (unlisten) unlisten();
      };
    } else {
      console.log("Setting up web API fullscreen listeners");
      return setupWebFullscreen();
    }
  }, [setIsFullscreen]);

  return null; // This component doesn't render anything
}
