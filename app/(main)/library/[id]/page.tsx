import { fetchLibraryItems, getLibraryById } from "@/app/actions";
import { getAuthData } from "@/app/actions/utils";
import { LibraryMediaList } from "@/components/library-media-list";
import { SearchBar } from "@/components/search-component";
import { ScanLibraryButton } from "@/components/scan-library-button";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authData = await getAuthData();
  const { serverUrl } = authData;

  // Fetch both library details and items
  const [libraryDetails, initialLibraryItems] = await Promise.all([
    getLibraryById(id),
    fetchLibraryItems(id), // First fetch to get totalRecordCount
  ]);

  // Fetch all items using the total count
  const libraryItems = await fetchLibraryItems(
    id,
    initialLibraryItems.totalRecordCount
  );

  console.log(libraryItems.items.length);
  console.log(libraryItems.totalRecordCount);

  const libraryName = libraryDetails?.Name || "Library";

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
        />
      </div>
    </div>
  );
}
