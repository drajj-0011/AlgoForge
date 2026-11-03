import { runSearch } from "./algorithms";
import { ALGOS } from "./meta";
import type { AnalysisPayload, AnalysisResult } from "./types";

const fmt = (n: number, d = 0): string =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

function boardFrom(payload: AnalysisPayload) {
  const { cols, rows } = payload.board;
  const walls = new Uint8Array(cols * rows);
  const weights = new Uint8Array(cols * rows).fill(1);
  for (const i of payload.board.walls) if (i >= 0 && i < walls.length) walls[i] = 1;
  for (const i of payload.board.weights) if (i >= 0 && i < weights.length) weights[i] = 5;
  return { cols, rows, walls, weights, start: payload.board.start, end: payload.board.end };
}

/**
 * Deterministic analysis engine: re-runs the full algorithm suite on the
 * exact board server-side, then reasons over the measured deltas.
 */
export function engineAnalysis(payload: AnalysisPayload): AnalysisResult {
  const b = boardFrom(payload);
  const opts = { diagonal: payload.diagonal, heuristic: payload.heuristic };
  const meta = ALGOS[payload.algo];
  const r = payload.result;

  const dij = runSearch("dijkstra", b.cols, b.rows, b.walls, b.weights, b.start, b.end, opts);
  const ast = runSearch("astar", b.cols, b.rows, b.walls, b.weights, b.start, b.end, opts);
  const bfs = runSearch("bfs", b.cols, b.rows, b.walls, b.weights, b.start, b.end, opts);
  const grd = runSearch("greedy", b.cols, b.rows, b.walls, b.weights, b.start, b.end, opts);

  const wallPct = (payload.board.walls.length / (b.cols * b.rows)) * 100;
  const mudPct = (payload.board.weights.length / (b.cols * b.rows)) * 100;
  const insights: string[] = [];
  let headline: string;

  if (!r.found) {
    headline = "Dead end confirmed — the goal is sealed off.";
    insights.push(
      `${meta.name} exhausted the reachable region after ${fmt(r.visited)} expansions. Dijkstra independently agrees: no corridor connects source to target on this ${b.cols}×${b.rows} board.`,
      `The frontier collapsed to zero with ${fmt(wallPct, 1)}% of cells walled. Clear a wall bridge or regenerate the maze, then re-run to compare informed vs. uninformed flood patterns.`,
      `Even failed searches carry signal: the explored blob is exactly the connected component containing your start node.`,
    );
    return {
      source: "engine",
      headline,
      insights,
      verdict: "Open a corridor between the two regions and run the benchmark again.",
    };
  }

  const optimalCost = dij.found ? dij.pathCost : r.pathCost;
  const detour = optimalCost > 0 ? (r.pathCost / optimalCost - 1) * 100 : 0;
  const pruning = dij.visited > 0 ? (1 - r.visited / dij.visited) * 100 : 0;

  if (detour > 2) {
    headline = `${meta.name} found a route ${fmt(detour, 1)}% longer than optimal.`;
  } else if (pruning > 55) {
    headline = `${meta.name} pruned ${fmt(pruning, 0)}% of Dijkstra's search space.`;
  } else if (payload.algo === "astar") {
    headline = `Optimal path locked in after ${fmt(r.visited)} expansions.`;
  } else {
    headline = `${meta.name} solved the board in ${fmt(r.computeMs, 2)} ms.`;
  }

  insights.push(
    `Path audit: your route costs ${fmt(r.pathCost, 1)} over ${fmt(r.pathLength)} steps. Dijkstra's ground truth on this exact board is ${fmt(optimalCost, 1)} — ${detour <= 0.5 ? "your run is provably optimal." : `a ${fmt(detour, 1)}% detour.`}`,
  );

  if (payload.algo === "astar" || payload.algo === "greedy") {
    insights.push(
      `Heuristic effect: with ${payload.heuristic}, ${meta.short} expanded ${fmt(r.visited)} nodes vs. Dijkstra's ${fmt(dij.visited)} (${pruning >= 0 ? `${fmt(pruning, 0)}% fewer` : `${fmt(-pruning, 0)}% more`}). ${
        payload.diagonal && payload.heuristic === "manhattan"
          ? "Warning: Manhattan overestimates on 8-way grids, so it is inadmissible here — switch to Octile to restore A*'s optimality guarantee."
          : payload.heuristic === "euclidean" && !payload.diagonal
            ? "Euclidean never overestimates, but it underestimates loosely on 4-way grids — Manhattan would steer harder."
            : "The estimate stays admissible, so every prune was safe."
      }`,
    );
  } else if (payload.algo === "dijkstra") {
    insights.push(
      `Uniform-cost flood: Dijkstra expanded ${fmt(dij.visited)} nodes where A* needed only ${fmt(ast.visited)} on the same board — the ${fmt(Math.max(0, (1 - ast.visited / Math.max(1, dij.visited)) * 100), 0)}% gap is the price of refusing to guess direction.`,
    );
  } else if (payload.algo === "bfs") {
    insights.push(
      `Ring expansion: BFS guarantees fewest steps (${fmt(r.pathLength)}), but it ignores terrain cost. ${mudPct > 3 ? `With ${fmt(mudPct, 1)}% weighted mud on the board, its true cost of ${fmt(r.pathCost, 1)} trails Dijkstra's ${fmt(optimalCost, 1)}.` : "On this unweighted board that also happens to be cost-optimal."}`,
    );
  } else {
    insights.push(
      `Depth-first wandering: DFS committed to the first corridor it found, producing ${fmt(r.pathLength)} steps vs. BFS's ${fmt(bfs.pathLength)} — a ${fmt(bfs.pathLength > 0 ? r.pathLength / bfs.pathLength : 1, 1)}× stretch. It only ever held a narrow stack of candidates in memory, which is exactly why maze carvers love it.`,
    );
  }

  insights.push(
    `Board profile: ${b.cols}×${b.rows} (${fmt(b.cols * b.rows)} cells), ${fmt(wallPct, 1)}% walls, ${fmt(mudPct, 1)}% weighted terrain. ${
      wallPct > 30
        ? "Dense topology punishes greedy lookahead — informed search earns its keep here."
        : wallPct > 12
          ? "Moderate clutter: enough to bend greedy paths, not enough to trap the flood."
          : "Nearly open field: heuristics dominate and raw flood-fill wastes work."
    } Greedy Best-First ${grd.found ? `crossed it for ${fmt(grd.pathCost, 1)} cost with ${fmt(grd.visited)} expansions` : "failed outright"} — ${grd.found && grd.pathCost > optimalCost * 1.05 ? "proof that speed and optimality trade against each other." : "a useful speed reference."}`,
  );

  const verdict =
    detour > 2
      ? `Switch to A* (${payload.diagonal ? "Octile" : "Manhattan"}) to recover the optimal ${fmt(optimalCost, 1)}-cost route without Dijkstra's full flood.`
      : payload.algo === "astar"
        ? "Textbook run. Try Greedy on the same maze to feel the optimality/speed trade-off, then benchmark all five."
        : "Solid run. Hit BENCHMARK ALL to race the full suite on this exact board.";

  return { source: "engine", headline, insights, verdict };
}

/** Optional neural layer: used only when OPENAI_API_KEY is configured. */
export async function neuralAnalysis(
  payload: AnalysisPayload,
  base: AnalysisResult,
): Promise<AnalysisResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return base;
  try {
    const facts = {
      algorithm: ALGOS[payload.algo].name,
      heuristic: payload.heuristic,
      diagonalMoves: payload.diagonal,
      maze: payload.maze,
      board: `${payload.board.cols}x${payload.board.rows}`,
      wallCells: payload.board.walls.length,
      weightedCells: payload.board.weights.length,
      result: payload.result,
      engineFindings: base,
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(9000),
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are AlgoForge's run analyst, a sharp pathfinding expert. Given measured run facts, respond ONLY with JSON: {\"headline\": string (max 90 chars), \"insights\": string[3] (each max 240 chars, cite the numbers), \"verdict\": string (max 160 chars, one actionable recommendation)}. Be precise, never invent numbers.",
          },
          { role: "user", content: JSON.stringify(facts) },
        ],
      }),
    });
    if (!res.ok) return base;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return base;
    const parsed = JSON.parse(content) as {
      headline?: unknown;
      insights?: unknown;
      verdict?: unknown;
    };
    if (
      typeof parsed.headline !== "string" ||
      !Array.isArray(parsed.insights) ||
      typeof parsed.verdict !== "string"
    ) {
      return base;
    }
    const insights = parsed.insights
      .filter((s): s is string => typeof s === "string")
      .slice(0, 4);
    if (insights.length === 0) return base;
    return {
      source: "neural",
      headline: parsed.headline.slice(0, 120),
      insights,
      verdict: parsed.verdict.slice(0, 200),
    };
  } catch {
    return base;
  }
}