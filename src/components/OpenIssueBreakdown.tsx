"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  "Complaint Register":           "#6366F1",
  "Pickup Arranged":              "#8B5CF6",
  "Pickup Delay From Cust.":      "#A78BFA",
  "Pickup successful":            "#7C3AED",
  "Received in Okhla":            "#2563EB",
  "Pending For Repair":           "#0891B2",
  "Repair Done But payment issue":"#D97706",
  "Dispatch Schduled":            "#65A30D",
  "Dispatch But Not Delivered":   "#16A34A",
  "Payment due from Customer":    "#EA580C",
  "Re-Open Ticket":               "#DC2626",
  "Delay Due to Customer":        "#F59E0B",
  "Required for Pickup":          "#7C3AED",
  "":                             "#94A3B8",
  "Not specified":                "#94A3B8",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#6366F1";
}

interface Props {
  openRows: ComplaintRow[];
  dateRangeLabel?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, count, pct } = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-semibold text-slate-700 mb-1">{name || "Not specified"}</p>
      <p className="text-slate-500">{count} open complaint{count !== 1 ? "s" : ""}</p>
      <p className="text-slate-400">{pct}% of open queue</p>
    </div>
  );
};

export default function OpenIssueBreakdown({ openRows, dateRangeLabel }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const data = useMemo(() => {
    const map = new Map<string, number>();
    openRows.forEach((r) => {
      const k = (r.actionTaken?.trim()) || "Not specified";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    const total = openRows.length || 1;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }));
  }, [openRows]);

  const drillRows = useMemo(() => {
    if (selectedStatus === null) return [];
    return openRows
      .filter((r) => {
        const k = (r.actionTaken?.trim()) || "Not specified";
        return k === selectedStatus;
      })
      .sort((a, b) => (b.daysPending ?? 0) - (a.daysPending ?? 0));
  }, [selectedStatus, openRows]);

  const topStatus = data[0];
  const chartHeight = Math.max(300, data.length * 44);
  const color = selectedStatus !== null ? statusColor(selectedStatus) : "#6366F1";

  function toggleStatus(name: string) {
    setSelectedStatus(prev => prev === name ? null : name);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1 gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Open Complaints — Status Breakdown</h2>
          {topStatus && (
            <p className="text-xs text-slate-500 mt-0.5">
              Largest group:{" "}
              <span className="font-semibold" style={{ color: statusColor(topStatus.name) }}>
                {topStatus.name || "Not specified"}
              </span>
              {" "}·{" "}
              <span className="font-semibold text-slate-700">{topStatus.count} units</span>
              {" "}({topStatus.pct}%)
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-slate-700">{openRows.length} open</p>
          {dateRangeLabel && (
            <p className="text-[11px] text-slate-400 mt-0.5">{dateRangeLabel}</p>
          )}
        </div>
      </div>

      {/* Clickable summary pills */}
      <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
        {data.map((d) => {
          const isSelected = selectedStatus === d.name;
          return (
            <button
              key={d.name}
              onClick={() => toggleStatus(d.name)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-all"
              style={{
                background: isSelected ? `${statusColor(d.name)}30` : `${statusColor(d.name)}15`,
                borderColor: isSelected ? statusColor(d.name) : `${statusColor(d.name)}40`,
                color: statusColor(d.name),
                outline: isSelected ? `2px solid ${statusColor(d.name)}` : "none",
                outlineOffset: "1px",
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: statusColor(d.name) }}
              />
              {d.name || "Not specified"}
              <span className="font-bold">{d.count}</span>
              {isSelected && <ChevronUp size={10} />}
              {!isSelected && <ChevronDown size={10} />}
            </button>
          );
        })}
      </div>

      {/* Collapsible drill-down table */}
      {selectedStatus !== null && (
        <div className="mb-5 rounded-xl border-2 overflow-hidden" style={{ borderColor: `${color}40` }}>
          {/* Drill header */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ background: `${color}10` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: color }}
              />
              <span className="text-sm font-semibold" style={{ color }}>
                {selectedStatus}
              </span>
              <span className="text-xs text-slate-500">— {drillRows.length} complaint{drillRows.length !== 1 ? "s" : ""}, sorted by most aged</span>
            </div>
            <button
              onClick={() => setSelectedStatus(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X size={14} />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2 text-slate-400 font-semibold">Seq</th>
                  <th className="text-left px-4 py-2 text-slate-400 font-semibold">Date</th>
                  <th className="text-left px-4 py-2 text-slate-400 font-semibold">Customer</th>
                  <th className="text-left px-4 py-2 text-slate-400 font-semibold">Product</th>
                  <th className="text-left px-4 py-2 text-slate-400 font-semibold">Platform</th>
                  <th className="text-right px-4 py-2 text-slate-400 font-semibold">Days Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {drillRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2 font-mono font-semibold text-indigo-600">#{r.sequenceNo}</td>
                    <td className="px-4 py-2 text-slate-500">{r.complaintDate}</td>
                    <td className="px-4 py-2 text-slate-700 font-medium">{r.customerName || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{r.productName || "—"}</td>
                    <td className="px-4 py-2 text-slate-500">{r.platform || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      {r.daysPending != null ? (
                        <span className={`font-bold ${r.daysPending > 30 ? "text-red-500" : r.daysPending > 14 ? "text-amber-500" : "text-slate-600"}`}>
                          {r.daysPending}d
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11, fill: "#475569" }}
            tickLine={false}
            axisLine={false}
            width={175}
            tickFormatter={(v) => v || "Not specified"}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
          <Bar
            dataKey="count"
            name="Open complaints"
            radius={[0, 4, 4, 0]}
            style={{ cursor: "pointer" }}
            onClick={(d) => toggleStatus(d.name)}
          >
            <LabelList
              dataKey="count"
              position="right"
              style={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }}
              formatter={(v: number) => `${v}`}
            />
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={statusColor(entry.name)}
                opacity={selectedStatus === null || selectedStatus === entry.name ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
