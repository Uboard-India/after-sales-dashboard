"use client";

import { useState } from "react";

interface Row {
  name: string;
  total: number;
  open: number;
  closed: number;
  closureRate: number;
}

interface Props {
  data: Row[];
}

type Tab = "all" | "open" | "closed";

export default function RequestByTable({ data }: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const displayed = data.map((r) => ({
    ...r,
    display: tab === "all" ? r.total : tab === "open" ? r.open : r.closed,
  })).sort((a, b) => b.display - a.display);

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: "all",    label: "All",    color: "bg-slate-100 text-slate-700" },
    { key: "open",   label: "Open",   color: "bg-orange-100 text-orange-700" },
    { key: "closed", label: "Closed", color: "bg-green-100 text-green-700"  },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Team Performance (Request By)</h2>
        <div className="flex gap-1 bg-slate-50 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs px-3 py-1 rounded-md transition font-medium ${
                tab === t.key ? t.color : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-4">Team Member</th>
              <th className="text-right text-xs font-medium text-slate-400 pb-2 px-4">Total</th>
              <th className="text-right text-xs font-medium text-slate-400 pb-2 px-4">Open</th>
              <th className="text-right text-xs font-medium text-slate-400 pb-2 px-4">Closed</th>
              <th className="text-right text-xs font-medium text-slate-400 pb-2 pl-4">Closure %</th>
              <th className="text-left text-xs font-medium text-slate-400 pb-2 pl-4 w-40">Progress</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r) => (
              <tr key={r.name} className="border-b border-slate-50 hover:bg-slate-50 transition">
                <td className="py-2 pr-4 font-medium text-slate-800">{r.name}</td>
                <td className="py-2 px-4 text-right text-slate-600">{r.total.toLocaleString()}</td>
                <td className="py-2 px-4 text-right text-orange-600 font-medium">{r.open}</td>
                <td className="py-2 px-4 text-right text-green-600 font-medium">{r.closed.toLocaleString()}</td>
                <td className="py-2 pl-4 text-right">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    r.closureRate >= 90 ? "bg-green-100 text-green-700" :
                    r.closureRate >= 75 ? "bg-blue-100 text-blue-700" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    {r.closureRate}%
                  </span>
                </td>
                <td className="py-2 pl-4">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-32">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${r.closureRate}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
