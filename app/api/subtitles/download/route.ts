import { NextRequest, NextResponse } from "next/server";
import { getOpenSubtitlesConfig } from "@/src/actions/store/server-actions";
import {
  downloadSubtitle,
  OpenSubtitlesError,
} from "@/src/lib/opensubtitles";

export async function POST(req: NextRequest) {
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

  let body: { fileId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const fileId = Number(body.fileId);
  if (!Number.isFinite(fileId) || fileId <= 0) {
    return NextResponse.json(
      { message: "A valid fileId is required" },
      { status: 400 },
    );
  }

  try {
    const result = await downloadSubtitle(config, fileId);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof OpenSubtitlesError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Subtitle download failed";
    return NextResponse.json({ message }, { status });
  }
}
