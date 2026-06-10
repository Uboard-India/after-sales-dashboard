import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!b64) return NextResponse.json({ email: null, error: "GOOGLE_SERVICE_ACCOUNT_JSON not set" });
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
    return NextResponse.json({ email: json.client_email });
  } catch {
    return NextResponse.json({ email: null, error: "Could not parse service account" });
  }
}
