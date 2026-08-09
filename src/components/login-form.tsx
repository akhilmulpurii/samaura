"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  FormEvent,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { VibrantAuroraBackground } from "../components/vibrant-aurora-background";
import {
  authenticateUser,
  isQuickConnectEnabled,
  initiateQuickConnect,
  getQuickConnectStatus,
  authenticateWithQuickConnect,
  getServerUrl,
} from "../actions";
import {
  Loader2,
  User,
  ArrowLeft,
  RefreshCcw,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Checkbox } from "../components/ui/checkbox";
import { StoreLoginPreferences } from "../actions/store/store-login-preferences";

interface LoginFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

type AuthMethod = "password" | "quickconnect";

interface QuickConnectSession {
  code: string;
  secret: string;
}

export function LoginForm({ onSuccess, onBack }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [quickConnectSupported, setQuickConnectSupported] = useState<
    boolean | null
  >(null);
  const [quickConnectSession, setQuickConnectSession] =
    useState<QuickConnectSession | null>(null);
  const [quickConnectError, setQuickConnectError] = useState<string | null>(
    null,
  );
  const [quickConnectLoading, setQuickConnectLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const pollTimerRef = useRef<number | null>(null);
  const lastSecretRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const stopQuickConnectPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const persistLoginPreferences = useCallback(async () => {
    try {
      const serverUrl = await getServerUrl();
      await StoreLoginPreferences.set({
        username: username.trim() || undefined,
        serverUrl: serverUrl || undefined,
        rememberMe,
      });
    } catch (error) {
      console.warn("Failed to persist login preferences:", error);
    }
  }, [rememberMe, username]);

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      const prefs = await StoreLoginPreferences.get();
      if (!isMountedRef.current) return;
      if (prefs?.username) {
        setUsername(prefs.username);
      }
      if (typeof prefs?.rememberMe === "boolean") {
        setRememberMe(prefs.rememberMe);
      }
    })();
    return () => {
      isMountedRef.current = false;
      stopQuickConnectPolling();
    };
  }, [stopQuickConnectPolling]);

  useEffect(() => {
    let active = true;

    isQuickConnectEnabled()
      .then((enabled) => {
        if (!active) return;
        setQuickConnectSupported(enabled);
      })
      .catch((reason) => {
        console.warn("Failed to check Quick Connect availability:", reason);
        if (active) {
          setQuickConnectSupported(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (quickConnectSupported === false && authMethod === "quickconnect") {
      setAuthMethod("password");
    }
  }, [authMethod, quickConnectSupported]);

  const pollQuickConnectStatus = useCallback(async () => {
    const secret = lastSecretRef.current;
    if (!secret) return;

    try {
      const status = await getQuickConnectStatus(secret);
      if (!status) {
        return;
      }

      const nextSecret = status.Secret || secret;
      lastSecretRef.current = nextSecret;

      if (status.Code) {
        setQuickConnectSession({
          code: status.Code,
          secret: nextSecret,
        });
      } else {
        setQuickConnectSession((previous) =>
          previous ? { ...previous, secret: nextSecret } : previous,
        );
      }

      if (status.Authenticated) {
        stopQuickConnectPolling();
        const success = await authenticateWithQuickConnect(nextSecret, rememberMe);
        if (!isMountedRef.current) return;

        if (success) {
          await persistLoginPreferences();
          onSuccess();
          return;
        }

        setQuickConnectError(
          "Quick Connect was approved, but we couldn't finish signing you in. Please try again or use your password.",
        );
      }
    } catch (pollError) {
      console.error("Quick Connect polling error:", pollError);
      stopQuickConnectPolling();
      if (!isMountedRef.current) return;
      setQuickConnectError(
        pollError instanceof Error
          ? pollError.message
          : "We couldn't check the Quick Connect status. Please try again.",
      );
    }
  }, [onSuccess, persistLoginPreferences, rememberMe, stopQuickConnectPolling]);

  const startQuickConnect = useCallback(async () => {
    if (quickConnectLoading) return;

    setQuickConnectLoading(true);
    setQuickConnectError(null);
    setQuickConnectSession(null);
    stopQuickConnectPolling();
    lastSecretRef.current = null;

    try {
      const session = await initiateQuickConnect();
      if (!isMountedRef.current) return;

      if (!session || !session.Secret || !session.Code) {
        throw new Error(
          "Quick Connect did not return a valid code. Please try again.",
        );
      }

      setQuickConnectSession({
        code: session.Code,
        secret: session.Secret,
      });
      lastSecretRef.current = session.Secret;

      await pollQuickConnectStatus();
      pollTimerRef.current = window.setInterval(() => {
        void pollQuickConnectStatus();
      }, 4000);
    } catch (initError) {
      console.error("Unable to start Quick Connect:", initError);
      if (!isMountedRef.current) return;
      setQuickConnectError(
        initError instanceof Error
          ? initError.message
          : "Unable to start Quick Connect. Please try again or use your password.",
      );
      setQuickConnectSession(null);
      stopQuickConnectPolling();
    } finally {
      if (isMountedRef.current) {
        setQuickConnectLoading(false);
      }
    }
  }, [pollQuickConnectStatus, quickConnectLoading, stopQuickConnectPolling]);

  useEffect(() => {
    if (authMethod !== "quickconnect") {
      stopQuickConnectPolling();
      return;
    }

    if (quickConnectSupported !== true) {
      return;
    }

    if (quickConnectSession || quickConnectLoading) {
      return;
    }

    startQuickConnect().catch((error) =>
      console.error("Quick Connect start error:", error),
    );
  }, [
    authMethod,
    quickConnectSupported,
    quickConnectSession,
    quickConnectLoading,
    startQuickConnect,
    stopQuickConnectPolling,
  ]);

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const success = await authenticateUser(username, password, rememberMe);
      if (success) {
        await persistLoginPreferences();
        onSuccess();
      } else {
        setError("Invalid username or password. Please try again.");
      }
    } catch {
      setError("Authentication failed. Please try again.");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleBack = useCallback(() => {
    stopQuickConnectPolling();
    setQuickConnectSession(null);
    setQuickConnectError(null);
    onBack();
  }, [onBack, stopQuickConnectPolling]);

  const quickConnectAvailable = quickConnectSupported === true;
  const quickConnectChecking = quickConnectSupported === null;
  const tabsListClass =
    quickConnectAvailable || quickConnectChecking
      ? "grid w-full grid-cols-2"
      : "grid w-full grid-cols-1";

  const formattedCode = quickConnectSession?.code
    ? quickConnectSession.code.replace(/(.{3})/g, "$1 ").trim()
    : "------";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4">
      <VibrantAuroraBackground amplitude={0.8} blend={0.4} />
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="mx-auto w-fit rounded-full bg-primary/10 p-3">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="w-10" />
          </div>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Use your Jellyfin credentials or Quick Connect
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <Tabs
            value={authMethod}
            onValueChange={(value) => setAuthMethod(value as AuthMethod)}
            className="w-full"
          >
            <TabsList className={tabsListClass}>
              <TabsTrigger value="password">Password</TabsTrigger>
              {(quickConnectAvailable || quickConnectChecking) && (
                <TabsTrigger
                  value="quickconnect"
                  disabled={!quickConnectAvailable}
                >
                  Quick Connect
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="password" className="mt-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium"
                  >
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={isLoading}
                    autoComplete="username"
                    className={error ? "border-red-500" : ""}
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className={error ? "border-red-500" : ""}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-sm text-muted-foreground"
                  >
                    Keep me signed in on this device
                  </label>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="quickconnect" className="mt-6">
              {quickConnectChecking && (
                <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking Quick Connect availability…
                </div>
              )}

              {quickConnectSupported === false && (
                <div className="flex items-start gap-2 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  This Jellyfin server has Quick Connect disabled. Please use
                  your username and password instead.
                </div>
              )}

              {quickConnectAvailable && (
                <div className="space-y-5">
                  {quickConnectError && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <span>{quickConnectError}</span>
                    </div>
                  )}

                  {!quickConnectError &&
                    !quickConnectSession &&
                    quickConnectLoading && (
                      <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Quick Connect code…
                      </div>
                    )}

                  {quickConnectSession && (
                    <div className="space-y-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Approve this device from any signed-in Jellyfin session
                      </div>
                      <div className="font-mono text-4xl font-semibold tracking-[0.6em] text-primary">
                        {formattedCode}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Open Jellyfin on a device that&apos;s already signed in,
                        go to <span className="font-medium">Quick Connect</span>
                        , and enter the code above. We&apos;ll finish signing
                        you in automatically.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            startQuickConnect().catch((error) =>
                              console.error(
                                "Quick Connect refresh error:",
                                error,
                              ),
                            )
                          }
                          disabled={quickConnectLoading}
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          Generate new code
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Checkbox
                  id="remember-me-quickconnect"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <label
                  htmlFor="remember-me-quickconnect"
                  className="text-sm text-muted-foreground"
                >
                  Keep me signed in on this device
                </label>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
