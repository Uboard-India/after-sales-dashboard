"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Store, X } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

interface Props {
  rows: ComplaintRow[]; // filtered by the dashboard's top filters (open + closed)
}

const COLORS = [
  "#4F46E5", "#7C3AED", "#DB2777", "#EA580C", "#0891B2",
  "#65A30D", "#D97706", "#0284C7", "#9333EA", "#E11D48", "#475569",
];

/** Count occurrences of a field, return sorted [name, count] top N. */
function topBy(rows: ComplaintRow[], pick: (r: ComplaintRow) => string, n = 8) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = (pick(r) || "").trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
}

export default function PlatformBreakdown({ rows }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  // Apply the open-only toggle before everything else.
  const scoped = useMemo(() => (openOnly ? rows.filter((r) => r.isOpen) : rows), [rows, openOnly]);

  const platformData = useMemo(() => {
    const map = new Map<string, { open: number; closed: number }>();
    for (const r of scoped) {
      const k = r.platform || "Other";
      const e = map.get(k) ?? { open: 0, closed: 0 };
      if (r.isOpen) e.open++; else e.closed++;
      map.set(k, e);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, total: v.open + v.closed }))
      .sort((a, b) => b.total - a.total);
  }, [scoped]);

  const selectedRows = useMemo(
    () => (selected ? scoped.filter((r) => (r.platform || "Other") === selected) : []),
    [scoped, selected]
  );
  const byProduct = useMemo(() => topBy(selectedRows, (r) => r.productName), [selectedRows]);
  const byIssue = useMemo(() => topBy(selectedRows, (r) => r.issueType), [selectedRows]);
  const sel = platformData.find((p) => p.name === selected);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Store size={15} className="text-indigo-600" />
        <h2 className="text-sm font-semibold text-slate-700">Complaints by Platform</h2>
        <span className="text-xs text-slate-400 hidden sm:inline">· click a platform for product &amp; issue details</span>
        <div className="ml-auto flex rounded-lg overflow-hidden border border-slate-200">
          {[
            { k: false, label: "All" },
            { k: true, label: "Open only" },
          ].map((o) => (
            <button
              key={o.label}
              onClick={() => setOpenOnly(o.k)}
              className={`text-xs px-3 py-1 font-medium transition ${
                openOnly === o.k ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(160, platformData.length * 34)}>
        <BarChart data={platformData} layout="vertical" margin={{ top: 8, right: 36, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
            cursor={{ fill: "#F8FAFC" }}
            formatter={(v: number, n: string) => [v, n === "open" ? "Open" : "Closed"]}
          />
          <Bar dataKey="closed" stackId="a" name="closed" radius={[0, 0, 0, 0]} cursor="pointer"
            onClick={(d: { name?: string }) => setSelected((s) => (s === d.name ? null : d.name ?? null))}>
            {platformData.map((p, i) => (
              <Cell key={p.name} fill={selected && selected !== p.name ? "#CBD5E1" : COLORS[i % COLORS.length]} />
            ))}
          </Bar>
          <Bar dataKey="open" stackId="a" name="open" radius={[0, 3, 3, 0]} cursor="pointer"
            onClick={(d: { name?: string }) => setSelected((s) => (s === d.name ? null : d.name ?? null))}>
            {platformData.map((p) => (
              <Cell key={p.name} fill={selected && selected !== p.name ? "#E2E8F0" : "#F59E0B"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-slate-400 mt-1">
        <span className="inline-block w-2 h-2 rounded-full align-middle mr-1" style={{ background: "#F59E0B" }} />Open
        <span className="inline-block w-2 h-2 rounded-full align-middle ml-3 mr-1" style={{ background: "#4F46E5" }} />Closed
      </p>

      {/* Drill-down for the selected platform */}
      {selected && sel && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-indigo-700">{selected}</span>
              <span className="text-xs text-slate-500">
                — {sel.total} complaints · {sel.open} open · {sel.closed} closed
              </span>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          </div>

          {/* Top products + issues side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <MiniRanked title="Top Products" items={byProduct} total={sel.total} color="#4F46E5" />
            <MiniRanked title="Top Issue Types" items={byIssue} total={sel.total} color="#DB2777" />
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {["#", "Date", "Customer", "Product", "Issue", "Status", "Days"].map((h) => (
                    <th key={h} className="text-left font-medium text-slate-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedRows.slice(0, 100).map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-1.5 pr-3 font-mono text-slate-400">{r.sequenceNo}</td>
                    <td className="py-1.5 pr-3 text-slate-600 whitespace-nowrap">{r.complaintDate}</td>
                    <td className="py-1.5 pr-3 text-slate-700 whitespace-nowrap">{r.customerName || "—"}</td>
                    <td className="py-1.5 pr-3 text-slate-700 whitespace-nowrap">{r.productName || "—"}</td>
                    <td className="py-1.5 pr-3 text-slate-600 whitespace-nowrap">{r.issueType || "—"}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${r.isOpen ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {r.actionTaken || (r.isOpen ? "Open" : "Closed")}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-right text-slate-600">{r.daysPending != null ? `${r.daysPending}d` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedRows.length > 100 && (
              <p className="text-xs text-slate-400 mt-2">Showing first 100 of {selectedRows.length}.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniRanked({ title, items, total, color }: { title: string; items: [string, number][]; total: number; color: string }) {
  const max = items.length ? items[0][1] : 1;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No data</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(([name, count]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-32 truncate" title={name}>{name}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: color }} />
              </div>
              <span className="text-xs text-slate-500 w-14 text-right">
                {count} <span className="text-slate-300">({total ? Math.round((count / total) * 100) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
