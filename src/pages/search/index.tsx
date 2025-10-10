import { getServerUrl, searchItems } from "../../actions";
import { VibrantAuroraBackground } from "../../components/vibrant-aurora-background";
import { MediaCard } from "../../components/media-card";
import { PersonCard } from "../../components/person-card";
import { EpisodeCard } from "../../components/episode-card";
import { SearchBar } from "../../components/search-component";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { SearchIcon, Film, Tv, PlayCircle, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const navigate = useNavigate();

  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [movies, setMovies] = useState<BaseItemDto[]>([]);
  const [series, setSeries] = useState<BaseItemDto[]>([]);
  const [episodes, setEpisodes] = useState<BaseItemDto[]>([]);
  const [people, setPeople] = useState<BaseItemDto[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!query.trim()) return;
      try {
        const url = await getServerUrl();
        setServerUrl(url);

        const results = await searchItems(query);
        setSearchResults(results);

        setMovies(results.filter((item) => item.Type === "Movie"));
        setSeries(results.filter((item) => item.Type === "Series"));
        setEpisodes(results.filter((item) => item.Type === "Episode"));
        setPeople(results.filter((item) => item.Type === "Person"));
      } catch (err: any) {
        console.error(err);
        if (err.message?.includes("Authentication expired")) {
          navigate("/login", { replace: true });
        }
      }
    }

    fetchData();
  }, [query]);

  // Helper function to render items
  const renderItems = (items: typeof searchResults) => (
    <div className="flex flex-row flex-wrap gap-8">
      {items.map((item) => (
        <div key={item.Id} className="flex-shrink-0">
          {item.Type === "Person" ? (
            <PersonCard person={item} serverUrl={serverUrl!} />
          ) : item.Type === "Episode" ? (
            <EpisodeCard item={item} serverUrl={serverUrl!} />
          ) : (
            <MediaCard item={item} serverUrl={serverUrl!} />
          )}
        </div>
      ))}
    </div>
  );

  // Helper function to render empty state
  const renderEmptyState = (type: string) => (
    <div className="text-center p-8">
      <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-muted-foreground">
        No {type.toLowerCase()} found for &quot;{query}&quot;
      </p>
    </div>
  );

  return (
    <div className="relative px-4 py-6 max-w-full">
      <VibrantAuroraBackground amplitude={0.8} blend={0.4} />

      <div className="relative z-[9999] mb-8">
        <div className="mb-6">
          <SearchBar />
        </div>
      </div>

      <div className="relative z-10 mb-2">
        <h2 className="text-3xl font-semibold text-foreground mb-2 font-poppins">
          &quot;{query}&quot;
        </h2>
        <p className="text-muted-foreground mb-6 inline-flex items-center">
          <SearchIcon className="h-4 w-4 mr-2" />
          Found {searchResults.length} results for &quot;{query}&quot;
        </p>
      </div>

      <section className="relative z-10 mb-12">
        {searchResults.length > 0 ? (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <SearchIcon className="h-4 w-4" />
                All ({searchResults.length})
              </TabsTrigger>
              {movies.length > 0 && (
                <TabsTrigger value="movies" className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Movies ({movies.length})
                </TabsTrigger>
              )}
              {series.length > 0 && (
                <TabsTrigger value="series" className="flex items-center gap-2">
                  <Tv className="h-4 w-4" />
                  Series ({series.length})
                </TabsTrigger>
              )}
              {episodes.length > 0 && (
                <TabsTrigger
                  value="episodes"
                  className="flex items-center gap-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  Episodes ({episodes.length})
                </TabsTrigger>
              )}
              {people.length > 0 && (
                <TabsTrigger value="people" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  People ({people.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all" className="space-y-8">
              {movies.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-1 font-poppins flex items-center gap-2">
                    <div className="size-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Film className="size-3 text-white" />
                    </div>
                    Movies
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {movies.length} items found
                  </p>
                  {renderItems(movies)}
                </div>
              )}
              {series.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-1 font-poppins flex items-center gap-2">
                    <div className="size-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Tv className="size-3 text-white" />
                    </div>
                    Series
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 mr-8">
                    {series.length} items found
                  </p>
                  {renderItems(series)}
                </div>
              )}
              {people.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-1 font-poppins flex items-center gap-2">
                    <div className="size-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <User className="size-3 text-white" />
                    </div>
                    People
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {people.length} items found
                  </p>
                  {renderItems(people)}
                </div>
              )}
              {episodes.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-4 font-poppins flex items-center gap-2">
                    <div className="size-7 bg-orange-500 rounded-full flex items-center justify-center">
                      <PlayCircle className="size-3.5 text-white" />
                    </div>
                    Episodes ({episodes.length})
                  </h3>
                  {renderItems(episodes)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="movies">
              {movies.length > 0
                ? renderItems(movies)
                : renderEmptyState("Movies")}
            </TabsContent>

            <TabsContent value="series">
              {series.length > 0
                ? renderItems(series)
                : renderEmptyState("Series")}
            </TabsContent>

            <TabsContent value="episodes">
              {episodes.length > 0
                ? renderItems(episodes)
                : renderEmptyState("Episodes")}
            </TabsContent>

            <TabsContent value="people">
              {people.length > 0
                ? renderItems(people)
                : renderEmptyState("People")}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center p-8">
            <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No results found for &quot;{query}&quot;
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
