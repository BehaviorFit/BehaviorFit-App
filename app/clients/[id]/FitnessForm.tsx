"use client";
// Form: Log Apple Watch fitness data (steps, exercise minutes)

import { useState } from "react";

export default function FitnessForm({ clientId, onSaved }: { clientId: number; onSaved: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [steps, setSteps] = useState("");
  const [exerciseMinutes, setExerciseMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/fitness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, date, steps, exerciseMinutes, notes }),
    });
    setSteps(""); setExerciseMinutes(""); setNotes(""); setDate(today);
    onSaved();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-4">
      <h2 className="font-semibold text-lg mb-4">Log Fitness Data</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Steps</label>
          <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} min="0"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 8500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Exercise Minutes</label>
          <input type="number" value={exerciseMinutes} onChange={(e) => setExerciseMinutes(e.target.value)} min="0"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 45" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional" />
        </div>
      </div>
      <button type="submit" disabled={saving}
        className="mt-4 bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800 transition disabled:opacity-50">
        {saving ? "Saving..." : "Save Entry"}
      </button>
    </form>
  );
}
