"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Clock, History } from "lucide-react";
import type { ComplaintRow } from "@/lib/types";

interface HistoryEntry {
  field: string;
  value: string;
  note: string | null;
  updated_by: string;
  created_at: string;
}

/** Exact status vocabulary already used in the sheets — keeps bucket logic working. */
const STATUS_OPTIONS = [
  "Complaint Register",
  "Pickup Arranged",
  "Pickup Delay From Cust.",
  "Pickup successful",
  "Received in Okhla",
  "Pending For Repair",
  "Repair Done But payment issue",
  "Dispatch Schduled",
  "Dispatch But Not Delivered",
  "Payment due from Customer",
  "Re-Open Ticket",
  "Close Ticket",
];

const TEAM = ["Prachi", "Adil", "Altab", "Asis"];

export default function UpdateTicketModal({
  row,
  onClose,
  onSaved,
}: {
  row: ComplaintRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<"update" | "history">("update");
  const [status, setStatus] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [remark, setRemark] = useState("");
  const [me, setMe] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Remember who's using this browser
  useEffect(() => {
    const saved = localStorage.getItem("team_member");
    if (saved) setMe(saved);
  }, []);

  // Load history when switching to history tab
  useEffect(() => {
    if (tab !== "history") return;
    setHistoryLoading(true);
    fetch(`/api/updates?complaintId=${encodeURIComponent(row.id)}`)
      .then(r => r.json())
      .then(j => setHistory(j.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [tab, row.id]);

  async function handleSave() {
    setError(null);
    if (!me) { setError("Select your name first."); return; }
    const updates: { field: string; value: string }[] = [];
    if (status) updates.push({ field: "status", value: status });
    if (assignTo) updates.push({ field: "assigned_to", value: assignTo });
    if (remark.trim()) updates.push({ field: "remark", value: remark.trim() });
    if (updates.length === 0) { setError("Nothing to save — change at least one field."); return; }

    setSaving(true);
    try {
      localStorage.setItem("team_member", me);
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: row.id, updates, updatedBy: me }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Update #{row.sequenceNo} — {row.customerName || "Unknown"}
            </h3>
            <p className="text-xs text-slate-400">
              {row.productName} · {row.brand} · currently: {row.actionTaken || "—"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setTab("update")}
            className={`flex items-center gap-1.5 text-xs px-5 py-2.5 font-medium border-b-2 transition ${tab === "update" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Save size={12} /> Update
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-1.5 text-xs px-5 py-2.5 font-medium border-b-2 transition ${tab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <History size={12} /> History
          </button>
        </div>

        {tab === "update" ? (
          <>
            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <Field label="New status (optional)">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">— no change —</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Assign to (optional)">
                <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">— no change —</option>
                  {TEAM.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Remark (optional)">
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={2}
                  placeholder="e.g. Customer not reachable, retry tomorrow"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </Field>

              <Field label="Your name (recorded with the update)">
                <select value={me} onChange={(e) => setMe(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">— select —</option>
                  {TEAM.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "Saving…" : "Save Update"}
              </button>
            </div>
          </>
        ) : (
          /* History tab */
          <div className="px-5 py-4 max-h-72 overflow-y-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No updates recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="mt-0.5 shrink-0">
                      <Clock size={12} className="text-slate-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 capitalize">{h.field.replace("_", " ")}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-indigo-700 font-medium">{h.value || "—"}</span>
                        <span className="text-slate-400 ml-auto shrink-0">by {h.updated_by}</span>
                      </div>
                      {h.note && <p className="text-slate-500 italic mt-0.5">{h.note}</p>}
                      <p className="text-slate-300 mt-0.5">
                        {new Date(h.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
