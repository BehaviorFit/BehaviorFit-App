import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Track which tabs have had their headers verified this server instance
const initializedTabs = new Set<string>();

function getSheets(): sheets_v4.Sheets | null {
  if (!SERVICE_ACCOUNT_KEY || !SPREADSHEET_ID) return null;
  try {
    const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return google.sheets({ version: "v4", auth });
  } catch {
    return null;
  }
}

async function ensureHeaders(
  sheets: sheets_v4.Sheets,
  tab: string,
  headers: string[]
) {
  if (initializedTabs.has(tab)) return;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${tab}!A1`,
  });
  if (!res.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID!,
      range: `${tab}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  }
  initializedTabs.add(tab);
}

async function appendRow(tab: string, headers: string[], values: (string | number | null | undefined)[]) {
  const sheets = getSheets();
  if (!sheets) return;
  await ensureHeaders(sheets, tab, headers);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values.map((v) => v ?? "")] },
  });
}

export async function appendLift(data: {
  date: Date;
  clientName: string;
  exercise: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  unit: string;
  notes: string | null;
}) {
  const headers = ["Date", "Client", "Exercise", "Sets", "Reps", "Weight", "Unit", "Notes"];
  const values = [
    data.date.toISOString().split("T")[0],
    data.clientName,
    data.exercise,
    data.sets,
    data.reps,
    data.weight,
    data.unit,
    data.notes,
  ];
  await appendRow("Lifts", headers, values);
}

export async function appendBiometrics(data: {
  date: Date;
  clientName: string;
  bodyWeight: number | null;
  bodyWeightUnit: string;
  bodyFatPercent: number | null;
  waistInches: number | null;
  hipsInches: number | null;
  notes: string | null;
}) {
  const headers = ["Date", "Client", "Body Weight", "Unit", "Body Fat %", "Waist (in)", "Hips (in)", "Notes"];
  const values = [
    data.date.toISOString().split("T")[0],
    data.clientName,
    data.bodyWeight,
    data.bodyWeightUnit,
    data.bodyFatPercent,
    data.waistInches,
    data.hipsInches,
    data.notes,
  ];
  await appendRow("Biometrics", headers, values);
}

export async function appendFitnessData(data: {
  date: Date;
  clientName: string;
  steps: number | null;
  exerciseMinutes: number | null;
  notes: string | null;
}) {
  const headers = ["Date", "Client", "Steps", "Exercise Minutes", "Notes"];
  const values = [
    data.date.toISOString().split("T")[0],
    data.clientName,
    data.steps,
    data.exerciseMinutes,
    data.notes,
  ];
  await appendRow("Fitness Data", headers, values);
}
