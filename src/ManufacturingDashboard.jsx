import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Mon", input: 710, output: 914, gap: -3317 },
  { name: "Tue", input: 998, output: 1363, gap: -2868 },
  { name: "Wed", input: 1000, output: 990, gap: -2636 },
  { name: "Thu", input: 1047, output: 817, gap: -2577 },
  { name: "Fri", input: 0, output: 0, gap: -3335 },
  { name: "Sat", input: 0, output: 0, gap: -4093 },
  { name: "Sun", input: 0, output: 0, gap: -4851 },
];

export default function ManufacturingDashboard() {
  const [week, setWeek] = useState("WK6");

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-bold mb-2">📦 TOSA Level - {week}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>📥 Input: <strong>1,047</strong></div>
          <div>📤 Output: <strong>817</strong></div>
          <div>📊 GAP: <strong>-4,851</strong></div>
          <div>🏗️ WIP: <strong>10,763</strong></div>
        </div>
        <div className="h-60 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="input" stroke="#22c55e" name="Input" />
              <Line type="monotone" dataKey="output" stroke="#3b82f6" name="Output" />
              <Line type="monotone" dataKey="gap" stroke="#ef4444" name="Gap" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-bold mb-2">📊 WIP Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>TOSA: <strong>10,763</strong></div>
          <div>PCBA Assy: <strong>14,302</strong></div>
          <div>Internal: <strong>10,680</strong></div>
          <div>FG: <strong>19,029</strong></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-bold mb-2">🚨 Alert Panel</h2>
        <ul className="list-disc ml-6 text-red-500 text-sm">
          <li>🔴 TOSA GAP เพิ่มขึ้นต่อเนื่อง</li>
          <li>🟡 Rework PCBA สูงขึ้น</li>
          <li>🟠 FG ไม่มี Output รายสัปดาห์</li>
        </ul>
      </div>
    </div>
  );
}
