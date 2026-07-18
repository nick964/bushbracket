# CDL Challengers Vegas - Bracket Guesser

A bracket-prediction app for an 8-team double-elimination Call of Duty playoff
(transcribed from `public/cod_bracket.jpeg`). Friends fill out the bracket and
submit under their name; an admin enters real results as games finish, which
locks picks, auto-scores everyone, and shows a live leaderboard.

## How it works

- **`/`** — pick a winner for all 10 remaining games (the four UB
  quarterfinals were already final and are shown as fixed results), enter your
  name, submit. One submission per name. Once the admin enters the first real
  result the page becomes read-only: leaderboard + everyone's brackets with
  correct/incorrect picks marked.
- **`/admin`** — password-protected. Click the real winner of each game;
  winners advance automatically. `undo` on any game clears it plus anything
  downstream that depended on it.
- **Scoring** — LB Round 1 = 1 pt, UB Semis / LB Quarters = 2, LB Semi = 3,
  UB Final / LB Final = 4, Grand Final = 8. Max 29. The leaderboard shows each
  player's current score and their max possible score given results so far.

The bracket structure (teams, matchups, advancement, points) lives in
[`lib/bracket.ts`](lib/bracket.ts) — edit that file if anything about the
tournament changes.

## Setup

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Var | What |
| --- | --- |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `FIREBASE_PROJECT_ID` | From your Firebase service account JSON |
| `FIREBASE_CLIENT_EMAIL` | From your Firebase service account JSON |
| `FIREBASE_PRIVATE_KEY` | From your Firebase service account JSON (keep the quotes; `\n` sequences are handled) |

To get the Firebase values: [Firebase console](https://console.firebase.google.com)
→ your project → **Project settings → Service accounts → Generate new private
key**. Also make sure **Firestore** is enabled for the project (Build →
Firestore Database → Create database). No security-rules changes are needed —
the app talks to Firestore server-side with admin credentials; clients never
touch Firebase directly.

Firestore data: a `submissions` collection (one doc per player) and a single
`bracket/state` doc holding real results.

> **No Firebase yet?** If the `FIREBASE_*` vars are unset the app automatically
> uses a local JSON file (`.data/db.json`). That's perfect for trying it out
> locally, but not durable on Vercel — set the Firebase vars in production.

### Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 (and http://localhost:3000/admin).

### Deploy to Vercel

```bash
npm i -g vercel   # if needed
vercel
```

or push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
Then add the four environment variables (Project → Settings → Environment
Variables), paste the private key including its `-----BEGIN/END-----` lines,
and redeploy. Done — share the URL with your friends before the first match
starts.
