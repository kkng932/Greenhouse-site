/* ============================================================
   배경 식물 지오메트리
   - 시드 고정 난수로 덤불/덩굴의 SVG 패스 문자열을 만든다
   - 잎을 놓기 전에 기존 잎·줄기와 겹치는지 검사해서 지저분한 교차를 막는다
   - DOM은 건드리지 않는다 (그리는 쪽은 js/main.js)
   ============================================================ */

'use strict';

const fix1 = (n) => n.toFixed(1);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* 시드 고정 LCG 난수 — 새로고침해도 식물 모양이 늘 같다 */
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* 선분 a-b와 c-d 사이의 최단 거리 (교차하면 0) */
function segDist(a, b, c, d) {
  const dps = (p, s, e) => {
    const dx = e[0] - s[0], dy = e[1] - s[1];
    const l = dx * dx + dy * dy;
    const t = l ? clamp01(((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / l) : 0;
    const qx = s[0] + t * dx - p[0], qy = s[1] + t * dy - p[1];
    return Math.sqrt(qx * qx + qy * qy);
  };
  const ccw = (p, q, r) => (r[1] - p[1]) * (q[0] - p[0]) - (q[1] - p[1]) * (r[0] - p[0]);
  if ((ccw(a, b, c) > 0) !== (ccw(a, b, d) > 0) && (ccw(c, d, a) > 0) !== (ccw(c, d, b) > 0)) return 0;
  return Math.min(dps(a, c, d), dps(b, c, d), dps(c, a, b), dps(d, a, b));
}

/* 식물 한 포기: 잎·줄기를 쌓으면서 겹침을 검사한다 */
class Plant {
  constructor() {
    this.leaves = '';
    this.segs = [];
  }

  blocked(s, e, rad, skipStemNear) {
    for (const g of this.segs) {
      if (skipStemNear && g.stem && g.near === skipStemNear) continue;
      if (segDist(s, e, g.s, g.e) < rad + g.r) return true;
    }
    return false;
  }

  stemSeg(s, e, r, id) {
    this.segs.push({ s, e, r, stem: true, near: id });
  }

  /* (x,y)에서 각도 a, 길이 L, 폭 W의 잎을 하나 놓는다. 겹치면 포기 */
  leaf(x, y, a, L, W, stemId) {
    const c = Math.cos(a), sn = Math.sin(a);
    const px = -sn, py = c;
    const s = [x + c * L * 0.18, y + sn * L * 0.18];
    const e = [x + c * L * 0.96, y + sn * L * 0.96];
    if (this.blocked(s, e, W * 0.75, stemId)) return false;
    this.segs.push({ s, e, r: W * 0.75 });
    const P = (u, v) => fix1(x + c * u + px * v) + ' ' + fix1(y + sn * u + py * v);
    this.leaves += 'M' + P(0, 0)
      + 'C' + P(L * 0.12, W * 0.9) + ' ' + P(L * 0.6, W * 0.95) + ' ' + P(L, 0)
      + 'C' + P(L * 0.6, -W * 0.95) + ' ' + P(L * 0.12, -W * 0.9) + ' ' + P(0, 0) + 'Z';
    return true;
  }
}

/* 바닥 덤불: 휘어진 줄기 하나에 잎을 번갈아 단다 (viewBox -80 -40 360 448 기준) */
function makeBush(seed) {
  const r = rng(seed);
  const pl = new Plant();
  const bend = (r() - 0.5) * 120, x0 = 100, topY = 30 + r() * 70;
  const P = [[x0, 402], [x0 + bend * 0.1, 300], [x0 + bend * 0.6, 190], [x0 + bend, topY]];
  const pt = (t) => {
    const u = 1 - t;
    return [
      u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
      u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]
    ];
  };
  const tan = (t) => {
    const u = 1 - t;
    const dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
    const dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
    return Math.atan2(dy, dx);
  };
  const stem = 'M' + P[0].join(' ') + 'C' + P[1].join(' ') + ' ' + P[2].join(' ') + ' ' + P[3].join(' ');

  for (let k = 0; k < 20; k++) pl.stemSeg(pt(k / 20), pt((k + 1) / 20), 6, 's');

  let side = r() < 0.5 ? 1 : -1;
  for (let t = 0.14; t < 0.97; t += 0.07 + r() * 0.03) {
    const p = pt(t), a = tan(t), L = (1 - t) * 55 + 44 + r() * 20;
    // 자리가 막혀 있으면 각도를 더 꺾어서 한 번 더 시도
    if (!pl.leaf(p[0], p[1], a + side * (0.8 + r() * 0.5), L, L * (0.22 + r() * 0.06), 's'))
      pl.leaf(p[0], p[1], a + side * (1.35 + r() * 0.3), L * 0.8, L * 0.2, 's');
    side = -side;
  }

  // 줄기 끝과 밑동 주변 마무리 잎
  const e = pt(1), ea = tan(1);
  pl.leaf(e[0], e[1], ea + (r() - 0.5) * 0.3, 54 + r() * 16, 13 + r() * 3, 's');
  pl.leaf(e[0], e[1], ea - 1.0, 40 + r() * 12, 10, 's');
  pl.leaf(e[0], e[1], ea + 1.0, 40 + r() * 12, 10, 's');
  for (let j = 0; j < 6; j++) {
    const bx = 100 + (r() - 0.5) * 110, ba = -Math.PI / 2 + (r() - 0.5) * 2.6;
    pl.leaf(bx, 404, ba, 48 + r() * 30, 12 + r() * 5, null);
  }

  return { stem, leaves: pl.leaves };
}

/* 벽을 타고 오르는 덩굴 (viewBox 0 0 100 1000 기준) */
function makeVine(seed) {
  const r = rng(seed), ph = r() * 6;
  const pl = new Plant();
  let stem = '', side = 1, prev = null;

  for (let y = 1000; y >= 0; y -= 20) {
    const x = 36 + Math.sin(y / 85 + ph) * 14 + Math.sin(y / 23 + ph * 2) * 3;
    stem += (y === 1000 ? 'M' : 'L') + fix1(x) + ' ' + y;
    if (prev) pl.stemSeg(prev, [x, y], 4, 'v');
    prev = [x, y];
  }
  for (let y = 980; y >= 20; y -= 30) {
    const x = 36 + Math.sin(y / 85 + ph) * 14 + Math.sin(y / 23 + ph * 2) * 3;
    const a = -Math.PI / 2 + side * (0.8 + r() * 0.5), L = 30 + r() * 22;
    if (pl.leaf(x, y, a, L, L * (0.24 + r() * 0.06), 'v')) side = -side;
  }

  return { stem, leaves: pl.leaves };
}
