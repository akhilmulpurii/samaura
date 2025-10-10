import { JotaiProvider } from "../components/jotai-provider";
import { FullscreenDetector } from "../components/fullscreen-detector";
import { LayoutContent } from "../components/layout-content";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // While loading, you can render a loader
  if (isLoading) {
    return;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <JotaiProvider>
      <FullscreenDetector />
      <LayoutContent>
        <Outlet />
      </LayoutContent>
    </JotaiProvider>
  );
}
