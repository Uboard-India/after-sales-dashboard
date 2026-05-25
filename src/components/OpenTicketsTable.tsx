"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

interface Props {
  rows: ComplaintRow[];
}

const STATUS_BADGE: Record<string, string> = {
  "Complaint Register":         "bg-blue-100 text-blue-700",
  "Pickup Arranged":            "bg-purple-100 text-purple-700",
  "Received in Okhla":          "bg-indigo-100 text-indigo-700",
  "Pending For Repair":         "bg-yellow-100 text-yellow-700",
  "Dispatch But Not Delivered": "bg-teal-100 text-teal-700",
  "Payment due from Customer":  "bg-red-100 text-red-700",
  "Repair Done But payment issue": "bg-orange-100 text-orange-700",
  "Pickup successful":          "bg-cyan-100 text-cyan-700",
  "Pickup Delay From Cust.":    "bg-pink-100 text-pink-700",
};

export default function OpenTicketsTable({ rows }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        !q ||
        r.sequenceNo.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.requestBy.toLowerCase().includes(q) ||
        r.issueType.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.actionTaken.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Open Tickets</h2>
          <p className="text-xs text-slate-400">{filtered.length} open complaints</p>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"
          />
        </div>
      </div>

      <div className="overflow-x-auto table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              {["#", "Date", "Requested By", "Product", "Brand", "Issue Type", "Status", "Days Pending", "Ageing"].map((h) => (
                <th key={h} className="text-left font-medium text-slate-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.sequenceNo} className="border-b border-slate-50 hover:bg-slate-50 transition">
                <td className="py-2 pr-3 text-slate-400 font-mono">{r.sequenceNo}</td>
                <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">{r.complaintDate}</td>
                <td className="py-2 pr-3 font-medium text-slate-800 whitespace-nowrap">{r.requestBy || "—"}</td>
                <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.productName || "—"}</td>
                <td className="py-2 pr-3">
                  <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{r.brand}</span>
                </td>
                <td className="py-2 pr-3 text-slate-600">{r.issueType || "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_BADGE[r.actionTaken] ?? "bg-slate-100 text-slate-600"
                  }`}>
                    {r.actionTaken || "Registered"}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right">
                  {r.daysPending != null ? (
                    <span className={`font-semibold ${r.daysPending > 30 ? "text-red-600" : r.daysPending > 15 ? "text-orange-500" : "text-slate-600"}`}>
                      {r.daysPending}d
                    </span>
                  ) : "—"}
                </td>
                <td className="py-2 pr-3">
                  {r.ageingDays ? (
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      r.ageingDays === "90+" ? "bg-red-100 text-red-700" :
                      r.ageingDays === "61-90" ? "bg-orange-100 text-orange-700" :
                      r.ageingDays === "31-60" ? "bg-yellow-100 text-yellow-700" :
                      "bg-green-100 text-green-700"
                    }`}>{r.ageingDays}</span>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">No open tickets found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
