'use strict';
// ==========================================================================
// Fruit Fusion — fruit definitions + 3D-looking sprite painter.
// Every fruit is a shaded sphere (radial light, rim shadow, bounce light,
// specular highlight) with a smiling face. Sprites are pre-rendered once.
// ==========================================================================
const FRUITS = [
  { id: 'cherry',     r: 15, pts: 1  },
  { id: 'strawberry', r: 19, pts: 3  },
  { id: 'mangosteen', r: 24, pts: 6  },
  { id: 'lemon',      r: 31, pts: 10 },
  { id: 'orange',     r: 37, pts: 15 },
  { id: 'peach',      r: 43, pts: 21 },
  { id: 'apple',      r: 51, pts: 28 },
  { id: 'pineapple',  r: 58, pts: 36 },
  { id: 'coconut',    r: 67, pts: 45 },
  { id: 'melon',      r: 77, pts: 55 },
  { id: 'watermelon', r: 89, pts: 66 }
];

// Small fruits removed by the hammer: index 0 (cherry) .. CLEAN_MAX_LEVEL (mangosteen)
const CLEAN_MAX_LEVEL = 2;

const TAU = Math.PI * 2;

function circlePath(r) { return c => { c.beginPath(); c.arc(0, 0, r, 0, TAU); }; }

// Seeded pseudo-random so every sprite is identical between sessions
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function shade(ctx, r, path, c) {
  ctx.save();
  path(ctx);
  let g = ctx.createRadialGradient(-r * .35, -r * .4, r * .05, -r * .1, -r * .1, r * 1.45);
  g.addColorStop(0, c.hi); g.addColorStop(.45, c.base); g.addColorStop(1, c.dark);
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  // rim darkening (light comes from top-left)
  g = ctx.createRadialGradient(-r * .2, -r * .25, r * .55, 0, 0, r * 1.1);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.30)');
  ctx.fillStyle = g; ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  // bounce light from the floor
  g = ctx.createRadialGradient(r * .3, r * .9, 0, r * .3, r * .9, r * .75);
  g.addColorStop(0, 'rgba(255,255,255,.30)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
  ctx.restore();
}
function outline(ctx, r, path, color) {
  ctx.save(); path(ctx);
  ctx.lineWidth = Math.max(1, r * .055); ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
function spec(ctx, r, big) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.beginPath(); ctx.ellipse(-r * .4, -r * .5, r * (big ? .26 : .2), r * (big ? .15 : .11), -.65, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(-r * .14, -r * .68, r * .055, 0, TAU); ctx.fill();
  ctx.restore();
}
function leaf(ctx, x, y, len, ang, w) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, '#9be35a'); g.addColorStop(1, '#2f9e3a');
  ctx.fillStyle = g; ctx.strokeStyle = '#1f7a2c'; ctx.lineWidth = Math.max(.8, len * .06);
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * .5, -w * 1.25, len, 0);
  ctx.quadraticCurveTo(len * .5, w * 1.25, 0, 0);
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(len * .08, 0); ctx.lineTo(len * .8, 0);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(.6, len * .03); ctx.stroke();
  ctx.restore();
}
function stem(ctx, x0, y0, x1, y1, w, color) {
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = color || '#7a4a22'; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + w, (y0 + y1) / 2, x1, y1); ctx.stroke();
  ctx.restore();
}

// The smiling face --------------------------------------------------------
function face(ctx, r, o) {
  o = o || {};
  const ey = (o.ey == null ? -.04 : o.ey) * r, ex = (o.ex || .3) * r, es = o.es || 1;
  const dark = '#2d1a2e';
  // cheeks
  ctx.save();
  ctx.fillStyle = o.cheek || 'rgba(255,80,110,.50)';
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(s * (ex + r * .22), ey + r * .27, r * .13, r * .08, 0, 0, TAU); ctx.fill(); });
  // eyes
  if (o.happy) {
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.1, r * .07); ctx.lineCap = 'round';
    [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(s * ex, ey + r * .06, r * .1 * es, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
  } else {
    const er = r * .095 * es;
    [-1, 1].forEach(s => {
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(s * ex, ey, er, er * 1.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * ex - er * .3, ey - er * .5, er * .42, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(s * ex + er * .3, ey + er * .45, er * .2, 0, TAU); ctx.fill();
    });
  }
  // mouth
  const my = ey + r * .26;
  if (o.open) {
    ctx.beginPath(); ctx.ellipse(0, my - r * .04, r * .17, r * .16, 0, 0, Math.PI); ctx.closePath();
    ctx.fillStyle = '#4a1226'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#ff7b94'; ctx.beginPath(); ctx.ellipse(0, my + r * .11, r * .1, r * .07, 0, 0, TAU); ctx.fill();
    ctx.restore();
  } else {
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.1, r * .06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, my - r * .12, r * .16, Math.PI * .15, Math.PI * .85); ctx.stroke();
  }
  ctx.restore();
}

// Individual fruits -------------------------------------------------------
const DRAW = [];

DRAW[0] = (ctx, r) => { // cherry
  stem(ctx, 0, -r * .85, r * .35, -r * 1.4, r * .1, '#5a8f2a');
  leaf(ctx, r * .3, -r * 1.36, r * .6, -.35, r * .2);
  const p = circlePath(r);
  shade(ctx, r, p, { hi: '#ff9a8a', base: '#e8283a', dark: '#9d0f26' });
  outline(ctx, r, p, '#7d0a1e');
  face(ctx, r, { ey: .02, es: .95 }); spec(ctx, r);
};

DRAW[1] = (ctx, r) => { // strawberry
  const p = c => {
    c.beginPath(); c.moveTo(0, r * .98);
    c.bezierCurveTo(-r * .45, r * .9, -r * 1.02, r * .2, -r * .98, -r * .28);
    c.bezierCurveTo(-r * .95, -r * .78, -r * .4, -r * .86, 0, -r * .7);
    c.bezierCurveTo(r * .4, -r * .86, r * .95, -r * .78, r * .98, -r * .28);
    c.bezierCurveTo(r * 1.02, r * .2, r * .45, r * .9, 0, r * .98); c.closePath();
  };
  shade(ctx, r, p, { hi: '#ff8c80', base: '#ec2f3f', dark: '#9a1026' });
  ctx.save(); p(ctx); ctx.clip();
  [[-.66, -.42], [.66, -.42], [-.78, .08], [.78, .08], [-.5, .55], [.5, .55], [0, .8], [-.3, -.6], [.3, -.6], [-.68, .38], [.68, .38]].forEach(([x, y]) => {
    ctx.save(); ctx.translate(x * r, y * r); ctx.rotate(x * .5);
    ctx.fillStyle = '#ffe58f'; ctx.strokeStyle = 'rgba(120,40,0,.5)'; ctx.lineWidth = r * .02;
    ctx.beginPath(); ctx.ellipse(0, 0, r * .045, r * .075, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  });
  ctx.restore();
  outline(ctx, r, p, '#80101f');
  for (let i = 0; i < 5; i++) { // calyx
    const a = -Math.PI / 2 + (i - 2) * .62;
    leaf(ctx, 0, -r * .72, r * .5, a, r * .13);
  }
  stem(ctx, 0, -r * .72, r * .06, -r * 1.08, r * .09, '#4f8f2c');
  face(ctx, r, { ey: .06, open: true, es: .9 }); spec(ctx, r);
};

DRAW[2] = (ctx, r) => { // mangosteen
  const p = circlePath(r);
  shade(ctx, r, p, { hi: '#d38cf0', base: '#9238cc', dark: '#531280' });
  outline(ctx, r, p, '#3e0c5e');
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * .55;
    leaf(ctx, 0, -r * .86, r * .42, a, r * .12);
  }
  face(ctx, r, { ey: .04, es: .9 }); spec(ctx, r);
};

DRAW[3] = (ctx, r) => { // lemon
  const rot = -.35, rx = r, ry = r * .88;
  const p = c => { c.beginPath(); c.ellipse(0, 0, rx, ry, rot, 0, TAU); };
  const nubs = c => {
    [1, -1].forEach(s => {
      c.beginPath(); c.ellipse(s * Math.cos(rot) * rx * .98, s * Math.sin(rot) * rx * .98, r * .13, r * .1, rot, 0, TAU);
    });
  };
  [1, -1].forEach(s => {
    ctx.beginPath(); ctx.ellipse(s * Math.cos(rot) * rx * .96, s * Math.sin(rot) * rx * .96, r * .14, r * .11, rot, 0, TAU);
    ctx.fillStyle = '#f2c300'; ctx.fill(); ctx.strokeStyle = '#a97c00'; ctx.lineWidth = r * .04; ctx.stroke();
  });
  shade(ctx, r, p, { hi: '#fffbb0', base: '#ffdc22', dark: '#d19a00' });
  outline(ctx, r, p, '#a97c00');
  stem(ctx, r * .5, -r * .72, r * .62, -r * .95, r * .07, '#6b8f2a');
  leaf(ctx, r * .6, -r * .93, r * .55, -.5, r * .17);
  face(ctx, r, { ey: .0, happy: true });
  ctx.save(); ctx.translate(0, 0); spec(ctx, r); ctx.restore();
};

DRAW[4] = (ctx, r) => { // orange
  const p = circlePath(r);
  shade(ctx, r, p, { hi: '#ffbe5c', base: '#ff8a0d', dark: '#c85a00' });
  const rnd = rng(7);
  ctx.save(); p(ctx); ctx.clip();
  for (let i = 0; i < 38; i++) {
    const a = rnd() * TAU, d = Math.sqrt(rnd()) * r * .95;
    ctx.fillStyle = 'rgba(190,80,0,.28)'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * .022 + rnd() * r * .014, 0, TAU); ctx.fill();
  }
  ctx.restore();
  outline(ctx, r, p, '#b04f00');
  stem(ctx, 0, -r * .92, r * .04, -r * 1.12, r * .08, '#5a7a22');
  leaf(ctx, r * .04, -r * 1.08, r * .62, -.45, r * .2);
  face(ctx, r, { ey: .0, happy: true, open: true }); spec(ctx, r);
};

DRAW[5] = (ctx, r) => { // peach
  const p = circlePath(r);
  shade(ctx, r, p, { hi: '#ffe0cf', base: '#ffa98e', dark: '#e0705a' });
  ctx.save(); p(ctx); ctx.clip();
  let g = ctx.createRadialGradient(r * .5, r * .1, 0, r * .5, r * .1, r * .9);
  g.addColorStop(0, 'rgba(255,80,110,.38)'); g.addColorStop(1, 'rgba(255,80,110,0)');
  ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(190,70,60,.42)'; ctx.lineWidth = r * .05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r * .85); ctx.quadraticCurveTo(r * .32, -r * .2, r * .12, r * .55); ctx.stroke();
  ctx.restore();
  outline(ctx, r, p, '#c55a48');
  stem(ctx, 0, -r * .88, r * .02, -r * 1.08, r * .07, '#6b4a22');
  leaf(ctx, r * .02, -r * 1.05, r * .6, -.35, r * .2);
  face(ctx, r, { ey: .02, cheek: 'rgba(255,60,100,.5)', es: 1.05 }); spec(ctx, r);
};

DRAW[6] = (ctx, r) => { // apple
  const p = c => {
    c.beginPath(); c.moveTo(0, -r * .82);
    c.bezierCurveTo(r * .3, -r * 1.0, r * 1.0, -r * .85, r * .98, -r * .1);
    c.bezierCurveTo(r * .96, r * .6, r * .55, r * 1.0, 0, r * .96);
    c.bezierCurveTo(-r * .55, r * 1.0, -r * .96, r * .6, -r * .98, -r * .1);
    c.bezierCurveTo(-r * 1.0, -r * .85, -r * .3, -r * 1.0, 0, -r * .82); c.closePath();
  };
  shade(ctx, r, p, { hi: '#ff857a', base: '#e0222c', dark: '#8f0f1a' });
  outline(ctx, r, p, '#7a0c16');
  stem(ctx, 0, -r * .75, r * .1, -r * 1.12, r * .09, '#6b3f1a');
  leaf(ctx, r * .1, -r * 1.0, r * .62, -.5, r * .2);
  face(ctx, r, { ey: .0, open: true }); spec(ctx, r);
};

DRAW[7] = (ctx, r) => { // pineapple
  for (let i = 0; i < 7; i++) { // crown behind the body
    const a = -Math.PI / 2 + (i - 3) * .36;
    leaf(ctx, Math.sin((i - 3) * .12) * r * .3, -r * .72, r * .62, a, r * .13);
  }
  const p = c => { c.beginPath(); c.ellipse(0, r * .06, r * .88, r * .93, 0, 0, TAU); };
  shade(ctx, r, p, { hi: '#ffe97a', base: '#ffb800', dark: '#c47a00' });
  ctx.save(); p(ctx); ctx.clip();
  ctx.strokeStyle = 'rgba(150,80,0,.42)'; ctx.lineWidth = r * .04;
  for (let k = -6; k <= 6; k++) {
    ctx.beginPath(); ctx.moveTo(k * r * .3 - r * 1.2, -r * 1.2); ctx.lineTo(k * r * .3 + r * 1.2, r * 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(k * r * .3 + r * 1.2, -r * 1.2); ctx.lineTo(k * r * .3 - r * 1.2, r * 1.2); ctx.stroke();
  }
  ctx.restore();
  outline(ctx, r, p, '#a56400');
  face(ctx, r, { ey: .1, open: true, ex: .28 }); spec(ctx, r);
};

DRAW[8] = (ctx, r) => { // coconut
  const p = circlePath(r);
  shade(ctx, r, p, { hi: '#bd8a60', base: '#7b4a2a', dark: '#3f2312' });
  const rnd = rng(11);
  ctx.save(); p(ctx); ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = (rnd() * 2 - 1) * r, y = (rnd() * 2 - 1) * r, a = rnd() * TAU, l = r * (.1 + rnd() * .14);
    ctx.strokeStyle = rnd() > .5 ? 'rgba(40,20,8,.35)' : 'rgba(210,160,110,.25)'; ctx.lineWidth = r * .022;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
  outline(ctx, r, p, '#2e190b');
  face(ctx, r, { ey: .02, cheek: 'rgba(255,120,120,.45)' });
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(-r * .4, -r * .5, r * .2, r * .11, -.65, 0, TAU); ctx.fill(); ctx.restore();
};

DRAW[9] = (ctx, r) => { // melon
  const p = circlePath(r);
  shade(ctx, r, p, { hi: '#eaffb8', base: '#aee266', dark: '#5f9f2e' });
  ctx.save(); p(ctx); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = r * .03;
  [.3, .6, .88].forEach(k => { ctx.beginPath(); ctx.ellipse(0, 0, r * k, r, 0, 0, TAU); ctx.stroke(); });
  ctx.strokeStyle = 'rgba(70,120,30,.28)';
  [-.35, .1, .5].forEach(y => { ctx.beginPath(); ctx.ellipse(0, y * r * 1.5, r * 1.1, r * .24, 0, 0, TAU); ctx.stroke(); });
  ctx.restore();
  outline(ctx, r, p, '#4a8424');
  stem(ctx, 0, -r * .94, r * .05, -r * 1.14, r * .1, '#7a8f2a');
  face(ctx, r, { ey: .02, happy: true, open: true }); spec(ctx, r, true);
};

DRAW[10] = (ctx, r) => { // watermelon
  const p = circlePath(r);
  shade(ctx, r, p, { hi: '#86ee70', base: '#33b83f', dark: '#17702a' });
  ctx.save(); p(ctx); ctx.clip();
  ctx.strokeStyle = 'rgba(14,98,38,.62)'; ctx.lineWidth = r * .13; ctx.lineCap = 'round';
  [.34, .68, 1.0].forEach(k => {
    ctx.beginPath(); ctx.ellipse(0, 0, r * k, r * 1.02, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r * k, r * 1.02, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
  });
  // soften the stripes with the light again
  const g = ctx.createRadialGradient(-r * .35, -r * .4, r * .05, 0, 0, r * 1.2);
  g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  outline(ctx, r, p, '#0f5a22');
  stem(ctx, 0, -r * .96, r * .05, -r * 1.18, r * .09, '#4f7a22');
  face(ctx, r, { ey: .0, happy: true, open: true, es: 1.1 }); spec(ctx, r, true);
};

// Pre-render a sprite. k = device pixels per world unit.
function makeSprite(level, k) {
  const r = FRUITS[level].r, ext = r * 1.55, size = Math.ceil(ext * 2 * k);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.translate(size / 2, size / 2); x.scale(k, k);
  DRAW[level](x, r);
  return { canvas: c, ext };
}
