import { staticObstacles } from './plan.js';
// check.js: simulate 0..20 s and report every overlap between extras, furniture, the cast and the camera.
export function checkCollisions(st, camAt) {
  const D = st.debug, out = [];
  const OB = staticObstacles(D.I_SPECS);
  const agents = D.walkers.map((w, i) => ['figurante ' + (i + 1), w]).concat([['chutador', D.KICK]]);
  const seen = new Set();
  for (let t = 0; t <= 20; t += 0.1) {
    const P = agents.map(([n, a]) => [n, D.agentState(a, t)]);
    const cam = camAt(t);
    for (const [n, s] of P) {
      if (s.x < -8.5 || s.x > 8.6) push(`${n} fora da parede x=${s.x.toFixed(1)}`, t);
      for (const [on, ox, oz, r] of OB) { const d = Math.hypot(s.x - ox, s.z - oz); if (d < r + 0.2) push(`${n} atravessa ${on} (${ox},${oz}) d=${d.toFixed(2)}`, t); }
      const dc = Math.hypot(s.x - cam[0], s.z - cam[2]); if (dc < 0.7) push(`${n} atravessa a câmera d=${dc.toFixed(2)}`, t);
    }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const d = Math.hypot(P[i][1].x - P[j][1].x, P[i][1].z - P[j][1].z); if (d < 0.6) push(`${P[i][0]} x ${P[j][0]} d=${d.toFixed(2)}`, t); }
  }
  function push(msg, t) { const key = msg.replace(/d=.*$/, '').replace(/x=.*$/, ''); if (seen.has(key)) return; seen.add(key); out.push(`t=${t.toFixed(1)} ${msg}`); }
  return out;
}
