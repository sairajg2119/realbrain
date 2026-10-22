import { NextResponse } from "next/server";

// Says which settings exist (true/false only, never the values) so setup problems are easy to spot.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    gemini_key_set: Boolean(process.env.GEMINI_API_KEY),
    blob_token_set: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    vercel_env: process.env.VERCEL_ENV ?? "local",
  });
}
