"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Clock, User, Plus } from "lucide-react";
import type { PriceListRow, HistoryRow } from "@/lib/spareparts-types";

const TEAM = ["Amit", "Chetna", "Rahul", "Neha", "Prachi", "Jyoti", "Adil", "Altab", "Asis"];

interface Props {
  row: PriceListRow | null;     // null = add new part
  product: string;              // product to add under (when row is null)
  onClose: () => void;
  onSaved: () => void;
}

export default function SparePartEditModal({ row, product, onClose, onSaved }: Props) {
  const isNew = !row;

  const [sparePart, setSparePart] = useState(row?.SparePart ?? "");
  const [maxB2C, setMaxB2C]       = useState(row?.MaxB2C ?? "");
  const [minB2B, setMinB2B]       = useState(row?.MinB2B ?? "");
  const [gst, setGst]             = useState(row?.GST ?? "");
  const [changedBy, setChangedBy] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("team_member") || "" : ""));
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [history, setHistory]     = useState<HistoryRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);

  // Load history for this specific part
  async function loadHistory() {
    if (!row) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/spareparts/history?product=${encodeURIComponent(row.Product)}`);
      const j = await res.json();
      const filtered = (j.history ?? []).filter((h: HistoryRow) => h.spare_part === row.SparePart);
      setHistory(filtered);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory]);

  async function handleSave() {
    if (!sparePart.trim()) { setError("Spare part name is required"); return; }
    if (!changedBy)         { setError("Please select your name");     return; }

    setSaving(true);
    setError("");
    try {
      localStorage.setItem("team_member", changedBy);
      const res = await fetch("/api/spareparts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: row?.Product ?? product,
          sparePart: sparePart.trim(),
          maxB2C: maxB2C.trim(),
          minB2B: minB2B.trim(),
          gst: gst.trim(),
          changedBy,
          isNew,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        if (j.error === "TABLES_NOT_SETUP") { setSetupNeeded(true); return; }
        throw new Error(j.error || "Save failed");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {isNew ? "Add New Spare Part" : "Edit Spare Part"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{row?.Product ?? product}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {setupNeeded ? (
          <div className="px-5 py-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
              <p className="font-semibold text-sm">⚙️ One-time database setup needed</p>
              <p>Ask Asis to run this SQL in the Supabase dashboard (SQL Editor):</p>
              <pre className="bg-white border border-amber-200 rounded p-3 text-[10px] overflow-x-auto whitespace-pre-wrap text-slate-700 select-all">{`CREATE TABLE spare_parts_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product TEXT NOT NULL,
  spare_part TEXT NOT NULL,
  max_b2c TEXT DEFAULT '',
  min_b2b TEXT DEFAULT '',
  gst TEXT DEFAULT '',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product, spare_part)
);
CREATE TABLE spare_parts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product TEXT NOT NULL,
  spare_part TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT DEFAULT '',
  new_value TEXT DEFAULT '',
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);`}</pre>
              <p className="text-amber-700">After running, click Save again.</p>
            </div>
            <button onClick={() => setSetupNeeded(false)} className="mt-3 text-xs text-indigo-600 hover:underline">← Go back</button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {/* Spare part name */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Spare Part Name</label>
              <input type="text" value={sparePart} onChange={e => setSparePart(e.target.value)}
                disabled={!isNew}
                placeholder="e.g. Battery"
                className={`w-full px-3 py-2 text-sm border-2 rounded-xl focus:outline-none transition ${isNew ? "border-indigo-200 focus:border-indigo-500" : "border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed"}`} />
            </div>

            {/* Prices row */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-green-700 block mb-1">Min B2B (₹)</label>
                <input type="text" value={minB2B} onChange={e => setMinB2B(e.target.value)}
                  placeholder="e.g. 1800"
                  className="w-full px-3 py-2 text-sm border-2 border-green-200 rounded-xl focus:outline-none focus:border-green-500 transition" />
              </div>
              <div>
                <label className="text-xs font-medium text-indigo-700 block mb-1">Max B2C (₹)</label>
                <input type="text" value={maxB2C} onChange={e => setMaxB2C(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-3 py-2 text-sm border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 transition" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">GST</label>
                <input type="text" value={gst} onChange={e => setGst(e.target.value)}
                  placeholder="18% / included"
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition" />
              </div>
            </div>

            {/* Who is editing */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Your Name</label>
              <div className="relative">
                <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={changedBy} onChange={e => setChangedBy(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 appearance-none">
                  <option value="">— select name —</option>
                  {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving…" : isNew ? "Add Part" : "Save Changes"}
              </button>
              {!isNew && (
                <button onClick={() => setShowHistory(v => !v)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-xl border-2 transition ${showHistory ? "border-slate-400 bg-slate-100 text-slate-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                  <Clock size={13} /> History
                </button>
              )}
            </div>
          </div>
        )}

        {/* History panel */}
        {showHistory && !setupNeeded && (
          <div className="px-5 pb-4 border-t border-slate-100 mt-1">
            <p className="text-xs font-semibold text-slate-500 mt-3 mb-2">Edit History — {row?.SparePart}</p>
            {historyLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No changes recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="bg-slate-50 rounded-lg px-3 py-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-700">{h.changed_by}</span>
                      <span className="text-slate-400">{new Date(h.changed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {h.field_changed === "new_part" ? (
                      <p className="text-green-700">✚ Added new part: {h.new_value}</p>
                    ) : (
                      <p className="text-slate-600">
                        <span className="font-medium">{h.field_changed}:</span>{" "}
                        <span className="text-red-500 line-through">{h.old_value || "—"}</span>
                        {" → "}
                        <span className="text-green-600 font-medium">{h.new_value || "—"}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
