"use client";
import { useState, useEffect } from "react";
import dashboardLinksConfig from "../config/sidebar/dashboard-links.json";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "../components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  getUser,
  getServerUrl,
  logout,
  getUserLibraries,
  getUserImageUrl,
} from "../actions";
import {
  Film,
  Tv,
  User,
  LogOut,
  ChevronUp,
  Home,
  Library,
  Settings2,
  ChevronRight,
  DiscAlbum,
  Antenna,
  LayoutDashboard,
  Users,
  Wrench,
  CalendarClock,
  Activity,
  Key,
  Compass,
  Monitor,
  Database,
  FileCode,
  PlayCircle,
  Cpu,
  History,
  Signal,
  FastForward,
} from "lucide-react";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export function AppSidebar() {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [libraries, setLibraries] = useState<BaseItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const isAdmin = Boolean(user?.Policy?.IsAdministrator);

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
          // Add timestamp to bypass cache
          setAvatarUrl(`${userAvatarUrl}&t=${Date.now()}`);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Listen for avatar updates
    const handleAvatarUpdate = async () => {
      try {
        const userData = await getUser();
        if (userData) {
          const userAvatarUrl = await getUserImageUrl(userData.Id!);
          const timestamp = Date.now();
          // Ensure we're using a new URL string to trigger re-render
          setAvatarUrl(`${userAvatarUrl}&t=${timestamp}`);

          // Also update the user state if needed
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to refresh avatar:", error);
      }
    };

    window.addEventListener("user-avatar-updated", handleAvatarUpdate);

    return () => {
      window.removeEventListener("user-avatar-updated", handleAvatarUpdate);
    };
  }, []);

  const handleLogout = async () => {
    // logout() already handles the redirect
    await logout(router.push);
  };

  const getLibraryIcon = (collectionType: string) => {
    switch (collectionType?.toLowerCase()) {
      case "movies":
        return <Film className="h-4 w-4" />;
      case "tvshows":
        return <Tv className="h-4 w-4" />;
      case "boxsets":
        return <DiscAlbum className="h-4 w-4" />;
      case "livetv":
        return <Antenna className="h-4 w-4" />;
      default:
        return <Film className="h-4 w-4" />; // Default to film icon for any edge cases
    }
  };

  const getDashboardIcon = (name: string) => {
    switch (name) {
      case "Overview":
        return <LayoutDashboard className="h-4 w-4" />;
      case "General":
        return <Wrench className="h-4 w-4" />;
      case "Libraries":
        return <Library className="h-4 w-4" />;
      case "Display":
        return <Monitor className="h-4 w-4" />;
      case "Metadata":
        return <Database className="h-4 w-4" />;
      case "NFO Settings":
        return <FileCode className="h-4 w-4" />;
      case "Playback":
        return <PlayCircle className="h-4 w-4" />;
      case "Transcoding":
        return <Cpu className="h-4 w-4" />;
      case "Resume":
        return <History className="h-4 w-4" />;
      case "Streaming":
        return <Signal className="h-4 w-4" />;
      case "Trickplay":
        return <FastForward className="h-4 w-4" />;
      case "Manage users":
        return <Users className="h-4 w-4" />;
      case "Activity":
        return <Activity className="h-4 w-4" />;
      case "Scheduled tasks":
        return <CalendarClock className="h-4 w-4" />;
      case "API keys":
        return <Key className="h-4 w-4" />;
      default:
        return <LayoutDashboard className="h-4 w-4" />;
    }
  };

  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className={`z-20`}
      onMouseEnter={() => !isMobile && setOpen(true)}
      onMouseLeave={() => !isMobile && setOpen(false)}
    >
      <SidebarHeader className="mb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="h-8 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              asChild
            >
              <Link href="/">
                <div className="text-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image
                    src={"/assets/logo/icon.png"}
                    alt="Apertúre Logo"
                    className="rounded"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Apertúre</span>
                  <span className="text-xs">
                    {serverUrl &&
                      new URL(serverUrl).hostname.replace(
                        /^(jellyfin\.|www\.)/,
                        "",
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
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/" onClick={() => setOpenMobile(false)}>
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/discover" onClick={() => setOpenMobile(false)}>
                    <Compass className="h-4 w-4" />
                    <span>Discover</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Libraries Section */}
              <Collapsible
                asChild
                defaultOpen={false}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Libraries">
                      <Library className="h-4 w-4" />
                      <span>Libraries</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {!isLoading && libraries.length > 0
                        ? libraries.map((library) => (
                            <SidebarMenuSubItem key={library.Id}>
                              <SidebarMenuSubButton asChild>
                                <Link
                                  href={
                                    library.CollectionType !== "livetv"
                                      ? `/library/${library.Id}`
                                      : `/livetv/`
                                  }
                                  onClick={() => setOpenMobile(false)}
                                >
                                  {getLibraryIcon(library.CollectionType!)}
                                  <span>{library.Name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))
                        : null}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings" onClick={() => setOpenMobile(false)}>
                    <Settings2 className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Admin Section */}
              {/* Migrate this to json config  */}

              {isAdmin && (
                <Collapsible
                  asChild
                  defaultOpen={false}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Admin">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>{dashboardLinksConfig.name}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {dashboardLinksConfig.sections.map((section: any) => {
                          if (section.items) {
                            return (
                              <Collapsible
                                asChild
                                defaultOpen={false}
                                className="group/collapsible-nested"
                                key={section.name}
                              >
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton>
                                      {getDashboardIcon(section.name)}
                                      <span>{section.name}</span>
                                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible-nested:rotate-90" />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub>
                                      {section.items.map((item: any) => (
                                        <SidebarMenuSubItem key={item.name}>
                                          <SidebarMenuSubButton asChild>
                                            <Link
                                              href={item.url}
                                              onClick={() =>
                                                setOpenMobile(false)
                                              }
                                            >
                                              {getDashboardIcon(item.name)}
                                              <span>{item.name}</span>
                                            </Link>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      ))}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            );
                          }

                          return (
                            <SidebarMenuSubItem key={section.name}>
                              <SidebarMenuSubButton asChild>
                                <Link
                                  href={section.url}
                                  onClick={() => setOpenMobile(false)}
                                >
                                  {getDashboardIcon(section.name)}
                                  <span>{section.name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
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
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="aspect-square object-cover size-8 rounded-lg border"
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
                className="w-[--radix-dropdown-menu-trigger-width] min-w-28 z-100 rounded-lg"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout} className="gap-2">
                  <LogOut className="h-4 w-4 text-red-600 dark:text-red-500" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {/* <SidebarRail /> */}
    </Sidebar>
  );
}
