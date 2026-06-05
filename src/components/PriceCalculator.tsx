"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Calculator, IndianRupee, ChevronDown, Plus, Minus } from "lucide-react";
import type { SparePartsData, PriceListRow } from "@/lib/spareparts-types";

interface Props {
  open: boolean;
  onClose: () => void;
}

function parseNum(s: string): number | null {
  if (!s || s.toLowerCase() === "na") return null;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

/** Returns the final price for a part row given B2B/B2C.
 *  GST column logic:
 *  - "included" (any case) → price is as-is
 *  - has a % number (e.g. "18%") → add that % on top
 *  - empty / unknown → price as-is, no GST added
 */
function calcPrice(row: PriceListRow, type: "B2C" | "B2B"): {
  base: number | null;
  gstPct: number;
  gstIncluded: boolean;
  final: number | null;
  gstAmount: number;
} {
  const rawStr = type === "B2C" ? row.MaxB2C : row.MinB2B;
  const base = parseNum(rawStr);
  const gstRaw = (row.GST ?? "").trim().toLowerCase();
  const gstIncluded = gstRaw === "included" || gstRaw === "gst included";
  const gstPct = gstIncluded ? 0 : (parseNum(row.GST) ?? 0);

  if (base == null) return { base: null, gstPct, gstIncluded, final: null, gstAmount: 0 };

  const gstAmount = Math.round(base * gstPct / 100);
  const final = base + gstAmount;
  return { base, gstPct, gstIncluded, final, gstAmount };
}

export default function PriceCalculator({ open, onClose }: Props) {
  const [data, setData]           = useState<SparePartsData | null>(null);
  const [brand, setBrand]         = useState("");
  const [product, setProduct]     = useState("");
  const [priceType, setPriceType] = useState<"B2C" | "B2B">("B2C");
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && !data) {
      fetch("/api/spareparts").then(r => r.json()).then(setData);
    }
  }, [open, data]);

  useEffect(() => { setProduct(""); setSelected(new Set()); }, [brand]);
  useEffect(() => { setSelected(new Set()); }, [product]);

  const brands = useMemo(() => {
    if (!data) return [];
    const s = new Set(
      data.priceList
        .filter(r => !r.Product.startsWith("REVIEW"))
        .map(r => data.productMaster.find(p => p.Product === r.Product)?.Brand ?? "")
        .filter(Boolean)
    );
    return Array.from(s).sort();
  }, [data]);

  const products = useMemo(() => {
    if (!data || !brand) return [];
    const s = new Set(
      data.priceList
        .filter(r => {
          if (r.Product.startsWith("REVIEW")) return false;
          return data.productMaster.find(p => p.Product === r.Product)?.Brand === brand;
        })
        .map(r => r.Product)
    );
    return Array.from(s).sort();
  }, [data, brand]);

  const parts = useMemo(() => {
    if (!data || !product) return [];
    return data.priceList
      .filter(r => r.Product === product && (r.MaxB2C !== "" || r.MinB2B !== ""))
      .sort((a, b) => a.SparePart.localeCompare(b.SparePart));
  }, [data, product]);

  function togglePart(name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Computed line items for selected parts
  const lineItems = useMemo(() => {
    return parts
      .filter(r => selected.has(r.SparePart))
      .map(r => {
        const c = calcPrice(r, priceType);
        return { ...r, ...c };
      });
  }, [parts, selected, priceType]);

  const totalBase  = lineItems.reduce((s, r) => s + (r.base  ?? 0), 0);
  const totalGST   = lineItems.reduce((s, r) => s + r.gstAmount, 0);
  const totalFinal = lineItems.reduce((s, r) => s + (r.final ?? 0), 0);
  const hasItems   = lineItems.length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Calculator size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Price Calculator</h2>
              <p className="text-[11px] text-slate-400">Select multiple parts → total price</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Brand + Product row */}
          <div className="grid grid-cols-2 gap-3">
            <CalcSelect
              label="Brand"
              value={brand}
              onChange={setBrand}
              placeholder="Select brand…"
              options={brands.map(b => ({ value: b, label: b }))}
            />
            <CalcSelect
              label="Product"
              value={product}
              onChange={setProduct}
              placeholder={brand ? "Select product…" : "Brand first"}
              options={products.map(p => ({ value: p, label: p }))}
              disabled={!brand}
            />
          </div>

          {/* B2B / B2C toggle */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Customer Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["B2C", "B2B"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setPriceType(t)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition ${
                    priceType === t
                      ? t === "B2C"
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-green-600 bg-green-600 text-white"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {t === "B2C" ? "B2C — Customer" : "B2B — Dealer"}
                  <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                    {t === "B2C" ? "Walk-in / end user" : "Hamleys / in-warranty"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Spare Parts checklist */}
          {product && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Spare Parts
                  {selected.size > 0 && (
                    <span className="ml-1.5 bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {selected.size} selected
                    </span>
                  )}
                </label>
                {selected.size > 0 && (
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="border-2 border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                {parts.map((r, i) => {
                  const c = calcPrice(r, priceType);
                  const isSelected = selected.has(r.SparePart);
                  const isService = r.SparePart.toLowerCase().includes("service");
                  return (
                    <button
                      key={i}
                      onClick={() => togglePart(r.SparePart)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 border-b border-slate-50 text-left transition ${
                        isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border-2 transition ${
                          isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                        }`}>
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs truncate ${isService ? "italic text-slate-400" : "text-slate-700"}`}>
                          {r.SparePart}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {c.final != null ? (
                          <span className={`text-xs font-semibold ${isSelected ? "text-indigo-700" : "text-slate-600"}`}>
                            ₹{c.final.toLocaleString("en-IN")}
                            {c.gstPct > 0 && (
                              <span className="text-[10px] font-normal text-slate-400 ml-1">+{c.gstPct}% GST</span>
                            )}
                            {c.gstIncluded && (
                              <span className="text-[10px] font-normal text-slate-400 ml-1">GST incl.</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Selected Parts</p>
              {lineItems.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={() => togglePart(r.SparePart)}
                      className="text-slate-300 hover:text-red-400 transition shrink-0"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-slate-600 truncate">{r.SparePart}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {r.final != null ? (
                      <span className="font-medium text-slate-800">₹{r.final.toLocaleString("en-IN")}</span>
                    ) : (
                      <span className="text-slate-300">N/A</span>
                    )}
                    {r.gstPct > 0 && (
                      <span className="text-[10px] text-slate-400 ml-1">(+{r.gstPct}%)</span>
                    )}
                    {r.gstIncluded && (
                      <span className="text-[10px] text-slate-400 ml-1">(incl.)</span>
                    )}
                  </div>
                </div>
              ))}
              {totalGST > 0 && (
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200 mt-1">
                  <span>Base: ₹{totalBase.toLocaleString("en-IN")}</span>
                  <span>GST: +₹{totalGST.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Total */}
        <div className={`mx-5 mb-5 shrink-0 rounded-2xl p-4 ${
          hasItems
            ? priceType === "B2C" ? "bg-indigo-600" : "bg-green-600"
            : "bg-slate-100"
        }`}>
          {!product ? (
            <div className="text-center text-slate-400 py-1">
              <IndianRupee size={24} className="mx-auto mb-1 opacity-30" />
              <p className="text-xs">Select brand and product to start</p>
            </div>
          ) : !hasItems ? (
            <div className="text-center text-slate-400 py-1">
              <Plus size={20} className="mx-auto mb-1 opacity-30" />
              <p className="text-xs">Tap parts above to add them</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70 mb-0.5">
                  {priceType === "B2C" ? "Customer Total (B2C)" : "Dealer Total (B2B)"}
                  {" · "}{lineItems.length} part{lineItems.length !== 1 ? "s" : ""}
                </p>
                <p className="text-4xl font-extrabold text-white">
                  ₹{totalFinal.toLocaleString("en-IN")}
                </p>
                {totalGST > 0 && (
                  <p className="text-xs text-white/60 mt-0.5">
                    ₹{totalBase.toLocaleString("en-IN")} + ₹{totalGST.toLocaleString("en-IN")} GST
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">{product}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalcSelect({ label, value, onChange, placeholder, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none px-3 py-2.5 pr-8 text-sm border-2 rounded-xl focus:outline-none transition ${
            disabled
              ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
              : value
              ? "border-indigo-300 bg-white text-slate-800 focus:border-indigo-500"
              : "border-slate-200 bg-white text-slate-400 focus:border-indigo-400"
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
