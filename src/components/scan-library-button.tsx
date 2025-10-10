import { useState } from "react";
import { Button } from "../components/ui/button";
import { TextShimmer } from "../components/motion-primitives/text-shimmer";
import { RefreshCw } from "lucide-react";
import { scanLibrary } from "../actions";
import { toast } from "sonner";

interface ScanLibraryButtonProps {
  libraryId?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ScanLibraryButton({
  libraryId,
  variant = "outline",
  size = "default",
  className,
}: ScanLibraryButtonProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    try {
      setIsScanning(true);
      await scanLibrary(libraryId);

      toast.success("Library scan started!");
    } catch (error: any) {
      console.error("Failed to scan library:", error);

      // Handle authentication errors
      if (error?.isAuthError) {
        toast.error("Authentication expired. Please sign in again.");
      } else {
        toast.error("Failed to start library scan. Please try again.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Button
      onClick={handleScan}
      disabled={isScanning}
      variant={variant}
      size={size}
      className={className}
    >
      <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
      {isScanning ? (
        <TextShimmer className="text-sm font-medium">
          Scanning Library...
        </TextShimmer>
      ) : (
        "Scan Library"
      )}
    </Button>
  );
}
