// Runs the platform connectors and records the outcome on each SocialAccount row.
// Facebook and Instagram share one Meta connection (stored on the "facebook" row).
import { prisma } from "@/lib/prisma";
import { syncFacebook, syncInstagram } from "./connectors/meta";
import { syncLinkedIn } from "./connectors/linkedin";
import { PLATFORMS, type Platform } from "./platforms";

export type SyncOutcome = { platform: Platform; ok: boolean; message: string; warnings: string[] };

async function credentials(platform: Platform) {
  const row = await prisma.socialAccount.findUnique({
    where: { platform: platform === "instagram" ? "facebook" : platform },
  });
  return row?.externalId && row.accessToken ? { id: row.externalId, token: row.accessToken } : null;
}

export async function isConnected(platform: Platform) {
  return (await credentials(platform)) !== null;
}

export async function syncPlatform(platform: Platform): Promise<SyncOutcome> {
  const creds = await credentials(platform);
  if (!creds) return { platform, ok: false, message: "Not connected", warnings: [] };
  try {
    const run =
      platform === "linkedin" ? syncLinkedIn : platform === "facebook" ? syncFacebook : syncInstagram;
    const result = await run(creds.id, creds.token);
    await prisma.socialAccount.upsert({
      where: { platform },
      create: { platform, name: result.name, lastSyncedAt: new Date(), lastError: null },
      update: { name: result.name, lastSyncedAt: new Date(), lastError: null },
    });
    return { platform, ok: true, message: `Synced ${result.posts} posts`, warnings: result.warnings };
  } catch (e) {
    const message = (e as Error).message;
    await prisma.socialAccount.upsert({
      where: { platform },
      create: { platform, lastError: message },
      update: { lastError: message },
    });
    return { platform, ok: false, message, warnings: [] };
  }
}

export async function syncAll(only?: Platform) {
  const targets = only ? [only] : PLATFORMS;
  const out: SyncOutcome[] = [];
  for (const p of targets) {
    if (!only && !(await isConnected(p))) continue;
    out.push(await syncPlatform(p));
  }
  return out;
}
