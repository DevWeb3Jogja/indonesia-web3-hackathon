import fs from "node:fs";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet, type GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import path from "node:path";
import type { StoredSubmission, Submission } from "./types";

const HEADERS = [
  "id",
  "createdAt",
  "updatedAt",
  "projectName",
  "tagline",
  "teamName",
  "tracks",
  "contractAddress",
  "network",
  "problemStatement",
  "solution",
  "description",
  "githubUrl",
  "demoVideoUrl",
  "demoUrl",
  "teamMembers",
  "extraLinks",
  "email",
  "logoUrl",
  "editCodeHash",
] as const;

const SHEET_TITLE = "submissions";

function hasGoogleEnv(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

// ---------- Google Sheets backend ----------

async function getSheet(): Promise<GoogleSpreadsheetWorksheet> {
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID as string, auth);
  await doc.loadInfo();
  let sheet = doc.sheetsByTitle[SHEET_TITLE];
  if (!sheet) {
    sheet = await doc.addSheet({ title: SHEET_TITLE, headerValues: [...HEADERS] });
  } else {
    try {
      await sheet.loadHeaderRow();
      if (!sheet.headerValues || sheet.headerValues.length === 0) {
        await sheet.setHeaderRow([...HEADERS]);
      }
    } catch {
      await sheet.setHeaderRow([...HEADERS]);
    }
  }
  return sheet;
}

function rowToSubmission(row: Record<string, string>): StoredSubmission {
  const parse = <T>(v: string, fallback: T): T => {
    try {
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    id: row.id ?? "",
    createdAt: row.createdAt ?? "",
    updatedAt: row.updatedAt ?? "",
    projectName: row.projectName ?? "",
    tagline: row.tagline ?? "",
    teamName: row.teamName ?? "",
    tracks: parse(row.tracks, []),
    contractAddress: row.contractAddress ?? "",
    network: (row.network as StoredSubmission["network"]) || "bsc",
    problemStatement: row.problemStatement ?? "",
    solution: row.solution ?? "",
    description: row.description ?? "",
    githubUrl: row.githubUrl ?? "",
    demoVideoUrl: row.demoVideoUrl ?? "",
    demoUrl: row.demoUrl ?? "",
    teamMembers: parse(row.teamMembers, []),
    extraLinks: parse(row.extraLinks, []),
    email: row.email ?? "",
    logoUrl: row.logoUrl ?? "",
    editCodeHash: row.editCodeHash ?? "",
  };
}

function submissionToRow(s: StoredSubmission): Record<string, string> {
  return {
    id: s.id,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    projectName: s.projectName,
    tagline: s.tagline,
    teamName: s.teamName,
    tracks: JSON.stringify(s.tracks),
    contractAddress: s.contractAddress,
    network: s.network,
    problemStatement: s.problemStatement,
    solution: s.solution,
    description: s.description,
    githubUrl: s.githubUrl,
    demoVideoUrl: s.demoVideoUrl,
    demoUrl: s.demoUrl,
    teamMembers: JSON.stringify(s.teamMembers),
    extraLinks: JSON.stringify(s.extraLinks),
    email: s.email,
    logoUrl: s.logoUrl,
    editCodeHash: s.editCodeHash,
  };
}

// ---------- Local file fallback (development tanpa credentials) ----------

const LOCAL_PATH = path.join(process.cwd(), ".data", "submissions.json");

function localRead(): StoredSubmission[] {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PATH, "utf8"));
  } catch {
    return [];
  }
}

function localWrite(items: StoredSubmission[]) {
  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(items, null, 2));
}

// ---------- Public API ----------

export async function listSubmissions(): Promise<StoredSubmission[]> {
  if (!hasGoogleEnv()) return localRead();
  const sheet = await getSheet();
  const rows = await sheet.getRows();
  return rows.map((r) => rowToSubmission(r.toObject() as Record<string, string>));
}

export async function getSubmission(id: string): Promise<StoredSubmission | null> {
  const all = await listSubmissions();
  return all.find((s) => s.id === id) ?? null;
}

export async function createSubmission(s: StoredSubmission): Promise<void> {
  if (!hasGoogleEnv()) {
    const items = localRead();
    items.push(s);
    localWrite(items);
    return;
  }
  const sheet = await getSheet();
  await sheet.addRow(submissionToRow(s));
}

export async function updateSubmission(s: StoredSubmission): Promise<boolean> {
  if (!hasGoogleEnv()) {
    const items = localRead();
    const i = items.findIndex((x) => x.id === s.id);
    if (i === -1) return false;
    items[i] = s;
    localWrite(items);
    return true;
  }
  const sheet = await getSheet();
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.get("id") === s.id);
  if (!row) return false;
  row.assign(submissionToRow(s));
  await row.save();
  return true;
}

/** Strip secret fields before sending to client */
export function toPublic(s: StoredSubmission): Submission {
  const { editCodeHash, email, ...rest } = s;
  return { ...rest, email: "" } as Submission;
}
