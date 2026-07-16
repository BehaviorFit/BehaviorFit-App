"use client";
// Page: Live treadmill workout display.
// No hardware/sensor integration exists in this app, so speed & incline are
// entered manually (matching the treadmill console) and time/distance/calories
// accumulate live off the wall clock, so backgrounding the tab doesn't lose time.

import { useEffect, useRef, useState } from "react";

type Client = { id: number; name: string };

const STORAGE_KEY = "treadmillSession";
const STRIDE_FEET = 2.5; // rough walking stride, used only for the steps estimate

type SavedSession = {
  elapsedSec: number;
  distanceMi: number;
  calorieKcal: number;
  speedMph: number;
  inclinePct: number;
  weightLbs: number;
  running: boolean;
};

function kcalPerMinute(speedMph: number, inclinePct: number, weightLbs: number) {
  const weightKg = weightLbs * 0.453592;
  const speedMmin = speedMph * 26.8224;
  const grade = inclinePct / 100;
  // ACSM walking metabolic equation
  const vo2 = 0.1 * speedMmin + 1.8 * speedMmin * grade + 3.5;
  const mets = vo2 / 3.5;
  return (mets * 3.5 * weightKg) / 200;
}

function formatTime(totalSeconds: number) {
  const s = Math.floor(totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

function formatPace(elapsedSec: number, distanceMi: number) {
  if (distanceMi < 0.01) return "--:--";
  const minPerMi = elapsedSec / 60 / distanceMi;
  const mm = Math.floor(minPerMi);
  const ss = Math.round((minPerMi - mm) * 60);
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export default function TreadmillPage() {
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [distanceMi, setDistanceMi] = useState(0);
  const [calorieKcal, setCalorieKcal] = useState(0);
  const [speedMph, setSpeedMph] = useState(3.0);
  const [inclinePct, setInclinePct] = useState(1.0);
  const [weightLbs, setWeightLbs] = useState(154);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const runningRef = useRef(running);
  const speedRef = useRef(speedMph);
  const inclineRef = useRef(inclinePct);
  const weightRef = useRef(weightLbs);
  const lastTsRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    runningRef.current = running;
    speedRef.current = speedMph;
    inclineRef.current = inclinePct;
    weightRef.current = weightLbs;
  });

  // Restore an in-progress session (e.g. iPad Safari suspended/reloaded the tab)
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved: SavedSession = JSON.parse(raw);
      setElapsedSec(saved.elapsedSec);
      setDistanceMi(saved.distanceMi);
      setCalorieKcal(saved.calorieKcal);
      setSpeedMph(saved.speedMph);
      setInclinePct(saved.inclinePct);
      setWeightLbs(saved.weightLbs);
      setRunning(saved.running);
    } catch {
      // ignore corrupt saved state
    }
  }, []);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  // Live tick: integrates elapsed time / distance / calories off the wall clock,
  // so a throttled or backgrounded tab still catches up correctly on resume.
  useEffect(() => {
    lastTsRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dtSec = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;
      if (!runningRef.current) return;

      setElapsedSec((e) => e + dtSec);
      setDistanceMi((d) => d + (speedRef.current * dtSec) / 3600);
      setCalorieKcal(
        (c) => c + (kcalPerMinute(speedRef.current, inclineRef.current, weightRef.current) * dtSec) / 60
      );
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Persist so the session survives a tab reload/suspend
  useEffect(() => {
    const session: SavedSession = { elapsedSec, distanceMi, calorieKcal, speedMph, inclinePct, weightLbs, running };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [elapsedSec, distanceMi, calorieKcal, speedMph, inclinePct, weightLbs, running]);

  // Keep the iPad screen awake while a workout is running
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // wake lock not available/allowed; display still works, screen may dim
      }
    }
    if (running) {
      requestWakeLock();
    } else {
      wakeLockRef.current?.release?.().catch(() => {});
      wakeLockRef.current = null;
    }
    function handleVisibility() {
      if (runningRef.current && document.visibilityState === "visible" && !wakeLockRef.current) {
        requestWakeLock();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [running]);

  function reset() {
    if (running && !confirm("End the current workout and reset?")) return;
    setRunning(false);
    setElapsedSec(0);
    setDistanceMi(0);
    setCalorieKcal(0);
    setSaveStatus("idle");
  }

  async function saveWorkout() {
    if (!clientId) return;
    setSaveStatus("saving");
    const steps = Math.round((distanceMi * 5280) / STRIDE_FEET);
    await fetch("/api/fitness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        date: new Date().toISOString().slice(0, 10),
        steps,
        exerciseMinutes: Math.round(elapsedSec / 60),
        notes: `Treadmill: ${distanceMi.toFixed(2)} mi @ ${speedMph} mph, ${inclinePct}% incline, ~${Math.round(
          calorieKcal
        )} kcal`,
      }),
    });
    setSaveStatus("saved");
  }

  const steps = Math.round((distanceMi * 5280) / STRIDE_FEET);

  return (
    <div className="-mx-4 -my-8 min-h-[calc(100vh-73px)] bg-slate-900 text-white px-4 py-8 rounded-none sm:rounded-2xl sm:mx-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-300">Live Treadmill Workout</h1>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              running ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"
            }`}
          >
            {running ? "IN PROGRESS" : "STOPPED"}
          </span>
        </div>

        {/* Timer */}
        <div className="text-center mb-8">
          <div className="text-7xl sm:text-8xl font-mono font-bold tabular-nums tracking-tight">
            {formatTime(elapsedSec)}
          </div>
          <div className="text-slate-400 mt-1">elapsed time</div>
        </div>

        {/* Big stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Stat label="Distance" value={distanceMi.toFixed(2)} unit="mi" />
          <Stat label="Pace" value={formatPace(elapsedSec, distanceMi)} unit="/mi" />
          <Stat label="Calories" value={Math.round(calorieKcal).toString()} unit="kcal" />
          <Stat label="Steps (est)" value={steps.toLocaleString()} unit="" />
          <SpeedControl label="Speed" value={speedMph} onChange={setSpeedMph} step={0.1} min={0.5} max={12} unit="mph" />
          <SpeedControl label="Incline" value={inclinePct} onChange={setInclinePct} step={0.5} min={0} max={15} unit="%" />
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-8">
          {!running ? (
            <button
              onClick={() => setRunning(true)}
              className="flex-1 bg-green-600 hover:bg-green-500 transition text-white text-xl font-bold py-5 rounded-xl"
            >
              {elapsedSec > 0 ? "Resume" : "Start Workout"}
            </button>
          ) : (
            <button
              onClick={() => setRunning(false)}
              className="flex-1 bg-amber-500 hover:bg-amber-400 transition text-slate-900 text-xl font-bold py-5 rounded-xl"
            >
              Pause
            </button>
          )}
          <button
            onClick={reset}
            className="px-6 bg-slate-800 hover:bg-slate-700 transition text-slate-200 font-semibold rounded-xl"
          >
            Reset
          </button>
        </div>

        {/* Save to client log */}
        <div className="bg-slate-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3 text-slate-200">Save this workout to a client</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setSaveStatus("idle");
              }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <label htmlFor="weight">Weight</label>
              <input
                id="weight"
                type="number"
                value={weightLbs}
                onChange={(e) => setWeightLbs(Number(e.target.value) || 0)}
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span>lbs</span>
            </div>
            <button
              onClick={saveWorkout}
              disabled={!clientId || elapsedSec < 1 || saveStatus === "saving"}
              className="bg-blue-700 hover:bg-blue-600 transition text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-40"
            >
              {saveStatus === "saved" ? "Saved ✓" : saveStatus === "saving" ? "Saving..." : "Save Workout"}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-6 text-center">
          Speed &amp; incline are set to match your treadmill console — distance, pace, and calories update live from
          those values. Calorie estimate uses the ACSM walking formula and is approximate.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-slate-800 rounded-xl px-4 py-5 text-center">
      <div className="text-3xl sm:text-4xl font-bold tabular-nums">
        {value}
        {unit && <span className="text-lg text-slate-400 ml-1">{unit}</span>}
      </div>
      <div className="text-slate-400 text-xs mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function SpeedControl({
  label,
  value,
  onChange,
  step,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  unit: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  return (
    <div className="bg-slate-800 rounded-xl px-3 py-4 text-center">
      <div className="text-slate-400 text-xs mb-2 uppercase tracking-wide">{label}</div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onChange(clamp(value - step))}
          className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-xl font-bold leading-none"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <div className="text-2xl sm:text-3xl font-bold tabular-nums w-20">
          {value.toFixed(1)}
          <span className="text-sm text-slate-400 ml-1">{unit}</span>
        </div>
        <button
          onClick={() => onChange(clamp(value + step))}
          className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-xl font-bold leading-none"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
