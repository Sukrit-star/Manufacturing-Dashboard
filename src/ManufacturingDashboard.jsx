import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import * as XLSX from "xlsx";

const defaultData = [
  { name: "Mon", input: 710, output: 914, gap: -3317 },
  { name: "Tue", input: 998, output: 1363, gap: -2868 },
  { name: "Wed", input: 1000, output: 990, gap: -2636 },
  { name: "Thu", input: 1047, output: 817, gap: -2577 },
  { name: "Fri", input: 0, output: 0, gap: -3335 },
  { name: "Sat", input: 0, output: 0, gap: -4093 },
  { name: "Sun", input: 0, output: 0, gap: -4851 },
];

// Fallback sample series for other modules when no upload is present
const fallbackSeries = {
  "Module PCBA Assy": {
    days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    input: [650, 700, 800, 950, 980, 1020, 998],
    output: [600, 720, 760, 900, 1000, 1200, 1363],
  },
  "Module internal": {
    days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    input: [700, 750, 780, 820, 900, 950, 1000],
    output: [650, 700, 730, 800, 870, 920, 990],
  },
  "FG Level": {
    days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    input: [500, 480, 460, 420, 200, 50, 0],
    output: [450, 430, 400, 300, 200, 10, 0],
  },
};

// ---- Helpers for Digital Board ----
const trendEmojiFromSeries = (vals = []) => {
  if (!vals || vals.length < 2) return "➡️";
  const last3 = vals.slice(-3);
  const delta = last3[last3.length - 1] - last3[0];
  if (delta > 0) return "📈";
  if (delta < 0) return "📉";
  return "➡️";
};

const statusFromTarget = (actual, target, { reverseGood = false, tol = 0.05 } = {}) => {
  const t = target || 1;
  const diff = (actual - target) / t;
  const good = reverseGood ? diff <= 0 : diff >= 0;
  const near = Math.abs(diff) <= tol;
  if (good) return "good";
  if (near) return "caution";
  return "critical";
};

const StatusPill = ({ status }) => {
  const map = {
    good: "bg-green-100 text-green-700",
    caution: "bg-yellow-100 text-yellow-700",
    critical: "bg-red-100 text-red-700",
  };
  const label = { good: "🟢", caution: "🟡", critical: "🔴" }[status] || "";
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[status]}`}>{label} {status}</span>;
};

const SparklineChart = ({ data = [], color = "#0072ce" }) => (
  <div className="h-10 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.map((v) => (typeof v === "number" ? { v } : v))} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const MetricRow = ({ name, target, actual, series, reverseGood = false, hideTargetActual = false }) => {
  const gap = (actual ?? 0) - (target ?? 0);
  const status = statusFromTarget(actual ?? 0, target ?? 0, { reverseGood });
  const trend = trendEmojiFromSeries(series?.map((d) => (typeof d === "number" ? d : d.v)) ?? []);
  return (
    <div className="grid grid-cols-6 items-center gap-3 py-2 text-sm md:text-base">
      <div className="font-semibold text-slate-700">{name}</div>
      {hideTargetActual ? (
        <div className="text-right text-slate-300">—</div>
      ) : (
        <div className="text-right tabular-nums text-slate-600">{(target ?? 0).toLocaleString()}</div>
      )}
      {hideTargetActual ? (
        <div className="text-right text-slate-300">—</div>
      ) : (
        <div className="text-right tabular-nums font-bold text-slate-800">{(actual ?? 0).toLocaleString()}</div>
      )}
      <div className={`text-right tabular-nums font-semibold ${gap >= 0 ? "text-green-600" : "text-red-600"}`}>{gap >= 0 ? "+" : ""}{gap.toLocaleString()}</div>
      <div className="flex items-center gap-1">
        <SparklineChart data={series} color="#0072ce" />
        <span>{trend}</span>
      </div>
      <div className="text-right"><StatusPill status={status} /></div>
    </div>
  );
};

const ModulePanel = ({ title, metrics }) => (
  <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-xl p-5 md:p-6 border border-[#e6f0fa]">
    <h3 className="text-xl md:text-2xl font-extrabold text-[#0072ce] tracking-wide mb-3">{title}</h3>
    <div className="grid grid-cols-6 text-[11px] md:text-sm font-semibold text-slate-500 mb-1.5">
      <div>Metric</div>
      <div className="text-right">Target</div>
      <div className="text-right">Actual</div>
      <div className="text-right">Gap</div>
      <div>Trend</div>
      <div className="text-right">Status</div>
    </div>
    <div className="divide-y divide-[#e6f0fa]">
      {metrics.map((m) => (
        <MetricRow key={m.name} {...m} />
      ))}
    </div>
  </div>
);

const KpiCard = ({ label, value, target, reverseGood = false }) => {
  const status = statusFromTarget(value ?? 0, target ?? 0, { reverseGood, tol: 0.03 });
  return (
    <div className="bg-white/85 rounded-2xl shadow-xl p-4 md:p-6 border border-[#e6f0fa]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-slate-500 font-semibold text-sm md:text-base">{label}</div>
        <StatusPill status={status} />
      </div>
      <div className="text-3xl md:text-4xl font-extrabold text-slate-800 tabular-nums">{(value ?? 0).toLocaleString()}</div>
      {target != null && (
        <div className="text-xs md:text-sm text-slate-500 mt-1">Target: {(target ?? 0).toLocaleString()}</div>
      )}
    </div>
  );
};

export default function ManufacturingDashboard() {
  const [week, setWeek] = useState("WK6");
  const [rows, setRows] = useState(null);
  const [modules, setModules] = useState(null); // parsed board-style modules
  const [activeModule, setActiveModule] = useState("TOSA Level");
  const [monitorMode, setMonitorMode] = useState("Daily"); // Daily | Weekly | Quarterly

  // Build chart data from either simple rows, parsed modules, or fallback
  const dailyData = useMemo(() => {
    if (modules && modules[activeModule]) {
      const m = modules[activeModule];
      return (m.days || []).map((d, i) => ({
        name: d,
        input: Number(m.input?.[i] ?? 0),
        output: Number(m.output?.[i] ?? 0),
        gap: Number(m.gap?.[i] ?? (Number(m.input?.[i] ?? 0) - Number(m.output?.[i] ?? 0))),
      }));
    }
    return rows ?? defaultData;
  }, [modules, activeModule, rows]);

  // Aggregate based on monitorMode
  const chartData = useMemo(() => {
    if (monitorMode === "Daily") return dailyData;
    // Aggregate all available days into a single bucket for Weekly/Quarterly
    const sum = (k) => dailyData.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const label = monitorMode === "Weekly" ? week : (week.replace(/WK\d+/i, "Q1"));
    return [{ name: label, input: sum("input"), output: sum("output"), gap: sum("gap") }];
  }, [dailyData, monitorMode, week]);

  // Scaled targets for top KPI row based on data span
  const dayCount = dailyData.length || 1;
  const kpiTarget = useMemo(() => ({
    input: monitorMode === 'Daily' ? 765 : 765 * dayCount,
    output: monitorMode === 'Daily' ? 758 : 758 * dayCount,
    gap: 0,
    wip: 12665,
  }), [monitorMode, dayCount]);

  // Helpers for per-module data and targets
  const computeModuleData = (moduleKey) => {
    let days = [], input = [], output = [];
    if (modules && modules[moduleKey]) {
      const m = modules[moduleKey];
      days = m.days || [];
      input = (m.input || []).map((n) => Number(n) || 0);
      output = (m.output || []).map((n) => Number(n) || 0);
    } else if (moduleKey === "TOSA Level") {
      days = defaultData.map((d) => d.name);
      input = defaultData.map((d) => d.input);
      output = defaultData.map((d) => d.output);
    } else if (fallbackSeries[moduleKey]) {
      days = fallbackSeries[moduleKey].days;
      input = fallbackSeries[moduleKey].input;
      output = fallbackSeries[moduleKey].output;
    }
    const gapSeries = input.map((v, i) => (Number(v) || 0) - (Number(output[i]) || 0));
    const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
    const totals = {
      input: sum(input),
      output: sum(output),
      gap: sum(gapSeries),
      wip: Math.max(0, sum(input) - sum(output)),
      count: input.length || 1,
    };
    return { days, input, output, gapSeries, totals };
  };

  const scaledTarget = (base, count) => {
    if (base == null) return 0;
    if (monitorMode === "Daily") return base;
    // Scale by number of datapoints we have for this module (keeps consistent with uploaded data span)
    return base * (count || 1);
  };
  const totals = useMemo(() => {
    const sum = (k) => chartData.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return {
      input: sum("input"),
      output: sum("output"),
      gap: sum("gap"),
      wip: Math.max(0, sum("input") - sum("output")),
    };
  }, [chartData]);

  const onUpload = async (file) => {
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Try parsing as board-style sheet first
      const parsed = parseBoardSheet(ws);
      if (parsed && Object.keys(parsed).length) {
        setModules(parsed);
        setRows(null);
        // set default active module if available
        const first = Object.keys(parsed)[0];
        if (first) setActiveModule(first);
        return;
      }

      // Fallback to simple tall-format parsing
      const json = XLSX.utils.sheet_to_json(ws, { defval: 0 });
      const mapped = json.map((r, i) => {
        const name = r.name ?? r.day ?? r.Day ?? `Row ${i + 1}`;
        const input = Number(r.input ?? r.Input ?? r.INPUT ?? 0);
        const output = Number(r.output ?? r.Output ?? r.OUTPUT ?? 0);
        const gap = r.gap ?? r.Gap ?? r.GAP ?? input - output;
        return { name, input, output, gap: Number(gap) };
      });
      setModules(null);
      setRows(mapped);
    } catch (err) {
      console.error(err);
      alert("อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบว่าไฟล์มีคอลัมน์ name,input,output,gap หรือใช้ Template ที่เราเตรียมไว้");
    }
  };

  // --- Parser for the provided board-like sheet ---
  function parseBoardSheet(ws) {
    try {
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
      if (!Array.isArray(aoa) || !aoa.length) return null;

      const modulesFound = {};
      let currentModule = null;
      let dayStart = -1;
      let dayLabels = [];

      const isDayRow = (row) => {
        if (!row) return false;
        const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; 
        const idx = row.findIndex((c) => labels.includes(String(c || "").trim()));
        if (idx === -1) return false;
        // ensure subsequent labels roughly match
        for (let i = 0; i < labels.length; i++) {
          if (String(row[idx + i] || "").trim() !== labels[i]) return false;
        }
        return true;
      };

      const parseNum = (v) => {
        if (v == null) return 0;
        let s = String(v).trim();
        if (s === "-" || s === "") return 0;
        // handle (1,234) as -1234
        let neg = false;
        if (s.startsWith("(") && s.endsWith(")")) {
          neg = true;
          s = s.slice(1, -1);
        }
        s = s.replace(/,/g, "");
        const n = Number(s);
        if (!isFinite(n)) return 0;
        return neg ? -n : n;
      };

      const wantedRows = new Set([
        "Daily Actual Input",
        "Actual Output",
        "Accumulate gap",
        "WIP",
      ]);

      const moduleAliases = [
        "TOSA Level",
        "Module PCBA Assy",
        "Module internal",
        "FG Level",
      ];

      for (let r = 0; r < aoa.length; r++) {
        const row = aoa[r];
        if (!row) continue;
        const first = String(row[0] ?? "").trim();

        // Detect new module header
        const modMatch = moduleAliases.find((m) => first.startsWith(m));
        if (modMatch) {
          currentModule = modMatch;
          if (!modulesFound[currentModule]) {
            modulesFound[currentModule] = { days: [], input: [], output: [], gap: [], wip: [] };
          }
          continue;
        }

        // Detect day header row for current module
        if (isDayRow(row)) {
          const idx = row.findIndex((c) => String(c || "").trim() === "Mon");
          dayStart = idx;
          dayLabels = row.slice(idx, idx + 7).map((x) => String(x).trim());
          // Store day labels for current module
          if (currentModule && modulesFound[currentModule]) {
            modulesFound[currentModule].days = dayLabels;
          }
          continue;
        }

        if (!currentModule || dayStart < 0 || !wantedRows.has(first)) continue;

        const series = [];
        for (let i = 0; i < 7; i++) {
          series.push(parseNum(row[dayStart + i]));
        }

        if (first === "Daily Actual Input") {
          modulesFound[currentModule].input = series;
        } else if (first === "Actual Output") {
          modulesFound[currentModule].output = series;
        } else if (first === "Accumulate gap") {
          modulesFound[currentModule].gap = series;
        } else if (first === "WIP") {
          modulesFound[currentModule].wip = series;
        }
      }

      // If no module had data, return null
      const nonEmpty = Object.values(modulesFound).some((m) => (m.input?.length || m.output?.length || m.gap?.length));
      return nonEmpty ? modulesFound : null;
    } catch (e) {
      console.warn("parseBoardSheet failed", e);
      return null;
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Executive Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <KpiCard label="Total Input" value={totals.input} target={kpiTarget.input} />
        <KpiCard label="Total Output" value={totals.output} target={kpiTarget.output} />
        <KpiCard label="Accumulated Gap" value={totals.gap} target={kpiTarget.gap} reverseGood />
        <KpiCard label="WIP" value={totals.wip} target={kpiTarget.wip} reverseGood />
      </div>
      {modules && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-slate-600">Module:</span>
          <select
            className="px-3 py-1.5 rounded-md border border-[#e6f0fa] text-sm focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
            value={activeModule}
            onChange={(e) => setActiveModule(e.target.value)}
          >
            {Object.keys(modules).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500">ใช้สำหรับกราฟและ KPI แถวบน</span>
        </div>
      )}

      {/* Controls for week, view, and upload */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-1.5 rounded-md border border-[#e6f0fa] text-sm focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          >
            <option>WK6</option>
            <option>WK7</option>
            <option>WK8</option>
          </select>
          <select
            className="px-3 py-1.5 rounded-md border border-[#e6f0fa] text-sm focus:outline-none focus:ring-2 focus:ring-[#0072ce]"
            value={monitorMode}
            onChange={(e) => setMonitorMode(e.target.value)}
          >
            <option>Daily</option>
            <option>Weekly</option>
            <option>Quarterly</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => onUpload(e.target.files?.[0])} className="hidden" />
            <span className="px-3 py-1.5 rounded-md bg-[#0072ce] text-white hover:bg-[#0a6bc0] transition">อัพโหลด Excel</span>
          </label>
        </div>
      </div>

      {/* Grid with four modules in order */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(() => {
          const md = computeModuleData("TOSA Level");
          return (
            <ModulePanel
              title="TOSA Module"
              metrics={[
                { name: "Daily Input", target: scaledTarget(765, md.totals.count), actual: monitorMode === 'Daily' ? md.totals.input : md.totals.input, series: md.input },
                { name: "Daily Output", target: scaledTarget(758, md.totals.count), actual: monitorMode === 'Daily' ? md.totals.output : md.totals.output, series: md.output },
                { name: "Accumulated Gap", target: 0, actual: md.totals.gap, series: md.gapSeries, reverseGood: true, hideTargetActual: true },
                { name: "WIP Level", target: 12665, actual: md.totals.wip, series: md.input.map((v, i) => Math.max(0, (md.input[i] || 0) - (md.output[i] || 0))), reverseGood: true },
              ]}
            />
          );
        })()}

        {(() => {
          const md = computeModuleData("Module PCBA Assy");
          return (
            <ModulePanel
              title="PCBA Assy Module"
              metrics={[
                { name: "Daily Input", target: scaledTarget(950, md.totals.count), actual: md.totals.input, series: md.input },
                { name: "Daily Output", target: scaledTarget(940, md.totals.count), actual: md.totals.output, series: md.output },
                { name: "Accumulated Gap", target: 0, actual: md.totals.gap, series: md.gapSeries, reverseGood: true, hideTargetActual: true },
                { name: "WIP Level", target: 15000, actual: md.totals.wip, series: md.input.map((v, i) => Math.max(0, (md.input[i] || 0) - (md.output[i] || 0))), reverseGood: true },
              ]}
            />
          );
        })()}

        {(() => {
          const md = computeModuleData("Module internal");
          return (
            <ModulePanel
              title="Internal Module"
              metrics={[
                { name: "Daily Input", target: scaledTarget(800, md.totals.count), actual: md.totals.input, series: md.input },
                { name: "Daily Output", target: scaledTarget(820, md.totals.count), actual: md.totals.output, series: md.output },
                { name: "Accumulated Gap", target: 0, actual: md.totals.gap, series: md.gapSeries, reverseGood: true, hideTargetActual: true },
                { name: "WIP Level", target: 11000, actual: md.totals.wip, series: md.input.map((v, i) => Math.max(0, (md.input[i] || 0) - (md.output[i] || 0))), reverseGood: true },
              ]}
            />
          );
        })()}

        {(() => {
          const md = computeModuleData("FG Level");
          return (
            <ModulePanel
              title="FG Level Module"
              metrics={[
                { name: "Daily Input", target: scaledTarget(500, md.totals.count), actual: md.totals.input, series: md.input },
                { name: "Daily Output", target: scaledTarget(500, md.totals.count), actual: md.totals.output, series: md.output },
                { name: "Accumulated Gap", target: 0, actual: md.totals.gap, series: md.gapSeries, reverseGood: true, hideTargetActual: true },
                { name: "WIP Level", target: 20000, actual: md.totals.wip, series: md.input.map((v, i) => Math.max(0, (md.input[i] || 0) - (md.output[i] || 0))), reverseGood: true },
              ]}
            />
          );
        })()}

        {/* Trend for active module across full width */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-[#e6f0fa] h-60 md:h-72 md:col-span-2">
          <h4 className="font-semibold text-[#0072ce] mb-2">{monitorMode === 'Daily' ? '7-Day Trend' : `${monitorMode} Totals`} ({activeModule})</h4>
          <ResponsiveContainer width="100%" height="100%">
            {monitorMode === 'Daily' ? (
              <LineChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="input" stroke="#22c55e" name="Input" strokeWidth={2} />
                <Line type="monotone" dataKey="output" stroke="#0072ce" name="Output" strokeWidth={2} />
                <Line type="monotone" dataKey="gap" stroke="#ef4444" name="Gap" strokeWidth={2} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="input" fill="#22c55e" name="Input" />
                <Bar dataKey="output" fill="#0072ce" name="Output" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary row: WIP Summary and Alerts/Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-4 md:p-6 border border-[#e6f0fa]">
          <h3 className="text-lg md:text-xl font-extrabold text-[#0072ce] tracking-wide mb-3">WIP Summary</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-[#e6f0fa] p-3">TOSA: <strong>10,763</strong> <span className="text-yellow-600">🟡</span></div>
            <div className="rounded-lg bg-[#e6f0fa] p-3">PCBA Assy: <strong>14,302</strong> <span className="text-orange-600">🟠</span></div>
            <div className="rounded-lg bg-[#e6f0fa] p-3">Internal: <strong>10,680</strong> <span className="text-green-600">🟢</span></div>
            <div className="rounded-lg bg-[#e6f0fa] p-3">FG: <strong>19,029</strong> <span className="text-yellow-600">🟡</span></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-4 md:p-6 border border-[#e6f0fa]">
          <h3 className="text-lg md:text-xl font-extrabold text-[#0072ce] tracking-wide mb-3">Alerts & Trends</h3>
          <ul className="list-disc ml-6 text-red-600 text-sm space-y-1 mb-4">
            <li>🔴 Accumulated Gap worsening in TOSA</li>
            <li>🟡 Rework PCBA trending up</li>
            <li>🟠 FG Output stalled for 3 days</li>
          </ul>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "PCBA", Debug: 276, Rework: 1479 }, { name: "Internal", Debug: 1461, Rework: 4164 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Debug" fill="#0072ce" />
                <Bar dataKey="Rework" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 text-xs">
            {["WK7","WK8","WK9","WK10","WK11","WK12","WK13"].map((w, i) => (
              <div key={w} className={`p-2 rounded border text-center ${i % 3 === 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                <div className="font-semibold">{w}</div>
                <div className="text-[10px]">{i % 3 === 0 ? "Forecast Gap" : "Ready"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
