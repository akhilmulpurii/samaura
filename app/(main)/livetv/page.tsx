import { fetchLiveTVItems } from "@/app/actions";
import { getAuthData } from "@/app/actions/utils";
import { LibraryMediaList } from "@/components/library-media-list";
import { SearchBar } from "@/components/search-component";
import { ScanLibraryButton } from "@/components/scan-library-button";
import { ItemSortBy } from "@jellyfin/sdk/lib/generated-client/models";

export default async function LiveTVPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authData = await getAuthData();
  const { serverUrl } = authData;

  // Fetch all items using the total count
  const libraryItems = await fetchLiveTVItems();

  const libraryName = "Live TV";

  return (
    <div className="relative px-4 py-6 max-w-full overflow-hidden">
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
            <ScanLibraryButton libraryId={id} />
          </div>
          <span className="font-mono text-muted-foreground">
            {libraryItems.items.length} items
          </span>
        </div>
        <LibraryMediaList
          mediaItems={libraryItems.items}
          serverUrl={serverUrl}
          initialSortField={ItemSortBy.IsFavoriteOrLiked}
        />
      </div>
    </div>
  );
}
