// Server-side persistence. Uses Firestore when Firebase credentials are set,
// otherwise falls back to a local JSON file (.data/db.json) so the app runs
// locally without any setup. The fallback is NOT durable on Vercel — set the
// Firebase env vars in production.

import fs from "node:fs/promises";
import path from "node:path";
import type { Decided, Submission } from "./logic";
import type { LcqDecided, LcqSubmission } from "./lcq";
import { BASE_POT, BUY_IN, LCQ_BASE_POT } from "./pot";

/** A submission plus its storage key (the submitter's Clerk user id). */
export type StoredSubmission = Submission & { id: string };

export type StoredLcqSubmission = LcqSubmission & { id: string };

/** Persistence for the LCQ side event — same shape as the main event. */
export interface LcqStore {
  getResults(): Promise<LcqDecided>;
  setResults(results: LcqDecided): Promise<void>;
  getManualLock(): Promise<boolean>;
  setManualLock(locked: boolean): Promise<void>;
  getSubmissions(): Promise<StoredLcqSubmission[]>;
  /** Returns false if a submission with this id already exists. */
  addSubmission(id: string, sub: LcqSubmission): Promise<boolean>;
  deleteSubmission(id: string): Promise<void>;
  /** Mark whether a player has paid the buy-in. No-op if the id is unknown. */
  setPaid(id: string, paid: boolean): Promise<void>;
  /** Current prize pot in whole dollars (defaults to LCQ_BASE_POT, i.e. $0). */
  getPot(): Promise<number>;
  setPot(amount: number): Promise<void>;
  /** LCQ buy-in in whole dollars, adjustable by the admin (defaults to BUY_IN). */
  getBuyIn(): Promise<number>;
  setBuyIn(amount: number): Promise<void>;
  getCompleted(): Promise<boolean>;
  setCompleted(completed: boolean): Promise<void>;
}

export interface Store {
  lcq: LcqStore;
  getResults(): Promise<Decided>;
  setResults(results: Decided): Promise<void>;
  /** Admin-set lock, independent of whether any results exist. */
  getManualLock(): Promise<boolean>;
  setManualLock(locked: boolean): Promise<void>;
  getSubmissions(): Promise<StoredSubmission[]>;
  /** Returns false if a submission with this id already exists. */
  addSubmission(id: string, sub: Submission): Promise<boolean>;
  deleteSubmission(id: string): Promise<void>;
  /** Mark whether a player has paid the buy-in. No-op if the id is unknown. */
  setPaid(id: string, paid: boolean): Promise<void>;
  /** Current prize pot in whole dollars (defaults to BASE_POT). */
  getPot(): Promise<number>;
  setPot(amount: number): Promise<void>;
  /** Admin-set flag hiding the pot banners on every page (EWC and LCQ). */
  getPotsHidden(): Promise<boolean>;
  setPotsHidden(hidden: boolean): Promise<void>;
  /** Admin-set flag: tournament is over, show the winners. */
  getCompleted(): Promise<boolean>;
  setCompleted(completed: boolean): Promise<void>;
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

// LCQ state lives in its own doc (bracket/lcq) and collection
// (lcq-submissions), fully independent of the main event.
const firestoreLcqStore: LcqStore = {
  async getResults() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/lcq").get();
    return (snap.data()?.results as LcqDecided) ?? {};
  },
  async setResults(results) {
    const db = await firestoreDb();
    await db
      .doc("bracket/lcq")
      .set({ results, updatedAt: Date.now() }, { merge: true });
  },
  async getManualLock() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/lcq").get();
    return Boolean(snap.data()?.lockedManually);
  },
  async setManualLock(locked) {
    const db = await firestoreDb();
    await db
      .doc("bracket/lcq")
      .set({ lockedManually: locked, updatedAt: Date.now() }, { merge: true });
  },
  async getSubmissions() {
    const db = await firestoreDb();
    const snap = await db.collection("lcq-submissions").get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as LcqSubmission) }));
  },
  async addSubmission(id, sub) {
    const db = await firestoreDb();
    try {
      // create() fails if the doc exists — atomic duplicate check
      await db.collection("lcq-submissions").doc(id).create(sub);
      return true;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 6 /* ALREADY_EXISTS */) {
        return false;
      }
      throw err;
    }
  },
  async deleteSubmission(id) {
    const db = await firestoreDb();
    await db.collection("lcq-submissions").doc(id).delete();
  },
  async setPaid(id, paid) {
    const db = await firestoreDb();
    try {
      // update() (not set) so a stale id can't create a picks-less doc
      await db.collection("lcq-submissions").doc(id).update({ paid });
    } catch (err: unknown) {
      if ((err as { code?: number }).code !== 5 /* NOT_FOUND */) throw err;
    }
  },
  async getPot() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/lcq").get();
    const pot = snap.data()?.pot;
    return typeof pot === "number" ? pot : LCQ_BASE_POT;
  },
  async setPot(amount) {
    const db = await firestoreDb();
    await db
      .doc("bracket/lcq")
      .set({ pot: amount, updatedAt: Date.now() }, { merge: true });
  },
  async getBuyIn() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/lcq").get();
    const buyIn = snap.data()?.buyIn;
    return typeof buyIn === "number" ? buyIn : BUY_IN;
  },
  async setBuyIn(amount) {
    const db = await firestoreDb();
    await db
      .doc("bracket/lcq")
      .set({ buyIn: amount, updatedAt: Date.now() }, { merge: true });
  },
  async getCompleted() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/lcq").get();
    return Boolean(snap.data()?.completed);
  },
  async setCompleted(completed) {
    const db = await firestoreDb();
    await db
      .doc("bracket/lcq")
      .set({ completed, updatedAt: Date.now() }, { merge: true });
  },
};

const firestoreStore: Store = {
  lcq: firestoreLcqStore,
  async getResults() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/state").get();
    return (snap.data()?.results as Decided) ?? {};
  },
  async setResults(results) {
    const db = await firestoreDb();
    await db
      .doc("bracket/state")
      .set({ results, updatedAt: Date.now() }, { merge: true });
  },
  async getManualLock() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/state").get();
    return Boolean(snap.data()?.lockedManually);
  },
  async setManualLock(locked) {
    const db = await firestoreDb();
    await db
      .doc("bracket/state")
      .set({ lockedManually: locked, updatedAt: Date.now() }, { merge: true });
  },
  async getSubmissions() {
    const db = await firestoreDb();
    const snap = await db.collection("submissions").get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Submission) }));
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
  async deleteSubmission(id) {
    const db = await firestoreDb();
    await db.collection("submissions").doc(id).delete();
  },
  async setPaid(id, paid) {
    const db = await firestoreDb();
    try {
      // update() (not set) so a stale id can't create a picks-less doc
      await db.collection("submissions").doc(id).update({ paid });
    } catch (err: unknown) {
      if ((err as { code?: number }).code !== 5 /* NOT_FOUND */) throw err;
    }
  },
  async getPot() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/state").get();
    const pot = snap.data()?.pot;
    return typeof pot === "number" ? pot : BASE_POT;
  },
  async setPot(amount) {
    const db = await firestoreDb();
    await db
      .doc("bracket/state")
      .set({ pot: amount, updatedAt: Date.now() }, { merge: true });
  },
  async getPotsHidden() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/state").get();
    return Boolean(snap.data()?.potsHidden);
  },
  async setPotsHidden(hidden) {
    const db = await firestoreDb();
    await db
      .doc("bracket/state")
      .set({ potsHidden: hidden, updatedAt: Date.now() }, { merge: true });
  },
  async getCompleted() {
    const db = await firestoreDb();
    const snap = await db.doc("bracket/state").get();
    return Boolean(snap.data()?.completed);
  },
  async setCompleted(completed) {
    const db = await firestoreDb();
    await db
      .doc("bracket/state")
      .set({ completed, updatedAt: Date.now() }, { merge: true });
  },
};

// ---------- Local file fallback ----------

const DB_PATH = path.join(process.cwd(), ".data", "db.json");

interface FileDb {
  results: Decided;
  submissions: Record<string, Submission>;
  lockedManually?: boolean;
  pot?: number;
  potsHidden?: boolean;
  completed?: boolean;
  lcq?: {
    results: LcqDecided;
    submissions: Record<string, LcqSubmission>;
    lockedManually?: boolean;
    pot?: number;
    buyIn?: number;
    completed?: boolean;
  };
}

function lcqSection(db: FileDb): NonNullable<FileDb["lcq"]> {
  return (db.lcq ??= { results: {}, submissions: {} });
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

const fileLcqStore: LcqStore = {
  async getResults() {
    return lcqSection(await readFileDb()).results;
  },
  async setResults(results) {
    const db = await readFileDb();
    lcqSection(db).results = results;
    await writeFileDb(db);
  },
  async getManualLock() {
    return Boolean(lcqSection(await readFileDb()).lockedManually);
  },
  async setManualLock(locked) {
    const db = await readFileDb();
    lcqSection(db).lockedManually = locked;
    await writeFileDb(db);
  },
  async getSubmissions() {
    const lcq = lcqSection(await readFileDb());
    return Object.entries(lcq.submissions).map(([id, sub]) => ({ id, ...sub }));
  },
  async addSubmission(id, sub) {
    const db = await readFileDb();
    const lcq = lcqSection(db);
    if (lcq.submissions[id]) return false;
    lcq.submissions[id] = sub;
    await writeFileDb(db);
    return true;
  },
  async deleteSubmission(id) {
    const db = await readFileDb();
    delete lcqSection(db).submissions[id];
    await writeFileDb(db);
  },
  async setPaid(id, paid) {
    const db = await readFileDb();
    const lcq = lcqSection(db);
    if (!lcq.submissions[id]) return;
    lcq.submissions[id].paid = paid;
    await writeFileDb(db);
  },
  async getPot() {
    const lcq = lcqSection(await readFileDb());
    return typeof lcq.pot === "number" ? lcq.pot : LCQ_BASE_POT;
  },
  async setPot(amount) {
    const db = await readFileDb();
    lcqSection(db).pot = amount;
    await writeFileDb(db);
  },
  async getBuyIn() {
    const lcq = lcqSection(await readFileDb());
    return typeof lcq.buyIn === "number" ? lcq.buyIn : BUY_IN;
  },
  async setBuyIn(amount) {
    const db = await readFileDb();
    lcqSection(db).buyIn = amount;
    await writeFileDb(db);
  },
  async getCompleted() {
    return Boolean(lcqSection(await readFileDb()).completed);
  },
  async setCompleted(completed) {
    const db = await readFileDb();
    lcqSection(db).completed = completed;
    await writeFileDb(db);
  },
};

const fileStore: Store = {
  lcq: fileLcqStore,
  async getResults() {
    return (await readFileDb()).results;
  },
  async setResults(results) {
    const db = await readFileDb();
    db.results = results;
    await writeFileDb(db);
  },
  async getManualLock() {
    return Boolean((await readFileDb()).lockedManually);
  },
  async setManualLock(locked) {
    const db = await readFileDb();
    db.lockedManually = locked;
    await writeFileDb(db);
  },
  async getSubmissions() {
    const db = await readFileDb();
    return Object.entries(db.submissions).map(([id, sub]) => ({ id, ...sub }));
  },
  async addSubmission(id, sub) {
    const db = await readFileDb();
    if (db.submissions[id]) return false;
    db.submissions[id] = sub;
    await writeFileDb(db);
    return true;
  },
  async deleteSubmission(id) {
    const db = await readFileDb();
    delete db.submissions[id];
    await writeFileDb(db);
  },
  async setPaid(id, paid) {
    const db = await readFileDb();
    if (!db.submissions[id]) return;
    db.submissions[id].paid = paid;
    await writeFileDb(db);
  },
  async getPot() {
    const db = await readFileDb();
    return typeof db.pot === "number" ? db.pot : BASE_POT;
  },
  async setPot(amount) {
    const db = await readFileDb();
    db.pot = amount;
    await writeFileDb(db);
  },
  async getPotsHidden() {
    return Boolean((await readFileDb()).potsHidden);
  },
  async setPotsHidden(hidden) {
    const db = await readFileDb();
    db.potsHidden = hidden;
    await writeFileDb(db);
  },
  async getCompleted() {
    return Boolean((await readFileDb()).completed);
  },
  async setCompleted(completed) {
    const db = await readFileDb();
    db.completed = completed;
    await writeFileDb(db);
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
