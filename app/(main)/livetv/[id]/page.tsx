import { fetchMediaDetails, getImageUrl } from "@/app/actions";
import { MediaActions } from "@/components/media-actions";
import { SearchBar } from "@/components/search-component";
import { VibrantAuroraBackground } from "@/components/vibrant-aurora-background";
import { VibrantLogo } from "@/components/vibrant-logo";
import { TextAnimate } from "@/components/magicui/text-animate";
import { redirect } from "next/navigation";
import { TextScramble } from "@/components/motion-primitives/text-scramble";
import { BackdropImage } from "@/components/media-page/backdrop-image";
import { PosterImage } from "@/components/media-page/poster-image";

export default async function LiveChannel({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const tvchannel = await fetchMediaDetails(id);

    if (!tvchannel) {
      return <div className="p-4">TV Channel not found</div>;
    }

    const primaryImage = await getImageUrl(id, "Primary");
    const backdropImage = await getImageUrl(id, "Backdrop");
    const logoImage = tvchannel.ImageTags?.Logo
      ? await getImageUrl(id, "Logo")
      : null;

    return (
      <div className="min-h-screen overflow-hidden md:pr-1 pb-8">
        {/* Aurora background based on poster colors */}
        <VibrantAuroraBackground
          posterUrl={primaryImage}
          className="fixed inset-0 z-10 pointer-events-none opacity-50"
        />

        {/* Backdrop section */}
        <div className="relative">
          {/* Backdrop image with gradient overlay */}
          <div className="relative h-[50vh] md:h-[70vh] overflow-hidden md:rounded-xl md:mt-2.5">
            <BackdropImage
              movie={tvchannel}
              backdropImage={backdropImage}
              className="w-full h-full object-cover"
              width={1920}
              height={1080}
            />
            {logoImage ? (
              <VibrantLogo
                src={logoImage}
                alt={`${tvchannel.Name} logo`}
                movieName={tvchannel.Name || ""}
                width={300}
                height={96}
                className="absolute md:top-5/12 top-4/12 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 max-h-20 md:max-h-24 w-auto object-contain max-w-2/3 invisible md:visible"
              />
            ) : null}
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
            {/* Movie poster */}
            <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 justify-center flex md:block z-50 mt-6">
              <PosterImage
                movie={tvchannel}
                posterImage={primaryImage}
                className="w-full h-auto rounded-lg shadow-2xl max-w-1/2 md:max-w-full"
                width={500}
                height={750}
              />
            </div>

            {/* Movie information */}
            {/* <div className="h-screen absolute left-0 right-0 bg-white backdrop-blur-3xl -z-10 mt-4 invisible md:visible"></div> */}
            <div className="w-full md:w-2/3 lg:w-3/4 pt-10 md:pt-8 text-center md:text-start mt-8">
              <div className="mb-4 flex justify-center md:justify-start">
                <TextAnimate
                  as="h1"
                  className="text-4xl md:text-5xl font-semibold font-poppins text-foreground md:pl-8 drop-shadow-xl"
                  animation="blurInUp"
                  by="character"
                  once
                >
                  {tvchannel.Name || ""}
                </TextAnimate>
              </div>

              <div className="px-8 md:pl-8 md:pt-4 md:pr-16 flex flex-col justify-center md:items-start items-center">
                <MediaActions movie={tvchannel} />

                {tvchannel.Taglines && (
                  <TextScramble
                    className="text-lg text-muted-foreground mb-4 max-w-4xl text-center md:text-left font-poppins drop-shadow-md"
                    duration={1.2}
                  >
                    {tvchannel.Taglines[0]}
                  </TextScramble>
                )}

                <span className="text-md leading-relaxed mb-6 max-w-4xl">
                  {tvchannel.Overview}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    // If authentication expired, redirect to login
    if (error.message?.includes("Authentication expired")) {
      redirect("/login");
    }

    // For other errors, show an error page
    console.error("Error loading tv channel:", error);
    return (
      <div className="p-4">Error loading TV Channel. Please try again.</div>
    );
  }
}
