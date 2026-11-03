import type { AlgoId, HeuristicId, MazeId } from "./types";

export interface AlgoMeta {
  id: AlgoId;
  name: string;
  short: string;
  color: string;
  dim: string;
  tag: string;
  time: string;
  space: string;
  optimal: string;
  weighted: boolean;
  informed: boolean;
  blurb: string;
  pseudocode: string[];
}

export const ALGO_IDS: AlgoId[] = ["astar", "dijkstra", "greedy", "bfs", "dfs"];

export const ALGOS: Record<AlgoId, AlgoMeta> = {
  astar: {
    id: "astar",
    name: "A* Search",
    short: "A*",
    color: "#22d3ee",
    dim: "rgba(34,211,238,0.14)",
    tag: "informed · optimal",
    time: "O(E log V)",
    space: "O(V)",
    optimal: "Yes — with an admissible heuristic",
    weighted: true,
    informed: true,
    blurb:
      "Dijkstra with foresight. Ranks the frontier by f = g + h — cost so far plus an admissible estimate of what remains — so the search leans toward the goal instead of flooding every direction.",
    pseudocode: [
      "open ← min-heap { (f(start), start) }",
      "g[start] ← 0",
      "while open not empty:",
      "  u ← pop-min(open)",
      "  if u = goal: return reconstruct(u)",
      "  for each neighbor v of u:",
      "    t ← g[u] + cost(u, v)",
      "    if t < g[v]:",
      "      g[v] ← t;  parent[v] ← u",
      "      push(open, (t + h(v), v))",
    ],
  },
  dijkstra: {
    id: "dijkstra",
    name: "Dijkstra",
    short: "DIJ",
    color: "#fbbf24",
    dim: "rgba(251,191,36,0.14)",
    tag: "uninformed · optimal",
    time: "O(E log V)",
    space: "O(V)",
    optimal: "Yes — always, on non-negative costs",
    weighted: true,
    informed: false,
    blurb:
      "The uniform-cost flood. Expands the cheapest frontier node every step, guaranteeing the true shortest path even through weighted terrain — but it explores in every direction equally.",
    pseudocode: [
      "open ← min-heap { (0, start) }",
      "dist[start] ← 0",
      "while open not empty:",
      "  u ← pop-min(open)",
      "  if u = goal: return reconstruct(u)",
      "  for each neighbor v of u:",
      "    t ← dist[u] + cost(u, v)",
      "    if t < dist[v]:",
      "      dist[v] ← t;  parent[v] ← u",
      "      push(open, (t, v))",
    ],
  },
  greedy: {
    id: "greedy",
    name: "Greedy Best-First",
    short: "GBF",
    color: "#60a5fa",
    dim: "rgba(96,165,250,0.14)",
    tag: "informed · fast · risky",
    time: "O(E log V)",
    space: "O(V)",
    optimal: "No — can be lured into detours",
    weighted: true,
    informed: true,
    blurb:
      "Pure ambition: ranks the frontier only by the heuristic h, sprinting at the goal. Blazing fast on open boards, but walls and mud traps can bait it into badly suboptimal paths.",
    pseudocode: [
      "open ← min-heap { (h(start), start) }",
      "while open not empty:",
      "  u ← pop-min(open)",
      "  if u = goal: return reconstruct(u)",
      "  for each neighbor v of u:",
      "    if v unseen:",
      "      seen[v] ← true;  parent[v] ← u",
      "      push(open, (h(v), v))",
    ],
  },
  bfs: {
    id: "bfs",
    name: "Breadth-First",
    short: "BFS",
    color: "#a78bfa",
    dim: "rgba(167,139,250,0.14)",
    tag: "uninformed · fewest steps",
    time: "O(V + E)",
    space: "O(V)",
    optimal: "Fewest steps — ignores terrain cost",
    weighted: false,
    informed: false,
    blurb:
      "The ripple. Expands in perfect rings of increasing depth, so it always finds the fewest-step route. Blind to terrain weights — it will happily wade through mud to save one step.",
    pseudocode: [
      "queue ← [start];  seen[start] ← true",
      "while queue not empty:",
      "  u ← dequeue(queue)",
      "  if u = goal: return reconstruct(u)",
      "  for each neighbor v of u:",
      "    if v unseen:",
      "      seen[v] ← true;  parent[v] ← u",
      "      enqueue(queue, v)",
    ],
  },
  dfs: {
    id: "dfs",
    name: "Depth-First",
    short: "DFS",
    color: "#fb7185",
    dim: "rgba(251,113,133,0.14)",
    tag: "uninformed · wanderer",
    time: "O(V + E)",
    space: "O(V)",
    optimal: "No — takes the first route it finds",
    weighted: false,
    informed: false,
    blurb:
      "The cave diver. Plunges down one corridor until it dead-ends, then backtracks. Finds a path with tiny memory overhead, but that path can be comically long. Great for carving mazes, terrible for shipping routes.",
    pseudocode: [
      "stack ← [start]",
      "while stack not empty:",
      "  u ← pop(stack)",
      "  if u seen: continue",
      "  seen[u] ← true",
      "  if u = goal: return reconstruct(u)",
      "  for each neighbor v of u:",
      "    if v unseen:",
      "      parent[v] ← u",
      "      push(stack, v)",
    ],
  },
};

export const HEURISTICS: { id: HeuristicId; name: string; formula: string }[] = [
  { id: "manhattan", name: "Manhattan", formula: "|dx| + |dy|" },
  { id: "euclidean", name: "Euclidean", formula: "√(dx² + dy²)" },
  { id: "octile", name: "Octile", formula: "max + (√2−1)·min" },
  { id: "chebyshev", name: "Chebyshev", formula: "max(|dx|, |dy|)" },
];

export const MAZES: { id: MazeId; name: string }[] = [
  { id: "division", name: "Recursive Division" },
  { id: "backtracker", name: "Perfect Maze" },
  { id: "scatter", name: "Scatter Field" },
];

export const MAZE_LABEL: Record<string, string> = {
  none: "Open field",
  division: "Recursive division",
  backtracker: "Perfect maze",
  scatter: "Scatter field",
  custom: "Hand-drawn",
};

export const WEIGHT_COST = 5;

/** Maps the 0–100 speed slider to replayed expansions per second. */
export const speedToRate = (s: number): number =>
  Math.round(8 * Math.pow(1.075, s));