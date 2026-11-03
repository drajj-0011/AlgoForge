import { isReachable } from "./algorithms";
import type { MazeId } from "./types";

function pick<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

/** Carve an L-shaped corridor so a board is always solvable. */
function carveL(walls: Uint8Array, cols: number, a: number, b: number): void {
  let x = a % cols;
  let y = (a / cols) | 0;
  const tx = b % cols;
  const ty = (b / cols) | 0;
  walls[y * cols + x] = 0;
  while (x !== tx) {
    x += x < tx ? 1 : -1;
    walls[y * cols + x] = 0;
  }
  while (y !== ty) {
    y += y < ty ? 1 : -1;
    walls[y * cols + x] = 0;
  }
}

function scatter(cols: number, rows: number, density: number): Uint8Array {
  const walls = new Uint8Array(cols * rows);
  for (let i = 0; i < walls.length; i++) {
    if (Math.random() < density) walls[i] = 1;
  }
  return walls;
}

function division(cols: number, rows: number): Uint8Array {
  const walls = new Uint8Array(cols * rows);
  const set = (x: number, y: number) => {
    walls[y * cols + x] = 1;
  };
  for (let x = 0; x < cols; x++) {
    set(x, 0);
    set(x, rows - 1);
  }
  for (let y = 0; y < rows; y++) {
    set(0, y);
    set(cols - 1, y);
  }

  const divide = (x: number, y: number, w: number, h: number): void => {
    if (w < 5 && h < 5) return;
    const horizontal = h > w ? true : w > h ? false : Math.random() < 0.5;
    if (horizontal && h >= 5) {
      const candidates: number[] = [];
      for (let wy = y + 1; wy <= y + h - 2; wy++) if (wy % 2 === 0) candidates.push(wy);
      if (candidates.length === 0) return;
      const wy = pick(candidates);
      const passages: number[] = [];
      for (let px = x; px < x + w; px++) if (px % 2 === 1) passages.push(px);
      const px = passages.length > 0 ? pick(passages) : x + ((Math.random() * w) | 0);
      for (let i = x; i < x + w; i++) if (i !== px) set(i, wy);
      divide(x, y, w, wy - y);
      divide(x, wy + 1, w, y + h - wy - 1);
    } else if (w >= 5) {
      const candidates: number[] = [];
      for (let wx = x + 1; wx <= x + w - 2; wx++) if (wx % 2 === 0) candidates.push(wx);
      if (candidates.length === 0) return;
      const wx = pick(candidates);
      const passages: number[] = [];
      for (let py = y; py < y + h; py++) if (py % 2 === 1) passages.push(py);
      const py = passages.length > 0 ? pick(passages) : y + ((Math.random() * h) | 0);
      for (let i = y; i < y + h; i++) if (i !== py) set(wx, i);
      divide(x, y, wx - x, h);
      divide(wx + 1, y, x + w - wx - 1, h);
    }
  };

  divide(1, 1, cols - 2, rows - 2);
  return walls;
}

function backtracker(cols: number, rows: number): Uint8Array {
  const walls = new Uint8Array(cols * rows).fill(1);
  const cx = Math.max(1, ((cols - 1) / 2) | 0);
  const cy = Math.max(1, ((rows - 1) / 2) | 0);
  const seen = new Uint8Array(cx * cy);
  const stack: number[] = [0];
  seen[0] = 1;
  walls[1 * cols + 1] = 0;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (stack.length > 0) {
    const u = stack[stack.length - 1];
    const ux = u % cx;
    const uy = (u / cx) | 0;
    const options = dirs.filter(([dx, dy]) => {
      const nx = ux + dx;
      const ny = uy + dy;
      return nx >= 0 && ny >= 0 && nx < cx && ny < cy && !seen[ny * cx + nx];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [dx, dy] = pick(options);
    const nx = ux + dx;
    const ny = uy + dy;
    seen[ny * cx + nx] = 1;
    walls[(2 * ny + 1) * cols + (2 * nx + 1)] = 0;
    walls[(2 * uy + 1 + dy) * cols + (2 * ux + 1 + dx)] = 0;
    stack.push(ny * cx + nx);
  }
  return walls;
}

/**
 * Generates a wall map and guarantees start → end connectivity by
 * carving a fallback corridor if the topology sealed the goal off.
 */
export function generateMaze(
  id: MazeId,
  cols: number,
  rows: number,
  start: number,
  end: number,
  density: number,
  diagonal: boolean,
): Uint8Array {
  let walls: Uint8Array;
  switch (id) {
    case "scatter":
      walls = scatter(cols, rows, density);
      break;
    case "division":
      walls = division(cols, rows);
      break;
    case "backtracker":
      walls = backtracker(cols, rows);
      break;
    default:
      walls = new Uint8Array(cols * rows);
  }
  // Keep the endpoints and their immediate breathing room clear.
  for (const p of [start, end]) {
    const px = p % cols;
    const py = (p / cols) | 0;
    walls[p] = 0;
    if (px > 0) walls[p - 1] = 0;
    if (px < cols - 1) walls[p + 1] = 0;
    if (py > 0) walls[p - cols] = 0;
    if (py < rows - 1) walls[p + cols] = 0;
  }
  if (id === "backtracker") {
    // Connect endpoints into the odd-lattice corridor network.
    for (const p of [start, end]) {
      const px = p % cols;
      const py = (p / cols) | 0;
      const ox = Math.min(cols - 2, Math.max(1, px % 2 === 1 ? px : px + 1));
      const oy = Math.min(rows - 2, Math.max(1, py % 2 === 1 ? py : py + 1));
      carveL(walls, cols, p, oy * cols + ox);
    }
  }
  if (!isReachable(cols, rows, walls, start, end, diagonal)) {
    carveL(walls, cols, start, end);
  }
  return walls;
}

/** Smooth-ish weighted terrain blobs (value noise on a coarse lattice). */
export function generateTerrain(
  cols: number,
  rows: number,
  amount: number,
): Uint8Array {
  const weights = new Uint8Array(cols * rows).fill(1);
  if (amount <= 0) return weights;
  const gw = Math.max(2, Math.ceil(cols / 7) + 1);
  const gh = Math.max(2, Math.ceil(rows / 7) + 1);
  const lattice = new Float64Array(gw * gh);
  for (let i = 0; i < lattice.length; i++) lattice[i] = Math.random();
  const sample = (x: number, y: number): number => {
    const fx = (x / cols) * (gw - 1);
    const fy = (y / rows) * (gh - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(gw - 1, x0 + 1);
    const y1 = Math.min(gh - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = lattice[y0 * gw + x0] * (1 - sx) + lattice[y0 * gw + x1] * sx;
    const b = lattice[y1 * gw + x0] * (1 - sx) + lattice[y1 * gw + x1] * sx;
    return a * (1 - sy) + b * sy;
  };
  const threshold = 1 - amount * 0.55;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (sample(x, y) > threshold) weights[y * cols + x] = 5;
    }
  }
  return weights;
}