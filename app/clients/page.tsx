"use client";
// Page: List all clients and add a new client

import { useEffect, useState } from "react";
import Link from "next/link";

type Client = { id: number; name: string; email: string | null; notes: string | null };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadClients() {
    const res = await fetch("/api/clients");
    setClients(await res.json());
  }

  useEffect(() => { loadClients(); }, []);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, notes }),
    });
    setName(""); setEmail(""); setNotes("");
    await loadClients();
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Clients</h1>

      {/* Add client form */}
      <form onSubmit={addClient} className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="font-semibold text-lg mb-4">Add New Client</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email (optional)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="jane@example.com"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Goals, diagnosis, anything relevant..."
              rows={2}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Client"}
        </button>
      </form>

      {/* Client list */}
      {clients.length === 0 ? (
        <p className="text-gray-500">No clients yet. Add one above.</p>
      ) : (
        <div className="grid gap-3">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="bg-white rounded-xl shadow px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition"
            >
              <div>
                <div className="font-semibold text-lg">{c.name}</div>
                {c.email && <div className="text-gray-500 text-sm">{c.email}</div>}
              </div>
              <span className="text-blue-700 font-medium">View &rarr;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
