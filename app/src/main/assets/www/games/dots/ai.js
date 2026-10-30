'use strict';
/* =========================================================
   DOTS & BOXES  —  AI engine  (self-contained: runs in a Web Worker or on the main thread)
   Levels: 0 Easy · 1 Medium · 2 Hard · 3 Expert
   Expert = iterative-deepening alpha-beta (transposition table, capture / safe-move / sacrifice ordering)
            + exact "loony endgame" evaluation (chains & loops dynamic programming, all-but-two / all-but-four
              double-dealing, hard-hearted handouts) + safe-move parity rollouts (long-chain-rule fight).
   ========================================================= */
function createAI() {
  let R = 0, C = 0, B = 0, E = 0;
  let eb0, eb1, bedges, zLo, zHi, mv, mk, vis, visStamp = 0;
  let drawn, sides, remaining, hLo = 0, hHi = 0;
  let tt = new Map(), dpMemo = new Map();
  let nodes = 0, aborted = false, deadline = 0, heur = false;
  const INF = 1e9;

  function setup(r, c) {
    if (r === R && c === C && eb0) return;
    R = r; C = c; B = R * C; const HN = (R + 1) * C; E = HN + R * (C + 1);
    eb0 = new Int16Array(E).fill(-1); eb1 = new Int16Array(E).fill(-1); bedges = new Int16Array(B * 4);
    for (let rr = 0; rr <= R; rr++) for (let cc = 0; cc < C; cc++) {
      const e = rr * C + cc; if (rr > 0) eb0[e] = (rr - 1) * C + cc; if (rr < R) { if (eb0[e] < 0) eb0[e] = rr * C + cc; else eb1[e] = rr * C + cc; }
    }
    for (let rr = 0; rr < R; rr++) for (let cc = 0; cc <= C; cc++) {
      const e = HN + rr * (C + 1) + cc; if (cc > 0) eb0[e] = rr * C + cc - 1; if (cc < C) { if (eb0[e] < 0) eb0[e] = rr * C + cc; else eb1[e] = rr * C + cc; }
    }
    for (let rr = 0; rr < R; rr++) for (let cc = 0; cc < C; cc++) {
      const b = rr * C + cc;
      bedges[b * 4] = rr * C + cc; bedges[b * 4 + 1] = (rr + 1) * C + cc;
      bedges[b * 4 + 2] = HN + rr * (C + 1) + cc; bedges[b * 4 + 3] = HN + rr * (C + 1) + cc + 1;
    }
    let s = 123456789; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s >>> 6; };
    zLo = new Int32Array(E); zHi = new Int32Array(E);
    for (let i = 0; i < E; i++) { zLo[i] = rnd() & 0x3FFFFFF; zHi[i] = (rnd() ^ (rnd() << 3)) & 0x3FFFFFF; }
    mv = []; mk = []; for (let i = 0; i <= E + 2; i++) { mv.push(new Int16Array(E)); mk.push(new Int16Array(E)); }
    vis = new Int32Array(B); visStamp = 0; dpMemo = new Map(); tt = new Map();
  }
  function load(drawnArr) {
    drawn = new Uint8Array(E); sides = new Uint8Array(B); remaining = 0; hLo = 0; hHi = 0;
    for (let e = 0; e < E; e++) {
      if (drawnArr[e]) { drawn[e] = 1; hLo ^= zLo[e]; hHi ^= zHi[e]; if (eb0[e] >= 0) sides[eb0[e]]++; if (eb1[e] >= 0) sides[eb1[e]]++; }
      else remaining++;
    }
  }
  function drawEdge(e) {
    drawn[e] = 1; remaining--; hLo ^= zLo[e]; hHi ^= zHi[e];
    let g = 0; const a = eb0[e], b = eb1[e];
    if (a >= 0 && ++sides[a] === 4) g++;
    if (b >= 0 && ++sides[b] === 4) g++;
    return g;
  }
  function undrawEdge(e) {
    drawn[e] = 0; remaining++; hLo ^= zLo[e]; hHi ^= zHi[e];
    const a = eb0[e], b = eb1[e]; if (a >= 0) sides[a]--; if (b >= 0) sides[b]--;
  }
  const isSafe = (e) => { const a = eb0[e], b = eb1[e]; return (a < 0 || sides[a] <= 1) && (b < 0 || sides[b] <= 1); };
  const isCapture = (e) => { const a = eb0[e], b = eb1[e]; return (a >= 0 && sides[a] === 3) || (b >= 0 && sides[b] === 3); };

  /* ---------- loony endgame DP (independent chains and loops) ---------- */
  function dpValue(chains, loops) {
    if (!chains.length && !loops.length) return 0;
    const key = chains.join(',') + '|' + loops.join(',');
    const hit = dpMemo.get(key); if (hit !== undefined) return hit;
    let best = -INF;
    for (let i = 0; i < chains.length; i++) {
      if (i > 0 && chains[i] === chains[i - 1]) continue;
      const n = chains[i], rest = chains.slice(0, i).concat(chains.slice(i + 1));
      const v = dpValue(rest, loops); let val;
      if (n === 1) val = -1 - v; else if (n === 2) val = -2 - v; else val = Math.min(-n - v, 4 - n + v);
      if (val > best) best = val;
    }
    for (let i = 0; i < loops.length; i++) {
      if (i > 0 && loops[i] === loops[i - 1]) continue;
      const n = loops[i], rest = loops.slice(0, i).concat(loops.slice(i + 1));
      const v = dpValue(chains, rest); const val = Math.min(-n - v, 8 - n + v);
      if (val > best) best = val;
    }
    dpMemo.set(key, best); return best;
  }
  /* exact value for the player to move when every remaining box is part of a chain / loop (no capturable box, no safe move) */
  function canonicalValue() {
    if (remaining === 0) return 0;
    for (let b = 0; b < B; b++) { const s = sides[b]; if (s !== 4 && s !== 2) return null; }
    visStamp++; const chains = [], loops = [], stack = [];
    for (let b = 0; b < B; b++) {
      if (sides[b] !== 2 || vis[b] === visStamp) continue;
      let n = 0, ground = 0; stack.length = 0; stack.push(b); vis[b] = visStamp;
      while (stack.length) {
        const x = stack.pop(); n++;
        for (let k = 0; k < 4; k++) {
          const e = bedges[x * 4 + k]; if (drawn[e]) continue;
          const y = eb0[e] === x ? eb1[e] : eb0[e];
          if (y < 0) ground++; else if (vis[y] !== visStamp) { vis[y] = visStamp; stack.push(y); }
        }
      }
      if (ground === 0) loops.push(n); else chains.push(n);
    }
    chains.sort((a, b) => a - b); loops.sort((a, b) => a - b);
    return dpValue(chains, loops);
  }

  /* ---------- leaf evaluation: roll out safe moves (single monotone pass) then read the loony endgame ---------- */
  function leafEval() {
    heur = true; let total = 0;
    for (let dir = 0; dir < 2; dir++) {
      const done = []; let m = 0;
      for (let i = 0; i < E; i++) {
        const e = dir ? E - 1 - i : i;
        if (!drawn[e] && isSafe(e)) { drawEdge(e); done.push(e); m++; }
      }
      const cv = canonicalValue(); let v = cv === null ? 0 : cv;
      if (m & 1) v = -v;
      total += v;
      while (done.length) undrawEdge(done.pop());
    }
    return total / 2;
  }

  /* ---------- alpha-beta (negamax on the margin of the remaining boxes; a capture keeps the move) ---------- */
  function search(depth, alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) aborted = true;
    if (aborted) return 0;
    if (remaining === 0) return 0;
    const buf = mv[ply], keys = mk[ply]; let n = 0, hasCap = false, hasSafe = false;
    for (let e = 0; e < E; e++) {
      if (drawn[e]) continue;
      const a = eb0[e], b = eb1[e], s0 = a >= 0 ? sides[a] : -1, s1 = b >= 0 ? sides[b] : -1;
      let key;
      if (s0 === 3 || s1 === 3) { key = 1000 + (s0 === 3 && s1 === 3 ? 5 : 0); hasCap = true; }
      else if (s0 === 2 || s1 === 2) key = 100 - ((s0 === 2 ? 1 : 0) + (s1 === 2 ? 1 : 0)) * 10;
      else { key = 500; hasSafe = true; }
      buf[n] = e; keys[n] = key; n++;
    }
    if (!hasCap) {
      if (!hasSafe) { const cv = canonicalValue(); if (cv !== null) return cv; }
      if (depth <= 0) return hasSafe ? leafEval() : (heur = true, 0);
    }
    const key = hHi * 67108864 + hLo, ent = tt.get(key); let ttMove = -1;
    if (ent) {
      ttMove = ent.m;
      if (ent.d >= depth) {
        if (ent.f === 0) return ent.v;
        if (ent.f === 1 && ent.v >= beta) return ent.v;
        if (ent.f === 2 && ent.v <= alpha) return ent.v;
      }
    }
    // order: tt move first, then by key (insertion sort, descending)
    for (let i = 1; i < n; i++) {
      const e = buf[i], ki = keys[i], k = ki + (e === ttMove ? 5000 : 0); let j = i - 1;
      while (j >= 0 && keys[j] + (buf[j] === ttMove ? 5000 : 0) < k) { buf[j + 1] = buf[j]; keys[j + 1] = keys[j]; j--; }
      buf[j + 1] = e; keys[j + 1] = ki;
    }
    let best = -INF, bm = -1, a = alpha; const origAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const e = buf[i], gain = drawEdge(e); let v;
      if (remaining === 0) v = gain;
      else if (gain > 0) v = gain + search(depth, a - gain, beta - gain, ply + 1);
      else v = -search(depth - 1, -beta, -a, ply + 1);
      undrawEdge(e);
      if (aborted) return 0;
      if (v > best) { best = v; bm = e; }
      if (v > a) a = v;
      if (a >= beta) break;
    }
    tt.set(key, { d: depth, v: best, f: best <= origAlpha ? 2 : (best >= beta ? 1 : 0), m: bm });
    return best;
  }

  function engineMove(timeMs, maxDepth) {
    tt = new Map(); nodes = 0; aborted = false;
    const moves = []; for (let e = 0; e < E; e++) if (!drawn[e]) moves.push(e);
    for (let i = moves.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = moves[i]; moves[i] = moves[j]; moves[j] = t; }
    // early game: nothing can be decided yet, shorten the think time
    const early = remaining > E * 0.62; deadline = Date.now() + (early ? Math.min(timeMs, 350) : timeMs);
    let bestMove = moves[0], scores = new Map();
    for (let d = 1; d <= maxDepth; d++) {
      heur = false; let iterBest = -INF, iterMove = -1, alpha = -INF;
      if (d > 1) moves.sort((x, y) => (scores.get(y) || 0) - (scores.get(x) || 0));
      for (let i = 0; i < moves.length; i++) {
        const e = moves[i], gain = drawEdge(e); let v;
        if (remaining === 0) v = gain;
        else if (gain > 0) v = gain + search(d, alpha - gain, INF, 1);
        else v = -search(d - 1, -INF, -alpha, 1);
        undrawEdge(e);
        if (aborted) break;
        scores.set(e, v);
        if (v > iterBest) { iterBest = v; iterMove = e; if (v > alpha) alpha = v; }
      }
      if (aborted) break;
      bestMove = iterMove;
      if (!heur) break;                 // the whole tree was resolved exactly
      if (Date.now() > deadline) break;
    }
    return bestMove;
  }

  /* ---------- simpler levels ---------- */
  const listAll = () => { const a = []; for (let e = 0; e < E; e++) if (!drawn[e]) a.push(e); return a; };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  function greedyLoss(e) {          // boxes the opponent would grab greedily after this move (for sacrifices)
    const done = []; let g = drawEdge(e); done.push(e); let loss = 0;
    for (;;) {
      let f = -1; for (let x = 0; x < E; x++) if (!drawn[x] && isCapture(x)) { f = x; break; }
      if (f < 0) break; loss += drawEdge(f); done.push(f);
    }
    while (done.length) undrawEdge(done.pop());
    return loss;
  }
  function easyMove() {
    const all = listAll(), caps = all.filter(isCapture);
    if (caps.length && Math.random() < 0.7) return pick(caps);
    const safe = all.filter(isSafe); if (safe.length && Math.random() < 0.35) return pick(safe);
    return pick(all);
  }
  function mediumMove() {
    const all = listAll(), caps = all.filter(isCapture); if (caps.length) return pick(caps);
    const safe = all.filter(isSafe); if (safe.length) return pick(safe);
    let best = INF, cand = [];
    for (const e of all) { const l = greedyLoss(e); if (l < best) { best = l; cand = [e]; } else if (l === best) cand.push(e); }
    return pick(cand);
  }

  function chooseMove(r, c, drawnArr, level, opts) {
    setup(r, c); load(drawnArr); opts = opts || {};
    if (remaining === 0) return -1;
    if (level <= 0) return easyMove();
    if (level === 1) return mediumMove();
    if (level === 2) {                                   // Hard: shallow search, sometimes plays the greedy way
      if (Math.random() < 0.10) return mediumMove();
      return engineMove(opts.time || 250, 3);
    }
    return engineMove(opts.time || 2200, 40);            // Expert
  }
  return { chooseMove };
}
if (typeof module !== 'undefined') module.exports = { createAI };
