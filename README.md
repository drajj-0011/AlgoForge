# ⚡ AlgoForge — AI Pathfinding Laboratory

**Watch algorithms think.** Draw a world, unleash five search algorithms on it,
benchmark them head-to-head, and let an analyst engine audit every decision
against ground truth — with every run persisted to a live database ledger.

![build](https://img.shields.io/badge/build-passing-a3e635)
![typescript](https://img.shields.io/badge/typescript-strict-22d3ee)
![engine deps](https://img.shields.io/badge/engine%20deps-zero-e879f9)
![license](https://img.shields.io/badge/license-MIT-a78bfa)

## What's inside

| Layer | Highlights |
| --- | --- |
| **Engine** (`src/lib`) | A*, Dijkstra, Greedy Best-First, BFS, DFS on weighted 4/8-way grids · binary min-heap · admissible heuristics (Manhattan, Euclidean, Octile, Chebyshev) · zero runtime dependencies |
| **World builder** | Recursive-division chambers, perfect mazes via backtracker, scatter fields with value-noise mud terrain · connectivity-guaranteed generation |
| **Canvas lab** | Single `requestAnimationFrame` loop · DPR capped at 2 · pointer painting with stroke interpolation · draggable source/target · live g/h/f inspection · PNG + JSON export |
| **Benchmark track** | All five algorithms raced on the exact board on screen — least work, cheapest path, fastest compute |
| **AI analyst** (`/api/analyze`) | Re-runs the suite server-side, audits optimality vs. Dijkstra ground truth, measures heuristic pruning · upgrades to GPT-4o-mini when `OPENAI_API_KEY` is set, degrades gracefully when it isn't |
| **Run ledger** | Official MongoDB driver · automatic seeding · search / filter / sort · expandable detail · undoable deletes · optional Drizzle + PostgreSQL fallback |

## Run locally with MongoDB

1. Start your local MongoDB server.
2. Install dependencies and create `.env` in the project root:

```bash
npm install
```

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=algoforge
```

3. Start Next.js:

```bash
npm run dev
```

Open `http://localhost:3000`. Collections and seed records are created
automatically — **no migration or `drizzle-kit push` is needed for MongoDB**.
Verify the active backend at `http://localhost:3000/api/health`.

## Optional PostgreSQL backend

If `MONGODB_URI` is absent, AlgoForge can use PostgreSQL through Drizzle:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

```bash
npx drizzle-kit push
npm run dev
```

Optional: set `OPENAI_API_KEY` to enable the neural analyst layer.

## Keyboard

`SPACE` visualize · `M` carve maze · `B` benchmark all · `C` clear path

## Architecture notes

- `runSearch()` is **pure and isomorphic** — the same function animates the
  canvas, races the benchmark, and audits runs on the server.
- The renderer computes the full trace synchronously, then *replays* it —
  animation speed never distorts the measured compute time.
- `src/db/runs.ts` is a shared persistence adapter. MongoDB takes priority when
  `MONGODB_URI` exists; otherwise Drizzle uses `DATABASE_URL`.
- Sound is a featherweight WebAudio synth; every tick/chime is bound to a
  visible event and one switch mutes everything.

MIT — build something worth starring.