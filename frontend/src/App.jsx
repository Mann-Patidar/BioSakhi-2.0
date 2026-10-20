import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Droplets, Gauge,
  Leaf, RefreshCw, Thermometer, Wifi, WifiOff, Wind, Waves
} from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const demoFallback = {
  temperature_c: 29.1, ph: 7.2, tank_level_pct: 54,
  gas_ppm: 24, sludge_level_pct: 31, demo_mode: true,
  device_online: false, timestamp: new Date().toISOString(),
  last_updated: new Date().toISOString()
};

const initialHistory = Array.from({ length: 8 }, (_, index) => ({
  time: new Date(Date.now() - (7 - index) * 3000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  temperature_c: 28.7 + index * 0.06,
  ph: 7.12 + index * 0.01,
  tank_level_pct: 51 + index * 0.4
}));

function formatTime(value) {
  if (!value) return "Waiting for data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function sensorState(kind, value) {
  if (kind === "temperature") return value > 38 ? "warning" : "normal";
  if (kind === "ph") return value < 6 || value > 9 ? "warning" : "normal";
  if (kind === "tank") return value >= 85 ? "critical" : value >= 70 ? "warning" : "normal";
  if (kind === "gas") return value >= 100 ? "critical" : value >= 60 ? "warning" : "normal";
  if (kind === "sludge") return value >= 80 ? "critical" : value >= 60 ? "warning" : "normal";
  return "normal";
}

const statusCopy = {
  normal: { label: "Normal", dot: "bg-emerald-500", text: "text-emerald-700", panel: "bg-emerald-50" },
  warning: { label: "Attention", dot: "bg-amber-500", text: "text-amber-700", panel: "bg-amber-50" },
  critical: { label: "Critical", dot: "bg-rose-500", text: "text-rose-700", panel: "bg-rose-50" }
};

function StatusTag({ state }) {
  const item = statusCopy[state] || statusCopy.normal;
  return <span className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold ${item.panel} ${item.text}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />{item.label}
  </span>;
}

function SensorCard({ title, value, unit, icon: Icon, state, detail, accent }) {
  const item = statusCopy[state] || statusCopy.normal;
  return <article className="sensor-card rounded-xl border border-slate-200/80 bg-white p-5 shadow-soft">
    <div className="flex items-start justify-between gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <StatusTag state={state} />
    </div>
    <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
    <div className="mt-1 flex items-baseline gap-2">
      <span className="text-3xl font-semibold tracking-tight text-ink">{value}</span>
      <span className="text-sm font-medium text-slate-500">{unit}</span>
    </div>
    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />{detail}
    </div>
  </article>;
}

function ChartPanel({ title, subtitle, data, dataKey, color, unit, domain }) {
  return <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-soft">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{unit}</span>
    </div>
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e8efeb" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#84958d", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis domain={domain || ["auto", "auto"]} tick={{ fill: "#84958d", fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
          <Tooltip
            contentStyle={{ border: "1px solid #e2ebe5", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 20px rgba(24,51,43,.08)" }}
            formatter={(value) => [`${value} ${unit}`, title]}
            labelStyle={{ color: "#18332b", fontWeight: 600, marginBottom: 4 }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>;
}

function App() {
  const [reading, setReading] = useState(demoFallback);
  const [history, setHistory] = useState(initialHistory);
  const [apiConnected, setApiConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [readingResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE}/api/readings`),
        fetch(`${API_BASE}/api/history`)
      ]);
      if (!readingResponse.ok || !historyResponse.ok) throw new Error("API request failed");
      const nextReading = await readingResponse.json();
      const nextHistory = await historyResponse.json();
      setReading(nextReading);
      if (Array.isArray(nextHistory.points) && nextHistory.points.length) {
        setHistory(nextHistory.points.map(point => ({
          ...point,
          time: point.time || formatTime(point.timestamp)
        })));
      }
      setApiConnected(true);
      setLastFetch(new Date());
      setNotice("");
    } catch {
      setApiConnected(false);
      setNotice("API not connected. Showing local sample readings.");
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const resetDemo = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/demo`, { method: "POST" });
      if (!response.ok) throw new Error("Could not switch to demo mode");
      await refresh();
      setNotice("Demo readings enabled.");
    } catch {
      setNotice("Start the FastAPI backend to change the monitoring mode.");
    } finally {
      setBusy(false);
    }
  };

  const tankState = sensorState("tank", Number(reading.tank_level_pct || 0));
  const gasState = sensorState("gas", Number(reading.gas_ppm || 0));
  const sludgeState = sensorState("sludge", Number(reading.sludge_level_pct || 0));
  const temperatureState = sensorState("temperature", Number(reading.temperature_c || 0));
  const phState = sensorState("ph", Number(reading.ph || 7));
  const alertItems = useMemo(() => {
    const items = [];
    if (tankState !== "normal") items.push({ state: tankState, title: tankState === "critical" ? "Tank level is high" : "Tank level is increasing", body: `Current tank level is ${reading.tank_level_pct}%. Check the tank and plan an inspection.` });
    if (sludgeState !== "normal") items.push({ state: sludgeState, title: "Sludge level needs attention", body: `Estimated sludge indicator is ${reading.sludge_level_pct}%. Confirm using an appropriate inspection method.` });
    if (gasState !== "normal") items.push({ state: gasState, title: "Gas reading needs attention", body: `Gas sensor reading is ${reading.gas_ppm} ppm. Follow site safety procedures and do not enter a confined space.` });
    if (temperatureState !== "normal" || phState !== "normal") items.push({ state: "warning", title: "Review sensor conditions", body: "One or more readings are outside the configured demo range." });
    if (!items.length) items.push({ state: "normal", title: "Sensor readings are within configured ranges", body: "Continue routine monitoring. Thresholds are demonstration defaults and should be validated for the installed sensors." });
    return items;
  }, [tankState, sludgeState, gasState, temperatureState, phState, reading]);

  const updatedText = reading.last_updated || reading.timestamp;

  return <div className="min-h-screen bg-canvas text-slate-800">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest text-white">
            <Leaf size={23} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-ink">BioSakhi <span className="text-teal">2.0</span></h1>
            <p className="hidden text-xs text-slate-500 sm:block">Smart Sanitation Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold sm:inline-flex ${reading.demo_mode ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${reading.demo_mode ? "bg-amber-500" : "bg-emerald-500"}`} />
            {reading.demo_mode ? "Demo Mode" : "Hardware Mode"}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${apiConnected && reading.device_online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {apiConnected && reading.device_online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{apiConnected && reading.device_online ? "Device online" : "Device offline"}</span>
            <span className="sm:hidden">{apiConnected && reading.device_online ? "Online" : "Offline"}</span>
          </span>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <section className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Monitoring overview</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Sanitation tank dashboard</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">View sensor conditions, recent trends, and alerts from your monitoring unit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            <Clock3 size={15} />
            <span>Updated {formatTime(updatedText)}</span>
          </div>
          <button onClick={resetDemo} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-forest bg-white px-3.5 py-2.5 text-sm font-semibold text-forest transition hover:bg-emerald-50 disabled:opacity-50">
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> Use demo data
          </button>
        </div>
      </section>

      {notice && <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>{notice}</span>
      </div>}

      <section aria-label="Sensor readings" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SensorCard title="Temperature" value={Number(reading.temperature_c ?? 0).toFixed(1)} unit="°C" icon={Thermometer} state={temperatureState} detail="Ambient tank reading" accent="bg-orange-50 text-orange-700" />
        <SensorCard title="pH level" value={Number(reading.ph ?? 0).toFixed(2)} unit="pH" icon={Droplets} state={phState} detail="Acidity indicator" accent="bg-sky-50 text-sky-700" />
        <SensorCard title="Tank level" value={Number(reading.tank_level_pct ?? 0).toFixed(1)} unit="%" icon={Gauge} state={tankState} detail="Measured fill estimate" accent="bg-teal-50 text-teal-700" />
        <SensorCard title="Gas level" value={Number(reading.gas_ppm ?? 0).toFixed(1)} unit="ppm" icon={Wind} state={gasState} detail="Requires compatible gas sensor" accent="bg-amber-50 text-amber-700" />
        <SensorCard title="Sludge level" value={Number(reading.sludge_level_pct ?? 0).toFixed(1)} unit="%" icon={Waves} state={sludgeState} detail="Estimate requires validation" accent="bg-indigo-50 text-indigo-700" />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Sensor history</h2>
            <p className="mt-1 text-sm text-slate-500">Recent readings collected by the dashboard.</p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex"><Activity size={14} /> Refreshes every 3 seconds</span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartPanel title="Temperature history" subtitle="Temperature changes over time" data={history} dataKey="temperature_c" color="#d97732" unit="°C" />
          <ChartPanel title="pH history" subtitle="Acidity indicator over time" data={history} dataKey="ph" color="#168b82" unit="pH" domain={[0, 14]} />
          <ChartPanel title="Tank level history" subtitle="Estimated tank fill percentage" data={history} dataKey="tank_level_pct" color="#4777c8" unit="%" domain={[0, 100]} />
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Alerts and observations</h2>
              <p className="mt-1 text-sm text-slate-500">Based on the dashboard's current threshold settings.</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><AlertTriangle size={20} /></div>
          </div>
          <div className="mt-5 space-y-3">
            {alertItems.map((item, index) => {
              const state = statusCopy[item.state] || statusCopy.normal;
              const Icon = item.state === "normal" ? CheckCircle2 : AlertTriangle;
              return <div key={`${item.title}-${index}`} className={`flex gap-3 rounded-lg border border-slate-100 p-3.5 ${item.state === "normal" ? "bg-emerald-50/60" : "bg-white"}`}>
                <Icon size={18} className={`mt-0.5 shrink-0 ${state.text}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <StatusTag state={item.state} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.body}</p>
                </div>
              </div>;
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">System status</h2>
          <p className="mt-1 text-sm text-slate-500">Connection and data-source details.</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><Wifi size={17} /></div><div><p className="text-sm font-medium text-ink">Device connection</p><p className="mt-0.5 text-xs text-slate-500">ESP32 monitoring unit</p></div></div>
              <span className={`text-sm font-semibold ${apiConnected && reading.device_online ? "text-emerald-700" : "text-slate-500"}`}>{apiConnected && reading.device_online ? "Online" : "Offline"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><Activity size={17} /></div><div><p className="text-sm font-medium text-ink">API service</p><p className="mt-0.5 text-xs text-slate-500">FastAPI data endpoint</p></div></div>
              <span className={`text-sm font-semibold ${apiConnected ? "text-emerald-700" : "text-rose-700"}`}>{apiConnected ? "Connected" : "Unavailable"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><Clock3 size={17} /></div><div><p className="text-sm font-medium text-ink">Last update</p><p className="mt-0.5 text-xs text-slate-500">Latest reading received</p></div></div>
              <span className="text-sm font-semibold text-ink">{formatTime(updatedText)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600"><RefreshCw size={17} /></div><div><p className="text-sm font-medium text-ink">Data source</p><p className="mt-0.5 text-xs text-slate-500">Current dashboard mode</p></div></div>
              <span className={`text-sm font-semibold ${reading.demo_mode ? "text-amber-700" : "text-emerald-700"}`}>{reading.demo_mode ? "Simulated" : "Sensor feed"}</span>
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            <strong className="text-slate-700">Prototype note:</strong> readings and alert limits are for demonstration until the installed sensors are calibrated and tested.
          </div>
        </div>
      </section>

      <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center">
        <p className="font-semibold text-slate-600">BioSakhi 2.0 · Smart Sanitation Monitoring</p>
        <p>Built for a Smart India Hackathon prototype</p>
      </footer>
    </main>
  </div>;
}

export default App;
