"use client";
// Page: View a client's data and log new entries

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FitnessForm from "./FitnessForm";
import LiftForm from "./LiftForm";
import BiometricsForm from "./BiometricsForm";

type FitnessEntry = { id: number; date: string; steps: number | null; exerciseMinutes: number | null; notes: string | null };
type LiftEntry = { id: number; date: string; exercise: string; sets: number | null; reps: number | null; weight: number | null; unit: string; notes: string | null };
type BiometricsEntry = { id: number; date: string; bodyWeight: number | null; bodyWeightUnit: string; bodyFatPercent: number | null; waistInches: number | null; hipsInches: number | null; notes: string | null };

type Client = {
  id: number;
  name: string;
  email: string | null;
  notes: string | null;
  fitnessData: FitnessEntry[];
  lifts: LiftEntry[];
  biometrics: BiometricsEntry[];
};

type Tab = "fitness" | "lifts" | "biometrics";

export default function ClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<Tab>("fitness");

  async function loadClient() {
    const res = await fetch(`/api/clients/${clientId}`);
    if (!res.ok) { router.push("/clients"); return; }
    setClient(await res.json());
  }

  useEffect(() => { loadClient(); }, [clientId]);

  async function deleteEntry(type: string, id: number) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/${type}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadClient();
  }

  if (!client) return <p className="text-gray-500">Loading...</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "fitness", label: "Fitness (Apple Watch)" },
    { key: "lifts", label: "Lifts" },
    { key: "biometrics", label: "Biometrics" },
  ];

  return (
    <div>
      {/* Client header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push("/clients")} className="text-blue-700 hover:underline text-sm mb-1 block">
            &larr; All Clients
          </button>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.email && <p className="text-gray-500">{client.email}</p>}
          {client.notes && <p className="text-gray-600 text-sm mt-1">{client.notes}</p>}
        </div>

        {/* Export CSV links for Power BI */}
        <div className="text-right text-sm">
          <p className="font-medium text-gray-700 mb-1">Export for Power BI</p>
          <a href={`/api/export?type=fitness&clientId=${clientId}`} className="text-blue-700 hover:underline block">Fitness CSV</a>
          <a href={`/api/export?type=lifts&clientId=${clientId}`} className="text-blue-700 hover:underline block">Lifts CSV</a>
          <a href={`/api/export?type=biometrics&clientId=${clientId}`} className="text-blue-700 hover:underline block">Biometrics CSV</a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-medium rounded-t-lg transition ${
              tab === t.key ? "bg-blue-700 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "fitness" && (
        <div>
          <FitnessForm clientId={clientId} onSaved={loadClient} />
          <DataTable
            headers={["Date", "Steps", "Exercise Min", "Notes", ""]}
            rows={client.fitnessData.map((r) => [
              r.date.slice(0, 10),
              r.steps ?? "—",
              r.exerciseMinutes ?? "—",
              r.notes ?? "—",
              <DeleteBtn key={r.id} onClick={() => deleteEntry("fitness", r.id)} />,
            ])}
          />
        </div>
      )}

      {tab === "lifts" && (
        <div>
          <LiftForm clientId={clientId} onSaved={loadClient} />
          <DataTable
            headers={["Date", "Exercise", "Sets", "Reps", "Weight", "Notes", ""]}
            rows={client.lifts.map((r) => [
              r.date.slice(0, 10),
              r.exercise,
              r.sets ?? "—",
              r.reps ?? "—",
              r.weight ? `${r.weight} ${r.unit}` : "—",
              r.notes ?? "—",
              <DeleteBtn key={r.id} onClick={() => deleteEntry("lifts", r.id)} />,
            ])}
          />
        </div>
      )}

      {tab === "biometrics" && (
        <div>
          <BiometricsForm clientId={clientId} onSaved={loadClient} />
          <DataTable
            headers={["Date", "Body Weight", "Body Fat %", "Waist (in)", "Hips (in)", "Notes", ""]}
            rows={client.biometrics.map((r) => [
              r.date.slice(0, 10),
              r.bodyWeight ? `${r.bodyWeight} ${r.bodyWeightUnit}` : "—",
              r.bodyFatPercent ?? "—",
              r.waistInches ?? "—",
              r.hipsInches ?? "—",
              r.notes ?? "—",
              <DeleteBtn key={r.id} onClick={() => deleteEntry("biometrics", r.id)} />,
            ])}
          />
        </div>
      )}
    </div>
  );
}

// Simple reusable table component
function DataTable({ headers, rows }: { headers: string[]; rows: (string | number | React.ReactNode)[][] }) {
  if (rows.length === 0) return <p className="text-gray-500 mt-4">No entries yet.</p>;
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm bg-white rounded-xl shadow">
        <thead>
          <tr className="border-b">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-red-500 hover:text-red-700 text-xs font-medium">
      Delete
    </button>
  );
}
