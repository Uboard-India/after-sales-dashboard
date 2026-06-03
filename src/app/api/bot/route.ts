import { NextResponse } from "next/server";
import Papa from "papaparse";

export const dynamic = "force-dynamic";

const BOT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1UXYV_aiQnwm7llAbNSu4x0noS2vztj3My3aNrJmi9lU/export?format=csv&gid=0";

function cleanMobile(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[\s\-().+]/g, "");
  // Strip leading 91 if 12 digits
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned.slice(2);
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) return cleaned;
  // Not a valid number (SKIP, Ok, etc.)
  return "";
}

export async function GET() {
  try {
    const res = await fetch(BOT_SHEET_URL, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Bot sheet fetch failed: ${res.status}`);
    const csv = await res.text();

    const { data } = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
    });

    const entries = data
      .filter((r) => (r["Complaint Number"] || "").trim().startsWith("SUP-"))
      .map((r) => ({
        botId:     r["Complaint Number"].trim(),
        timestamp: r["Timestamp"]?.trim() || "",
        month:     r["Month"]?.trim() || "",
        brand:     r["BRAND"]?.trim() || "",
        category:  r["CATEGORY"]?.trim() || "",
        product:   r["PRODUCT"]?.trim() || "",
        issue:     r["ISSUE"]?.trim() || "",
        warranty:  r["WARRENTY STATUS"]?.trim() || "",
        platform:  r["PURCHASE PLATFORM"]?.trim() || "",
        invoice:   r["INVOICE NUMBER"]?.trim() || "",
        mobile:    cleanMobile(r["CALL BACK NUMBER"] || ""),
        mobileRaw: (r["CALL BACK NUMBER"] || "").trim(),
        customerName: r["Customer name"]?.trim() || "",
        hasMobile: cleanMobile(r["CALL BACK NUMBER"] || "") !== "",
      }));

    return NextResponse.json({ entries, total: entries.length });
  } catch (err) {
    console.error("Bot sheet error:", err);
    return NextResponse.json({ entries: [], total: 0, error: "Failed to load bot sheet" }, { status: 500 });
  }
}
