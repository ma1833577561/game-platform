<template>
  <div class="fruit-game">
    <div class="fruit-hud">
      <div class="stat-card">
        <small>当前得分 / SCORE</small>
        <strong>{{ score.toLocaleString('zh-CN') }}</strong>
      </div>
      <div class="stat-card is-best">
        <small>最高纪录 / BEST</small>
        <strong>{{ best.toLocaleString('zh-CN') }}</strong>
      </div>
      <div class="next-card">
        <small>下一个</small>
        <canvas ref="nextCanvasRef" width="86" height="86" aria-hidden="true"></canvas>
      </div>
    </div>

    <div class="mission-card">
      <div class="mission-heading">
        <span class="mission-number">{{ missionNumber }}</span>
        <span v-if="combo >= 2" class="combo-badge">连击 ×{{ combo }}</span>
      </div>
      <div class="mission-main">
        <strong>{{ missionTitle }}</strong>
        <span>{{ missionTarget }}</span>
      </div>
      <div class="mission-track" aria-hidden="true">
        <span :style="{ width: `${missionFill}%` }"></span>
      </div>
    </div>

    <div class="board-wrap">
      <div
        ref="boardRef"
        class="fruit-board"
        tabindex="0"
        role="application"
        aria-label="合成西瓜游戏区域：移动瞄准，点击或松开投放；方向键调整，空格投放，P 暂停，R 重开"
        @pointermove="onPointerMove"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      >
        <canvas ref="canvasRef" width="840" height="1140" aria-hidden="true"></canvas>
        <span class="board-corner">{{ boardCorner }}</span>

        <div v-if="overlay" class="fruit-overlay">
          <div class="overlay-card">
            <div class="overlay-art" aria-hidden="true"></div>
            <h2>{{ overlay.title }}</h2>
            <p>{{ overlay.text }}</p>
            <button ref="overlayButtonRef" class="primary-button" type="button" @click="handleOverlayAction">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8a1 1 0 0 1 1.5-.86l12 7.2a1 1 0 0 1 0 1.72l-12 7.2A1 1 0 0 1 7 19.2V4.8Z"/></svg>
              {{ overlay.button }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="fruit-footer">
      <span class="footer-tip"><i aria-hidden="true"></i>移动瞄准 · 点击 / 松开投放</span>
      <div class="footer-actions">
        <button class="icon-button" type="button" :aria-label="muted ? '开启音效' : '关闭音效'" @click="toggleSound">
          <svg v-if="!muted" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4Z" />
            <path d="M17 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4Z" />
            <path d="M17 9l4 6M21 9l-4 6" />
          </svg>
        </button>
        <button class="icon-button" type="button" :aria-label="state === 'paused' ? '继续游戏' : '暂停游戏'" @click="togglePause">
          <svg v-if="state === 'paused'" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7V5Z" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
        </button>
        <button class="text-button" type="button" @click="resetGame">重新开始 ↗</button>
      </div>
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

interface Fruit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  level: number;
  born: number;
  angle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
}

type GameState = 'ready' | 'playing' | 'paused' | 'over' | 'stage-clear' | 'complete';
type OverlayAction = 'start' | 'resume' | 'next' | 'restart';

const WIDTH = 420;
const HEIGHT = 570;
const FLOOR = 565;
const DANGER_Y = 91;
const STORAGE_KEY = 'fruit-lab-best-v1';

const FRUITS = [
  { name: '小樱桃', r: 17, color: '#dc5768', light: '#f79095' },
  { name: '草莓', r: 23, color: '#ee736e', light: '#ffc29c' },
  { name: '葡萄', r: 29, color: '#9e79bc', light: '#c5a3df' },
  { name: '小橘子', r: 36, color: '#f3a452', light: '#ffd080' },
  { name: '柠檬', r: 44, color: '#eec55d', light: '#ffe997' },
  { name: '猕猴桃', r: 53, color: '#86b777', light: '#bedb92' },
  { name: '红苹果', r: 63, color: '#e76964', light: '#ffa290' },
  { name: '水蜜桃', r: 74, color: '#f0a7a0', light: '#ffd0b0' },
  { name: '菠萝', r: 86, color: '#dfa963', light: '#f8d889' },
  { name: '哈密瓜', r: 99, color: '#a8c87e', light: '#dbeba1' },
  { name: '大西瓜', r: 112, color: '#57a87c', light: '#9dd49a' }
];

const STAGES = [
  { name: '果园初体验', targetScore: 5000, pool: [0, 0, 1, 1, 2] },
  { name: '酸甜时光', targetScore: 10000, pool: [0, 1, 1, 2, 2, 3] },
  { name: '丰收物语', targetScore: 20000, pool: [1, 2, 2, 3, 3, 4] },
  { name: '盛夏果篮', targetScore: 40000, pool: [2, 2, 3, 3, 4, 5] },
  { name: '缤纷果宴', targetScore: 80000, pool: [2, 3, 3, 4, 4, 5] },
  { name: '甜蜜连连', targetScore: 160000, pool: [3, 3, 4, 4, 5] },
  { name: '金色丰收', targetScore: 320000, pool: [3, 4, 4, 5, 5] },
  { name: '瓜田奇遇', targetScore: 640000, pool: [3, 4, 5, 5, 6] },
  { name: '果园传奇', targetScore: 1280000, pool: [4, 4, 5, 5, 6] },
  { name: '西瓜终章', targetScore: 2560000, pool: [4, 5, 5, 6, 6] }
];

const Rules = {
  clampX(x: number, radius: number, width: number) {
    return Math.max(radius, Math.min(width - radius, x));
  },
  canMerge(first: Fruit, second: Fruit) {
    return first.level === second.level;
  },
  mergeLevel(level: number) {
    return level < 10 ? level + 1 : null;
  },
  mergePoints(level: number) {
    return (level + 1) * (level + 1) * 10;
  },
  shouldMerge(first: Fruit, second: Fruit) {
    return (
      this.canMerge(first, second) &&
      Math.hypot(first.x - second.x, first.y - second.y) <= first.r + second.r + 2.25
    );
  }
};

const boardRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const nextCanvasRef = ref<HTMLCanvasElement | null>(null);
const overlayButtonRef = ref<HTMLButtonElement | null>(null);

const score = ref(0);
const best = ref(0);
const stageIndex = ref(0);
const combo = ref(0);
const state = ref<GameState>('ready');
const muted = ref(false);
const announcement = ref('');
const overlay = ref<{ title: string; text: string; button: string } | null>(null);

let overlayAction: OverlayAction = 'start';
let ctx: CanvasRenderingContext2D | null = null;
let nextCtx: CanvasRenderingContext2D | null = null;
let fruits: Fruit[] = [];
let particles: Particle[] = [];
let popups: Popup[] = [];
let aimX = WIDTH / 2;
let currentLevel = 0;
let nextLevel = 1;
let cooldown = 0;
let dangerTime = 0;
let elapsed = 0;
let lastFrame = 0;
let accumulator = 0;
let pointerHeld = false;
let resting = false;
let restTime = 0;
let restAnchors = new Map<Fruit, { x: number; y: number }>();
let clearedStageIndex = 0;
let lastMergeAt = -Infinity;
let raf = 0;
let audioContext: AudioContext | null = null;

const stage = computed(() => STAGES[stageIndex.value] ?? null);

const missionNumber = computed(() =>
  stageIndex.value < STAGES.length
    ? `第 ${stageIndex.value + 1} / ${STAGES.length} 关`
    : '通关成功 · 无尽模式'
);

const missionTitle = computed(() => stage.value?.name ?? '无尽模式 · 西瓜大师');

const missionTarget = computed(() =>
  stage.value
    ? `目标 · 累计 ${stage.value.targetScore.toLocaleString('zh-CN')} 分`
    : '目标 · 冲刺最高分'
);

const missionFill = computed(() => {
  const current = stage.value;
  if (!current) {
    return 100;
  }
  const previous = stageIndex.value ? STAGES[stageIndex.value - 1].targetScore : 0;
  return Math.max(
    0,
    Math.min(100, ((score.value - previous) / (current.targetScore - previous)) * 100)
  );
});

const boardCorner = computed(() =>
  stageIndex.value < STAGES.length
    ? `FRUIT LAB · ${String(stageIndex.value + 1).padStart(2, '0')}`
    : 'FRUIT LAB · ∞'
);

function randomLevel(): number {
  const pool = STAGES[Math.min(stageIndex.value, STAGES.length - 1)].pool;
  return pool[Math.floor(Math.random() * pool.length)];
}

function addScore(points: number) {
  score.value += points;
  if (score.value > best.value) {
    best.value = score.value;
    try {
      localStorage.setItem(STORAGE_KEY, String(best.value));
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }
}

function sound(frequency: number, duration = 0.11, type: OscillatorType = 'sine') {
  if (muted.value) {
    return;
  }
  try {
    audioContext ||= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.38, audioContext.currentTime + duration);
    gain.gain.setValueAtTime(0.055, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    /* 音频不可用时静默 */
  }
}

function showOverlay(title: string, text: string, button: string, action: OverlayAction) {
  overlay.value = { title, text, button };
  overlayAction = action;
  nextTick(() => overlayButtonRef.value?.focus({ preventScroll: true }));
}

function resetGame() {
  fruits = [];
  particles = [];
  popups = [];
  score.value = 0;
  elapsed = 0;
  cooldown = 0;
  dangerTime = 0;
  resting = false;
  restTime = 0;
  restAnchors = new Map();
  stageIndex.value = 0;
  clearedStageIndex = 0;
  combo.value = 0;
  lastMergeAt = -Infinity;
  aimX = WIDTH / 2;
  currentLevel = randomLevel();
  nextLevel = randomLevel();
  overlay.value = null;
  state.value = 'playing';
  drawNext();
  boardRef.value?.focus({ preventScroll: true });
  announcement.value = '第一关开始，累计获得 5,000 分。移动指针瞄准并投放水果。';
}

function nextStage() {
  if (state.value !== 'stage-clear' && state.value !== 'complete') {
    return;
  }
  while (clearedStageIndex < STAGES.length && score.value >= STAGES[clearedStageIndex].targetScore) {
    clearedStageIndex += 1;
  }
  const stagesCleared = clearedStageIndex - stageIndex.value;
  stageIndex.value = clearedStageIndex;
  const highestDrop = Math.max(...STAGES[Math.min(stageIndex.value, STAGES.length - 1)].pool);
  currentLevel = Math.min(currentLevel + stagesCleared, highestDrop);
  nextLevel = Math.min(nextLevel + stagesCleared, highestDrop);
  combo.value = 0;
  lastMergeAt = -Infinity;
  overlay.value = null;
  state.value = 'playing';
  drawNext();
  boardRef.value?.focus({ preventScroll: true });
  announcement.value =
    stageIndex.value < STAGES.length
      ? `第 ${stageIndex.value + 1} 关开始，累计目标 ${STAGES[stageIndex.value].targetScore.toLocaleString('zh-CN')} 分。`
      : '全部通关，进入无尽挑战。';
}

function completeStage() {
  clearedStageIndex = stageIndex.value;
  while (clearedStageIndex < STAGES.length && score.value >= STAGES[clearedStageIndex].targetScore) {
    clearedStageIndex += 1;
  }
  const stagesCleared = clearedStageIndex - stageIndex.value;
  const lastStage = clearedStageIndex === STAGES.length;
  state.value = lastStage ? 'complete' : 'stage-clear';
  const title = lastStage
    ? '西瓜大师，十关通关啦！'
    : stagesCleared > 1
      ? `连过 ${stagesCleared} 关！`
      : `第 ${stageIndex.value + 1} 关完成！`;
  const message = lastStage
    ? `累计 ${score.value.toLocaleString('zh-CN')} 分，十关全部完成！继续挑战最高纪录吧。`
    : `累计 ${score.value.toLocaleString('zh-CN')} 分，已达到第 ${clearedStageIndex} 关目标！下一关掉落水果升级。`;
  showOverlay(title, message, lastStage ? '继续无尽挑战' : '进入下一关', 'next');
  announcement.value = `${title} ${message}`;
  sound(700, 0.22);
}

function togglePause() {
  if (state.value === 'playing') {
    state.value = 'paused';
    showOverlay('先歇一小会儿。', '水果们会乖乖等你，准备好了再继续。', '继续游戏', 'resume');
  } else if (state.value === 'paused') {
    overlay.value = null;
    state.value = 'playing';
    boardRef.value?.focus({ preventScroll: true });
  }
}

function gameOver() {
  state.value = 'over';
  sound(210, 0.28, 'triangle');
  const progress =
    stageIndex.value < STAGES.length ? `闯到了第 ${stageIndex.value + 1} 关` : '完成了全部关卡';
  showOverlay(
    '果园装满啦！',
    `${progress}，收获 ${score.value.toLocaleString('zh-CN')} 分。再来挑战一次吧！`,
    '再玩一次',
    'restart'
  );
  announcement.value = `游戏结束，得分 ${score.value}。`;
}

function drop() {
  if (state.value !== 'playing' || cooldown > 0) {
    return;
  }
  resting = false;
  restTime = 0;
  restAnchors = new Map();
  const radius = FRUITS[currentLevel].r;
  aimX = Rules.clampX(aimX, radius + 2, WIDTH);
  fruits.push({
    x: aimX,
    y: 49,
    vx: 0,
    vy: 10,
    r: radius,
    level: currentLevel,
    born: elapsed,
    angle: (Math.random() - 0.5) * 0.15
  });
  currentLevel = nextLevel;
  nextLevel = randomLevel();
  cooldown = 0.42;
  drawNext();
  sound(335, 0.09);
}

function createBurst(x: number, y: number, color: string, points: number) {
  const count = matchMedia('(prefers-reduced-motion: reduce)').matches ? 3 : 11;
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.35;
    const speed = 60 + Math.random() * 125;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      life: 0.55,
      maxLife: 0.55,
      r: 2 + Math.random() * 3,
      color
    });
  }
  popups.push({ x, y: y - 10, text: `+${points}`, life: 0.9 });
}

function merge(first: Fruit, second: Fruit) {
  const level = first.level;
  const newLevel = Rules.mergeLevel(level);
  const x = Rules.clampX(
    (first.x + second.x) / 2,
    newLevel === null ? 0 : FRUITS[newLevel].r,
    WIDTH
  );
  const y = (first.y + second.y) / 2;
  combo.value = elapsed - lastMergeAt <= 2.7 ? Math.min(combo.value + 1, 5) : 1;
  lastMergeAt = elapsed;
  const points = Rules.mergePoints(level) * combo.value;
  addScore(points);
  createBurst(x, y, FRUITS[level].color, points);
  sound(330 + level * 55, 0.15);
  if (newLevel !== null) {
    const radius = FRUITS[newLevel].r;
    const firstMass = first.r * first.r;
    const secondMass = second.r * second.r;
    const vx = ((first.vx * firstMass + second.vx * secondMass) / (firstMass + secondMass)) * 0.78;
    fruits.push({
      x,
      y: Math.min(FLOOR - radius, Math.max(radius, y)),
      vx,
      vy: -175,
      r: radius,
      level: newLevel,
      born: elapsed,
      angle: (first.angle + second.angle) / 2
    });
    if (newLevel === 10) {
      announcement.value = '太棒了，你合成了大西瓜！';
    }
  } else {
    announcement.value = '完美！两个大西瓜合成，果园又有空间了。';
  }
  if (state.value === 'playing' && stageIndex.value < STAGES.length && score.value >= STAGES[stageIndex.value].targetScore) {
    completeStage();
  }
}

function mergeRestingPair() {
  for (let firstIndex = 0; firstIndex < fruits.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < fruits.length; secondIndex += 1) {
      const first = fruits[firstIndex];
      const second = fruits[secondIndex];
      if (!Rules.shouldMerge(first, second)) {
        continue;
      }
      fruits.splice(secondIndex, 1);
      fruits.splice(firstIndex, 1);
      resting = false;
      restTime = 0;
      restAnchors = new Map();
      merge(first, second);
      return true;
    }
  }
  return false;
}

function step(dt: number) {
  elapsed += dt;
  cooldown = Math.max(0, cooldown - dt);
  if (resting && !mergeRestingPair()) {
    finishStep(dt);
    return;
  }
  const removed = new Set<Fruit>();
  const pairs: Array<[Fruit, Fruit]> = [];

  for (const fruit of fruits) {
    const grounded = fruit.y >= FLOOR - fruit.r - 0.5;
    fruit.vy += 1450 * dt;
    fruit.vx *= Math.exp((grounded ? -2.1 : -0.4) * dt);
    fruit.x += fruit.vx * dt;
    fruit.y += fruit.vy * dt;
    fruit.angle += (fruit.vx / fruit.r) * dt * 0.8;
    if (fruit.x < fruit.r) {
      fruit.x = fruit.r;
      fruit.vx = Math.abs(fruit.vx) * 0.3;
    }
    if (fruit.x > WIDTH - fruit.r) {
      fruit.x = WIDTH - fruit.r;
      fruit.vx = -Math.abs(fruit.vx) * 0.3;
    }
    if (fruit.y > FLOOR - fruit.r) {
      fruit.y = FLOOR - fruit.r;
      fruit.vy = fruit.vy > 60 ? -fruit.vy * 0.19 : 0;
    }
  }

  for (let pass = 0; pass < 5; pass += 1) {
    for (let firstIndex = 0; firstIndex < fruits.length; firstIndex += 1) {
      const first = fruits[firstIndex];
      if (removed.has(first)) {
        continue;
      }
      for (let secondIndex = firstIndex + 1; secondIndex < fruits.length; secondIndex += 1) {
        const second = fruits[secondIndex];
        if (removed.has(second)) {
          continue;
        }
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const minDistance = first.r + second.r - 2;
        const distanceSquared = dx * dx + dy * dy;
        if (Rules.shouldMerge(first, second)) {
          removed.add(first);
          removed.add(second);
          pairs.push([first, second]);
          break;
        }
        if (distanceSquared >= minDistance * minDistance) {
          continue;
        }
        const distance = Math.sqrt(distanceSquared) || 0.001;
        const nx = distanceSquared === 0 ? 1 : dx / distance;
        const ny = distanceSquared === 0 ? 0 : dy / distance;
        const overlap = minDistance - distance;
        const firstInverseMass = 1 / (first.r * first.r);
        const secondInverseMass = 1 / (second.r * second.r);
        const inverseMassSum = firstInverseMass + secondInverseMass;
        const firstShare = firstInverseMass / inverseMassSum;
        first.x -= nx * overlap * firstShare * 0.88;
        first.y -= ny * overlap * firstShare * 0.88;
        second.x += nx * overlap * (1 - firstShare) * 0.88;
        second.y += ny * overlap * (1 - firstShare) * 0.88;
        const relative = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
        if (relative < 0) {
          const impulse = (-(1 + 0.24) * relative) / inverseMassSum;
          first.vx -= nx * impulse * firstInverseMass;
          first.vy -= ny * impulse * firstInverseMass;
          second.vx += nx * impulse * secondInverseMass;
          second.vy += ny * impulse * secondInverseMass;
          const tangentX = -ny;
          const tangentY = nx;
          const tangentSpeed = (second.vx - first.vx) * tangentX + (second.vy - first.vy) * tangentY;
          const friction = Math.max(
            -impulse * 0.16,
            Math.min(impulse * 0.16, -tangentSpeed / inverseMassSum)
          );
          first.vx -= tangentX * friction * firstInverseMass;
          first.vy -= tangentY * friction * firstInverseMass;
          second.vx += tangentX * friction * secondInverseMass;
          second.vy += tangentY * friction * secondInverseMass;
        }
      }
    }
    for (const fruit of fruits) {
      fruit.x = Rules.clampX(fruit.x, fruit.r, WIDTH);
      if (fruit.y > FLOOR - fruit.r) {
        fruit.y = FLOOR - fruit.r;
        fruit.vy = Math.min(0, fruit.vy);
      }
    }
  }

  if (pairs.length) {
    fruits = fruits.filter(fruit => !removed.has(fruit));
    for (const [first, second] of pairs) {
      merge(first, second);
    }
  }

  if (fruits.length) {
    const steady =
      fruits.length === restAnchors.size &&
      fruits.every(fruit => {
        const anchor = restAnchors.get(fruit);
        return anchor && Math.hypot(fruit.x - anchor.x, fruit.y - anchor.y) < 3;
      });
    if (steady) {
      restTime += dt;
      if (restTime > 0.75) {
        resting = true;
        for (const fruit of fruits) {
          fruit.vx = 0;
          fruit.vy = 0;
        }
      }
    } else {
      restAnchors = new Map(fruits.map(fruit => [fruit, { x: fruit.x, y: fruit.y }]));
      restTime = 0;
    }
  }

  finishStep(dt);
}

function finishStep(dt: number) {
  const endangered = fruits.some(
    fruit =>
      elapsed - fruit.born > 1.5 &&
      fruit.y - fruit.r < DANGER_Y &&
      Math.abs(fruit.vy) < 100
  );
  dangerTime = endangered ? dangerTime + dt : Math.max(0, dangerTime - dt * 2);
  if (state.value === 'playing' && dangerTime > 2.4) {
    gameOver();
  }
  if (combo.value && elapsed - lastMergeAt > 2.7) {
    combo.value = 0;
  }

  for (const particle of particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 270 * dt;
  }
  particles = particles.filter(particle => particle.life > 0);
  for (const popup of popups) {
    popup.life -= dt;
    popup.y -= dt * 35;
  }
  popups = popups.filter(popup => popup.life > 0);
}

function drawFruit(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  level: number,
  angle = 0,
  alpha = 1
) {
  const fruit = FRUITS[level];
  context.save();
  context.globalAlpha = alpha;
  context.translate(x, y);
  context.rotate(angle);
  context.shadowColor = 'rgba(94,70,52,.19)';
  context.shadowBlur = 9;
  context.shadowOffsetY = 4;
  const gradient = context.createRadialGradient(
    -radius * 0.35,
    -radius * 0.48,
    radius * 0.08,
    0,
    0,
    radius * 1.3
  );
  gradient.addColorStop(0, fruit.light);
  gradient.addColorStop(0.67, fruit.color);
  gradient.addColorStop(1, fruit.color);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  if (level === 10) {
    context.strokeStyle = '#34805d';
    context.lineWidth = Math.max(3, radius * 0.072);
    for (let stripe = -2; stripe <= 2; stripe += 1) {
      context.beginPath();
      context.moveTo(stripe * radius * 0.32, -radius * 0.89);
      context.bezierCurveTo(
        stripe * radius * 0.37 - radius * 0.18,
        -radius * 0.34,
        stripe * radius * 0.38 + radius * 0.18,
        radius * 0.4,
        stripe * radius * 0.32,
        radius * 0.86
      );
      context.stroke();
    }
  } else if (level === 5 || level === 9) {
    context.strokeStyle = 'rgba(255,255,255,.28)';
    context.lineWidth = Math.max(1, radius * 0.04);
    for (let stripe = -1; stripe <= 1; stripe += 1) {
      context.beginPath();
      context.arc(0, 0, radius * (0.42 + stripe * 0.2), 0.15, Math.PI - 0.15);
      context.stroke();
    }
  } else if (level === 8) {
    context.strokeStyle = 'rgba(124,100,52,.22)';
    context.lineWidth = Math.max(1, radius * 0.035);
    for (let stripe = -2; stripe <= 2; stripe += 1) {
      context.beginPath();
      context.moveTo(-radius * 0.8, stripe * radius * 0.34 - radius * 0.25);
      context.lineTo(radius * 0.8, stripe * radius * 0.34 + radius * 0.25);
      context.stroke();
    }
  }
  context.fillStyle = 'rgba(255,255,255,.30)';
  context.beginPath();
  context.ellipse(-radius * 0.36, -radius * 0.48, radius * 0.24, radius * 0.12, -0.55, 0, Math.PI * 2);
  context.fill();
  if (radius >= 16) {
    context.strokeStyle = '#56714e';
    context.lineWidth = Math.max(2, radius * 0.055);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(0, -radius * 0.89);
    context.quadraticCurveTo(radius * 0.02, -radius * 1.08, radius * 0.13, -radius * 1.12);
    context.stroke();
    context.fillStyle = '#70a975';
    context.beginPath();
    context.ellipse(radius * 0.25, -radius * 1.04, radius * 0.21, radius * 0.095, -0.45, 0, Math.PI * 2);
    context.fill();
  }
  if (radius >= 13) {
    const eyeY = radius * 0.05;
    context.fillStyle = '#554552';
    context.beginPath();
    context.arc(-radius * 0.23, eyeY, Math.max(1.8, radius * 0.048), 0, Math.PI * 2);
    context.arc(radius * 0.23, eyeY, Math.max(1.8, radius * 0.048), 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#654a52';
    context.lineWidth = Math.max(1.5, radius * 0.035);
    context.lineCap = 'round';
    context.beginPath();
    context.arc(0, radius * 0.13, radius * 0.11, 0.05, Math.PI - 0.05);
    context.stroke();
    context.fillStyle = 'rgba(255,156,150,.52)';
    context.beginPath();
    context.arc(-radius * 0.41, radius * 0.18, radius * 0.09, 0, Math.PI * 2);
    context.arc(radius * 0.41, radius * 0.18, radius * 0.09, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawNext() {
  if (!nextCtx) {
    return;
  }
  nextCtx.clearRect(0, 0, 86, 86);
  const radius = Math.min(FRUITS[nextLevel].r, 28);
  drawFruit(nextCtx, 43, 45, radius, nextLevel);
}

function draw() {
  if (!ctx || !canvasRef.value) {
    return;
  }
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  ctx.save();
  ctx.scale(2, 2);

  ctx.save();
  ctx.setLineDash([5, 7]);
  ctx.strokeStyle = dangerTime
    ? `rgba(231,92,82,${Math.min(0.9, 0.48 + dangerTime * 0.22)})`
    : 'rgba(226,129,103,.38)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(13, DANGER_Y);
  ctx.lineTo(WIDTH - 13, DANGER_Y);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = dangerTime ? '#d4665b' : '#c29c88';
  ctx.font = 'bold 10px system-ui';
  ctx.fillText('警戒线', 14, DANGER_Y - 10);

  if (state.value === 'playing' && cooldown <= 0) {
    const radius = FRUITS[currentLevel].r;
    const x = Rules.clampX(aimX, radius + 2, WIDTH);
    ctx.save();
    ctx.strokeStyle = 'rgba(137,125,109,.24)';
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, 68);
    ctx.lineTo(x, HEIGHT - 15);
    ctx.stroke();
    ctx.restore();
    drawFruit(ctx, x, 43, radius, currentLevel, 0, 0.88);
  }

  for (const fruit of fruits) {
    drawFruit(ctx, fruit.x, fruit.y, fruit.r, fruit.level, fruit.angle);
  }
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = '900 17px system-ui';
  for (const popup of popups) {
    ctx.globalAlpha = Math.max(0, popup.life / 0.9);
    ctx.fillStyle = '#e17c60';
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(199,149,112,.33)';
  ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
  ctx.restore();
}

function frame(timestamp: number) {
  if (!lastFrame) {
    lastFrame = timestamp;
  }
  accumulator += Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;
  if (state.value === 'playing') {
    let iterations = 0;
    while (accumulator >= 1 / 60 && iterations < 3) {
      step(1 / 60);
      accumulator -= 1 / 60;
      iterations += 1;
      if (state.value !== 'playing') {
        break;
      }
    }
  } else {
    accumulator = 0;
  }
  draw();
  raf = requestAnimationFrame(frame);
}

function pointerX(event: PointerEvent): number {
  const board = boardRef.value;
  if (!board) {
    return WIDTH / 2;
  }
  const bounds = board.getBoundingClientRect();
  return Rules.clampX(
    ((event.clientX - bounds.left) / bounds.width) * WIDTH,
    FRUITS[currentLevel].r + 2,
    WIDTH
  );
}

function onPointerMove(event: PointerEvent) {
  if (state.value === 'playing') {
    aimX = pointerX(event);
  }
}

function onPointerDown(event: PointerEvent) {
  if (state.value !== 'playing') {
    return;
  }
  pointerHeld = true;
  aimX = pointerX(event);
  boardRef.value?.setPointerCapture(event.pointerId);
}

function onPointerUp(event: PointerEvent) {
  if (!pointerHeld) {
    return;
  }
  pointerHeld = false;
  aimX = pointerX(event);
  drop();
}

function onPointerCancel() {
  pointerHeld = false;
}

function handleOverlayAction() {
  if (overlayAction === 'resume') {
    togglePause();
    return;
  }
  if (overlayAction === 'next') {
    nextStage();
    return;
  }
  resetGame();
}

function toggleSound() {
  muted.value = !muted.value;
  if (!muted.value) {
    sound(490);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.code === 'KeyP' && (state.value === 'playing' || state.value === 'paused')) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (event.code === 'KeyR') {
    event.preventDefault();
    resetGame();
    return;
  }
  if (
    state.value !== 'playing' ||
    (document.activeElement !== boardRef.value && document.activeElement !== document.body)
  ) {
    return;
  }
  if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    event.preventDefault();
    aimX = Rules.clampX(
      aimX + (event.code === 'ArrowLeft' ? -18 : 18),
      FRUITS[currentLevel].r + 2,
      WIDTH
    );
  }
  if (event.code === 'Space') {
    event.preventDefault();
    drop();
  }
}

function handleVisibility() {
  if (document.hidden && state.value === 'playing') {
    togglePause();
  }
}

onMounted(() => {
  try {
    best.value = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    best.value = 0;
  }

  const canvas = canvasRef.value;
  const nextCanvas = nextCanvasRef.value;
  if (!canvas || !nextCanvas) {
    return;
  }
  ctx = canvas.getContext('2d');
  nextCtx = nextCanvas.getContext('2d');

  currentLevel = randomLevel();
  nextLevel = randomLevel();
  drawNext();
  showOverlay(
    '今天，来点甜的。',
    '十关积分挑战，第一关累计达到 5,000 分。连续合成还能连击加分，轻点放下水果开始吧！',
    '开始合成',
    'start'
  );

  window.addEventListener('keydown', handleKeydown);
  document.addEventListener('visibilitychange', handleVisibility);
  raf = requestAnimationFrame(frame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('visibilitychange', handleVisibility);
  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
});

defineExpose({
  reset: resetGame,
  pause: () => {
    if (state.value === 'playing') {
      togglePause();
    }
  },
  resume: () => {
    if (state.value === 'paused') {
      togglePause();
    }
  }
});
</script>

<style scoped>
.fruit-game {
  display: grid;
  gap: 11px;
  width: 100%;
}

.fruit-hud {
  display: flex;
  gap: 9px;
}

.next-card {
  width: 86px;
  flex: none;
  padding: 7px 8px 4px;
  text-align: center;
  background: var(--green-soft);
  border: 1.5px solid var(--green-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card-green);
}

.next-card small {
  display: block;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
  color: #7d9a83;
}

.next-card canvas {
  display: block;
  width: 48px;
  height: 48px;
  margin: 0 auto;
}

.mission-card {
  padding: 11px 15px 12px;
  background: var(--green-soft);
  border: 1.5px solid var(--green-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card-green);
}

.mission-heading,
.mission-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mission-heading {
  min-height: 20px;
  margin-bottom: 2px;
}

.mission-number {
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.11em;
  color: #578564;
}

.mission-main strong {
  font-size: clamp(15px, 3.6vw, 17px);
  font-weight: 850;
  letter-spacing: -0.03em;
  color: #344a3a;
}

.mission-main span {
  font-size: 11.5px;
  font-weight: 750;
  color: #67806b;
  text-align: right;
}

.mission-track {
  height: 6px;
  margin-top: 9px;
  border-radius: 10px;
  background: #d7e7ce;
  overflow: hidden;
}

.mission-track span {
  display: block;
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg, #71b77c, #e9ba6a);
  transition: width 0.45s ease;
}

.combo-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--coral-soft);
  color: #b35337;
  font-size: 11px;
  font-weight: 900;
  animation: combo-pop 0.25s ease-out;
}

@keyframes combo-pop {
  from {
    transform: scale(0.75);
  }
  to {
    transform: scale(1);
  }
}

.board-wrap {
  width: 100%;
  padding: 9px;
  background: var(--panel);
  border: 2px solid #f2ddc8;
  border-radius: 27px;
  box-shadow: var(--shadow-soft), 0 6px 0 #edd9c3;
}

.fruit-board {
  position: relative;
  width: 100%;
  max-width: min(100%, calc(62dvh * 420 / 570));
  margin: 0 auto;
  aspect-ratio: 420 / 570;
  overflow: hidden;
  border-radius: 20px;
  background:
    radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.92), transparent 32%),
    linear-gradient(180deg, #fff5e2 0%, #fff9ee 75%, #fbe9d3 100%);
  touch-action: none;
  outline: none;
  user-select: none;
}

.fruit-board::before {
  content: "";
  pointer-events: none;
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#cda789 1px, transparent 1px);
  background-size: 23px 23px;
  opacity: 0.12;
}

.fruit-board canvas {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
}

.board-corner {
  position: absolute;
  left: 16px;
  bottom: 11px;
  color: #c8a98d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.13em;
  pointer-events: none;
}

.fruit-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  padding: 20px;
  text-align: center;
  background: rgba(255, 249, 236, 0.84);
  backdrop-filter: blur(6px);
}

.overlay-card {
  max-width: 300px;
}

.overlay-art {
  position: relative;
  width: 96px;
  height: 96px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: #d9ebd2;
  box-shadow: 0 7px 0 #bdd8af;
  transform: rotate(-10deg);
}

.overlay-art::before {
  content: "";
  position: absolute;
  inset: 15px;
  border: 9px solid #4a9c67;
  border-radius: 50%;
  background: #f17372;
  box-shadow: inset 0 0 0 5px #f7b7a4;
}

.overlay-art::after {
  content: "•••";
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 22px;
  letter-spacing: 4px;
  color: #684c48;
  transform: translate(3px, 0) rotate(10deg);
}

.overlay-card h2 {
  font-size: clamp(22px, 5vw, 27px);
  font-weight: 900;
  letter-spacing: -0.045em;
  margin-bottom: 8px;
}

.overlay-card p {
  max-width: 260px;
  margin: 0 auto 20px;
  color: #777b7d;
  font-size: 13.5px;
  line-height: 1.8;
}

.overlay-card .primary-button {
  min-width: 172px;
  min-height: 50px;
  font-size: 15px;
}

.fruit-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 4px 0;
  font-size: 11.5px;
  color: #918d84;
}

.footer-tip {
  display: flex;
  align-items: center;
  gap: 7px;
}

.footer-tip i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #69b783;
  box-shadow: 0 0 0 4px #e0f0d9;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.footer-actions .icon-button {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 11px;
}

.footer-actions .text-button {
  min-height: 38px;
  font-size: 12px;
}

@media (max-width: 520px) {
  .fruit-hud {
    gap: 7px;
  }

  .next-card {
    width: 74px;
    padding: 6px 6px 3px;
  }

  .next-card canvas {
    width: 42px;
    height: 42px;
  }

  .mission-card {
    padding: 9px 12px 10px;
  }

  .mission-main {
    align-items: flex-end;
  }

  .mission-main strong {
    font-size: 15px;
  }

  .mission-main span {
    font-size: 10.5px;
  }

  .board-wrap {
    padding: 7px;
    border-radius: 23px;
  }

  .fruit-board {
    border-radius: 17px;
  }

  .fruit-footer {
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11px;
  }

  .footer-tip {
    order: 2;
    width: 100%;
    justify-content: center;
    padding-top: 2px;
  }

  .footer-actions {
    width: 100%;
    justify-content: space-between;
  }

  .footer-actions .text-button {
    margin-left: auto;
  }
}
</style>
