import { fetchLiveTVItems } from "../../actions";
import { getAuthData } from "../../actions/utils";
import { LibraryMediaList } from "../../components/library-media-list";
import { SearchBar } from "../../components/search-component";
import { ScanLibraryButton } from "../../components/scan-library-button";
import {
  BaseItemDto,
  ItemSortBy,
} from "@jellyfin/sdk/lib/generated-client/models";
import { AuroraBackground } from "../../components/aurora-background";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const libraryName = "Live TV";

export default function LiveTVPage() {
  const [libraryItems, setLibraryItems] = useState<BaseItemDto[]>([]);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLibraryData() {
      try {
        // Get auth info
        const authData = await getAuthData();
        setServerUrl(authData.serverUrl);

        const libraryItems = await fetchLiveTVItems();

        if (!libraryItems) {
          return;
        }

        setLibraryItems(libraryItems.items);
      } catch (err: any) {
        console.error(err);
        if (err.message?.includes("Authentication expired")) {
          // redirect
          window.location.href = "/login";
        }
      }
    }

    fetchLibraryData();
  }, []);

  if (serverUrl == null)
    return <div className="p-4">Error loading Live TV. Please try again.</div>;

  return (
    <div className="relative px-4 py-6 max-w-full overflow-hidden">
      <AuroraBackground
        colorStops={["#a78bfa", "#8b5cf6", "#7c3aed"]}
        amplitude={0.5}
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
      />
      {/* Main content with higher z-index */}
      <div className="relative z-10">
        <div className="relative z-[9999] mb-8">
          <div className="mb-6">
            <SearchBar />
          </div>
        </div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-semibold text-foreground font-poppins">
              {libraryName}
            </h2>
          </div>
          <span className="font-mono text-muted-foreground">
            {libraryItems.length} items
          </span>
        </div>
        <LibraryMediaList
          mediaItems={libraryItems}
          serverUrl={serverUrl}
          initialSortField={ItemSortBy.IsFavoriteOrLiked}
        />
      </div>
    </div>
  );
}
