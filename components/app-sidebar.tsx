"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getUser,
  getServerUrl,
  logout,
  getUserLibraries,
  getUserImageUrl,
} from "@/app/actions";
import {
  Film,
  Tv,
  User,
  LogOut,
  ChevronUp,
  Home,
  Library,
  Sun,
  Moon,
  Monitor,
  Settings2,
  ChevronRight,
  DiscAlbum,
} from "lucide-react";
import { useSettings } from "@/contexts/settings-context";

interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType: string;
  ItemCount?: number;
}

export function AppSidebar({
  isElectronMac,
  isElectronFullscreen,
}: {
  isElectronMac: boolean;
  isElectronFullscreen: boolean;
}) {
  const { setTheme } = useTheme();
  const { videoBitrate, setVideoBitrate } = useSettings();
  const { state } = useSidebar();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [libraries, setLibraries] = useState<JellyfinLibrary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [userData, serverUrlData] = await Promise.all([
          getUser(),
          getServerUrl(),
        ]);

        setUser(userData);
        setServerUrl(serverUrlData);

        // Fetch libraries if we have both user and server URL
        if (userData && serverUrlData) {
          const librariesData = await getUserLibraries();
          setLibraries(librariesData);
          const userAvatarUrl = await getUserImageUrl(userData.Id!);
          setAvatarUrl(userAvatarUrl);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
    // logout() already handles the redirect
  };

  const getLibraryIcon = (collectionType: string) => {
    switch (collectionType?.toLowerCase()) {
      case "movies":
        return <Film className="h-4 w-4" />;
      case "tvshows":
        return <Tv className="h-4 w-4" />;
      case "boxsets":
        return <DiscAlbum className="h-4 w-4" />;
      default:
        return <Film className="h-4 w-4" />; // Default to film icon for any edge cases
    }
  };

  const lightSpeedUrl = avatarUrl?.includes("192.168.")
    ? avatarUrl
    : "https://lightspeed.ac/?url=" + avatarUrl;

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className={`${
        isElectronMac && !isElectronFullscreen ? "pt-10" : ""
      } z-20`}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              asChild
            >
              <Link href="/">
                <div className="text-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image
                    src="/logo/icons/Samaura_TintedRed.png"
                    alt="SamAura Logo"
                    width={32}
                    height={32}
                    className="rounded"
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">SamAura</span>
                  <span className="text-xs">
                    {serverUrl &&
                      new URL(serverUrl).hostname.replace(
                        /^(jellyfin\.|www\.)/,
                        ""
                      )}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <DropdownMenu>
                <SidebarMenuItem>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                      <Library className="h-4 w-4" />
                      <span>Libraries</span>
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  {!isLoading && libraries.length > 0 ? (
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      className="min-w-56 rounded-lg"
                    >
                      {libraries.map((library) => (
                        <DropdownMenuItem asChild key={library.Id}>
                          <Link
                            href={`/library/${library.Id}`}
                            className="flex items-center gap-2"
                          >
                            {getLibraryIcon(library.CollectionType)}
                            <span>{library.Name}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  ) : null}
                </SidebarMenuItem>
              </DropdownMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <Settings2 className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-lg"
                  role="button"
                  tabIndex={0}
                >
                  {lightSpeedUrl ? (
                    <Image
                      src={lightSpeedUrl}
                      alt="Avatar"
                      width={200}
                      height={200}
                    />
                  ) : (
                    <div className="text-foreground flex aspect-square size-8 items-center justify-center rounded-lg bg-primary p-2">
                      <User className="size-6 text-white" />
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.Name || "User"}
                    </span>
                    <span className="truncate text-xs">User Account</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Monitor className="h-4 w-4" />
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4 text-red-600 dark:text-red-500" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
