"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SetupPage() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/apple-health/token")
      .then((r) => r.json())
      .then((d) => setToken(d.token));
  }, []);

  async function regenerate() {
    if (!confirm("Regenerate token? Your existing Shortcut will stop working until you update it.")) return;
    setRegenerating(true);
    const r = await fetch("/api/apple-health/token", { method: "POST" });
    const d = await r.json();
    setToken(d.token);
    setRegenerating(false);
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  const syncUrl = `${origin}/api/apple-health/sync`;

  const shortcutBody = JSON.stringify({
    date: "<<DATE>>",
    steps: "<<STEPS>>",
    activeCalories: "<<ACTIVE_CALORIES>>",
    exerciseMinutes: "<<EXERCISE_MINUTES>>",
    standHours: "<<STAND_HOURS>>",
    restingHeartRate: "<<RESTING_HR>>",
    avgHeartRate: "<<AVG_HR>>",
    flightsClimbed: "<<FLIGHTS>>",
    distanceMiles: "<<DISTANCE_MILES>>",
    sleepHours: "<<SLEEP_HOURS>>",
  }, null, 2);

  return (
    <div className="max-w-2xl">
      <Link href="/health" className="text-blue-700 hover:underline text-sm mb-4 block">
        ← Health Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-1">Auto-Sync Setup</h1>
      <p className="text-gray-500 mb-8">
        Set up an iOS Shortcut to automatically push your Apple Health data every day — no manual uploads needed.
      </p>

      {/* Step 1: API Token */}
      <Step number={1} title="Your API Token">
        <p className="text-gray-600 text-sm mb-3">
          This token authenticates your iPhone with the app. Keep it private.
        </p>
        {token ? (
          <div className="flex gap-2 items-center">
            <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm font-mono break-all">
              {token}
            </code>
            <button
              onClick={() => copy(token, "token")}
              className="shrink-0 bg-blue-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-800 transition"
            >
              {copied === "token" ? "Copied!" : "Copy"}
            </button>
          </div>
        ) : (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        )}
        <button
          onClick={regenerate}
          disabled={regenerating}
          className="mt-2 text-xs text-gray-400 hover:text-red-600 transition"
        >
          {regenerating ? "Regenerating…" : "Regenerate token"}
        </button>
      </Step>

      {/* Step 2: Sync URL */}
      <Step number={2} title="Your Sync URL">
        <p className="text-gray-600 text-sm mb-3">
          This is the endpoint your Shortcut will POST data to.
        </p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm font-mono break-all">
            {syncUrl}
          </code>
          <button
            onClick={() => copy(syncUrl, "url")}
            className="shrink-0 bg-blue-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-800 transition"
          >
            {copied === "url" ? "Copied!" : "Copy"}
          </button>
        </div>
      </Step>

      {/* Step 3: Build the Shortcut */}
      <Step number={3} title="Build the Shortcut on your iPhone">
        <p className="text-gray-600 text-sm mb-4">
          Open the <strong>Shortcuts</strong> app and create a new shortcut with these actions in order:
        </p>

        <ol className="space-y-3 text-sm text-gray-700">
          <ShortcutAction index={1} action='Format "Current Date" → Date Format: ISO 8601 (YYYY-MM-DD)' note='Save as variable "Today"' />
          <ShortcutAction index={2} action='Find Health Samples: Steps → Sum' note='Time range: Yesterday (or Today). Save as "StepsVal"' />
          <ShortcutAction index={3} action='Find Health Samples: Active Energy Burned → Sum' note='Save as "CaloriesVal"' />
          <ShortcutAction index={4} action='Find Health Samples: Apple Exercise Time → Sum' note='Save as "ExerciseVal"' />
          <ShortcutAction index={5} action='Find Health Samples: Apple Stand Hour → Count' note='Save as "StandVal"' />
          <ShortcutAction index={6} action='Find Health Samples: Resting Heart Rate → Average' note='Save as "RestingHRVal"' />
          <ShortcutAction index={7} action='Find Health Samples: Heart Rate → Average' note='Save as "AvgHRVal"' />
          <ShortcutAction index={8} action='Find Health Samples: Flights Climbed → Sum' note='Save as "FlightsVal"' />
          <ShortcutAction index={9} action='Find Health Samples: Walking + Running Distance → Sum' note='Convert to miles if needed. Save as "DistanceVal"' />
          <ShortcutAction index={10} action='Find Health Samples: Sleep Analysis (Asleep) → Sum (hours)' note='Save as "SleepVal"' />
          <ShortcutAction index={11}
            action='Get Contents of URL'
            note={`URL: ${syncUrl}\nMethod: POST\nHeaders: Authorization = Bearer YOUR_TOKEN\nBody: JSON (see below)`}
          />
        </ol>

        <div className="mt-4 bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">JSON Body for "Get Contents of URL":</p>
          <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre">{`{
  "date":             TODAY_VARIABLE,
  "steps":            StepsVal,
  "activeCalories":   CaloriesVal,
  "exerciseMinutes":  ExerciseVal,
  "standHours":       StandVal,
  "restingHeartRate": RestingHRVal,
  "avgHeartRate":     AvgHRVal,
  "flightsClimbed":   FlightsVal,
  "distanceMiles":    DistanceVal,
  "sleepHours":       SleepVal
}`}</pre>
          <p className="text-xs text-gray-400 mt-2">Replace each value with the variable you saved in the previous actions.</p>
        </div>
      </Step>

      {/* Step 4: Automate */}
      <Step number={4} title="Make it run automatically every day">
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-gray-400 font-mono">1.</span>
            <span>In the <strong>Shortcuts</strong> app, tap the <strong>Automation</strong> tab (clock icon).</span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400 font-mono">2.</span>
            <span>Tap <strong>+</strong> → <strong>Time of Day</strong>.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400 font-mono">3.</span>
            <span>Set the time to <strong>9:00 AM daily</strong> (or any time after midnight so yesterday's data is complete).</span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400 font-mono">4.</span>
            <span>Tap <strong>Next</strong> → <strong>Run Shortcut</strong> → select your new shortcut.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-400 font-mono">5.</span>
            <span>Disable <strong>"Ask Before Running"</strong> so it runs silently in the background.</span>
          </li>
        </ol>
        <p className="mt-3 text-xs text-gray-400">
          Your Apple Health data will now sync automatically every morning with no manual steps.
        </p>
      </Step>

      {/* Step 5: Verify */}
      <Step number={5} title="Test it works">
        <p className="text-gray-600 text-sm mb-3">
          Run the Shortcut manually once to verify data appears on the dashboard.
        </p>
        <Link
          href="/health"
          className="inline-block bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition"
        >
          View Dashboard →
        </Link>
      </Step>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="ml-10">{children}</div>
    </div>
  );
}

function ShortcutAction({ index, action, note }: { index: number; action: string; note: string }) {
  return (
    <li className="bg-gray-50 rounded-lg p-3">
      <span className="font-semibold text-blue-700">Action {index}: </span>
      <span className="font-medium">{action}</span>
      {note && (
        <p className="text-gray-400 text-xs mt-1 whitespace-pre-line">{note}</p>
      )}
    </li>
  );
}
