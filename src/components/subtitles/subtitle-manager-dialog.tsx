"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Flag } from "../ui/flag";
import {
  Captions,
  Search,
  Upload,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  Film,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { JellyfinItem, MediaSourceInfo, MediaStream } from "../../types/jellyfin";
import {
  getInstalledSubtitles,
  uploadSubtitleToJellyfin,
  deleteJellyfinSubtitle,
  type InstalledSubtitle,
} from "../../actions";
import { formatRuntime } from "../../lib/utils";

interface SearchResult {
  fileId: number | null;
  fileName: string;
  language: string;
  release: string;
  fps: number | null;
  downloadCount: number;
  ratings: number;
  fromTrusted: boolean;
  hearingImpaired: boolean;
  hd: boolean;
  aiTranslated: boolean;
  machineTranslated: boolean;
  uploadDate: string | null;
}

interface SubtitleManagerDialogProps {
  media?: JellyfinItem;
  mediaSource?: MediaSourceInfo | null;
  triggerClassName?: string;
  triggerLabelClassName?: string;
}

function baseName(path?: string | null): string {
  if (!path) return "";
  return path.split(/[\\/]/).pop() || path;
}

export function SubtitleManagerDialog({
  media,
  mediaSource,
  triggerClassName,
  triggerLabelClassName,
}: SubtitleManagerDialogProps) {
  const [open, setOpen] = useState(false);

  if (!media?.Id) return null;
  const itemId = media.Id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          <Captions className="h-4 w-4" />
          <span className={triggerLabelClassName ?? "ml-2 text-sm sm:hidden"}>
            Subtitles
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] !max-w-4xl overflow-y-auto dark:bg-background/30 backdrop-blur-md z-9999999999">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Captions className="h-5 w-5" />
            Subtitles
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search, upload and manage subtitles for this title.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <SubtitleManagerContent
            media={media}
            itemId={itemId}
            mediaSource={mediaSource ?? null}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubtitleManagerContent({
  media,
  itemId,
  mediaSource,
}: {
  media: JellyfinItem;
  itemId: string;
  mediaSource: MediaSourceInfo | null;
}) {
  const videoStream = mediaSource?.MediaStreams?.find(
    (s: MediaStream) => s.Type === "Video",
  );
  const fileFps =
    videoStream?.AverageFrameRate || videoStream?.RealFrameRate || null;
  const fileName =
    baseName(mediaSource?.Path) || mediaSource?.Name || media.Name || "";
  const runtime = formatRuntime(media.RunTimeTicks ?? undefined);
  const imdbId = (media.ProviderIds as Record<string, string> | undefined)?.Imdb;
  const tmdbId = (media.ProviderIds as Record<string, string> | undefined)?.Tmdb;

  const [installed, setInstalled] = useState<InstalledSubtitle[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(true);

  const refreshInstalled = useCallback(async () => {
    if (!mediaSource?.Id) {
      setInstalled([]);
      setLoadingInstalled(false);
      return;
    }
    try {
      const subs = await getInstalledSubtitles(itemId, mediaSource.Id);
      setInstalled(subs);
    } catch (e) {
      console.error("Failed to load installed subtitles", e);
    } finally {
      setLoadingInstalled(false);
    }
  }, [itemId, mediaSource?.Id]);

  useEffect(() => {
    refreshInstalled();
  }, [refreshInstalled]);

  return (
    <div className="space-y-4">
      {/* Your file — for matching search results */}
      <div className="rounded-lg border border-border/50 bg-background/40 p-3 text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Film className="h-4 w-4 text-primary" />
          <span className="truncate" title={fileName}>
            {fileName || "Unknown file"}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2 text-muted-foreground">
          {fileFps ? <Badge variant="secondary">{fileFps.toFixed(3)} fps</Badge> : null}
          {runtime ? <Badge variant="secondary">{runtime}</Badge> : null}
          {mediaSource?.Container ? (
            <Badge variant="secondary">{mediaSource.Container}</Badge>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">
            <Search className="mr-1.5 h-3.5 w-3.5" /> Search
          </TabsTrigger>
          <TabsTrigger value="installed">
            <Captions className="mr-1.5 h-3.5 w-3.5" /> Installed
            {installed.length > 0 ? (
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({installed.length})
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4">
          <SearchTab
            itemId={itemId}
            imdbId={imdbId}
            tmdbId={tmdbId}
            query={media.Name || ""}
            year={media.ProductionYear?.toString()}
            fileFps={fileFps}
            onInstalled={refreshInstalled}
          />
        </TabsContent>

        <TabsContent value="installed" className="mt-4">
          <InstalledTab
            itemId={itemId}
            installed={installed}
            loading={loadingInstalled}
            onChanged={refreshInstalled}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <UploadTab itemId={itemId} onUploaded={refreshInstalled} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchTab({
  itemId,
  imdbId,
  tmdbId,
  query,
  year,
  fileFps,
  onInstalled,
}: {
  itemId: string;
  imdbId?: string;
  tmdbId?: string;
  query: string;
  year?: string;
  fileFps: number | null;
  onInstalled: () => void;
}) {
  const [languages, setLanguages] = useState("en");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<number | null>(null);
  const hasSearched = useRef(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (imdbId) params.set("imdbId", imdbId);
      if (tmdbId) params.set("tmdbId", tmdbId);
      // Only fall back to a free-text query if we have no precise id.
      if (!imdbId && !tmdbId && query) params.set("query", query);
      if (year) params.set("year", year);
      if (languages.trim()) params.set("languages", languages.trim());

      const res = await fetch(`/api/subtitles/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Search failed");
      }
      setResults(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [imdbId, tmdbId, query, year, languages]);

  // Auto-run once when the tab first mounts.
  useEffect(() => {
    if (!hasSearched.current) {
      hasSearched.current = true;
      runSearch();
    }
  }, [runSearch]);

  const install = async (result: SearchResult) => {
    if (!result.fileId) {
      toast.error("This result has no downloadable file");
      return;
    }
    setInstallingId(result.fileId);
    const toastId = toast.loading("Downloading subtitle…");
    try {
      const dlRes = await fetch("/api/subtitles/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: result.fileId }),
      });
      const dl = await dlRes.json();
      if (!dlRes.ok) throw new Error(dl?.message || "Download failed");

      const upload = await uploadSubtitleToJellyfin(itemId, {
        language: result.language || "und",
        format: dl.format,
        contentBase64: dl.contentBase64,
        isHearingImpaired: result.hearingImpaired,
      });
      if (!upload.success) throw new Error(upload.message || "Upload failed");

      const remainingMsg =
        typeof dl.remaining === "number"
          ? ` (${dl.remaining} downloads left today)`
          : "";
      toast.success(`Subtitle added${remainingMsg}`, { id: toastId });
      onInstalled();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add subtitle", {
        id: toastId,
      });
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="sub-langs" className="text-xs">
            Languages (comma separated ISO codes)
          </Label>
          <Input
            id="sub-langs"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="en,es,pt-br"
            className="h-9 bg-background/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
        </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={runSearch} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </Button>
      </div>

      {!imdbId && !tmdbId ? (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          No IMDb/TMDB id on this item — searching by title, results may be less
          precise.
        </p>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <ScrollArea className="h-[min(45vh,360px)] rounded-md border border-border/40">
        {loading ? (
          <div className="flex h-[min(45vh,360px)] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-[min(45vh,360px)] items-center justify-center text-sm text-muted-foreground">
            No subtitles found.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {results.map((r, i) => {
              const fpsMatch =
                r.fps && fileFps
                  ? Math.abs(r.fps - fileFps) < 0.05
                  : false;
              return (
                <div
                  key={`${r.fileId}-${i}`}
                  className="flex items-start gap-3 p-3"
                >
                  <Flag language={r.language} size={18} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={r.release || r.fileName}>
                      {r.release || r.fileName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <Badge variant="outline" className="uppercase">
                        {r.language || "??"}
                      </Badge>
                      {r.fps ? (
                        <Badge
                          variant={fpsMatch ? "default" : "secondary"}
                          className={fpsMatch ? "bg-green-600 hover:bg-green-600" : ""}
                        >
                          {r.fps.toFixed(3)} fps{fpsMatch ? " ✓" : ""}
                        </Badge>
                      ) : null}
                      <Badge variant="secondary">
                        <Download className="mr-1 h-3 w-3" />
                        {r.downloadCount.toLocaleString()}
                      </Badge>
                      {r.fromTrusted ? (
                        <Badge variant="secondary" className="text-green-500">
                          trusted
                        </Badge>
                      ) : null}
                      {r.hd ? <Badge variant="secondary">HD</Badge> : null}
                      {r.hearingImpaired ? (
                        <Badge variant="secondary">HI</Badge>
                      ) : null}
                      {r.aiTranslated || r.machineTranslated ? (
                        <Badge variant="secondary" className="text-amber-500">
                          auto-translated
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 gap-1.5"
                    disabled={installingId !== null || !r.fileId}
                    onClick={() => install(r)}
                  >
                    {installingId === r.fileId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Add
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function InstalledTab({
  itemId,
  installed,
  loading,
  onChanged,
}: {
  itemId: string;
  installed: InstalledSubtitle[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const remove = async (sub: InstalledSubtitle) => {
    setDeletingIndex(sub.index);
    const toastId = toast.loading("Removing subtitle…");
    try {
      const res = await deleteJellyfinSubtitle(itemId, sub.index);
      if (!res.success) throw new Error(res.message || "Delete failed");
      toast.success("Subtitle removed", { id: toastId });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove", {
        id: toastId,
      });
    } finally {
      setDeletingIndex(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[min(45vh,360px)] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (installed.length === 0) {
    return (
      <div className="flex h-[min(45vh,360px)] items-center justify-center text-sm text-muted-foreground">
        No subtitles installed yet.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[min(45vh,360px)] rounded-md border border-border/40">
      <div className="divide-y divide-border/40">
        {installed.map((sub) => (
          <div key={sub.index} className="flex items-center gap-3 p-3">
            <Flag language={sub.language} size={18} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{sub.displayTitle}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <Badge variant="outline">
                  {sub.isExternal ? "external" : "embedded"}
                </Badge>
                {sub.codec ? (
                  <Badge variant="secondary" className="uppercase">
                    {sub.codec}
                  </Badge>
                ) : null}
                {sub.isDefault ? <Badge variant="secondary">default</Badge> : null}
                {sub.isForced ? <Badge variant="secondary">forced</Badge> : null}
                {sub.isHearingImpaired ? (
                  <Badge variant="secondary">HI</Badge>
                ) : null}
              </div>
            </div>
            {sub.isExternal ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 text-destructive hover:text-destructive"
                disabled={deletingIndex !== null}
                onClick={() => remove(sub)}
              >
                {deletingIndex === sub.index ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            ) : (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                in container
              </span>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function UploadTab({
  itemId,
  onUploaded,
}: {
  itemId: string;
  onUploaded: () => void;
}) {
  const [language, setLanguage] = useState("en");
  const [forced, setForced] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = [".srt", ".ass", ".ssa", ".vtt", ".sub", ".smi"];

  const pick = (f: File | null) => {
    if (!f) return;
    const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "");
    if (!ACCEPTED.includes(ext)) {
      toast.error(`Unsupported file type. Use ${ACCEPTED.join(", ")}`);
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading("Uploading subtitle…");
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const format = file.name.split(".").pop()?.toLowerCase() || "srt";

      const res = await uploadSubtitleToJellyfin(itemId, {
        language: language.trim() || "und",
        format,
        contentBase64: base64,
        isForced: forced,
      });
      if (!res.success) throw new Error(res.message || "Upload failed");
      toast.success("Subtitle uploaded", { id: toastId });
      setFile(null);
      onUploaded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed", {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition ${
          dragging
            ? "border-primary bg-primary/10"
            : "border-border/60 bg-background/40 hover:border-primary/60"
        }`}
      >
        {file ? (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {file.name}
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag &amp; drop a subtitle file, or click to browse
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {ACCEPTED.join("  ")}
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="upload-lang" className="text-xs">
            Language (ISO code)
          </Label>
          <Input
            id="upload-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="en"
            className="h-9 w-28 bg-background/50"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={forced}
            onChange={(e) => setForced(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Forced
        </label>
        <Button
          size="sm"
          className="ml-auto h-9 gap-1.5"
          disabled={!file || uploading}
          onClick={submit}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload
        </Button>
      </div>
    </div>
  );
}
