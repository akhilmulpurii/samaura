import { JotaiProvider } from "../components/jotai-provider";
import { FullscreenDetector } from "../components/fullscreen-detector";
import { LayoutContent } from "../components/layout-content";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <JotaiProvider>
      <FullscreenDetector />
      <LayoutContent>
        <Outlet />
      </LayoutContent>
    </JotaiProvider>
  );
}
