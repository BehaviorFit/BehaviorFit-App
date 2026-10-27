"use client";
// Page: Unified inbox — DMs, comments, and mentions across all platforms, triaged

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PLATFORMS, PLATFORM_INFO, RESPONSE_GOAL_HOURS } from "@/lib/social/platforms";
import { CATEGORY_PRIORITY, type MessageCategory } from "@/lib/social/classify";
import {
  Card, PlatformBadge, CATEGORY_STYLE, buttonClass, secondaryButtonClass, inputClass, timeAgo,
} from "../components/ui";

type Message = {
  id: number;
  platform: string;
  kind: string;
  author: string | null;
  text: string;
  permalink: string | null;
  receivedAt: string;
  status: string;
  category: MessageCategory;
};

const FILTERS = [
  { id: "needs", label: "Needs reply" },
  { id: "overdue", label: `Overdue (>${RESPONSE_GOAL_HOURS}h)` },
  { id: "lead", label: "Leads" },
  { id: "all", label: "All" },
  { id: "handled", label: "Handled" },
];

function isOverdue(m: Message) {
  return (
    m.status === "new" &&
    (m.category === "lead" || m.category === "question") &&
    Date.now() - new Date(m.receivedAt).getTime() > RESPONSE_GOAL_HOURS * 36e5
  );
}

function Inbox() {
  const params = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState(params.get("filter") ?? "needs");
  const [platform, setPlatform] = useState(params.get("platform") ?? "");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ platform: "linkedin", kind: "dm", author: "", text: "", permalink: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/social/messages");
    setMessages(await res.json());
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);

  async function update(id: number, data: Partial<Pick<Message, "status" | "category">>) {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...data } : m)));
    await fetch(`/api/social/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function logMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!form.text.trim()) return;
    await fetch("/api/social/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ ...form, author: "", text: "", permalink: "" });
    setShowForm(false);
    await load();
  }

  const visible = useMemo(() => {
    return messages
      .filter((m) => !platform || m.platform === platform)
      .filter((m) => {
        if (filter === "needs") return m.status === "new" && m.category !== "spam";
        if (filter === "overdue") return isOverdue(m);
        if (filter === "lead") return m.category === "lead";
        if (filter === "handled") return m.status !== "new";
        return true;
      })
      .sort((a, b) =>
        filter === "needs" || filter === "overdue"
          ? CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category] ||
            new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
          : new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
  }, [messages, filter, platform]);

  const counts = {
    needs: messages.filter((m) => m.status === "new" && m.category !== "spam").length,
    overdue: messages.filter(isOverdue).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-gray-500">
            {counts.needs} need a reply · {counts.overdue} overdue. Leads and questions sort to the top, oldest first.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={secondaryButtonClass}>
          {showForm ? "Cancel" : "+ Log a message"}
        </button>
      </div>

      {showForm && (
        <Card title="Log a message by hand">
          <p className="text-xs text-gray-500 mb-3">
            For things the APIs can&apos;t pull in — like LinkedIn DMs. It&apos;ll be triaged and tracked like any other message.
          </p>
          <form onSubmit={logMessage} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={inputClass}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_INFO[p].label}</option>)}
            </select>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={inputClass}>
              <option value="dm">Direct message</option>
              <option value="comment">Comment</option>
              <option value="mention">Mention</option>
            </select>
            <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={inputClass} placeholder="From (name)" />
            <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className={`${inputClass} sm:col-span-3`} rows={2} placeholder="Message text" required />
            <input value={form.permalink} onChange={(e) => setForm({ ...form, permalink: e.target.value })} className={`${inputClass} sm:col-span-2`} placeholder="Link (optional)" />
            <button className={buttonClass}>Save</button>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              filter === f.id ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}>
            {f.label}
          </button>
        ))}
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="ml-auto border rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_INFO[p].label}</option>)}
        </select>
      </div>

      <Card>
        {visible.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Inbox zero here. 🎯</p>
        ) : (
          <ul className="divide-y">
            {visible.map((m) => (
              <li key={m.id} className="py-3 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <PlatformBadge platform={m.platform} />
                    <span className="text-xs text-gray-500 uppercase">{m.kind}</span>
                    <span className="text-sm font-medium">{m.author ?? "Unknown"}</span>
                    <span className={`text-xs ${isOverdue(m) ? "text-red-700 font-medium" : "text-gray-500"}`}>
                      {isOverdue(m) && "⚠ "}{timeAgo(m.receivedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{m.text}</p>
                </div>
                <div className="flex sm:flex-col gap-2 items-start sm:items-end shrink-0">
                  <select value={m.category} onChange={(e) => update(m.id, { category: e.target.value as MessageCategory })}
                    className={`text-xs rounded px-2 py-1 border-0 ${CATEGORY_STYLE[m.category]}`} aria-label="Category">
                    {Object.keys(CATEGORY_STYLE).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex gap-1">
                    {m.permalink && (
                      <a href={m.permalink} target="_blank" rel="noreferrer" className={secondaryButtonClass}>Open ↗</a>
                    )}
                    {m.status === "new" ? (
                      <>
                        <button onClick={() => update(m.id, { status: "replied" })} className={secondaryButtonClass}>Replied</button>
                        <button onClick={() => update(m.id, { status: "done" })} className={secondaryButtonClass}>Dismiss</button>
                      </>
                    ) : (
                      <button onClick={() => update(m.id, { status: "new" })} className={secondaryButtonClass}>
                        {m.status === "replied" ? "Replied ✓" : "Done ✓"} · Reopen
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Inbox />
    </Suspense>
  );
}
