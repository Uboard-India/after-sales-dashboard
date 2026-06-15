"use client";

import { useState, useMemo } from "react";
import { IndianRupee, Search, X, AlertTriangle } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";
import { paymentStatus, isOutOfWarranty, type PaymentStatus } from "@/lib/payment";

interface Props {
  rows: ComplaintRow[]; // already filtered by the dashboard's top filters
}

const STATUS_BADGE: Record<PaymentStatus, string> = {
  Paid:    "bg-green-100 text-green-700",
  Pending: "bg-red-100 text-red-700",
  FOC:     "bg-slate-100 text-slate-500",
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

export default function PaymentTable({ rows }: Props) {
  // Payment only matters once a ticket is closed.
  const closed = useMemo(() => rows.filter((r) => !r.isOpen), [rows]);

  const [search, setSearch]       = useState("");
  const [fStatus, setFStatus]     = useState<"All" | PaymentStatus>("Pending");
  const [fWarranty, setFWarranty] = useState<"All" | "Out of Warranty" | "Under Warranty">("All");
  const [fBrand, setFBrand]       = useState("All");
  const [page, setPage]           = useState(1);
  const PER_PAGE = 15;

  const brands = useMemo(() => uniq(closed.map((r) => r.brand)), [closed]);

  // Annotate once
  const annotated = useMemo(
    () => closed.map((r) => ({ row: r, status: paymentStatus(r), oow: isOutOfWarranty(r) })),
    [closed]
  );

  // Headline counts (out-of-warranty pending = the money actually owed)
  const stats = useMemo(() => {
    const pending = annotated.filter((a) => a.status === "Pending");
    const pendingOOW = pending.filter((a) => a.oow);
    return { closed: closed.length, pending: pending.length, pendingOOW: pendingOOW.length };
  }, [annotated, closed.length]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return annotated.filter((a) => {
      if (fStatus !== "All" && a.status !== fStatus) return false;
      if (fWarranty === "Out of Warranty" && !a.oow) return false;
      if (fWarranty === "Under Warranty" && a.oow) return false;
      if (fBrand !== "All" && a.row.brand !== fBrand) return false;
      if (q) {
        const r = a.row;
        if (
          !r.sequenceNo.toLowerCase().includes(q) &&
          !r.customerName.toLowerCase().includes(q) &&
          !r.productName.toLowerCase().includes(q) &&
          !(r.customerMobile || "").includes(q)
        ) return false;
      }
      return true;
    });
  }, [annotated, search, fStatus, fWarranty, fBrand]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = search || fStatus !== "Pending" || fWarranty !== "All" || fBrand !== "All";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <IndianRupee size={15} className="text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-700">Payment Tracking</h2>
        <span className="text-xs text-slate-400">· closed tickets only</span>
      </div>

      {/* Headline */}
      <div className="flex flex-wrap gap-2 my-3">
        <Stat label="Closed tickets" value={stats.closed} tone="slate" />
        <Stat label="Payment pending" value={stats.pending} tone="red" />
        <Stat label="Pending · out of warranty" value={stats.pendingOOW} tone="amber" highlight />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3 pb-3 border-b border-slate-100">
        <TinySelect label="Payment"  value={fStatus}   options={["Pending", "Paid", "FOC", "All"]} onChange={(v) => { setFStatus(v as typeof fStatus); setPage(1); }} />
        <TinySelect label="Warranty" value={fWarranty} options={["All", "Out of Warranty", "Under Warranty"]} onChange={(v) => { setFWarranty(v as typeof fWarranty); setPage(1); }} />
        <TinySelect label="Brand"    value={fBrand}    options={["All", ...brands]} onChange={(v) => { setFBrand(v); setPage(1); }} />
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-md px-2 py-1">
          <Search size={12} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name / seq / product"
            className="text-xs outline-none w-44 bg-transparent"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setFStatus("Pending"); setFWarranty("All"); setFBrand("All"); setPage(1); }}
            className="text-xs text-indigo-600 hover:underline"
          >
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length.toLocaleString()} shown</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              {["#", "Close Date", "Customer", "Product", "Brand", "Warranty", "Amount", "Payment Type", "Status"].map((h) => (
                <th key={h} className="text-left font-medium text-slate-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((a) => {
              const r = a.row;
              return (
                <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 transition ${a.status === "Pending" && a.oow ? "bg-amber-50/40" : ""}`}>
                  <td className="py-2 pr-3 text-slate-400 font-mono">{r.sequenceNo}</td>
                  <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">{r.closeDate || "—"}</td>
                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.customerName || "—"}</td>
                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.productName || "—"}</td>
                  <td className="py-2 pr-3"><span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{r.brand}</span></td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {a.oow
                      ? <span className="text-amber-700 font-medium">Out of warranty</span>
                      : <span className="text-slate-400">Under warranty</span>}
                  </td>
                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.paymentReceived || "—"}</td>
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{r.paymentType || "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[a.status]}`}>{a.status}</span>
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">No closed tickets match the filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone, highlight }: { label: string; value: number; tone: "slate" | "red" | "amber"; highlight?: boolean }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    red:   "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-800 border-amber-300",
  }[tone];
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${tones} ${highlight ? "ring-1 ring-amber-300" : ""}`}>
      {highlight && <AlertTriangle size={13} />}
      <span className="text-base font-bold">{value.toLocaleString()}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

function TinySelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-400">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
