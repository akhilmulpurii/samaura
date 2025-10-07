import { JotaiProvider } from "@/components/jotai-provider";
import { FullscreenDetector } from "@/components/fullscreen-detector";
import { LayoutContent } from "@/components/layout-content";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <JotaiProvider>
      <FullscreenDetector />
      <LayoutContent>{children}</LayoutContent>
    </JotaiProvider>
  );
}
