"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Eye,
  Download,
  X,
  Copy,
  Search,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { fetchLogContent, JellyfinLog } from "../../actions/utils";
import { toast } from "sonner";
import { LogFile } from "@jellyfin/sdk/lib/generated-client/models";
import { TextShimmer } from "../motion-primitives/text-shimmer";

interface LogViewerDialogProps {
  log: LogFile;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LogViewerDialog({
  log,
  children,
  open: controlledOpen,
  onOpenChange,
}: LogViewerDialogProps) {
  const [logContent, setLogContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const refreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  // Handle loading content when dialog opens
  useEffect(() => {
    console.log("Dialog open state changed via useEffect:", open);
    if (open && !logContent) {
      loadLogContent(true); // Initial load
    }

    // Start auto-refresh when dialog opens and live mode is enabled
    if (open && isLiveMode) {
      refreshIntervalRef.current = setInterval(() => {
        loadLogContent(false); // Refresh load
      }, 1000);
    } else {
      // Clear interval when dialog closes or live mode is disabled
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      // Reset states when dialog closes
      if (!open) {
        setIsAutoScrolling(false);
        setShowScrollButton(true);
        setIsInitialLoad(true);
      }
    }

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [open, logContent, isLiveMode]);

  // Auto-scroll to bottom when content changes and auto-scrolling is enabled
  useEffect(() => {
    if (isAutoScrolling && logContent && !isInitialLoad) {
      scrollToBottom();
    }
  }, [logContent, isAutoScrolling, isInitialLoad]);

  // Set up scroll listener
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", handleScroll);
        return () => {
          scrollContainer.removeEventListener("scroll", handleScroll);
        };
      }
    }
  }, [scrollAreaRef.current, isAutoScrolling]);

  const handleOpenChange = (newOpen: boolean) => {
    console.log("Dialog open state changed via handleOpenChange:", newOpen);
    if (setOpen) {
      setOpen(newOpen);
    }
  };

  const loadLogContent = async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
      setIsInitialLoad(true);
    }
    console.log("Loading log content for:", log.Name);
    try {
      const content = await fetchLogContent(log.Name!);
      console.log("Log content loaded:", content);
      setLogContent(content);
      if (isInitial) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error("Failed to load log content:", error);
      toast.error("Failed to load log content");
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logContent);
    toast.success("Log content copied to clipboard");
  };

  const downloadLog = () => {
    const blob = new Blob([logContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = log.Name!;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const handleScrollToBottomClick = () => {
    setIsAutoScrolling(true);
    setShowScrollButton(false);
    scrollToBottom();
  };

  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        const isAtBottom =
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - 10;

        if (!isAtBottom && isAutoScrolling) {
          setIsAutoScrolling(false);
          setShowScrollButton(true);
        }
      }
    }
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(
      regex,
      "<mark class='bg-primary dark:bg-primary/50 text-white'>$1</mark>"
    );
  };

  const filteredContent = React.useMemo(() => {
    if (!searchTerm) return logContent;

    return logContent
      .split("\n")
      .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
      .join("\n");
  }, [logContent, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[90vw]! w-[90vw]! h-[80vh] flex flex-col overflow-hidden dark:bg-background/30 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex flex-col md:flex-row items-center gap-2">
            <div className="flex items-center gap-2">{log.Name}</div>
            <div className="flex items-center gap-2 my-2 md:my-0">
              <Badge variant="outline" className="">
                {formatFileSize(log.Size!)}
              </Badge>
              <Badge
                className={
                  isLiveMode ? "bg-emerald-500 dark:bg-emerald-500" : ""
                }
              >
                {isLiveMode ? "LIVE" : "PAUSED"}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>
              Created: {new Date(log.DateCreated!).toLocaleString()} • Modified:{" "}
              {new Date(log.DateModified!).toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm">Live Mode</span>
              <Switch
                checked={isLiveMode}
                onCheckedChange={(checked) => {
                  const newLiveMode = !!checked;
                  setIsLiveMode(newLiveMode);

                  // If turning on live mode and dialog is open, start refresh
                  if (newLiveMode && open) {
                    refreshIntervalRef.current = setInterval(() => {
                      loadLogContent(false);
                    }, 1000);
                  }
                  // If turning off live mode, stop refresh
                  else if (!newLiveMode && refreshIntervalRef.current) {
                    clearInterval(refreshIntervalRef.current);
                    refreshIntervalRef.current = null;
                  }
                }}
              />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 mt-2 relative">
          <ScrollArea ref={scrollAreaRef} className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-[calc(80vh-200px)]">
                <div className="inline-flex items-center gap-2">
                  <TextShimmer>Loading log content...</TextShimmer>
                </div>
              </div>
            ) : (
              <div>
                <pre
                  className="text-xs font-mono whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: highlightSearchTerm(filteredContent),
                  }}
                />
              </div>
            )}
          </ScrollArea>

          {/* Scroll to bottom button */}
          {!isLoading && logContent && showScrollButton && (
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-4 right-4 z-10"
              onClick={handleScrollToBottomClick}
              title="Scroll to bottom"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 mt-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            disabled={!logContent}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadLog}
            disabled={!logContent}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
