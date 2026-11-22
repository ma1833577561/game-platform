<template>
  <main class="mahjong-game" role="application" aria-label="麻将对对碰游戏">
    <div class="game-hud">
      <div class="hud-stats">
        <div class="stat-card">
          <small>得分</small>
          <strong>{{ score.toLocaleString('zh-CN') }}</strong>
        </div>
        <div class="stat-card">
          <small>时间</small>
          <strong>{{ formatTime(timeElapsed) }}</strong>
        </div>
        <div class="stat-card combo-card" :class="{ 'is-hot': combo > 1 }">
          <small>连击</small>
          <strong>{{ combo }}x</strong>
        </div>
        <div class="stat-card">
          <small>剩余</small>
          <strong>{{ gameState === 'idle' ? '—' : remainingTiles }}</strong>
        </div>
      </div>

      <div class="hud-bar">
        <div class="hud-actions">
          <button
            class="ghost-button"
            type="button"
            :disabled="gameState !== 'playing' || hintCount <= 0"
            @click="showHint"
          >
            提示 ({{ hintCount }})
          </button>
          <button
            class="ghost-button"
            type="button"
            :disabled="gameState !== 'playing' || shuffleCount <= 0"
            @click="shuffleTiles"
          >
            洗牌 ({{ shuffleCount }})
          </button>
          <button class="ghost-button" type="button" @click="restart">重开</button>
          <button class="icon-button" type="button" aria-label="对局设置" @click="showSettings = true">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="board-wrap">
      <div class="canvas-stage">
        <canvas
          ref="gameCanvas"
          class="game-canvas"
          tabindex="0"
          aria-label="麻将牌游戏区域，点击两张相同的牌进行消除"
          @click="handleCanvasClick"
          @keydown.enter="handleKeyPress"
          @keydown.space="handleKeyPress"
        ></canvas>

        <div v-if="gameState === 'idle'" class="board-overlay">
          <div class="overlay-card welcome-card">
            <span class="overlay-eyebrow">MAHJONG MATCH</span>
            <h2>麻将对对碰</h2>
            <p>点两张相同的牌消除，连击拿高分。</p>
            <div class="rule-chips">
              <span class="chip">相同配对</span>
              <span class="chip">连击加成</span>
              <span class="chip">有限道具</span>
            </div>
            <button class="primary-button" type="button" @click="startGame">开始游戏</button>
            <button class="text-button" type="button" @click="showSettings = true">
              难度 {{ difficulty }} · 布局 {{ currentLayout }} · 调整
            </button>
          </div>
        </div>

        <div v-else-if="gameState === 'won'" class="board-overlay">
          <div class="overlay-card result-card">
            <span class="overlay-eyebrow">CLEARED</span>
            <h2>全部消除！</h2>
            <p>得分 <b>{{ score.toLocaleString('zh-CN') }}</b> · 用时 {{ formatTime(timeElapsed) }}</p>
            <div class="overlay-actions">
              <button class="primary-button" type="button" @click="restart">再来一局</button>
              <button class="ghost-button" type="button" @click="showSettings = true">调整设置</button>
            </div>
          </div>
        </div>

        <div v-else-if="gameState === 'lost'" class="board-overlay">
          <div class="overlay-card result-card">
            <span class="overlay-eyebrow">GAME OVER</span>
            <h2>没有可配对的牌</h2>
            <p>得分 <b>{{ score.toLocaleString('zh-CN') }}</b> · 剩余 {{ remainingTiles }} 张</p>
            <div class="overlay-actions">
              <button class="primary-button" type="button" @click="restart">再来一局</button>
              <button class="ghost-button" type="button" @click="showSettings = true">调整设置</button>
            </div>
          </div>
        </div>

        <div class="floating-layer" aria-hidden="true">
          <span
            v-for="item in floatingScores"
            :key="item.id"
            class="floating-score"
            :style="{ left: `${(item.x / CANVAS_WIDTH) * 100}%`, top: `${(item.y / CANVAS_HEIGHT) * 100}%` }"
          >
            +{{ item.value }}
          </span>
        </div>
      </div>
    </div>

    <p class="game-note">点击两张相同的牌消除 · 3 秒内连续消除有连击加成</p>

    <transition name="combo-animation">
      <div v-if="showComboPopup" class="combo-popup" aria-live="polite">
        <div class="combo-content">
          <span class="combo-icon" aria-hidden="true">🔥</span>
          <span class="combo-text">{{ combo }} 连击！</span>
        </div>
      </div>
    </transition>

    <div v-if="showSettings" class="sheet-backdrop" @click.self="showSettings = false">
      <div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="mahjong-settings-title">
        <div class="sheet-head">
          <div>
            <h2 id="mahjong-settings-title">对局设置</h2>
            <div class="sheet-sub">SETTINGS</div>
          </div>
          <button class="icon-button" type="button" aria-label="关闭设置" @click="showSettings = false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div class="sheet-body">
          <div class="setting-block">
            <div class="setting-head">
              <span>难度</span>
              <small>{{ difficulty }}</small>
            </div>
            <div class="segmented">
              <button
                v-for="item in difficultyOptions"
                :key="item"
                type="button"
                :class="{ 'is-active': difficulty === item }"
                :aria-pressed="difficulty === item"
                @click="difficulty = item"
              >
                {{ item }}
              </button>
            </div>
            <p class="setting-tip">简单模式提示和洗牌各 5 次，普通 3 次，困难 1 次。</p>
          </div>

          <div class="setting-block">
            <div class="setting-head">
              <span>布局</span>
              <small>{{ currentLayout }}</small>
            </div>
            <div class="segmented">
              <button
                v-for="item in layoutOptions"
                :key="item"
                type="button"
                :class="{ 'is-active': currentLayout === item }"
                :aria-pressed="currentLayout === item"
                @click="currentLayout = item"
              >
                {{ item }}
              </button>
            </div>
            <p class="setting-tip">经典是规整的 8×6 网格，金字塔是层叠的三角形。</p>
          </div>

          <p v-if="gameState === 'playing'" class="setting-warn">当前对局进行中，开始新局后设置才会生效。</p>

          <button class="primary-button sheet-done" type="button" @click="applySettings">开始新局</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

// ===== 类型定义 =====

// 麻将牌类型
type TileType = 'wan' | 'tiao' | 'tong' | 'wind' | 'dragon';

// 麻将牌接口
interface Tile {
  id: string;
  type: TileType;
  value: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  selected: boolean;
  matched: boolean;
  hint: boolean;
}

// 游戏状态
type GameState = 'idle' | 'playing' | 'won' | 'lost';

// ===== 常量配置 =====

// 画布逻辑分辨率固定，展示尺寸交给 CSS 随容器等比缩放
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 600;

const TILE_WIDTH = 68;
const TILE_HEIGHT = 88;
const TILE_GAP = 6;
const TILE_CORNER = 10;

const difficultyOptions = ['简单', '普通', '困难'] as const;
const layoutOptions = ['经典', '金字塔'] as const;

// 颜色配置
const COLORS = {
  wan: '#c0392b',
  tiao: '#2f7d4f',
  tong: '#2f6fa8',
  wind: '#6d4a8f',
  dragon: '#c9552f',
  border: '#c39a6b',
  selected: '#e0a33a',
  hint: '#4f93a8'
};

// 麻将牌 Unicode 字符
const TILE_SYMBOLS: Record<TileType, string[]> = {
  wan: ['一', '二', '三', '四', '五', '六', '七', '八', '九'],
  tiao: ['🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘'],
  tong: ['🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡'],
  wind: ['东', '南', '西', '北'],
  dragon: ['中', '发', '白']
};

const WIND_SYMBOLS = ['东', '南', '西', '北'];
const DRAGON_SYMBOLS = ['中', '发', '白'];

// ===== 响应式状态 =====

const gameCanvas = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

// 游戏状态
const gameState = ref<GameState>('idle');
const score = ref(0);
const timeElapsed = ref(0);
const combo = ref(0);
const comboTimer = ref<NodeJS.Timeout | null>(null);
const selectedTile = ref<Tile | null>(null);
const tiles = ref<Tile[]>([]);

// 游戏设置
const difficulty = ref<'简单' | '普通' | '困难'>('普通');
const currentLayout = ref<'经典' | '金字塔'>('经典');
const hintCount = ref(3);
const shuffleCount = ref(3);
const showSettings = ref(false);

// 动画状态
const floatingScores = ref<Array<{ id: number; x: number; y: number; value: number }>>([]);
const showComboPopup = ref(false);
const animationId = ref<number | null>(null);
let floatingScoreId = 0;

// 计时器
let timerInterval: NodeJS.Timeout | null = null;

// ===== 计算属性 =====

const remainingTiles = computed(() => tiles.value.filter(t => !t.matched).length);

// ===== 生命周期 =====

onMounted(() => {
  if (gameCanvas.value) {
    ctx.value = gameCanvas.value.getContext('2d');
    initCanvas();
    // 不自动开始游戏，等待用户点击"开始游戏"按钮
    renderIdleState();
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (comboTimer.value) clearTimeout(comboTimer.value);
  if (animationId.value) cancelAnimationFrame(animationId.value);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleKeydown);
});

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    showSettings.value = false;
  }
}

// ===== 游戏初始化 =====

function initCanvas() {
  if (!gameCanvas.value || !ctx.value) return;

  const canvas = gameCanvas.value;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(CANVAS_WIDTH * dpr);
  canvas.height = Math.round(CANVAS_HEIGHT * dpr);

  // 重置变换，避免重复 scale 累积
  ctx.value.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// 渲染空闲状态的画布背景（游戏开始前）
function renderIdleState() {
  if (!gameCanvas.value || !ctx.value) return;

  const context = ctx.value;
  drawBackground(context, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 装饰性麻将牌图案（半透明）
  context.save();
  context.globalAlpha = 0.16;
  for (let x = 26; x < CANVAS_WIDTH - 40; x += 96) {
    for (let y = 26; y < CANVAS_HEIGHT - 40; y += 112) {
      context.fillStyle = '#e5c69c';
      roundRect(context, x, y, 58, 76, 10);
      context.fill();
    }
  }
  context.restore();
}

function startGame() {
  gameState.value = 'playing';
  score.value = 0;
  timeElapsed.value = 0;
  combo.value = 0;
  selectedTile.value = null;
  floatingScores.value = [];
  hintCount.value = difficulty.value === '简单' ? 5 : difficulty.value === '普通' ? 3 : 1;
  shuffleCount.value = difficulty.value === '简单' ? 5 : difficulty.value === '普通' ? 3 : 1;

  generateTiles();
  startTimer();
  render();
}

function applySettings() {
  showSettings.value = false;
  startGame();
}

function generateTiles() {
  tiles.value = [];
  const pairs = currentLayout.value === '经典' ? 36 : 48;
  const tilePairs = generateTilePairs(pairs);

  // 根据布局放置麻将牌
  if (currentLayout.value === '经典') {
    placeClassicLayout(tilePairs);
  } else {
    placePyramidLayout(tilePairs);
  }
}

function generateTilePairs(count: number): TileType[] {
  const types: TileType[] = [];
  const wanCount = Math.floor(count * 0.4);
  const tiaoCount = Math.floor(count * 0.3);
  const tongCount = Math.floor(count * 0.3);

  for (let i = 0; i < wanCount; i++) {
    types.push('wan');
  }
  for (let i = 0; i < tiaoCount; i++) {
    types.push('tiao');
  }
  for (let i = 0; i < tongCount; i++) {
    types.push('tong');
  }

  // 补充剩余数量
  while (types.length < count) {
    types.push('wan');
  }

  // 打乱顺序
  return shuffleArray(types);
}

function placeClassicLayout(types: TileType[]) {
  const cols = 8;
  const rows = 6;
  const layoutWidth = cols * TILE_WIDTH + (cols - 1) * TILE_GAP;
  const layoutHeight = rows * TILE_HEIGHT + (rows - 1) * TILE_GAP;
  const startX = (CANVAS_WIDTH - layoutWidth) / 2;
  const startY = (CANVAS_HEIGHT - layoutHeight) / 2;

  let index = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (index >= types.length) break;

      // 跳过某些位置形成不规则布局
      if ((row + col) % 3 === 0 && row > 2) continue;

      const tile: Tile = {
        id: `tile-${index}`,
        type: types[index],
        value: Math.floor(Math.random() * 9) + 1,
        x: startX + col * (TILE_WIDTH + TILE_GAP),
        y: startY + row * (TILE_HEIGHT + TILE_GAP),
        z: row,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        selected: false,
        matched: false,
        hint: false
      };

      tiles.value.push(tile);
      index++;
    }
  }
}

function placePyramidLayout(types: TileType[]) {
  const centerX = CANVAS_WIDTH / 2;
  const startY = 20;

  let index = 0;
  let z = 0;

  // 金字塔层级
  for (let level = 0; level < 6; level++) {
    const tilesInLevel = 6 - level;
    const levelWidth = tilesInLevel * TILE_WIDTH + (tilesInLevel - 1) * TILE_GAP;
    const startX = centerX - levelWidth / 2;

    for (let i = 0; i < tilesInLevel; i++) {
      if (index >= types.length) break;

      const tile: Tile = {
        id: `tile-${index}`,
        type: types[index],
        value: Math.floor(Math.random() * 9) + 1,
        x: startX + i * (TILE_WIDTH + TILE_GAP),
        y: startY + level * (TILE_HEIGHT + TILE_GAP),
        z,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        selected: false,
        matched: false,
        hint: false
      };

      tiles.value.push(tile);
      index++;
    }

    z++;
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// ===== 游戏逻辑 =====

function handleCanvasClick(event: MouseEvent) {
  if (gameState.value !== 'playing') return;

  const canvas = gameCanvas.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  // 画布按 CSS 等比缩放，点击坐标换算回逻辑坐标
  const x = (event.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const y = (event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  // 找到点击的麻将牌（从上层到下层）
  const clickedTile = findClickedTile(x, y);

  if (clickedTile) {
    selectTile(clickedTile);
  }
}

function findClickedTile(x: number, y: number): Tile | null {
  // 按z轴排序，先检查上层的牌
  const sortedTiles = [...tiles.value]
    .filter(t => !t.matched)
    .sort((a, b) => b.z - a.z);

  for (const tile of sortedTiles) {
    if (x >= tile.x && x <= tile.x + tile.width &&
        y >= tile.y && y <= tile.y + tile.height) {
      // 检查是否被其他牌遮挡
      if (!isTileBlocked(tile)) {
        return tile;
      }
    }
  }

  return null;
}

function isTileBlocked(tile: Tile): boolean {
  const otherTiles = tiles.value.filter(t => !t.matched && t.id !== tile.id);

  for (const other of otherTiles) {
    // 检查是否有牌在上层
    if (other.z > tile.z) {
      // 检查是否有重叠
      if (isOverlapping(tile, other)) {
        return true;
      }
    }
  }

  return false;
}

function isOverlapping(tile1: Tile, tile2: Tile): boolean {
  const margin = 5;
  return !(tile1.x + tile1.width <= tile2.x + margin ||
           tile1.x >= tile2.x + tile2.width - margin ||
           tile1.y + tile1.height <= tile2.y + margin ||
           tile1.y >= tile2.y + tile2.height - margin);
}

function selectTile(tile: Tile) {
  // 清除提示状态
  clearHints();

  if (!selectedTile.value) {
    // 第一次选择
    selectedTile.value = tile;
    tile.selected = true;
    playSelectSound();
  } else if (selectedTile.value.id === tile.id) {
    // 取消选择
    tile.selected = false;
    selectedTile.value = null;
  } else {
    // 第二次选择，检查是否匹配
    if (canMatch(selectedTile.value, tile)) {
      // 匹配成功
      matchTiles(selectedTile.value, tile);
    } else {
      // 匹配失败，切换选择
      selectedTile.value.selected = false;
      selectedTile.value = tile;
      tile.selected = true;
      playErrorSound();
    }
  }

  render();
}

function canMatch(tile1: Tile, tile2: Tile): boolean {
  // 检查类型和值是否相同
  return tile1.type === tile2.type && tile1.value === tile2.value;
}

function matchTiles(tile1: Tile, tile2: Tile) {
  // 标记为已匹配
  tile1.matched = true;
  tile2.matched = true;
  tile1.selected = false;
  tile2.selected = false;

  // 更新连击
  combo.value++;
  if (comboTimer.value) {
    clearTimeout(comboTimer.value);
  }
  comboTimer.value = setTimeout(() => {
    combo.value = 0;
  }, 3000);

  // 显示连击提示
  if (combo.value > 1) {
    showComboPopup.value = true;
    setTimeout(() => {
      showComboPopup.value = false;
    }, 1000);
  }

  // 计算得分
  const baseScore = 10;
  const comboBonus = combo.value * 5;
  const totalScore = baseScore + comboBonus;
  score.value += totalScore;

  // 显示浮动得分
  showFloatingScore(tile1.x + tile1.width / 2, tile1.y, totalScore);
  showFloatingScore(tile2.x + tile2.width / 2, tile2.y, totalScore);

  // 播放匹配音效
  playMatchSound();

  // 清除选择
  selectedTile.value = null;

  // 检查游戏是否结束
  checkGameEnd();

  render();
}

function showFloatingScore(x: number, y: number, value: number) {
  const id = ++floatingScoreId;
  floatingScores.value.push({ id, x, y, value });

  setTimeout(() => {
    floatingScores.value = floatingScores.value.filter(s => s.id !== id);
  }, 1000);
}

function checkGameEnd() {
  const remaining = tiles.value.filter(t => !t.matched);

  if (remaining.length === 0) {
    // 胜利
    gameState.value = 'won';
    stopTimer();
    playWinSound();
  } else {
    // 检查是否还有可消除的牌
    const hasMatch = checkHasMatch();
    if (!hasMatch) {
      // 没有可消除的牌，游戏结束
      gameState.value = 'lost';
      stopTimer();
    }
  }
}

function checkHasMatch(): boolean {
  const availableTiles = tiles.value.filter(t => !t.matched && !isTileBlocked(t));

  for (let i = 0; i < availableTiles.length; i++) {
    for (let j = i + 1; j < availableTiles.length; j++) {
      if (canMatch(availableTiles[i], availableTiles[j])) {
        return true;
      }
    }
  }

  return false;
}

// ===== 游戏功能 =====

function showHint() {
  if (hintCount.value <= 0 || gameState.value !== 'playing') return;

  clearHints();

  const availableTiles = tiles.value.filter(t => !t.matched && !isTileBlocked(t));
  let foundMatch = false;

  for (let i = 0; i < availableTiles.length && !foundMatch; i++) {
    for (let j = i + 1; j < availableTiles.length && !foundMatch; j++) {
      if (canMatch(availableTiles[i], availableTiles[j])) {
        availableTiles[i].hint = true;
        availableTiles[j].hint = true;
        foundMatch = true;
      }
    }
  }

  if (foundMatch) {
    hintCount.value--;
    playHintSound();

    // 3秒后清除提示
    setTimeout(() => {
      clearHints();
    }, 3000);
  }

  render();
}

function clearHints() {
  tiles.value.forEach(t => t.hint = false);
}

function shuffleTiles() {
  if (shuffleCount.value <= 0 || gameState.value !== 'playing') return;

  const availableTiles = tiles.value.filter(t => !t.matched);
  const positions = availableTiles.map(t => ({ x: t.x, y: t.y, z: t.z }));

  // 打乱位置
  const shuffledPositions = shuffleArray(positions);

  // 重新分配位置
  availableTiles.forEach((tile, index) => {
    tile.x = shuffledPositions[index].x;
    tile.y = shuffledPositions[index].y;
    tile.z = shuffledPositions[index].z;
  });

  shuffleCount.value--;
  playShuffleSound();

  // 清除选择和提示
  selectedTile.value = null;
  clearHints();

  // 检查是否还有可消除的牌
  if (!checkHasMatch()) {
    gameState.value = 'lost';
    stopTimer();
  }

  render();
}

function restart() {
  stopTimer();
  startGame();
}

// ===== 计时器 =====

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    timeElapsed.value++;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ===== 渲染 =====

function render() {
  if (!ctx.value || !gameCanvas.value) return;

  const context = ctx.value;

  // 清空画布
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 绘制背景
  drawBackground(context, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 按z轴排序绘制麻将牌
  const sortedTiles = [...tiles.value]
    .filter(t => !t.matched)
    .sort((a, b) => a.z - b.z);

  for (const tile of sortedTiles) {
    drawTile(context, tile);
  }
}

function drawBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  // 暖纸底
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#fff8ec');
  gradient.addColorStop(0.55, '#fdf0de');
  gradient.addColorStop(1, '#f6e6d1');

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // 细微纸面纹理
  context.save();
  context.fillStyle = 'rgba(192, 154, 120, 0.14)';
  for (let x = 22; x < width; x += 54) {
    for (let y = 24; y < height; y += 54) {
      context.beginPath();
      context.arc(x, y, 1, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawTile(context: CanvasRenderingContext2D, tile: Tile) {
  const { x, y, width, height, type, value, selected, hint } = tile;

  context.save();

  // 绘制阴影
  context.shadowColor = 'rgba(120, 85, 55, 0.22)';
  context.shadowBlur = 8;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 3;

  // 绘制麻将牌背景
  const bgGradient = context.createLinearGradient(x, y, x + width, y + height);
  bgGradient.addColorStop(0, '#fffdf7');
  bgGradient.addColorStop(1, '#f0e0c8');

  context.fillStyle = bgGradient;
  roundRect(context, x, y, width, height, TILE_CORNER);
  context.fill();

  // 绘制边框
  context.shadowColor = 'transparent';
  context.strokeStyle = COLORS.border;
  context.lineWidth = 2;
  context.stroke();

  // 绘制内边框
  context.strokeStyle = '#d9b78f';
  context.lineWidth = 1;
  const innerMargin = 4;
  roundRect(context, x + innerMargin, y + innerMargin,
             width - innerMargin * 2, height - innerMargin * 2,
             TILE_CORNER - 2);
  context.stroke();

  // 绘制选中高亮
  if (selected) {
    context.strokeStyle = COLORS.selected;
    context.lineWidth = 3;
    roundRect(context, x - 2, y - 2, width + 4, height + 4, TILE_CORNER + 2);
    context.stroke();

    // 添加发光效果
    context.shadowColor = COLORS.selected;
    context.shadowBlur = 12;
    context.stroke();
  }

  // 绘制提示高亮
  if (hint) {
    context.strokeStyle = COLORS.hint;
    context.lineWidth = 3;
    roundRect(context, x - 2, y - 2, width + 4, height + 4, TILE_CORNER + 2);
    context.stroke();

    // 添加脉冲效果
    const pulseSize = Math.sin(Date.now() / 200) * 3;
    context.strokeStyle = 'rgba(79, 147, 168, 0.5)';
    context.lineWidth = 2;
    roundRect(context, x - 2 - pulseSize, y - 2 - pulseSize,
               width + 4 + pulseSize * 2, height + 4 + pulseSize * 2,
               TILE_CORNER + 2 + pulseSize);
    context.stroke();
  }

  // 绘制麻将牌内容
  drawTileContent(context, x, y, width, height, type, value);

  context.restore();
}

function drawTileContent(context: CanvasRenderingContext2D, x: number, y: number,
                        width: number, height: number, type: TileType, value: number) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  context.fillStyle = COLORS[type];
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  if (type === 'wan') {
    // 万字牌
    context.font = 'bold 38px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(TILE_SYMBOLS.wan[value - 1], centerX, centerY - 9);

    context.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText('万', centerX, centerY + 21);
  } else if (type === 'tiao') {
    // 条子牌 - 使用 Unicode 字符
    context.font = '42px sans-serif';
    context.fillText(TILE_SYMBOLS.tiao[value - 1], centerX, centerY);
  } else if (type === 'tong') {
    // 筒子牌 - 使用 Unicode 字符
    context.font = '42px sans-serif';
    context.fillText(TILE_SYMBOLS.tong[value - 1], centerX, centerY);
  } else if (type === 'wind') {
    // 风牌
    context.font = 'bold 34px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(WIND_SYMBOLS[value - 1], centerX, centerY);
  } else if (type === 'dragon') {
    // 箭牌
    context.font = 'bold 34px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(DRAGON_SYMBOLS[value - 1], centerX, centerY);
  }
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number,
                   width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

// ===== 音效 =====

function playSelectSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 600;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // 静默失败
  }
}

function playMatchSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    // 静默失败
  }
}

function playErrorSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 300;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    // 静默失败
  }
}

function playHintSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // 静默失败
  }
}

function playShuffleSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 400;
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // 静默失败
  }
}

function playWinSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = audioContext.currentTime + index * 0.15;
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  } catch (e) {
    // 静默失败
  }
}

// ===== 事件处理 =====

function handleResize() {
  // 画布逻辑分辨率固定，仅按新的 DPR 重设位图并重绘
  initCanvas();

  if (gameState.value === 'idle') {
    renderIdleState();
  } else {
    render();
  }
}

function handleKeyPress(event: KeyboardEvent) {
  // 键盘导航支持
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    // 在画布中心模拟点击
    const canvas = gameCanvas.value;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      handleCanvasClick({
        clientX: rect.left + centerX,
        clientY: rect.top + centerY
      } as MouseEvent);
    }
  }
}

// 暴露方法供父组件调用
defineExpose({
  reset: restart,
  restart,
  pause: () => {
    if (gameState.value === 'playing') {
      stopTimer();
    }
  },
  resume: () => {
    if (gameState.value === 'playing') {
      startTimer();
    }
  }
});
</script>

<style scoped>
.mahjong-game {
  display: grid;
  gap: 12px;
  width: 100%;
}

/* ---------- HUD ---------- */
.game-hud {
  display: grid;
  gap: 10px;
}

.hud-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.hud-stats .stat-card {
  min-height: 68px;
  padding: 9px 14px;
}

.hud-stats .stat-card strong {
  letter-spacing: -0.03em;
}

.combo-card.is-hot {
  background: var(--coral-soft);
  border-color: #f3c8b4;
  box-shadow: 0 4px 0 #f3d3c1;
}

.combo-card.is-hot strong {
  color: var(--coral-deep);
  animation: combo-pop 0.3s ease-out;
}

@keyframes combo-pop {
  from {
    transform: scale(0.8);
  }
  to {
    transform: scale(1);
  }
}

.hud-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hud-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}

.hud-actions .ghost-button {
  min-height: 44px;
  padding: 8px 14px;
  font-size: 13px;
}

.hud-actions .icon-button {
  width: 44px;
  height: 44px;
  min-width: 44px;
}

/* ---------- 棋盘 ---------- */
.board-wrap {
  width: 100%;
  max-width: min(100%, 664px);
  margin: 0 auto;
  padding: 10px;
  background: var(--panel);
  border: 2px solid #f2ddc8;
  border-radius: 26px;
  box-shadow: var(--shadow-soft), 0 6px 0 #edd9c3;
}

.canvas-stage {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}

.game-canvas {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 18px;
  background: #fdf2e2;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.game-canvas:focus-visible {
  outline: 3px solid #4d9c73;
  outline-offset: 3px;
}

/* ---------- 覆盖层（纸卡风格） ---------- */
.board-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
  background: rgba(255, 249, 237, 0.84);
  backdrop-filter: blur(5px);
  border-radius: 18px;
}

.overlay-card {
  width: min(340px, 100%);
  padding: 22px 20px;
  text-align: center;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 16px 44px rgba(113, 75, 47, 0.2);
}

.overlay-eyebrow {
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.22em;
  color: var(--faint);
}

.overlay-card h2 {
  margin: 7px 0 8px;
  font-size: 25px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.overlay-card p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 14px;
}

.overlay-card p b {
  color: var(--ink);
  font-weight: 900;
}

.rule-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: 18px;
}

.welcome-card .primary-button {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  font-size: 15px;
}

.welcome-card .text-button {
  display: block;
  margin: 6px auto 0;
}

.overlay-actions {
  display: grid;
  gap: 8px;
}

.overlay-actions .primary-button,
.overlay-actions .ghost-button {
  min-height: 46px;
  min-width: 0;
  font-size: 14px;
}

/* ---------- 浮动得分 ---------- */
.floating-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  border-radius: 18px;
}

.floating-score {
  position: absolute;
  color: var(--coral-deep);
  font-size: clamp(15px, 2.6vw, 20px);
  font-weight: 900;
  transform: translate(-50%, -50%);
  text-shadow: 0 1px 0 #fff, 0 2px 8px rgba(255, 255, 255, 0.9);
  animation: float-up 1s ease-out forwards;
}

@keyframes float-up {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -130%);
  }
}

/* ---------- 连击提示 ---------- */
.combo-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 40;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.combo-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: var(--panel);
  border: 1.5px solid #f3c8b4;
  border-radius: 18px;
  box-shadow: 0 8px 0 #f4d8c8, var(--shadow-soft);
  color: var(--coral-deep);
  animation: combo-popup 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.combo-icon {
  font-size: 22px;
}

.combo-text {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

@keyframes combo-popup {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.combo-animation-enter-active,
.combo-animation-leave-active {
  transition: opacity 0.25s ease;
}

.combo-animation-enter-from,
.combo-animation-leave-to {
  opacity: 0;
}

/* ---------- 设置抽屉 ---------- */
.setting-block {
  display: grid;
  gap: 9px;
}

.setting-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  font-weight: 850;
}

.setting-head small {
  color: var(--faint);
  font-size: 11px;
  font-weight: 700;
}

.setting-block .segmented {
  display: flex;
}

.setting-block .segmented button {
  flex: 1;
  min-height: 44px;
}

.setting-tip {
  color: var(--faint);
  font-size: 11.5px;
  line-height: 1.6;
}

.setting-warn {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--amber-soft);
  border: 1px solid #f0ddb4;
  color: #8a6431;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
}

.sheet-done {
  width: 100%;
  min-height: 48px;
  margin-top: 4px;
  font-size: 15px;
}

/* ---------- 提示 ---------- */
.game-note {
  text-align: center;
  color: var(--faint);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.04em;
  line-height: 1.6;
  padding: 0 6px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 560px) {
  .mahjong-game {
    gap: 10px;
  }

  .hud-stats {
    gap: 6px;
  }

  .hud-stats .stat-card {
    min-height: 60px;
    padding: 7px 8px;
  }

  .hud-stats .stat-card small {
    font-size: 9px;
    letter-spacing: 0.1em;
  }

  .hud-stats .stat-card strong {
    font-size: 19px;
  }

  .hud-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .hud-actions {
    margin-left: 0;
    gap: 6px;
    flex-wrap: nowrap;
  }

  .hud-actions .ghost-button {
    flex: 1;
    min-height: 44px;
    padding: 0 6px;
    font-size: 12.5px;
    white-space: nowrap;
  }

  .hud-actions .icon-button {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .board-wrap {
    padding: 7px;
    border-radius: 22px;
  }

  .board-overlay {
    padding: 10px;
  }

  .overlay-card {
    padding: 16px 14px;
    border-radius: 18px;
  }

  .overlay-card h2 {
    font-size: 21px;
    margin: 5px 0 6px;
  }

  .overlay-card p {
    font-size: 12.5px;
    margin-bottom: 10px;
  }

  .rule-chips {
    margin-bottom: 12px;
  }

  .rule-chips .chip {
    min-height: 24px;
    padding: 2px 9px;
    font-size: 10.5px;
  }

  .welcome-card .primary-button,
  .overlay-actions .primary-button,
  .overlay-actions .ghost-button {
    min-height: 44px;
    font-size: 13.5px;
  }
}
</style>
