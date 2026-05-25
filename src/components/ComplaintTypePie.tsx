"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  data: { name: string; value: number }[];
}

const COLORS = ["#4F46E5", "#10B981"];

export default function ComplaintTypePie({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 h-full">
      <h2 className="text-sm font-semibold text-slate-700 mb-2">Complaint Source</h2>
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, ""]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {data.map((d, i) => (
          <div key={d.name} className="text-center">
            <p className="text-lg font-bold" style={{ color: COLORS[i] }}>{d.value.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{d.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
