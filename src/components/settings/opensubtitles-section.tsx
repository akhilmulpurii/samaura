"use client";
import {
  Captions,
  ChevronDown,
  Key,
  Loader2,
  Save,
  User,
  Languages,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { StoreOpenSubtitlesData } from "@/src/actions/store/store-opensubtitles-data";
import { toast } from "sonner";

export default function OpenSubtitlesSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [savedUsername, setSavedUsername] = useState("");

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [languages, setLanguages] = useState("en");

  const loadStatus = useCallback(async () => {
    try {
      const status = await StoreOpenSubtitlesData.status();
      setConfigured(status.configured);
      setSavedUsername(status.username);
      setLanguages(status.languages || "en");
    } catch (error) {
      console.error("Failed to load OpenSubtitles status", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleDisconnect = async () => {
    await StoreOpenSubtitlesData.remove();
    setApiKey("");
    setUsername("");
    setPassword("");
    setConfigured(false);
    setSavedUsername("");
    toast.success("Disconnected OpenSubtitles");
  };

  const handleConnect = async () => {
    if (!apiKey || !username || !password) {
      toast.error("API key, username and password are all required");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Testing OpenSubtitles connection…");
    try {
      const res = await fetch("/api/subtitles/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data?.message || "Connection failed", { id: toastId });
        return;
      }

      await StoreOpenSubtitlesData.set({
        apiKey,
        username,
        password,
        languages: languages.trim() || "en",
      });

      const remaining = data.quota?.remaining;
      const allowed = data.quota?.allowed;
      const quotaMsg =
        typeof remaining === "number" && typeof allowed === "number"
          ? ` — ${remaining}/${allowed} downloads left today`
          : "";
      toast.success(`OpenSubtitles connected${quotaMsg}`, { id: toastId });
      setConfigured(true);
      setSavedUsername(username);
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-card/80 backdrop-blur">
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-wrap items-start justify-between gap-3 cursor-pointer">
            <CardTitle className="flex items-center gap-2 font-poppins text-lg">
              <Captions className="h-5 w-5" />
              Subtitle Search (OpenSubtitles)
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {configured && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Connected
                </div>
              )}
            </CardTitle>
            <button
              type="button"
              aria-expanded={open}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              {open ? "Hide" : "Show"}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  open ? "rotate-180" : "rotate-0",
                )}
              />
            </button>
            <CardDescription className="w-full">
              Connect your OpenSubtitles.com account to search and download
              subtitles directly from a title&apos;s page. Downloads are saved
              into your media library through Jellyfin.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : configured ? (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                    <Captions className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground">
                      Connected to OpenSubtitles
                    </h4>
                    <p className="text-xs text-muted-foreground break-all">
                      {savedUsername} · languages: {languages}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="os-api-key">API Key</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="os-api-key"
                      type="password"
                      placeholder="Your API key from opensubtitles.com → Consumers"
                      className="pl-9 bg-background/50"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Create a free API key under your account&apos;s{" "}
                    <span className="font-medium">API Consumers</span> section at
                    opensubtitles.com.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="os-username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="os-username"
                        placeholder="OpenSubtitles username"
                        className="pl-9 bg-background/50"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="os-password">Password</Label>
                    <Input
                      id="os-password"
                      type="password"
                      placeholder="Password"
                      className="bg-background/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="os-langs">Preferred languages</Label>
                  <div className="relative">
                    <Languages className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="os-langs"
                      placeholder="en,es,pt-br"
                      className="pl-9 bg-background/50"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Comma-separated ISO codes used as the default for searches.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    className="w-full gap-2 sm:w-auto"
                    onClick={handleConnect}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Connect
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
