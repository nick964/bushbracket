// Server-side persistence. Uses Firestore when Firebase credentials are set,
// otherwise falls back to a local JSON file (.data/db.json) so the app runs
// locally without any setup. The fallback is NOT durable on Vercel — set the
// Firebase env vars in production.

import fs from "node:fs/promises";
import path from "node:path";
import type { Decided, Submission } from "./logic";

export interface Store {
  getResults(): Promise<Decided>;
  setResults(results: Decided): Promise<void>;
  getSubmissions(): Promise<Submission[]>;
  /** Returns false if a submission with this id already exists. */
  addSubmission(id: string, sub: Submission): Promise<boolean>;
}

function hasFirebaseEnv(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

// ---------- Firestore ----------

async function firestoreDb() {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel stores the key with literal \n sequences
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

const firestoreStore: Store = {
  async getResults() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/state").get();
    return (snap.data()?.results as Decided) ?? {};
  },
  async setResults(results) {
    const db = await firestoreDb();
    await db.doc("bracket/state").set({ results, updatedAt: Date.now() });
  },
  async getSubmissions() {
    const db = await firestoreDb();
    const snap = await db.collection("submissions").get();
    return snap.docs.map((d) => d.data() as Submission);
  },
  async addSubmission(id, sub) {
    const db = await firestoreDb();
    try {
      // create() fails if the doc exists — atomic duplicate-name check
      await db.collection("submissions").doc(id).create(sub);
      return true;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 6 /* ALREADY_EXISTS */) {
        return false;
      }
      throw err;
    }
  },
};

// ---------- Local file fallback ----------

const DB_PATH = path.join(process.cwd(), ".data", "db.json");

interface FileDb {
  results: Decided;
  submissions: Record<string, Submission>;
}

async function readFileDb(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf8")) as FileDb;
  } catch {
    return { results: {}, submissions: {} };
  }
}

async function writeFileDb(db: FileDb): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

const fileStore: Store = {
  async getResults() {
    return (await readFileDb()).results;
  },
  async setResults(results) {
    const db = await readFileDb();
    db.results = results;
    await writeFileDb(db);
  },
  async getSubmissions() {
    return Object.values((await readFileDb()).submissions);
  },
  async addSubmission(id, sub) {
    const db = await readFileDb();
    if (db.submissions[id]) return false;
    db.submissions[id] = sub;
    await writeFileDb(db);
    return true;
  },
};

let warned = false;

export function getStore(): Store {
  if (hasFirebaseEnv()) return firestoreStore;
  if (!warned) {
    console.warn(
      "[store] Firebase env vars not set — using local file store (.data/db.json). " +
        "Fine for local dev; set FIREBASE_* vars in production."
    );
    warned = true;
  }
  return fileStore;
}
