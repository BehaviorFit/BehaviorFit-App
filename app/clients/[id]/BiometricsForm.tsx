"use client";
// Form: Log biometric measurements

import { useState } from "react";

export default function BiometricsForm({ clientId, onSaved }: { clientId: number; onSaved: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [bodyWeight, setBodyWeight] = useState("");
  const [bodyWeightUnit, setBodyWeightUnit] = useState("lbs");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [waistInches, setWaistInches] = useState("");
  const [hipsInches, setHipsInches] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, date, bodyWeight, bodyWeightUnit, bodyFatPercent, waistInches, hipsInches, notes }),
    });
    setBodyWeight(""); setBodyFatPercent(""); setWaistInches(""); setHipsInches(""); setNotes(""); setDate(today);
    onSaved();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-4">
      <h2 className="font-semibold text-lg mb-4">Log Biometrics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Body Weight</label>
          <div className="flex gap-2">
            <input type="number" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)} min="0" step="0.1"
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 175" />
            <select value={bodyWeightUnit} onChange={(e) => setBodyWeightUnit(e.target.value)}
              className="border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>lbs</option>
              <option>kg</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Body Fat %</label>
          <input type="number" value={bodyFatPercent} onChange={(e) => setBodyFatPercent(e.target.value)} min="0" max="100" step="0.1"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 22.5" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Waist (inches)</label>
          <input type="number" value={waistInches} onChange={(e) => setWaistInches(e.target.value)} min="0" step="0.25"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 34" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hips (inches)</label>
          <input type="number" value={hipsInches} onChange={(e) => setHipsInches(e.target.value)} min="0" step="0.25"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 40" />
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
        {saving ? "Saving..." : "Save Biometrics"}
      </button>
    </form>
  );
}
