import { NextRequest, NextResponse } from "next/server";
import { testConnection, OpenSubtitlesError } from "@/src/lib/opensubtitles";

// Validates the credentials the user just typed (sent in the body) BEFORE they
// are saved, mirroring the Seerr "test-connection" flow.
export async function POST(req: NextRequest) {
  let body: { apiKey?: string; username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { apiKey, username, password } = body;
  if (!apiKey || !username || !password) {
    return NextResponse.json(
      { message: "API key, username and password are all required" },
      { status: 400 },
    );
  }

  try {
    const quota = await testConnection({ apiKey, username, password });
    return NextResponse.json({ success: true, quota });
  } catch (error) {
    const status = error instanceof OpenSubtitlesError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({ success: false, message }, { status });
  }
}
