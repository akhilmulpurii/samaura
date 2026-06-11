import { NextRequest, NextResponse } from "next/server";
import { getOpenSubtitlesConfig } from "@/src/actions/store/server-actions";
import {
  searchSubtitles,
  OpenSubtitlesError,
} from "@/src/lib/opensubtitles";

export async function GET(req: NextRequest) {
  const config = await getOpenSubtitlesConfig();
  if (!config?.apiKey || !config?.username || !config?.password) {
    return NextResponse.json(
      {
        message:
          "OpenSubtitles is not configured. Add your credentials in Settings.",
      },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(req.url);
  const imdbId = searchParams.get("imdbId") || undefined;
  const tmdbId = searchParams.get("tmdbId") || undefined;
  const query = searchParams.get("query") || undefined;
  const languages =
    searchParams.get("languages") || config.languages || "en";
  const year = searchParams.get("year") || undefined;
  const seasonNumber = searchParams.get("season") || undefined;
  const episodeNumber = searchParams.get("episode") || undefined;

  if (!imdbId && !tmdbId && !query) {
    return NextResponse.json(
      { message: "Provide an imdbId, tmdbId, or query to search." },
      { status: 400 },
    );
  }

  try {
    const results = await searchSubtitles(config, {
      imdbId,
      tmdbId,
      query,
      languages,
      year,
      seasonNumber,
      episodeNumber,
    });
    return NextResponse.json({ results });
  } catch (error) {
    const status = error instanceof OpenSubtitlesError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Subtitle search failed";
    return NextResponse.json({ message }, { status });
  }
}
