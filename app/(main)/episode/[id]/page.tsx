import { fetchEpisodeDetails } from "@/app/actions/tv-shows";
import { getImageUrl, fetchSimilarItems, getServerUrl } from "@/app/actions";
import { MediaActions } from "@/components/media-actions";
import { SearchBar } from "@/components/search-component";
import { Badge } from "@/components/ui/badge";
import { CastScrollArea } from "@/components/cast-scrollarea";
import { SeasonEpisodes } from "@/components/season-episodes";
import { MediaSection } from "@/components/media-section";
import { VibrantAuroraBackground } from "@/components/vibrant-aurora-background";
import { VibrantLogo } from "@/components/vibrant-logo";
import { RottenTomatoesIcon } from "@/components/icons/rotten-tomatoes";
import { TextAnimate } from "@/components/magicui/text-animate";
import { Star, Play, TvIcon } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { TextScramble } from "@/components/motion-primitives/text-scramble";
import { BackdropImage } from "@/components/media-page/backdrop-image";
import { PosterImage } from "@/components/media-page/poster-image";

export default async function Episode({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const episode = await fetchEpisodeDetails(id);

    if (!episode) {
      return <div className="p-4">Episode not found</div>;
    }

    const primaryImage = await getImageUrl(id, "Primary");
    const backdropImage = await getImageUrl(
      episode.ParentBackdropItemId!,
      "Backdrop"
    );
    const logoImage = await getImageUrl(episode.SeriesId!, "Logo");

    // Fetch similar items and server URL for the More Like This section
    const [similarItems, serverUrl] = await Promise.all([
      fetchSimilarItems(episode.SeriesId!, 12),
      getServerUrl(),
    ]);

    return (
      <div className="min-h-screen overflow-hidden md:pr-1 pb-8">
        {/* Aurora background based on backdrop image */}
        <VibrantAuroraBackground
          posterUrl={backdropImage}
          className="fixed inset-0 z-10 pointer-events-none opacity-50"
        />

        {/* Backdrop section */}
        <div className="relative">
          {/* Backdrop image with gradient overlay */}
          <div className="relative h-[50vh] md:h-[70vh] overflow-hidden md:rounded-xl md:mt-2.5">
            <BackdropImage
              movie={episode}
              backdropImage={backdropImage}
              className="w-full h-full object-cover"
              width={1920}
              height={1080}
            />
            <VibrantLogo
              src={logoImage}
              alt={`${episode.SeriesName} logo`}
              movieName={episode.SeriesName || ""}
              width={300}
              height={96}
              className="absolute md:top-5/12 top-4/12 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 max-h-20 md:max-h-24 w-auto object-contain max-w-2/3 invisible md:visible"
            />
            {/* Enhanced gradient overlay for smooth transition to overview */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90 md:rounded-xl" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent md:rounded-xl" />
          </div>

          {/* Search bar positioned over backdrop */}
          <div className="absolute top-8 left-0 right-0 z-20 px-6">
            <SearchBar />
          </div>
        </div>

        {/* Content section */}
        <div className="relative z-10 -mt-54 md:pl-6 bg-background/95 dark:bg-background/50 backdrop-blur-xl rounded-2xl mx-4 pb-6">
          <div className="flex flex-col md:flex-row mx-auto">
            {/* Episode Image */}
            <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 justify-center flex md:block z-50 mt-6">
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl bg-muted max-w-1/2 md:max-w-full mt-16">
                {primaryImage ? (
                  <PosterImage
                    movie={episode}
                    posterImage={primaryImage}
                    className="w-full h-full object-cover"
                    width={480}
                    height={270}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Play className="h-12 w-12" />
                  </div>
                )}
              </div>
            </div>

            {/* Episode Info */}
            <div className="w-full md:w-2/3 lg:w-3/4 pt-10 md:pt-8 text-center md:text-start mt-8">
              {/* TV Show Name and Season */}
              <div className="mb-4 flex justify-center md:justify-start">
                <h2 className="text-sm font-medium text-muted-foreground md:pl-8 inline-flex items-center">
                  <TvIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <Link
                    href={`/series/${episode.SeriesId}`}
                    className="hover:underline"
                  >
                    {episode.SeriesName}
                  </Link>
                  {episode.ParentIndexNumber && (
                    <span className="inline-flex items-center">
                      <span className="mx-2">•</span>
                      <Link
                        href={`/season/${episode.SeasonId}`}
                        className="hover:underline"
                      >
                        {`Season ${episode.ParentIndexNumber}`}
                      </Link>
                    </span>
                  )}
                </h2>
              </div>

              <div className="mb-4 flex justify-center md:justify-start">
                <TextAnimate
                  as="h1"
                  className="text-4xl md:text-5xl font-semibold font-poppins text-foreground md:pl-8 drop-shadow-xl"
                  animation="blurInUp"
                  by="character"
                  once
                >
                  {`${episode.IndexNumber ? `${episode.IndexNumber}. ` : ""}${
                    episode.Name || "Untitled Episode"
                  }`}
                </TextAnimate>
              </div>

              {/* Episode badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2 justify-center md:justify-start md:pl-8">
                <Badge
                  variant="outline"
                  className="bg-background/90 backdrop-blur-sm"
                >
                  S{episode.ParentIndexNumber || 1} • E
                  {episode.IndexNumber || 1}
                </Badge>

                {episode.ProductionYear && (
                  <Badge
                    variant="outline"
                    className="bg-background/90 backdrop-blur-sm"
                  >
                    {episode.ProductionYear}
                  </Badge>
                )}

                {episode.OfficialRating && (
                  <Badge
                    variant="outline"
                    className="bg-background/90 backdrop-blur-sm"
                  >
                    {episode.OfficialRating}
                  </Badge>
                )}

                {episode.RunTimeTicks && (
                  <Badge
                    variant="outline"
                    className="bg-background/90 backdrop-blur-sm"
                  >
                    {Math.round(episode.RunTimeTicks / 600000000)} min
                  </Badge>
                )}

                {episode.CommunityRating && (
                  <Badge
                    variant="outline"
                    className="bg-background/90 backdrop-blur-sm flex items-center gap-1"
                  >
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {episode.CommunityRating.toFixed(1)}
                  </Badge>
                )}

                {episode.CriticRating && (
                  <Badge
                    variant="outline"
                    className="bg-background/90 backdrop-blur-sm flex items-center gap-1"
                  >
                    <RottenTomatoesIcon size={12} />
                    {episode.CriticRating}%
                  </Badge>
                )}
              </div>

              <div className="px-8 md:pl-8 pt-4 md:pr-16 flex flex-col justify-center md:items-start items-center">
                <MediaActions episode={episode} />

                {episode.Taglines && (
                  <TextScramble
                    className="text-lg text-muted-foreground mb-4 max-w-4xl text-center md:text-left font-poppins drop-shadow-md"
                    duration={1.2}
                  >
                    {episode.Taglines[0]}
                  </TextScramble>
                )}

                {episode.Overview && (
                  <p className="text-md leading-relaxed mb-8 max-w-4xl">
                    {episode.Overview}
                  </p>
                )}
                {/* Media actions */}
              </div>
            </div>
          </div>
          {/* Season Episodes section */}
          <SeasonEpisodes showId={episode.SeriesId!} />
        </div>

        {/* Cast section */}
        <div className="mt-12 px-6">
          <CastScrollArea people={episode.People!} mediaId={id} />
        </div>

        {similarItems && (
          <div className="mt-8 px-6">
            <MediaSection
              sectionName="More Like This"
              mediaItems={similarItems as BaseItemDto[]}
              serverUrl={serverUrl!}
            />
          </div>
        )}
        {/* More Like This section */}
      </div>
    );
  } catch (error: any) {
    // If authentication expired, redirect to login
    if (error.message?.includes("Authentication expired")) {
      redirect("/login");
    }

    // For other errors, show an error page
    console.error("Error loading episode:", error);
    return <div className="p-4">Error loading episode. Please try again.</div>;
  }
}
