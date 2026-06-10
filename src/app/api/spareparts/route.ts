import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import productMaster from "@/data/product-master.json";
import priceListBase from "@/data/price-list.json";
import repairLog from "@/data/repair-log.json";
import { getGoogleAccessToken } from "@/lib/googleAuth";

// Bot sheet is used as the write-layer for spare parts overrides.
// Tabs "Spare Parts Custom" and "Spare Parts History" are auto-created on first use.
const BOT_SHEET_ID = "1UXYV_aiQnwm7llAbNSu4x0noS2vztj3My3aNrJmi9lU";

const CUSTOM_TAB   = "Spare Parts Custom";
const HISTORY_TAB  = "Spare Parts History";
const CUSTOM_HEADERS  = ["Product", "Spare Part", "Max B2C", "Min B2B", "GST", "Updated By", "Updated At"];
const HISTORY_HEADERS = ["Product", "Spare Part", "Field Changed", "Old Value", "New Value", "Changed By", "Changed At"];

const NO_CACHE = { cache: "no-store" as const };

async function sheetsGet(token: string, tab: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${BOT_SHEET_ID}/values/${encodeURIComponent(tab)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, ...NO_CACHE });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.values as string[][]) ?? [];
}

async function sheetsAppend(token: string, tab: string, values: string[][]): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${BOT_SHEET_ID}/values/${encodeURIComponent(tab)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
    ...NO_CACHE,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sheets append failed: ${res.status} — ${body.slice(0, 200)}`);
  }
}

async function sheetsUpdate(token: string, range: string, values: string[][]): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${BOT_SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
    ...NO_CACHE,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sheets update failed: ${res.status} — ${body.slice(0, 200)}`);
  }
}

async function ensureTab(token: string, title: string, headers: string[]): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${BOT_SHEET_ID}/values/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, ...NO_CACHE });
  if (res.ok) {
    const j = await res.json();
    // Tab exists but might be empty — add headers if no rows
    if (!j.values || j.values.length === 0) {
      await sheetsAppend(token, title, [headers]);
    }
    return;
  }
  // Create tab
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${BOT_SHEET_ID}:batchUpdate`;
  const bRes = await fetch(batchUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
    ...NO_CACHE,
  });
  if (!bRes.ok) {
    const body = await bRes.text().catch(() => "");
    throw new Error(`Could not create tab "${title}": ${bRes.status} — ${body.slice(0, 200)}`);
  }
  await sheetsAppend(token, title, [headers]);
}

export async function GET() {
  let priceList = [...(priceListBase as { Product: string; SparePart: string; MaxB2C: string; MinB2B: string; GST: string }[])];

  try {
    const token = await getGoogleAccessToken();
    const rows = await sheetsGet(token, CUSTOM_TAB);
    if (rows.length > 1) {
      // rows[0] = headers, rows[1..] = data
      rows.slice(1).forEach((row) => {
        const [product, sparePart, maxB2C, minB2B, gst] = row;
        if (!product || !sparePart) return;
        const idx = priceList.findIndex(r => r.Product === product && r.SparePart === sparePart);
        const mapped = { Product: product, SparePart: sparePart, MaxB2C: maxB2C || "", MinB2B: minB2B || "", GST: gst || "" };
        if (idx >= 0) priceList[idx] = mapped;
        else priceList.push(mapped);
      });
    }
  } catch {
    // Google Sheets not configured — use static data only
  }

  return NextResponse.json({ productMaster, priceList, repairLog });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, sparePart, maxB2C, minB2B, gst, changedBy, isNew } = body;

    if (!product || !sparePart || !changedBy) {
      return NextResponse.json({ error: "product, sparePart and changedBy are required" }, { status: 400 });
    }

    const token = await getGoogleAccessToken();
    await ensureTab(token, CUSTOM_TAB,  CUSTOM_HEADERS);
    await ensureTab(token, HISTORY_TAB, HISTORY_HEADERS);

    // Read existing custom rows to find old values + row index
    const rows = await sheetsGet(token, CUSTOM_TAB);
    const headers = rows[0] ?? CUSTOM_HEADERS;
    const pIdx = headers.indexOf("Product");
    const sIdx = headers.indexOf("Spare Part");

    const existingRowIdx = rows.slice(1).findIndex(
      (r) => r[pIdx] === product && r[sIdx] === sparePart
    );

    // Get old values from static base or existing sheet row
    const priceList = priceListBase as { Product: string; SparePart: string; MaxB2C: string; MinB2B: string; GST: string }[];
    const staticRow = priceList.find(r => r.Product === product && r.SparePart === sparePart);
    const existingRow = existingRowIdx >= 0 ? rows[existingRowIdx + 1] : null;

    const oldMax = existingRow?.[headers.indexOf("Max B2C")] ?? staticRow?.MaxB2C ?? "";
    const oldMin = existingRow?.[headers.indexOf("Min B2B")] ?? staticRow?.MinB2B ?? "";
    const oldGst = existingRow?.[headers.indexOf("GST")]     ?? staticRow?.GST     ?? "";

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const newRow = [product, sparePart, maxB2C || "", minB2B || "", gst || "", changedBy, now];

    if (existingRowIdx >= 0) {
      // Update existing row (sheet row = existingRowIdx + 2 because row 1 = headers)
      const sheetRow = existingRowIdx + 2;
      await sheetsUpdate(token, `${CUSTOM_TAB}!A${sheetRow}:G${sheetRow}`, [newRow]);
    } else {
      await sheetsAppend(token, CUSTOM_TAB, [newRow]);
    }

    // Log history
    const historyRows: string[][] = [];
    if (isNew) {
      historyRows.push([product, sparePart, "new_part", "", `Max:${maxB2C} Min:${minB2B} GST:${gst}`, changedBy, now]);
    } else {
      if (oldMax !== (maxB2C || "")) historyRows.push([product, sparePart, "Max B2C", oldMax, maxB2C || "", changedBy, now]);
      if (oldMin !== (minB2B || "")) historyRows.push([product, sparePart, "Min B2B", oldMin, minB2B || "", changedBy, now]);
      if (oldGst !== (gst    || "")) historyRows.push([product, sparePart, "GST",     oldGst, gst    || "", changedBy, now]);
    }
    if (historyRows.length > 0) {
      await sheetsAppend(token, HISTORY_TAB, historyRows);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
