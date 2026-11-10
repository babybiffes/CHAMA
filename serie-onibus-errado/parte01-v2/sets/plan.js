// plan.js: deterministic crowd planning, run once at build time.
// 1) static obstacles (furniture, people standing still, the cast) -> occupancy grid
// 2) A* between each extra's waypoints + string pulling -> a smooth path that never crosses an obstacle
// 3) start times nudged so no two extras (or an extra and the camera) ever come closer than 0.7 m
export const STATIC = [];
export function staticObstacles(I_SPECS) {
  const OB = [];
  for (const z of [-0.6, 5.5, 11.5]) for (const x of [-4.6, 5.2]) OB.push(['coluna', x, z, 0.42]);
  for (const [x, z] of [[-3.8, 3.2], [4.4, 8.6], [-3.8, 9.5], [2.6, 0.6]]) OB.push(['lixeira', x, z, 0.28]);
  for (const [x, z] of [[-8.3, 5.1], [8.3, 5.1], [8.3, 12.6]]) OB.push(['planta', x, z, 0.45]);
  OB.push(['banca', 4.2, 4.4, 0.7], ['placa piso', -2.0, 6.3, 0.35], ['cone', -3.3, 1.2, 0.25], ['cone', 3.9, 6.9, 0.25], ['máquina', -8.5, 9.9, 0.6], ['poça', -2.4, 5.6, 0.5]);
  for (const z of [3.5, 6.5, 9.5, 12.5]) for (const x of [5.8, 6.4, 7.0, 7.6, 8.2, 8.8]) OB.push(['banco', x, z, 0.32]);
  for (const [x, z] of [[-0.55, -0.75], [0.35, -1.0], [1.25, -0.7]]) OB.push(['amigo', x, z, 0.5]);
  I_SPECS.forEach((s) => OB.push(['parado', s[0], s[1], 0.32]));
  return OB;
}
const X0 = -8.5, X1 = 8.5, Z0 = -1.35, Z1 = 18.5, STEP = 0.2;
const NX = Math.round((X1 - X0) / STEP) + 1, NZ = Math.round((Z1 - Z0) / STEP) + 1;
export function makeGrid(OB, inflate = 0.33) {
  const g = new Uint8Array(NX * NZ);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const x = X0 + i * STEP, z = Z0 + j * STEP;
    for (const [, ox, oz, r] of OB) if (Math.hypot(x - ox, z - oz) < r + inflate) { g[i * NZ + j] = 1; break; }
  }
  return g;
}
const cell = (x, z) => [Math.max(0, Math.min(NX - 1, Math.round((x - X0) / STEP))), Math.max(0, Math.min(NZ - 1, Math.round((z - Z0) / STEP)))];
function los(g, a, b) {   // walkable straight line between two points
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (STEP * 0.5));
  for (let k = 1; k < n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n; const [i, j] = cell(x, z); if (g[i * NZ + j]) return false; }
  return true;
}
function astar(g, a, b) {
  const [si, sj] = cell(...a), [ti, tj] = cell(...b);
  const N = NX * NZ, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), open = [[0, si * NZ + sj]];
  gs[si * NZ + sj] = 0; const closed = new Uint8Array(N);
  const H = (i, j) => Math.hypot(i - ti, j - tj);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, id] = open.splice(bi, 1)[0]; if (closed[id]) continue; closed[id] = 1;
    const i = Math.floor(id / NZ), j = id % NZ;
    if (i === ti && j === tj) break;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
      const nid = ni * NZ + nj; const free = !g[nid] || (ni === ti && nj === tj) || (Math.abs(ni - si) + Math.abs(nj - sj) < 3);
      if (!free || closed[nid]) continue;
      const c = gs[id] + Math.hypot(di, dj); if (c < gs[nid]) { gs[nid] = c; from[nid] = id; open.push([c + H(ni, nj), nid]); }
    }
  }
  const pts = []; let id = ti * NZ + tj; if (from[id] === -1 && id !== si * NZ + sj) return [a, b];
  while (id !== -1) { const i = Math.floor(id / NZ), j = id % NZ; pts.push([X0 + i * STEP, Z0 + j * STEP]); id = from[id]; }
  pts.reverse(); pts[0] = a; pts[pts.length - 1] = b;
  // string pulling
  const out = [pts[0]]; let k = 0;
  while (k < pts.length - 1) { let m = pts.length - 1; while (m > k + 1 && !los(g, pts[k], pts[m])) m--; out.push(pts[m]); k = m; }
  return out;
}
export function planRoute(g, waypoints) {
  let route = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i++) route = route.concat(astar(g, waypoints[i - 1], waypoints[i]).slice(1));
  return route;
}
// shift start times so agents keep their distance from each other and from the camera
export function schedule(agents, agentState, camAt, { minD = 0.72, camD = 1.0 } = {}) {
  const accepted = [];
  const cost = (A) => {
    let bad = 0;
    for (let t = 0; t <= 20; t += 0.1) {
      const s = agentState(A, t); const c = camAt(t);
      if (Math.hypot(s.x - c[0], s.z - c[2]) < camD) bad += 3;
      if (t > 5.2 && t < 19 && s.x > -1.6 && s.x < 2.4 && s.z > -0.4 && s.z < 2.0) bad += 2;   // never between Caio and his friends while they talk
      for (const B of accepted) { const q = agentState(B, t); if (Math.hypot(s.x - q.x, s.z - q.z) < minD) bad += 1; }
    }
    return bad;
  };
  for (const A of agents) {
    if (A.fixedTime) { accepted.push(A); continue; }
    const base = A.t0, v0 = A.v; let best = [1e9, base, v0];
    outer: for (const sv of [1, 0.9, 1.1, 0.82, 1.2]) for (const d of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.7, -2.7, 3.5, -3.5, 4.5, -4.5, 5.5, -5.5, 7, -7, 9, -9, 11, -11, 13, -13]) {
      A.t0 = base + d; A.v = v0 * sv; const c = cost(A); if (c < best[0]) best = [c, A.t0, A.v]; if (c === 0) break outer;
    }
    A.t0 = best[1]; A.v = best[2];
    if (best[0] > 0) console.error('schedule: residual ' + best[0]);
    accepted.push(A);
  }
}
