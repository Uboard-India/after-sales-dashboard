import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/googleAuth";

const BOT_SHEET_ID = "1UXYV_aiQnwm7llAbNSu4x0noS2vztj3My3aNrJmi9lU";
const HISTORY_TAB  = "Spare Parts History";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product   = searchParams.get("product");
  const sparePart = searchParams.get("sparePart");

  try {
    const token = await getGoogleAccessToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${BOT_SHEET_ID}/values/${encodeURIComponent(HISTORY_TAB)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!res.ok) return NextResponse.json({ history: [] });

    const j = await res.json();
    const rows: string[][] = (j.values ?? []).slice(1); // skip header

    const history = rows
      .filter(r => {
        if (product   && r[0] !== product)   return false;
        if (sparePart && r[1] !== sparePart) return false;
        return true;
      })
      .map(r => ({
        id: Math.random().toString(36).slice(2),
        product:       r[0] ?? "",
        spare_part:    r[1] ?? "",
        field_changed: r[2] ?? "",
        old_value:     r[3] ?? "",
        new_value:     r[4] ?? "",
        changed_by:    r[5] ?? "",
        changed_at:    r[6] ?? "",
      }))
      .reverse(); // latest first

    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ history: [], error: (err as Error).message });
  }
}
