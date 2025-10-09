"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { VibrantAuroraBackground } from "@/components/vibrant-aurora-background";
import { checkServerHealth, setServerUrl } from "@/app/actions";
import { Loader2, Server, CheckCircle, Globe, Shield } from "lucide-react";

const SERVER_BASE_URL = process.env.NEXT_PUBLIC_SERVER_BASE_URL || "";

interface ServerSetupProps {
  onNext: () => void;
}

type ConnectionStatus =
  | "idle"
  | "connecting"
  | "trying-http"
  | "trying-https"
  | "success"
  | "error";

export function ServerSetup({ onNext }: ServerSetupProps) {
  const [url, setUrl] = useState(SERVER_BASE_URL);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [error, setError] = useState("");
  const [detectedUrl, setDetectedUrl] = useState("");

  const isLoading =
    connectionStatus !== "idle" &&
    connectionStatus !== "success" &&
    connectionStatus !== "error";

  const cleanUrl = (inputUrl: string): string => {
    let cleaned = inputUrl.trim();
    // Remove trailing slash
    cleaned = cleaned.replace(/\/$/, "");
    return cleaned;
  };

  const getConnectionMessage = (): string => {
    switch (connectionStatus) {
      case "connecting":
        return "Connecting to server...";
      case "trying-http":
        return "Trying HTTP connection...";
      case "trying-https":
        return "Trying HTTPS connection...";
      case "success":
        return "Connected successfully!";
      default:
        return "Connect to Server";
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "trying-http":
        return <Globe className="h-4 w-4 animate-pulse" />;
      case "trying-https":
        return <Shield className="h-4 w-4 animate-pulse" />;
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a server URL");
      return;
    }

    setConnectionStatus("connecting");
    setError("");
    setDetectedUrl("");

    console.log("URL:", url);

    try {
      const cleanedUrl = cleanUrl(url);
      console.log("Cleaned URL:", cleanedUrl);
      const result = await checkServerHealth(cleanedUrl);
      console.log("Health check result:", result);
      if (result.success && result.finalUrl) {
        setConnectionStatus("success");
        setDetectedUrl(result.finalUrl);
        await setServerUrl(result.finalUrl);
        console.log("Server URL set to:", result.finalUrl);
        // Small delay to show success state
        setTimeout(() => {
          onNext();
        }, 800);
      } else {
        console.log("Health check failed:", result.error);
        setConnectionStatus("error");
        setError(
          result.error ||
            "Unable to connect to Jellyfin server. Please check the URL and try again."
        );
      }
    } catch {
      console.error("Unexpected error during server connection");
      setConnectionStatus("error");
      setError("An unexpected error occurred. Please try again.");
    }
  };

  console.log("VALUE:", SERVER_BASE_URL);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative w-full">
      <VibrantAuroraBackground amplitude={0.8} blend={0.4} />
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect to Jellyfin</CardTitle>
          <CardDescription>
            Enter your Jellyfin server URL to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div>
              <label
                htmlFor="server-url"
                className="text-sm font-medium block mb-2"
              >
                Server URL
              </label>
              <Input
                id="server-url"
                type="text"
                placeholder="jellyfin.example.com or 192.168.1.100:8096"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className={`${
                  error
                    ? "border-red-500"
                    : connectionStatus === "success"
                    ? "border-green-500"
                    : ""
                }`}
              />

              {/* Connection Status */}
              {(connectionStatus === "connecting" ||
                connectionStatus === "trying-http" ||
                connectionStatus === "trying-https") && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  {getConnectionIcon()}
                  <span>{getConnectionMessage()}</span>
                </div>
              )}

              {/* Success State */}
              {connectionStatus === "success" && detectedUrl && (
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Connected to {detectedUrl}</span>
                </div>
              )}

              {/* Error State */}
              {error && (
                <p className="text-sm text-red-500 mt-2 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">⚠</span>
                  <span>{error}</span>
                </p>
              )}

              {/* Help Text */}
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  No need to include http:// or https:// - we'll try HTTPS
                  first, then HTTP
                </p>
                <p className="text-xs text-muted-foreground">
                  Examples:{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    jellyfin.mydomain.com
                  </code>
                  ,{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    192.168.1.100:8096
                  </code>
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className={`w-full mt-4 ${
                connectionStatus === "success"
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
              }`}
              disabled={isLoading}
            >
              <span className="flex items-center gap-2">
                {getConnectionIcon()}
                <span>{getConnectionMessage()}</span>
              </span>
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Theme toggle in bottom right */}
      <div className="fixed bottom-4 right-4">
        <ThemeToggle />
      </div>
    </div>
  );
}
