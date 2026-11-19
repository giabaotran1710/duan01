/* Cho AI tự đấu để cân bằng và đo tốc độ. Dùng: node tool/vodaithe-sim.js [số ván] */
const V = require('../game/vodaithe-core.js');
const AI = require('../game/vodaithe-ai.js');
const N = +process.argv[2] || 100;

function play(seed, lv0, lv1) {
  const s = V.newGame(seed);
  const ai = [AI.create(lv0, seed * 2 + 1), AI.create(lv1, seed * 2 + 2)];
  let guard = 0;
  while (s.winner === null && guard++ < 400) {
    const p = s.turn;
    const plan = ai[p].plan(V.viewFor(s, p));
    for (const a of plan) { if (!V.apply(s, a)) throw new Error('AI ra nước sai ' + JSON.stringify(a)); if (s.winner !== null) break; }
    const flips = s.log.filter(e => e.e === 'flip');
    ai[0].observe(flips, 0); ai[1].observe(flips, 1);
    s.log = [];
  }
  if (s.winner === null) throw new Error('kẹt');
  return s;
}
function match(lvA, lvB, n) {
  let a = 0, b = 0, rounds = 0, atkWins = 0, ms = 0;
  for (let i = 1; i <= n; i++) {
    const swap = i % 2 === 0;
    const t = Date.now();
    const s = play(i * 7919, swap ? lvB : lvA, swap ? lvA : lvB);
    ms += Date.now() - t;
    const wA = swap ? s.winner === 1 : s.winner === 0;
    if (wA) a++; else b++;
    rounds += s.round;
  }
  console.log(`mức ${lvA} - mức ${lvB}: ${a}-${b} (${Math.round(100 * a / n)}%), TB ${(rounds / n).toFixed(1)} vòng, ${(ms / n).toFixed(0)} ms/ván`);
}
match(0, 0, N); match(1, 0, N); match(2, 1, N); match(3, 2, N); match(2, 0, N); match(3, 0, Math.max(10, N / 2));
