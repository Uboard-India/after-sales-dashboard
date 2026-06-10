import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    let query = supabaseAdmin()
      .from("spare_parts_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(100);

    if (product) query = query.eq("product", product);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ history: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ history: [], error: msg });
  }
}
