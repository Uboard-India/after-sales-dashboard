"use client";

import { useMemo } from "react";
import type { ComplaintRow } from "@/lib/types";

interface Props {
  rows: ComplaintRow[];
}

const TOP_PRODUCTS = 10;
const TOP_ISSUES = 6;

export default function IssueByProductTable({ rows }: Props) {
  const { products, issues, matrix } = useMemo(() => {
    const productCount = new Map<string, number>();
    const issueCount = new Map<string, number>();
    const cell = new Map<string, number>();

    rows.forEach((r) => {
      if (!r.productName || !r.issueType) return;
      productCount.set(r.productName, (productCount.get(r.productName) ?? 0) + 1);
      issueCount.set(r.issueType, (issueCount.get(r.issueType) ?? 0) + 1);
      const key = `${r.productName}||${r.issueType}`;
      cell.set(key, (cell.get(key) ?? 0) + 1);
    });

    const topProducts = Array.from(productCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_PRODUCTS)
      .map(([name]) => name);

    const topIssues = Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_ISSUES)
      .map(([name]) => name);

    return { products: topProducts, issues: topIssues, matrix: cell };
  }, [rows]);

  const maxVal = useMemo(() => {
    let m = 0;
    products.forEach((p) =>
      issues.forEach((i) => {
        const v = matrix.get(`${p}||${i}`) ?? 0;
        if (v > m) m = v;
      })
    );
    return m;
  }, [products, issues, matrix]);

  function heatColor(val: number) {
    if (val === 0) return "bg-slate-50 text-slate-300";
    const intensity = val / maxVal;
    if (intensity > 0.7) return "bg-red-500 text-white font-bold";
    if (intensity > 0.4) return "bg-orange-400 text-white font-semibold";
    if (intensity > 0.2) return "bg-yellow-300 text-yellow-900 font-medium";
    return "bg-yellow-100 text-yellow-800";
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">Issue Type by Product (Heatmap)</h2>
      <p className="text-xs text-slate-400 mb-4">Top 10 products × Top 6 issue types — darker = more complaints</p>
      <div className="overflow-x-auto table-scroll">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left text-slate-400 font-medium pb-2 pr-4 w-36">Product</th>
              {issues.map((issue) => (
                <th key={issue} className="text-center text-slate-500 font-medium pb-2 px-2 whitespace-nowrap max-w-[90px]">
                  <span className="block truncate" title={issue}>{issue}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product}>
                <td className="py-1.5 pr-4 font-medium text-slate-700 whitespace-nowrap">{product}</td>
                {issues.map((issue) => {
                  const val = matrix.get(`${product}||${issue}`) ?? 0;
                  return (
                    <td key={issue} className="px-2 py-1.5 text-center">
                      <span className={`inline-block w-full rounded px-1 py-0.5 text-center ${heatColor(val)}`}>
                        {val > 0 ? val : ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
