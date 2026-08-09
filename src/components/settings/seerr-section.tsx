"use client";
import {
  ChevronDown,
  Eye,
  Key,
  Loader2,
  Save,
  Server,
  User,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { StoreSeerrData } from "@/src/actions/store/store-seerr-data";
import { StoreLoginPreferences } from "@/src/actions/store/store-login-preferences";
import { type SeerrAuthType } from "@/src/actions/store/server-actions";
import { toast } from "sonner";
import { testSeerrConnection } from "@/src/actions";
import { useSeerr } from "@/src/contexts/seerr-context";

export default function SeerrSection() {
  const [seerrOpen, setSeerrOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isSeerrConnected, setIsSeerrConnected } = useSeerr();

  // Form State
  const [serverUrl, setServerUrl] = useState("");
  const [authType, setAuthType] = useState<SeerrAuthType>("api-key");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      const data = await StoreSeerrData.get();
      if (data) {
        setServerUrl(data.serverUrl);

        if (
          data.serverUrl &&
          ((data.authType === "api-key" && data.apiKey) ||
            (data.authType !== "api-key" && data.username && data.password))
        ) {
          setIsSeerrConnected(true);
        }
      }
    } catch (error) {
      console.error("Failed to load Seerr settings", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const getRememberMePreference = useCallback(async () => {
    const prefs = await StoreLoginPreferences.get();
    return prefs?.rememberMe === true;
  }, []);

  const handleSave = async () => {
    try {
      const rememberMe = await getRememberMePreference();
      if (authType === "api-key") {
        await StoreSeerrData.set({
          authType: "api-key",
          serverUrl,
          apiKey,
        }, { persistent: rememberMe });
      } else {
        await StoreSeerrData.set({
          authType,
          serverUrl,
          username,
          password,
        }, { persistent: rememberMe });
      }
      toast.success("Seerr settings saved successfully");
    } catch (error) {
      console.error("Failed to save Seerr settings", error);
      toast.error("Failed to save settings");
    }
  };

  const handleDisconnect = async () => {
    await StoreSeerrData.remove();
    setServerUrl("");
    setApiKey("");
    setUsername("");
    setPassword("");
    setIsSeerrConnected(false);
    toast.success("Disconnected Seerr Integration");
  };

  const handleTestConnection = async () => {
    if (!serverUrl) {
      toast.error("Please enter a Server URL first");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Testing connection...");

    try {
      // Save local state first to ensure we test what is currently typed
      const currentConfig = {
        serverUrl,
        authType,
        apiKey,
        username,
        password,
      };

      const result = await testSeerrConnection(currentConfig);

      if (result.success) {
        toast.success(result.message || "Connection Successful", {
          id: toastId,
        });
        await handleSave(); // Auto-save on success
        setIsSeerrConnected(true);
      } else {
        toast.error(result.message || "Connection Failed", { id: toastId });
        setIsSeerrConnected(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible open={seerrOpen} onOpenChange={setSeerrOpen}>
      <Card className="bg-card/80 backdrop-blur">
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-wrap items-start justify-between gap-3 cursor-pointer">
            <CardTitle className="flex items-center gap-2 font-poppins text-lg">
              <Eye className="h-5 w-5" />
              Seerr Integration
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSeerrConnected && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Connected
                </div>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px]">
                Beta
              </Badge>
                <button
                  type="button"
                  aria-expanded={seerrOpen}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  {seerrOpen ? "Hide" : "Show"}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      seerrOpen ? "rotate-180" : "rotate-0",
                    )}
                  />
                </button>
            </div>
            <CardDescription className="w-full">
              Configure your Overseerr or Jellyseerr instance to handle media
              requests directly.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-up data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-down">
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading settings...
              </div>
            ) : isSeerrConnected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                      <Eye className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">
                        Integrated with Seerr
                      </h4>
                      <p className="text-xs text-muted-foreground break-all">
                        {serverUrl}
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
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="seerr-url">Server URL</Label>
                  <div className="relative">
                    <Server className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="seerr-url"
                      placeholder="https://requests.yourdomain.com"
                      className="pl-9 bg-background/50"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Authentication Method</Label>
                  <Tabs
                    value={authType}
                    onValueChange={(v) => setAuthType(v as SeerrAuthType)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger
                        value="api-key"
                        className="text-xs sm:text-sm"
                      >
                        API Key
                      </TabsTrigger>
                      <TabsTrigger
                        value="jellyfin-user"
                        className="text-xs sm:text-sm"
                      >
                        Jellyfin User
                      </TabsTrigger>
                      <TabsTrigger
                        value="local-user"
                        className="text-xs sm:text-sm"
                      >
                        Local User
                      </TabsTrigger>
                    </TabsList>

                    <div className="mt-4 rounded-lg border border-border/50 bg-background/40 p-4">
                      <TabsContent value="api-key" className="mt-0 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="api-key">Overseerr API Key</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="api-key"
                              type="password"
                              placeholder="Your full API key from Settings > General"
                              className="pl-9"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Recommended for most single-user setups.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="jellyfin-user"
                        className="mt-0 space-y-3"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="jf-username">Jellyfin Username</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="jf-username"
                              placeholder="e.g. MyUser"
                              className="pl-9"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="jf-password">Jellyfin Password</Label>
                          <Input
                            id="jf-password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Use this if you want to sign in as a specific Jellyfin
                          user on Overseerr.
                        </p>
                      </TabsContent>

                      <TabsContent
                        value="local-user"
                        className="mt-0 space-y-3"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="local-username">Local Username</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="local-username"
                              placeholder="e.g. admin"
                              className="pl-9"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="local-password">Local Password</Label>
                          <Input
                            id="local-password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Sign in using an account created directly in Overseerr
                          (e.g. admin).
                        </p>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    className="w-full gap-2 sm:w-auto"
                    onClick={handleTestConnection}
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
