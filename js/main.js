/* ============================================================
   안락온실 포트폴리오 — 페이지 동작
   1. 스크롤 진행도 → 안락 수치(100 → 0) → 배경·식물·게이지 갱신
   2. 피아노 건반 내비게이션
   3. 전후 비교 슬라이더
   4. 소개 영상 인라인 재생
   5. 이메일 복사
   ============================================================ */

'use strict';

/* ---------- 설정 ---------- */

const SECTIONS = ['top', 'summary', 'system', 'problems', 'collab', 'learned', 'contact'];
const NAV_LABELS = ['요약', '안락 수치', '문제 해결', '협업', '회고', '연락'];
const SHARP_KEYS = [1, 2, 4, 5]; // 흰 건반 사이 중 검은 건반이 들어갈 자리

const EMAIL = 'kkng93279@naver.com';
const YOUTUBE_ID = 'DLPSxTDmF1I';

const COMPARE_SCENES = [
  {
    label: '피아노 방',
    ratio: '16 / 9',
    high: 'assets/piano-warm.webp',
    low: 'assets/piano-red.webp',
    highAlt: '안락 수치가 높을 때: 따뜻한 조명의 피아노 방',
    lowAlt: '안락 수치가 낮을 때: 같은 피아노 방이 붉게 물들고 식물이 자라난 모습'
  },
  {
    label: '액자',
    ratio: '16 / 9',
    high: 'assets/frame-warm.webp',
    low: 'assets/frame-red.webp',
    highAlt: '안락 수치가 높을 때: 평범한 숲 풍경화와 독백 “평범한 숲 풍경화. 나무들 사이로 열은 안개가 깔려 있다.”',
    lowAlt: '안락 수치가 낮을 때: 같은 액자가 어두워지고 숲속에 사람 형체가 보이며 독백이 “나무들 사이, 원래 없던 사람의 형체가 서 있는 것처럼 보인다.”로 바뀜'
  },
  {
    label: '고양이',
    ratio: '16 / 9',
    high: 'assets/cat-warm.webp',
    low: 'assets/cat-red.webp',
    highAlt: '안락 수치가 높을 때: 부엌 바닥에 앉아 올려다보는 동그란 눈의 작은 검은 고양이',
    lowAlt: '안락 수치가 낮을 때: 붉은 복도에서 같은 고양이가 크고 일그러진 검은 형체로 다가오는 모습'
  }
];

/* 바닥 덤불 배치: x(%), 높이(%), 등장 지연(0~1), 좌우 반전 */
const BUSH_LAYOUT = [
  { x: -5, h: 70, delay: 0,   flip: 1 },
  { x: 8,  h: 54, delay: .25, flip: -1 },
  { x: 20, h: 62, delay: .45, flip: 1 },
  { x: 32, h: 46, delay: .65, flip: -1 },
  { x: 56, h: 48, delay: .6,  flip: 1 },
  { x: 68, h: 60, delay: .4,  flip: -1 },
  { x: 80, h: 52, delay: .2,  flip: 1 },
  { x: 91, h: 72, delay: 0,   flip: -1 }
];

/* ---------- 유틸 ---------- */

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const setVar = (name, value) => root.style.setProperty(name, value);

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/* 두 hex 색을 t(0~1) 비율로 섞는다 */
function mixHex(a, b, t) {
  const x = hexToRgb(a), y = hexToRgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/* 붉은 틴트(t)와 어둠(shade)을 반투명 한 겹으로 합친다.
   mix-blend-mode 레이어를 여러 장 겹치면 스크롤이 무거워져서 미리 계산한다 */
function veilColor(t, shade) {
  const tint = 0.55 * t;
  const alpha = 1 - (1 - tint) * (1 - shade);
  if (alpha <= 0.001) return 'rgba(0,0,0,0)';
  const w = tint * (1 - shade) / alpha;
  const ch = (red, dark) => Math.round(red * w + dark * (1 - w));
  return `rgba(${ch(120, 7)},${ch(14, 3)},${ch(10, 2)},${alpha.toFixed(3)})`;
}

/* ---------- 1. 식물 ---------- */

const SVG_NS = 'http://www.w3.org/2000/svg';

function createPath(d, attrs) {
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
  return p;
}

/* 외곽선용(굵게) + 채움용(얇게) 두 벌을 겹쳐서 한 포기가 한 덩어리로 보이게 한다 */
function createPlantSvg(viewBox, aspect, { stem, leaves }, [stemOutline, leafOutline, stemFill]) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('preserveAspectRatio', aspect);
  svg.setAttribute('overflow', 'visible');

  const round = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  const parts = {
    stemOut: createPath(stem, { fill: 'none', 'stroke-width': stemOutline, ...round }),
    leafOut: createPath(leaves, { 'stroke-width': leafOutline, 'stroke-linejoin': 'round' }),
    stemIn: createPath(stem, { fill: 'none', 'stroke-width': stemFill, ...round }),
    leafIn: createPath(leaves, {})
  };
  Object.values(parts).forEach((p) => svg.appendChild(p));
  return { svg, parts };
}

function paintPlant({ parts }, fill, outline) {
  parts.stemOut.setAttribute('stroke', outline);
  parts.leafOut.setAttribute('fill', outline);
  parts.leafOut.setAttribute('stroke', outline);
  parts.stemIn.setAttribute('stroke', fill);
  parts.leafIn.setAttribute('fill', fill);
}

function setGrowth(svg, amount) {
  svg.style.clipPath = amount >= 0.999 ? 'none' : `inset(${((1 - amount) * 100).toFixed(1)}% 0 0 0)`;
}

const flora = $('flora');

const vines = [4242, 9191].map((seed, i) => {
  const wrap = document.createElement('div');
  wrap.className = 'vine';
  wrap.style.cssText = i === 0 ? 'left:0;' : 'right:0;transform:scaleX(-1);';
  const plant = createPlantSvg('0 0 100 1000', 'none', makeVine(seed), [9, 3, 6]);
  wrap.appendChild(plant.svg);
  flora.appendChild(wrap);
  return plant;
});

const bushes = BUSH_LAYOUT.map((layout, i) => {
  const wrap = document.createElement('div');
  wrap.className = 'sway';
  wrap.style.left = layout.x + '%';
  wrap.style.width = 'max(170px, 17vw)';
  wrap.style.height = layout.h + '%';
  wrap.style.animationDuration = (6 + ((i * 37) % 5)) + 's';  // 포기마다 흔들림 박자를 다르게
  wrap.style.animationDelay = -(i * 1.3) + 's';
  const plant = createPlantSvg('-80 -40 360 448', 'xMidYMax meet', makeBush(101 + i * 977), [11.6, 3.6, 8]);
  plant.svg.style.transform = `scaleX(${layout.flip})`;
  wrap.appendChild(plant.svg);
  flora.appendChild(wrap);
  return { ...plant, layout };
});

/* 수치가 내려갈수록 자라고, 초록 → 붉은색으로 물든다 */
function updatePlants(comfort) {
  const grow = clamp((90 - comfort) / 66, 0, 1);
  const leaf = mixHex('#2A3118', '#A8120E', clamp((62 - comfort) / 45, 0, 1));

  const bushOutline = mixHex(leaf, '#050101', 0.6);
  for (const bush of bushes) {
    const d = bush.layout.delay * 0.4;
    paintPlant(bush, leaf, bushOutline);
    setGrowth(bush.svg, clamp((grow - d) / (1 - d), 0, 1));
  }

  const vineGrow = clamp((70 - comfort) / 62, 0, 1);
  const vineOutline = mixHex(leaf, '#050101', 0.55);
  for (const vine of vines) {
    paintPlant(vine, leaf, vineOutline);
    setGrowth(vine.svg, vineGrow);
  }
}

/* ---------- 2. 피아노 건반 내비게이션 ---------- */

const piano = $('piano');

const keys = SECTIONS.slice(1).map((id, i) => {
  const a = document.createElement('a');
  a.href = '#' + id;
  a.className = 'key';
  a.textContent = NAV_LABELS[i];
  piano.appendChild(a);
  return a;
});

for (const pos of SHARP_KEYS) {
  const sharp = document.createElement('span');
  sharp.className = 'key-sharp';
  sharp.setAttribute('aria-hidden', 'true');
  sharp.style.left = `calc(${(pos * 100 / NAV_LABELS.length).toFixed(3)}% - 3.7%)`;
  piano.appendChild(sharp);
}

/* ---------- 3. 전후 비교 ---------- */

const compareTabs = $('cmpTabs');
const lowImg = $('cmpLow');
const highImg = $('cmpHigh');
const range = $('cmpRange');

const tabButtons = COMPARE_SCENES.map((scene, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = scene.label;
  btn.addEventListener('click', () => selectScene(i));
  compareTabs.appendChild(btn);
  return btn;
});

function selectScene(index) {
  const scene = COMPARE_SCENES[index];
  setVar('--cmpRatio', scene.ratio);
  lowImg.src = scene.low;
  lowImg.alt = scene.lowAlt;
  highImg.src = scene.high;
  highImg.alt = scene.highAlt;
  tabButtons.forEach((btn, i) => {
    btn.classList.toggle('is-active', i === index);
    btn.setAttribute('aria-pressed', String(i === index));
  });
}

function updateSlider() {
  const v = Number(range.value);
  setVar('--cmpClip', (100 - v) + '%');
  setVar('--cmpLine', v + '%');
}

range.addEventListener('input', updateSlider);

/* ---------- 4. 소개 영상 ---------- */

// 첫 화면에서는 썸네일만 불러오고, 누를 때 그 자리에 플레이어를 끼운다
$('trailer').addEventListener('click', (e) => {
  e.preventDefault();
  const box = document.createElement('div');
  box.className = 'trailer-player';
  box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0&cc_load_policy=1&cc_lang_pref=ko"
    title="안락온실 소개 영상" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  e.currentTarget.replaceWith(box);
});

/* ---------- 5. 이메일 복사 ---------- */

const copyBtn = $('copyBtn');
const emailLabel = $('emailLabel');
const copyStatus = $('copyStatus');
let copyTimer;

function onCopied() {
  emailLabel.textContent = '복사했어요';
  copyStatus.textContent = '이메일 주소를 복사했습니다';
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    emailLabel.textContent = EMAIL;
    copyStatus.textContent = '';
  }, 1800);
}

/* clipboard API가 막힌 환경(http, 구형 브라우저)용 */
function copyFallback() {
  try {
    const t = document.createElement('textarea');
    t.value = EMAIL;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
    onCopied();
  } catch {
    window.location.href = 'mailto:' + EMAIL;
  }
}

copyBtn.addEventListener('click', () => {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(EMAIL).then(onCopied, copyFallback);
  } else {
    copyFallback();
  }
});

/* ---------- 1. 스크롤 → 안락 수치 ---------- */

const flicker = $('flicker');
const gaugeValue = $('gval');
const gaugeBox = $('gaugeBox');
const monologues = [...document.querySelectorAll('[data-mono]')];

const state = { comfort: 100, ending: 0, section: 0, seen: 0 };
let lastPlantStep = -1;

function render() {
  const { comfort, ending } = state;
  const red = Math.pow(1 - comfort / 100, 1.1);
  const dim = red * (1 - ending * 0.6);

  // 배경: 마지막 연락 구간(ending)에서는 붉은 기가 걷힌다
  setVar('--bg', mixHex(mixHex('#4A2D1C', '#1A0504', red), '#1C1817', ending * 0.85));
  setVar('--green', (Math.pow(comfort / 100, 1.4) * 0.75).toFixed(2));
  setVar('--veil', veilColor(red * 0.95 * (1 - ending * 0.85), 0.05 + 0.6 * dim));
  setVar('--warm', (comfort / 100).toFixed(2));
  setVar('--red', (red * (1 - ending * 0.9)).toFixed(2));

  // 게이지: 게임과 같은 규칙으로 20% 이하에서 빨갛게
  const low = comfort <= 20;
  setVar('--clipTop', (100 - comfort) + '%');
  setVar('--brainFilter', low ? 'saturate(5) brightness(.78) hue-rotate(-8deg)' : 'none');
  setVar('--gaugeText', low ? '#FF7A6E' : '#F3E9D6');
  gaugeValue.textContent = comfort;
  gaugeBox.setAttribute('aria-label', `안락 수치 ${comfort}%`);

  flicker.classList.toggle('is-on', comfort < 40 && ending < 0.5);

  // 식물 SVG는 다시 그리는 비용이 커서 4% 단위로만 갱신
  const step = Math.round(comfort / 4) * 4;
  if (step !== lastPlantStep) {
    lastPlantStep = step;
    updatePlants(step);
  }

  keys.forEach((key, i) => {
    const active = state.section === i + 1;
    key.classList.toggle('is-active', active);
    if (active) key.setAttribute('aria-current', 'true');
    else key.removeAttribute('aria-current');
  });

  for (const m of monologues) {
    m.classList.toggle('is-visible', state.seen >= Number(m.dataset.mono));
  }
}

let lastKey = '';

function measure() {
  const doc = document.scrollingElement || document.documentElement;
  const max = Math.max(1, doc.scrollHeight - window.innerHeight);
  const progress = clamp((window.scrollY || doc.scrollTop) / max, 0, 1);

  // 86% 지점에서 0이 되고, 마지막 10%는 엔딩 연출 구간
  const comfort = Math.round(100 - 100 * clamp(progress / 0.86, 0, 1));
  const ending = Math.round(clamp((progress - 0.9) / 0.1, 0, 1) * 20) / 20;

  let section = 0;
  SECTIONS.forEach((id, i) => {
    const el = $(id);
    if (el && el.getBoundingClientRect().top < window.innerHeight * 0.6) section = i;
  });
  if (progress > 0.985) section = SECTIONS.length - 1;

  const key = `${comfort}|${ending}|${section}`;
  if (key === lastKey) return;
  lastKey = key;

  Object.assign(state, { comfort, ending, section, seen: Math.max(state.seen, section) });
  render();
}

let rafId = 0;
function onScroll() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    measure();
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

selectScene(0);
updateSlider();
render();
measure();
