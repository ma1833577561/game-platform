<template>
  <main class="minesweeper-game" role="application" aria-label="扫雷游戏">
    <div class="game-hud">
      <div class="hud-stats">
        <div class="stat-card">
          <small>剩余雷数</small>
          <strong>{{ remainingMines }}</strong>
        </div>
        <div class="stat-card">
          <small>计时</small>
          <strong>{{ formatTime(timer) }}</strong>
        </div>
        <div class="stat-card is-best">
          <small>最佳</small>
          <strong>{{ bestRecord !== null ? formatTime(bestRecord) : '--:--' }}</strong>
        </div>
      </div>

      <div class="hud-bar">
        <div class="segmented difficulty" role="group" aria-label="难度">
          <button
            v-for="item in difficultyOptions"
            :key="item.value"
            type="button"
            :class="{ 'is-active': currentDifficulty === item.value }"
            :aria-pressed="currentDifficulty === item.value"
            :disabled="gameStarted && !gameOver"
            @click="changeDifficulty(item.value)"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="hud-actions">
          <button class="ghost-button" type="button" @click="restart">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5v5h5" />
              <path d="M4.8 10a7.5 7.5 0 1 1 1.4 7.2" />
            </svg>
            新局
          </button>
          <button class="ghost-button" type="button" :disabled="!canUndo" @click="undo">撤销</button>
          <button
            class="ghost-button flag-button"
            type="button"
            :class="{ 'is-on': flagMode }"
            :aria-pressed="flagMode"
            :aria-label="flagMode ? '关闭插旗模式' : '开启插旗模式'"
            @click="toggleFlagMode"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 21V4" />
              <path d="M6 4h11l-2.4 3.6L17 11H6" />
            </svg>
            {{ flagMode ? '插旗中' : '插旗' }}
          </button>
        </div>
      </div>
    </div>

    <div class="board-wrap" :class="{ 'is-flagging': flagMode }" :style="wrapStyle">
      <div class="board-scroll">
        <canvas
          ref="canvas"
          class="board"
          tabindex="0"
          :style="boardStyle"
          :aria-label="flagMode
            ? '扫雷棋盘，插旗模式：点击格子插旗或取消'
            : '扫雷棋盘，点击格子翻开；也可右键插旗'"
          @click="handleLeftClick"
          @contextmenu.prevent="handleRightClick"
          @mousemove="handleMouseMove"
          @mouseleave="handleMouseLeave"
        ></canvas>
      </div>

      <div v-if="gameOver" class="result-card" role="dialog" aria-label="本局结果">
        <span class="result-eyebrow">{{ gameWon ? 'CLEARED' : 'BOOM' }}</span>
        <h2>{{ gameWon ? '全部扫清！' : '踩到地雷了' }}</h2>
        <p v-if="gameWon">
          用时 {{ formatTime(timer) }}
          <template v-if="bestRecord !== null"> · 本难度最佳 {{ formatTime(bestRecord) }}</template>
        </p>
        <p v-else>本局用时 {{ formatTime(timer) }}，再试一次吧</p>
        <div class="result-actions">
          <button class="primary-button" type="button" @click="restart">再来一局</button>
        </div>
      </div>
    </div>

    <p class="game-note">
      <template v-if="flagMode">插旗模式：点击格子插旗，再点取消</template>
      <template v-else>点击翻格 · 数字表示周围八格的地雷数 · 第一次点击不会踩雷</template>
      <template v-if="isWideBoard"> · 困难棋盘可左右滑动</template>
    </p>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

// Canvas 引用
const canvas = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

// 难度配置
interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
}

const difficultyConfigs: Record<string, DifficultyConfig> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
};

const difficultyOptions: Array<{ value: string; label: string }> = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' }
];

// 游戏状态
const currentDifficulty = ref<string>('easy');
const board = ref<number[][]>([]); // 0:空, 1-8:数字, -1:地雷
const revealed = ref<boolean[][]>([]);
const flagged = ref<boolean[][]>([]);
const gameStarted = ref<boolean>(false);
const gameOver = ref<boolean>(false);
const gameWon = ref<boolean>(false);
const timer = ref<number>(0);
const timerInterval = ref<number | null>(null);
const history = ref<Array<{ row: number; col: number; type: 'reveal' | 'flag' }>>([]);

// 插旗模式（触屏友好）
const flagMode = ref(false);

// 格子大小
const CELL_SIZE = 36;
const PADDING = 12;

// 动画状态
const hoverPosition = ref<{ row: number; col: number } | null>(null);
const animationFrame = ref<number | null>(null);
const revealAnimations = ref<Map<string, { progress: number; targetRow: number; targetCol: number }>>(new Map());

// 最佳记录
const bestRecords = ref<Record<string, number>>({});

// 数字配色（浅色纸底上清晰可读）
const NUMBER_COLORS: Record<number, string> = {
  1: '#3d7fb8',
  2: '#3f8b5b',
  3: '#d2623f',
  4: '#7b5aa6',
  5: '#b24c5f',
  6: '#2f8a97',
  7: '#a97b25',
  8: '#6d7280'
};

// 计算属性
const config = computed(() => difficultyConfigs[currentDifficulty.value]);

const boardPixelWidth = computed(() => config.value.cols * CELL_SIZE + PADDING * 2);

// 移动端困难棋盘保持可辨认的格子尺寸，超出部分在 board-wrap 内横向滚动
const boardMinWidth = computed(() => config.value.cols * 30 + PADDING * 2);

// 桌面端不让简单棋盘缩成一小块
const boardMaxWidth = computed(() => Math.max(boardPixelWidth.value, 460));

const isWideBoard = computed(() => boardMinWidth.value > 480);

const boardStyle = computed(() => ({
  width: '100%',
  maxWidth: `${boardMaxWidth.value}px`,
  minWidth: `${boardMinWidth.value}px`
}));

// 面板跟着棋盘收窄，平板/桌面上不会出现大片空白
const wrapStyle = computed(() => ({
  maxWidth: `min(100%, ${boardMaxWidth.value + 24}px)`
}));

const remainingMines = computed(() => {
  const flagCount = flagged.value.flat().filter((f: boolean) => f).length;
  return config.value.mines - flagCount;
});

const canUndo = computed(() => {
  return history.value.length > 0 && !gameOver.value;
});

const bestRecord = computed(() => {
  return bestRecords.value[currentDifficulty.value] ?? null;
});

// 初始化游戏
function initGame() {
  const cfg = config.value;

  // 初始化棋盘
  board.value = Array(cfg.rows).fill(null).map(() => Array(cfg.cols).fill(0));
  revealed.value = Array(cfg.rows).fill(null).map(() => Array(cfg.cols).fill(false));
  flagged.value = Array(cfg.rows).fill(null).map(() => Array(cfg.cols).fill(false));

  // 重置状态
  gameStarted.value = false;
  gameOver.value = false;
  gameWon.value = false;
  timer.value = 0;
  history.value = [];
  hoverPosition.value = null;
  revealAnimations.value.clear();

  // 清除计时器
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }

  drawBoard();
}

// 放置地雷（首次点击后调用）
function placeMines(excludeRow: number, excludeCol: number) {
  const cfg = config.value;
  const rows = cfg.rows;
  const cols = cfg.cols;
  const mines = cfg.mines;

  // 获取所有可放置地雷的位置（排除首次点击及其周围）
  const availablePositions: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // 排除首次点击及其周围3x3区域
      if (Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1) {
        continue;
      }
      availablePositions.push({ row, col });
    }
  }

  // 随机选择地雷位置
  for (let i = 0; i < mines; i++) {
    if (availablePositions.length === 0) break;

    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    const position = availablePositions.splice(randomIndex, 1)[0];
    board.value[position.row][position.col] = -1;
  }

  // 计算数字
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board.value[row][col] === -1) continue;

      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board.value[nr][nc] === -1) {
            count++;
          }
        }
      }
      board.value[row][col] = count;
    }
  }
}

// 翻开格子
function revealCell(row: number, col: number): boolean {
  const cfg = config.value;

  // 边界检查
  if (row < 0 || row >= cfg.rows || col < 0 || col >= cfg.cols) return false;

  // 已翻开或已插旗的格子不能翻开
  if (revealed.value[row][col] || flagged.value[row][col]) return false;

  // 翻开格子
  revealed.value[row][col] = true;
  history.value.push({ row, col, type: 'reveal' });

  // 检查是否踩到地雷
  if (board.value[row][col] === -1) {
    gameOver.value = true;
    gameWon.value = false;
    stopTimer();
    revealAllMines();
    return true;
  }

  // 如果是空格子，自动展开周围
  if (board.value[row][col] === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        revealCell(row + dr, col + dc);
      }
    }
  }

  // 检查是否获胜
  checkWin();

  return true;
}

// 翻开所有地雷
function revealAllMines() {
  const cfg = config.value;
  for (let row = 0; row < cfg.rows; row++) {
    for (let col = 0; col < cfg.cols; col++) {
      if (board.value[row][col] === -1) {
        revealed.value[row][col] = true;
      }
    }
  }
}

// 检查获胜
function checkWin() {
  const cfg = config.value;
  let unrevealedSafeCells = 0;

  for (let row = 0; row < cfg.rows; row++) {
    for (let col = 0; col < cfg.cols; col++) {
      if (board.value[row][col] !== -1 && !revealed.value[row][col]) {
        unrevealedSafeCells++;
      }
    }
  }

  if (unrevealedSafeCells === 0) {
    gameOver.value = true;
    gameWon.value = true;
    stopTimer();
    updateBestRecord();
  }
}

// 切换旗帜
function toggleFlag(row: number, col: number) {
  const cfg = config.value;

  // 边界检查
  if (row < 0 || row >= cfg.rows || col < 0 || col >= cfg.cols) return;

  // 已翻开的格子不能插旗
  if (revealed.value[row][col]) return;

  // 切换旗帜
  flagged.value[row][col] = !flagged.value[row][col];
  history.value.push({ row, col, type: 'flag' });

  drawBoard();
}

// 撤销
function undo() {
  if (history.value.length === 0) return;

  const lastAction = history.value.pop()!;

  if (lastAction.type === 'reveal') {
    revealed.value[lastAction.row][lastAction.col] = false;
  } else if (lastAction.type === 'flag') {
    flagged.value[lastAction.row][lastAction.col] = !flagged.value[lastAction.row][lastAction.col];
  }

  drawBoard();
}

// 重新开始
function restart() {
  initGame();
}

// 切换难度（对局进行中不切换，与原逻辑一致）
function changeDifficulty(value: string) {
  if (currentDifficulty.value === value) return;
  if (gameStarted.value && !gameOver.value) return;
  currentDifficulty.value = value;
  initGame();
}

// 插旗模式开关
function toggleFlagMode() {
  flagMode.value = !flagMode.value;
  drawBoard();
}

// 计时器
function startTimer() {
  if (timerInterval.value) return;

  timerInterval.value = window.setInterval(() => {
    timer.value++;
  }, 1000);
}

function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
}

// 更新最佳记录
function updateBestRecord() {
  const currentRecord = bestRecords.value[currentDifficulty.value];
  if (!currentRecord || timer.value < currentRecord) {
    bestRecords.value[currentDifficulty.value] = timer.value;
    localStorage.setItem('minesweeper-best-records', JSON.stringify(bestRecords.value));
  }
}

// 加载最佳记录
function loadBestRecords() {
  const saved = localStorage.getItem('minesweeper-best-records');
  if (saved) {
    try {
      bestRecords.value = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load best records:', e);
    }
  }
}

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 绘制棋盘
function drawBoard() {
  if (!canvas.value || !ctx.value) return;

  const cfg = config.value;
  const c = canvas.value;
  const context = ctx.value;

  // 保持逻辑分辨率不变，展示尺寸交给 CSS 自适应
  const dpr = window.devicePixelRatio || 1;
  const width = cfg.cols * CELL_SIZE + PADDING * 2;
  const height = cfg.rows * CELL_SIZE + PADDING * 2;

  const targetWidth = Math.round(width * dpr);
  const targetHeight = Math.round(height * dpr);

  if (c.width !== targetWidth || c.height !== targetHeight) {
    c.width = targetWidth;
    c.height = targetHeight;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  // 绘制背景
  drawBoardBackground(context, width, height);

  // 绘制格子
  for (let row = 0; row < cfg.rows; row++) {
    for (let col = 0; col < cfg.cols; col++) {
      drawCell(context, row, col);
    }
  }

  // 绘制悬停效果
  if (hoverPosition.value && !gameOver.value) {
    drawHoverEffect(context, hoverPosition.value.row, hoverPosition.value.col);
  }
}

// 圆角矩形路径
function tilePath(context: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number) {
  const r = Math.min(radius, size / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + size - r, y);
  context.quadraticCurveTo(x + size, y, x + size, y + r);
  context.lineTo(x + size, y + size - r);
  context.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  context.lineTo(x + r, y + size);
  context.quadraticCurveTo(x, y + size, x, y + size - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

// 绘制棋盘背景（暖纸底）
function drawBoardBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#fff8ed');
  gradient.addColorStop(0.55, '#fdf1df');
  gradient.addColorStop(1, '#f6e7d2');

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // 细微纸面纹理
  context.save();
  context.fillStyle = 'rgba(192, 154, 120, 0.14)';
  for (let x = 18; x < width; x += 46) {
    for (let y = 20; y < height; y += 46) {
      context.beginPath();
      context.arc(x, y, 1, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

// 绘制单个格子
function drawCell(context: CanvasRenderingContext2D, row: number, col: number) {
  const x = PADDING + col * CELL_SIZE;
  const y = PADDING + row * CELL_SIZE;
  const size = CELL_SIZE - 2;

  if (revealed.value[row][col]) {
    if (board.value[row][col] === -1) {
      drawMine(context, x, y, size);
    } else if (board.value[row][col] > 0) {
      drawNumber(context, x, y, size, board.value[row][col]);
    } else {
      // 已翻开的安全空格
      context.fillStyle = '#f4e5d1';
      tilePath(context, x + 1, y + 1, size, 5);
      context.fill();
      context.strokeStyle = '#ecd8bf';
      context.lineWidth = 1;
      context.stroke();
    }
  } else {
    // 未翻开的纸砖
    drawUnrevealedCell(context, x, y, size);

    // 旗帜
    if (flagged.value[row][col]) {
      drawFlag(context, x, y, size);
    }
  }
}

// 绘制未翻开的格子
function drawUnrevealedCell(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.fillStyle = '#fffaf1';
  tilePath(context, x + 1, y + 1, size, 5);
  context.fill();

  // 顶部高光
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fillRect(x + 4, y + 3, size - 6, 2);

  // 底边阴影，做出轻微按压感
  context.fillStyle = '#ecd9c1';
  context.fillRect(x + 4, y + size - 3, size - 6, 2);

  context.strokeStyle = '#ecd7be';
  context.lineWidth = 1;
  tilePath(context, x + 1.5, y + 1.5, size - 1, 5);
  context.stroke();
}

// 绘制数字
function drawNumber(context: CanvasRenderingContext2D, x: number, y: number, size: number, number: number) {
  // 背景
  context.fillStyle = '#f7e9d6';
  tilePath(context, x + 1, y + 1, size, 5);
  context.fill();
  context.strokeStyle = '#ead5bc';
  context.lineWidth = 1;
  context.stroke();

  // 数字
  context.fillStyle = NUMBER_COLORS[number] || '#4a4d63';
  context.font = `bold ${Math.round(size * 0.56)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(number.toString(), x + size / 2, y + size / 2);
}

// 绘制地雷
function drawMine(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size * 0.33;

  // 背景
  context.fillStyle = '#f8d8cf';
  tilePath(context, x + 1, y + 1, size, 5);
  context.fill();
  context.strokeStyle = '#efc0b2';
  context.lineWidth = 1;
  context.stroke();

  // 地雷主体
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = '#dc674f';
  context.fill();

  // 刺
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const spikeLength = radius * 0.45;
    context.beginPath();
    context.moveTo(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius
    );
    context.lineTo(
      centerX + Math.cos(angle) * (radius + spikeLength),
      centerY + Math.sin(angle) * (radius + spikeLength)
    );
    context.strokeStyle = '#c85d49';
    context.lineWidth = 2;
    context.stroke();
  }

  // 高光
  context.beginPath();
  context.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.28, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.55)';
  context.fill();
}

// 绘制旗帜
function drawFlag(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;

  // 旗杆
  context.beginPath();
  context.moveTo(centerX - size * 0.2, centerY + size * 0.36);
  context.lineTo(centerX - size * 0.2, centerY - size * 0.36);
  context.strokeStyle = '#9a6b3f';
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.stroke();

  // 旗帜
  context.beginPath();
  context.moveTo(centerX - size * 0.2, centerY - size * 0.36);
  context.lineTo(centerX + size * 0.3, centerY - size * 0.2);
  context.lineTo(centerX - size * 0.2, centerY - size * 0.04);
  context.closePath();
  context.fillStyle = '#dc674f';
  context.fill();

  // 底座
  context.beginPath();
  context.moveTo(centerX - size * 0.32, centerY + size * 0.36);
  context.lineTo(centerX + size * 0.02, centerY + size * 0.36);
  context.strokeStyle = '#9a6b3f';
  context.lineWidth = 2;
  context.stroke();
}

// 绘制悬停效果
function drawHoverEffect(context: CanvasRenderingContext2D, row: number, col: number) {
  const cfg = config.value;

  if (row < 0 || row >= cfg.rows || col < 0 || col >= cfg.cols) return;
  if (revealed.value[row][col] || flagged.value[row][col]) return;

  const x = PADDING + col * CELL_SIZE;
  const y = PADDING + row * CELL_SIZE;
  const size = CELL_SIZE - 2;

  context.fillStyle = flagMode.value ? 'rgba(237, 115, 95, 0.26)' : 'rgba(69, 141, 103, 0.2)';
  tilePath(context, x + 1, y + 1, size, 5);
  context.fill();

  context.strokeStyle = flagMode.value ? 'rgba(220, 103, 79, 0.75)' : 'rgba(68, 141, 103, 0.6)';
  context.lineWidth = 2;
  tilePath(context, x + 2, y + 2, size - 2, 5);
  context.stroke();
}

// 把 CSS 坐标换算成棋盘逻辑坐标（棋盘随容器等比缩放）
function toBoardPoint(event: MouseEvent): { x: number; y: number } {
  if (!canvas.value) {
    return { x: 0, y: 0 };
  }
  const cfg = config.value;
  const rect = canvas.value.getBoundingClientRect();
  const logicWidth = cfg.cols * CELL_SIZE + PADDING * 2;
  const logicHeight = cfg.rows * CELL_SIZE + PADDING * 2;
  if (!rect.width || !rect.height) {
    return { x: 0, y: 0 };
  }
  return {
    x: (event.clientX - rect.left) * (logicWidth / rect.width),
    y: (event.clientY - rect.top) * (logicHeight / rect.height)
  };
}

// 处理左键点击
function handleLeftClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (gameOver.value) return;
  if (!canvas.value) return;

  const { x, y } = toBoardPoint(event);

  const col = Math.floor((x - PADDING) / CELL_SIZE);
  const row = Math.floor((y - PADDING) / CELL_SIZE);

  const cfg = config.value;
  if (row < 0 || row >= cfg.rows || col < 0 || col >= cfg.cols) return;

  // 插旗模式下，点击 = 插旗 / 取消插旗
  if (flagMode.value) {
    toggleFlag(row, col);
    return;
  }

  if (flagged.value[row][col]) return;

  if (!gameStarted.value) {
    gameStarted.value = true;
    placeMines(row, col);
    startTimer();
  }

  revealCell(row, col);
  drawBoard();
}

// 处理右键点击
function handleRightClick(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (gameOver.value) return;
  if (!canvas.value) return;

  const { x, y } = toBoardPoint(event);

  const col = Math.floor((x - PADDING) / CELL_SIZE);
  const row = Math.floor((y - PADDING) / CELL_SIZE);

  const cfg = config.value;
  if (row < 0 || row >= cfg.rows || col < 0 || col >= cfg.cols) return;

  toggleFlag(row, col);
}

// 处理鼠标移动
function handleMouseMove(event: MouseEvent) {
  if (gameOver.value || !canvas.value) {
    hoverPosition.value = null;
    drawBoard();
    return;
  }

  const { x, y } = toBoardPoint(event);

  const col = Math.floor((x - PADDING) / CELL_SIZE);
  const row = Math.floor((y - PADDING) / CELL_SIZE);

  const cfg = config.value;
  if (row >= 0 && row < cfg.rows && col >= 0 && col < cfg.cols) {
    if (!hoverPosition.value || hoverPosition.value.row !== row || hoverPosition.value.col !== col) {
      hoverPosition.value = { row, col };
      drawBoard();
    }
  } else {
    if (hoverPosition.value) {
      hoverPosition.value = null;
      drawBoard();
    }
  }
}

// 处理鼠标离开
function handleMouseLeave() {
  if (hoverPosition.value) {
    hoverPosition.value = null;
    drawBoard();
  }
}

// 生命周期
onMounted(() => {
  loadBestRecords();
  initGame();

  if (canvas.value) {
    ctx.value = canvas.value.getContext('2d');
    drawBoard();
  }
});

onBeforeUnmount(() => {
  stopTimer();
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
});

// 暴露方法供父组件调用
defineExpose({
  reset: restart,
  pause: () => stopTimer(),
  resume: () => { if (gameStarted.value && !gameOver.value) startTimer(); }
});
</script>

<style scoped>
.minesweeper-game {
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.hud-stats .stat-card {
  min-height: 68px;
  padding: 9px 14px;
}

.hud-stats .stat-card strong {
  letter-spacing: -0.03em;
}

.hud-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.difficulty {
  flex: none;
}

.difficulty button {
  min-width: 58px;
  min-height: 44px;
  padding: 6px 15px;
  font-size: 13px;
}

.segmented button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

.flag-button.is-on {
  background: var(--coral);
  border-color: var(--coral);
  color: #fff;
  box-shadow: 0 3px 0 var(--coral-deep);
}

.flag-button.is-on:hover {
  background: var(--coral-strong);
  box-shadow: 0 4px 0 var(--coral-deep);
}

/* ---------- 棋盘 ---------- */
.board-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 0 auto;
  padding: 10px;
  background: var(--panel);
  border: 2px solid #f2ddc8;
  border-radius: 26px;
  box-shadow: var(--shadow-soft), 0 6px 0 #edd9c3;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.board-wrap.is-flagging {
  border-color: #e8b7a4;
  box-shadow: var(--shadow-soft), 0 6px 0 #efcbb9;
}

.board-scroll {
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  border-radius: 16px;
}

.board {
  display: block;
  height: auto;
  margin: 0 auto;
  border-radius: 15px;
  background: #fdf2e2;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.board:focus-visible {
  outline: 3px solid #4d9c73;
  outline-offset: 3px;
}

/* ---------- 结果卡片 ---------- */
.result-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(300px, 86%);
  padding: 22px 20px 20px;
  text-align: center;
  background: rgba(255, 253, 249, 0.97);
  border: 1.5px solid var(--line);
  border-radius: 22px;
  box-shadow: var(--shadow-soft);
  transform: translate(-50%, -50%);
  backdrop-filter: blur(6px);
}

.result-eyebrow {
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.22em;
  color: var(--faint);
}

.result-card h2 {
  margin: 7px 0 6px;
  font-size: 25px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.result-card p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.result-actions {
  display: grid;
  gap: 9px;
}

.result-actions .primary-button {
  min-height: 46px;
  min-width: 0;
  font-size: 14px;
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
  .minesweeper-game {
    gap: 10px;
  }

  .hud-stats {
    gap: 6px;
  }

  .hud-stats .stat-card {
    min-height: 60px;
    padding: 7px 9px;
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

  .difficulty {
    width: 100%;
  }

  .difficulty button {
    flex: 1;
    min-height: 42px;
    padding: 6px 8px;
  }

  .hud-actions {
    margin-left: 0;
    gap: 6px;
  }

  .hud-actions .ghost-button {
    flex: 1;
    min-height: 44px;
    padding: 0 8px;
    gap: 5px;
    font-size: 12.5px;
  }

  .hud-actions .ghost-button svg {
    width: 14px;
    height: 14px;
  }

  .board-wrap {
    padding: 7px;
    border-radius: 22px;
  }

  .result-card {
    padding: 18px 16px 16px;
  }

  .result-card h2 {
    font-size: 22px;
  }
}
</style>
