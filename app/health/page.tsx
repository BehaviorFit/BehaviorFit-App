"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = {
  id: number;
  date: string;
  steps: number | null;
  activeCalories: number | null;
  exerciseMinutes: number | null;
  standHours: number | null;
  restingHeartRate: number | null;
  avgHeartRate: number | null;
  flightsClimbed: number | null;
  distanceMiles: number | null;
  sleepHours: number | null;
};

const DAYS_OPTIONS = [7, 14, 30, 90];

export default function HealthPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/apple-health/data?days=${days}`)
      .then((r) => r.json())
      .then((data: Entry[]) => {
        setEntries(data);
        if (data.length > 0) setLastSync(data[data.length - 1].date);
        setLoading(false);
      });
  }, [days]);

  const latest = entries[entries.length - 1] ?? null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apple Health Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lastSync ? `Last sync: ${lastSync}` : "No data synced yet"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Link
            href="/health/setup"
            className="text-sm bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition"
          >
            Setup Auto-Sync
          </Link>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border rounded-lg px-3 py-2"
          >
            {DAYS_OPTIONS.map((d) => (
              <option key={d} value={d}>Last {d} days</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-gray-400">Loading...</p>}

      {!loading && entries.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium text-lg mb-2">No health data yet</p>
          <p className="text-amber-700 text-sm mb-4">
            Set up the iOS Shortcut to automatically sync your Apple Health data every day.
          </p>
          <Link
            href="/health/setup"
            className="bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition"
          >
            Get Started →
          </Link>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <>
          {/* Today summary cards */}
          {latest && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard label="Steps" value={latest.steps?.toLocaleString() ?? "—"} color="blue" icon="👟" />
              <StatCard label="Active Cal." value={latest.activeCalories != null ? `${Math.round(latest.activeCalories)} kcal` : "—"} color="orange" icon="🔥" />
              <StatCard label="Exercise" value={latest.exerciseMinutes != null ? `${latest.exerciseMinutes} min` : "—"} color="green" icon="⚡" />
              <StatCard label="Resting HR" value={latest.restingHeartRate != null ? `${Math.round(latest.restingHeartRate)} bpm` : "—"} color="red" icon="❤️" />
              <StatCard label="Stand Hours" value={latest.standHours != null ? `${latest.standHours} hr` : "—"} color="teal" icon="🧍" />
              <StatCard label="Flights" value={latest.flightsClimbed?.toString() ?? "—"} color="purple" icon="🪜" />
              <StatCard label="Distance" value={latest.distanceMiles != null ? `${latest.distanceMiles.toFixed(1)} mi` : "—"} color="indigo" icon="📍" />
              <StatCard label="Sleep" value={latest.sleepHours != null ? `${latest.sleepHours.toFixed(1)} hr` : "—"} color="slate" icon="😴" />
            </div>
          )}

          {/* Charts */}
          <div className="space-y-6">
            <ChartCard title="Steps" entries={entries} field="steps" color="#2563eb" />
            <ChartCard title="Active Calories" entries={entries} field="activeCalories" color="#ea580c" />
            <ChartCard title="Exercise Minutes" entries={entries} field="exerciseMinutes" color="#16a34a" />
            <ChartCard title="Resting Heart Rate (bpm)" entries={entries} field="restingHeartRate" color="#dc2626" />
            <ChartCard title="Sleep Hours" entries={entries} field="sleepHours" color="#7c3aed" />
          </div>

          {/* Raw data table */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Daily Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white rounded-xl shadow">
                <thead>
                  <tr className="border-b text-left">
                    {["Date","Steps","Cal","Ex Min","Stand","HR Rest","HR Avg","Flights","Miles","Sleep"].map((h) => (
                      <th key={h} className="px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{e.date}</td>
                      <td className="px-3 py-2">{e.steps?.toLocaleString() ?? "—"}</td>
                      <td className="px-3 py-2">{e.activeCalories != null ? Math.round(e.activeCalories) : "—"}</td>
                      <td className="px-3 py-2">{e.exerciseMinutes ?? "—"}</td>
                      <td className="px-3 py-2">{e.standHours ?? "—"}</td>
                      <td className="px-3 py-2">{e.restingHeartRate != null ? Math.round(e.restingHeartRate) : "—"}</td>
                      <td className="px-3 py-2">{e.avgHeartRate != null ? Math.round(e.avgHeartRate) : "—"}</td>
                      <td className="px-3 py-2">{e.flightsClimbed ?? "—"}</td>
                      <td className="px-3 py-2">{e.distanceMiles != null ? e.distanceMiles.toFixed(1) : "—"}</td>
                      <td className="px-3 py-2">{e.sleepHours != null ? e.sleepHours.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    teal: "bg-teal-50 border-teal-200 text-teal-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.blue}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

function ChartCard({ title, entries, field, color }: {
  title: string;
  entries: Entry[];
  field: keyof Entry;
  color: string;
}) {
  const values = entries.map((e) => (e[field] as number | null) ?? null);
  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length === 0) return null;

  const min = Math.min(...nonNull);
  const max = Math.max(...nonNull);
  const range = max - min || 1;

  const W = 800;
  const H = 120;
  const PAD = 8;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const points = entries.map((e, i) => {
    const val = (e[field] as number | null);
    const x = PAD + (i / Math.max(entries.length - 1, 1)) * chartW;
    const y = val != null
      ? PAD + chartH - ((val - min) / range) * chartH
      : null;
    return { x, y, val, date: e.date };
  });

  const pathD = points
    .filter((p) => p.y !== null)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${(p.y!).toFixed(1)}`)
    .join(" ");

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {points.filter((p) => p.y !== null).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y!} r="3" fill={color} opacity="0.8" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{entries[0]?.date ?? ""}</span>
        <span className="font-medium text-gray-600">
          avg {(nonNull.reduce((a, b) => a + b, 0) / nonNull.length).toFixed(1)}
        </span>
        <span>{entries[entries.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}
