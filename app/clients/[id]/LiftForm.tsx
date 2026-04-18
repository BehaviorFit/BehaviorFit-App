"use client";
// Form: Log a strength training lift

import { useState } from "react";

// Common exercises — feel free to add more here
const EXERCISES = [
  "Squat", "Deadlift", "Bench Press", "Overhead Press", "Barbell Row",
  "Pull-Up", "Lat Pulldown", "Leg Press", "Lunge", "Hip Thrust",
  "Bicep Curl", "Tricep Pushdown", "RDL", "Other",
];

export default function LiftForm({ clientId, onSaved }: { clientId: number; onSaved: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [customExercise, setCustomExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState("lbs");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const finalExercise = exercise === "Other" ? customExercise : exercise;
    await fetch("/api/lifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, date, exercise: finalExercise, sets, reps, weight, unit, notes }),
    });
    setSets(""); setReps(""); setWeight(""); setNotes(""); setDate(today);
    onSaved();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-4">
      <h2 className="font-semibold text-lg mb-4">Log Lift</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Exercise *</label>
          <select value={exercise} onChange={(e) => setExercise(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {EXERCISES.map((ex) => <option key={ex}>{ex}</option>)}
          </select>
        </div>
        {exercise === "Other" && (
          <div>
            <label className="block text-sm font-medium mb-1">Exercise Name *</label>
            <input value={customExercise} onChange={(e) => setCustomExercise(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter exercise name" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Sets</label>
          <input type="number" value={sets} onChange={(e) => setSets(e.target.value)} min="0"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 3" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reps</label>
          <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} min="0"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 10" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Weight</label>
          <div className="flex gap-2">
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} min="0" step="0.5"
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 135" />
            <select value={unit} onChange={(e) => setUnit(e.target.value)}
              className="border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>lbs</option>
              <option>kg</option>
            </select>
          </div>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional (e.g. PR, form cues, difficulty)" />
        </div>
      </div>
      <button type="submit" disabled={saving}
        className="mt-4 bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800 transition disabled:opacity-50">
        {saving ? "Saving..." : "Save Lift"}
      </button>
    </form>
  );
}
