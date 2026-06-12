import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Diagnostic: which Supabase project does THIS deployment use, and does the
 * sheet_backups table exist there? Reveals only the project URL (not keys).
 * Behind auth middleware like every other route.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL || "";
  const ref = url.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "unknown";

  let backupsTable = "unknown";
  try {
    const { error } = await supabaseAdmin()
      .from("sheet_backups")
      .select("id", { count: "exact", head: true });
    backupsTable = error ? `missing (${error.message.slice(0, 80)})` : "exists ✓";
  } catch (e) {
    backupsTable = `error: ${(e as Error).message.slice(0, 80)}`;
  }

  return NextResponse.json({
    supabaseProjectRef: ref,
    supabaseUrl: url ? url.replace(/^https?:\/\//, "") : "NOT SET",
    sheetBackupsTable: backupsTable,
    howToFix:
      ref === "unknown"
        ? "SUPABASE_URL env var is not set on this deployment"
        : `Open supabase.com/dashboard/project/${ref} and run the create-table SQL there`,
  });
}
