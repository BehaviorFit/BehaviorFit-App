"use client";
// Page: Connect accounts, import CSV exports, and manage sample data

import { useCallback, useEffect, useState } from "react";
import { PLATFORMS, PLATFORM_INFO } from "@/lib/social/platforms";
import { Card, buttonClass, secondaryButtonClass, inputClass, timeAgo } from "../components/ui";

type Account = {
  platform: string;
  name: string | null;
  externalId: string | null;
  hasToken: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
};

function Status({ account }: { account?: Account }) {
  if (!account?.lastSyncedAt && !account?.lastError) return <span className="text-xs text-gray-500">Never synced</span>;
  return (
    <span className="text-xs">
      {account.lastSyncedAt && <span className="text-gray-600">{account.name ? `${account.name} · ` : ""}synced {timeAgo(account.lastSyncedAt)}</span>}
      {account.lastError && <span className="block text-red-700">⚠ {account.lastError}</span>}
    </span>
  );
}

function Connection({
  platform, title, idLabel, idHelp, accounts, onSaved, children,
}: {
  platform: "facebook" | "linkedin";
  title: string;
  idLabel: string;
  idHelp: string;
  accounts: Account[];
  onSaved: () => Promise<void>;
  children: React.ReactNode;
}) {
  const account = accounts.find((a) => a.platform === platform);
  const [externalId, setExternalId] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/social/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, externalId: externalId || account?.externalId, accessToken: token }),
    });
    setToken("");
    // Sync right away so you see whether the credentials work
    const targets = platform === "facebook" ? ["facebook", "instagram"] : ["linkedin"];
    const notes: string[] = [];
    for (const t of targets) {
      const res = await fetch("/api/social/sync", { method: "POST", body: JSON.stringify({ platform: t }) });
      const { results } = await res.json();
      for (const r of results) {
        notes.push(`${PLATFORM_INFO[r.platform as keyof typeof PLATFORM_INFO].label}: ${r.ok ? r.message : `failed — ${r.message}`}`);
        notes.push(...r.warnings);
      }
    }
    setNote(notes.join("\n"));
    await onSaved();
    setBusy(false);
  }

  async function disconnect() {
    await fetch("/api/social/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, disconnect: true }),
    });
    setNote(null);
    await onSaved();
  }

  const connected = Boolean(account?.hasToken && account.externalId);

  return (
    <Card title={title} action={
      connected ? (
        <span className="text-xs bg-green-50 text-green-800 rounded px-2 py-0.5">✓ Connected</span>
      ) : (
        <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">Not connected</span>
      )
    }>
      <div className="mb-3 space-y-1">
        {platform === "facebook" ? (
          <>
            <div className="flex gap-2 items-baseline"><span className="text-xs font-medium w-20">Facebook</span><Status account={account} /></div>
            <div className="flex gap-2 items-baseline"><span className="text-xs font-medium w-20">Instagram</span><Status account={accounts.find((a) => a.platform === "instagram")} /></div>
          </>
        ) : (
          <Status account={account} />
        )}
      </div>
      <details className="mb-4 text-sm text-gray-700">
        <summary className="cursor-pointer text-blue-700">How to get these</summary>
        <div className="mt-2 space-y-2">{children}</div>
      </details>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">{idLabel}</label>
          <input value={externalId} onChange={(e) => setExternalId(e.target.value)} className={inputClass}
            placeholder={account?.externalId ?? ""} />
          <p className="text-xs text-gray-500 mt-1">{idHelp}</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Access token</label>
          <input value={token} onChange={(e) => setToken(e.target.value)} type="password" className={inputClass}
            placeholder={account?.hasToken ? "•••••••• saved — paste a new one to replace" : ""} autoComplete="off" />
          <p className="text-xs text-gray-500 mt-1">Stored only in this app&apos;s local database on your computer.</p>
        </div>
        <div className="flex gap-2">
          <button disabled={busy || (!externalId && !account?.externalId)} className={buttonClass}>
            {busy ? "Connecting & syncing…" : "Save & sync"}
          </button>
          {connected && <button type="button" onClick={disconnect} className={secondaryButtonClass}>Disconnect</button>}
        </div>
        {note && <pre className="text-xs text-gray-700 bg-gray-50 rounded p-2 whitespace-pre-wrap">{note}</pre>}
      </form>
    </Card>
  );
}

function CsvImport({ onDone }: { onDone: () => Promise<void> }) {
  const [platform, setPlatform] = useState("linkedin");
  const [kind, setKind] = useState("posts");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const res = await fetch("/api/social/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, kind, csv: await file.text() }),
    });
    const r = await res.json();
    setResult(r.error ? `⚠ ${r.error}` : `Imported ${r.imported} rows${r.skipped ? ` (skipped ${r.skipped} without a valid date)` : ""}.`);
    await onDone();
  }

  return (
    <Card title="Import a CSV">
      <p className="text-sm text-gray-600 mb-3">
        Best path for <strong>LinkedIn</strong> (especially your personal profile, which the LinkedIn API doesn&apos;t cover) and for any
        history the APIs don&apos;t return. Re-importing the same file updates rows instead of duplicating them.
      </p>
      <details className="mb-4 text-sm text-gray-700">
        <summary className="cursor-pointer text-blue-700">Where to find the export</summary>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>LinkedIn Company Page:</strong> Page admin view → Analytics → Content → Export. Open the .xls file and save the post-level sheet as CSV.</li>
          <li><strong>LinkedIn personal profile:</strong> your profile → Analytics → Post impressions (or Content) → Export. Save the per-post sheet as CSV.</li>
          <li><strong>Followers over time:</strong> LinkedIn Analytics → Followers → Export, saved as CSV, imported as &quot;Follower counts&quot;.</li>
          <li><strong>Facebook / Instagram:</strong> Meta Business Suite → Insights → Content → Export data.</li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">
          Columns are matched by name (e.g. Date / Created date, Impressions / Views, Reactions / Likes, Comments, Reposts / Shares, Clicks, Saves, Post link, Post title).
          Only a date column is required.
        </p>
      </details>
      <form onSubmit={upload} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass}>
          {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_INFO[p].label}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
          <option value="posts">Post analytics</option>
          <option value="followers">Follower counts</option>
        </select>
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        <button disabled={!file} className={buttonClass}>Import</button>
      </form>
      {result && <p className="text-sm mt-3">{result}</p>}
    </Card>
  );
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [demoNote, setDemoNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/social/accounts");
    setAccounts(await res.json());
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);

  async function demo(method: "POST" | "DELETE") {
    await fetch("/api/social/demo", { method });
    setDemoNote(method === "POST" ? "Sample data loaded." : "Sample data cleared. Your real data is untouched.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connect &amp; Import</h1>
        <p className="text-sm text-gray-500">
          Everything stays on your computer. Connect what the APIs allow, import CSVs for the rest.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Connection platform="facebook" title="Facebook Page + Instagram (Meta)" idLabel="Facebook Page ID"
          idHelp="Instagram is found automatically through the Instagram account linked to this Page."
          accounts={accounts} onSaved={load}>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Make sure your Instagram is a <strong>Professional</strong> (Business or Creator) account and is linked to your BehaviorFit Facebook Page.</li>
            <li>Go to <a className="text-blue-700 underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a> and create an app (type: Business).</li>
            <li>Open the <strong>Graph API Explorer</strong>, select your app, and generate a User token with: <code className="text-xs">pages_show_list, pages_read_engagement, pages_read_user_content, read_insights, instagram_basic, instagram_manage_insights, instagram_manage_comments</code>. For DMs also add <code className="text-xs">pages_messaging, instagram_manage_messages</code>.</li>
            <li>Extend it to a long-lived token with the <strong>Access Token Debugger</strong> (&quot;Extend Access Token&quot;).</li>
            <li>In the Explorer, run <code className="text-xs">me/accounts</code> with that long-lived token. Copy your Page&apos;s <code className="text-xs">id</code> and its <code className="text-xs">access_token</code> (a Page token from a long-lived user token doesn&apos;t expire).</li>
            <li>Paste both here and click Save &amp; sync.</li>
          </ol>
          <p className="text-xs text-gray-500">While your app is in Development mode it works for accounts you admin — which is all you need here. No App Review required for your own Page.</p>
        </Connection>

        <Connection platform="linkedin" title="LinkedIn Company Page" idLabel="Organization ID"
          idHelp="The number in your Page admin URL: linkedin.com/company/12345678/admin"
          accounts={accounts} onSaved={load}>
          <p>
            LinkedIn only shares Company Page data through its <strong>Community Management API</strong>, which requires applying for access
            on a developer app. It does <strong>not</strong> provide personal-profile analytics or DMs to third-party apps.
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Create an app at <a className="text-blue-700 underline" href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer">linkedin.com/developers/apps</a> and verify it with your Company Page.</li>
            <li>Under Products, request <strong>Community Management API</strong>. Approval can take a while.</li>
            <li>Once approved, use the OAuth token generator with scopes <code className="text-xs">r_organization_social, rw_organization_admin</code> and paste the token here.</li>
          </ol>
          <p className="text-xs text-gray-500">Until then (or for your personal profile), use the CSV import below — it&apos;s a 2-minute weekly habit. Log LinkedIn DMs by hand in the Inbox.</p>
        </Connection>
      </div>

      <CsvImport onDone={load} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Sample data">
          <p className="text-sm text-gray-600 mb-3">Load realistic sample data to explore the dashboard, then clear it when your real data is in.</p>
          <div className="flex gap-2">
            <button onClick={() => demo("POST")} className={secondaryButtonClass}>Load sample data</button>
            <button onClick={() => demo("DELETE")} className={secondaryButtonClass}>Clear sample data</button>
          </div>
          {demoNote && <p className="text-sm mt-2">{demoNote}</p>}
        </Card>
        <Card title="Goals">
          <p className="text-sm text-gray-600 mb-2">Weekly posting goals (the criterion the dashboard measures against):</p>
          <ul className="text-sm space-y-1">
            {PLATFORMS.map((p) => (
              <li key={p}>{PLATFORM_INFO[p].label}: <strong>{PLATFORM_INFO[p].weeklyPostGoal}</strong> posts/week</li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2">Change them in <code>lib/social/platforms.ts</code>. Raise a goal only after 4 straight weeks at 100%.</p>
        </Card>
      </div>
    </div>
  );
}
