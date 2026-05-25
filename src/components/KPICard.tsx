"use client";

interface Props {
  label: string;
  value: number | string;
  sub?: string;
  color: "slate" | "orange" | "green" | "purple" | "blue";
}

const colorMap = {
  slate:  { bg: "bg-slate-50",  border: "border-slate-200", text: "text-slate-700",  value: "text-slate-900"  },
  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", value: "text-orange-700" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-600",  value: "text-green-700"  },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", value: "text-purple-700" },
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-600",   value: "text-blue-700"   },
};

export default function KPICard({ label, value, sub, color }: Props) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} px-4 py-4`}>
      <p className={`text-xs font-medium ${c.text} mb-1`}>{label}</p>
      <p className={`text-3xl font-bold ${c.value}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
