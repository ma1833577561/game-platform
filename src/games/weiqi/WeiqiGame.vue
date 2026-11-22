
<template>
  <main class="weiqi-game" role="application" aria-label="围棋游戏">
    <div class="sr-only" aria-live="polite">
      19 路棋盘，当前{{ currentPlayer === BLACK ? '黑方' : '白方' }}走棋，黑方提子 {{ blackCaptures }}，白方提子 {{ whiteCaptures }}
    </div>

    <div class="game-hud">
      <div class="hud-row hud-top">
        <div class="turn-card" :class="currentPlayer === BLACK ? 'is-black' : 'is-white'">
          <span class="turn-stone" aria-hidden="true"></span>
          <div class="turn-text">
            <small>当前回合</small>
            <strong>{{ currentPlayer === BLACK ? '黑方' : '白方' }}</strong>
          </div>
        </div>

        <div class="hud-actions">
          <button class="ghost-button" type="button" :disabled="!!winner || aiThinking" @click="pass">
            虚手
          </button>
          <button
            class="icon-button"
            type="button"
            aria-label="悔棋"
            :disabled="history.length === 0 || aiThinking"
            @click="undo"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button class="ghost-button" type="button" :disabled="aiThinking" @click="reset">新局</button>
          <button class="icon-button" type="button" aria-label="对局设置" @click="showSettings = true">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1Z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="hud-row hud-bottom">
        <div class="status-line" aria-live="assertive">
          <i class="status-dot" :class="statusTone" aria-hidden="true"></i>
          <span>{{ statusText }}</span>
        </div>

        <div class="capture-stats" role="group" aria-label="提子数">
          <span class="capture-chip">
            <i class="mini-stone is-black" aria-hidden="true"></i>
            <span>黑提子</span>
            <b>{{ blackCaptures }}</b>
          </span>
          <span class="capture-chip">
            <i class="mini-stone is-white" aria-hidden="true"></i>
            <span>白提子</span>
            <b>{{ whiteCaptures }}</b>
          </span>
        </div>
      </div>
    </div>

    <div class="board-wrap">
      <canvas
        ref="canvas"
        :width="CANVAS_SIZE"
        :height="CANVAS_SIZE"
        class="board"
        aria-label="围棋棋盘，19x19 网格，点击交叉点落子"
        role="application"
        tabindex="0"
      ></canvas>

      <div v-if="winner" class="result-card" role="dialog" aria-modal="true" aria-label="对局结果">
        <span class="result-eyebrow">GAME OVER</span>
        <h2>{{ winner === BLACK ? '黑方胜' : '白方胜' }}</h2>
        <div class="score-rows">
          <div class="score-row">
            <span class="score-stone is-black" aria-hidden="true"></span>
            <span class="score-name">黑方</span>
            <strong>{{ blackTerritory.toFixed(1) }}</strong>
          </div>
          <div class="score-row">
            <span class="score-stone is-white" aria-hidden="true"></span>
            <span class="score-name">白方</span>
            <strong>{{ whiteTerritory.toFixed(1) }}</strong>
          </div>
        </div>
        <p class="score-tip">数子法 · 白方含 6.5 目贴目</p>
        <div class="result-actions">
          <button class="primary-button" type="button" @click="reset">再来一局</button>
          <button class="ghost-button" type="button" @click="showSettings = true">调整设置</button>
        </div>
      </div>
    </div>

    <p class="game-note">黑方先行 · 点击交叉点落子，连续两次虚手后自动数子</p>

    <div v-if="showSettings" class="sheet-backdrop" @click.self="showSettings = false">
      <div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="weiqi-settings-title">
        <div class="sheet-head">
          <div>
            <h2 id="weiqi-settings-title">对局设置</h2>
            <div class="sheet-sub">SETTINGS</div>
          </div>
          <button class="icon-button" type="button" aria-label="关闭设置" @click="showSettings = false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div class="sheet-body">
          <div class="setting-block">
            <div class="setting-head">
              <span>对战模式</span>
              <small>切换即重开</small>
            </div>
            <div class="segmented">
              <button
                type="button"
                :class="{ 'is-active': gameMode === 'pvp' }"
                :disabled="aiThinking"
                @click="setGameMode('pvp')"
              >
                人人对战
              </button>
              <button
                type="button"
                :class="{ 'is-active': gameMode === 'pve' }"
                :disabled="aiThinking"
                @click="setGameMode('pve')"
              >
                人机对战
              </button>
            </div>
          </div>

          <div v-if="gameMode === 'pve'" class="setting-block">
            <div class="setting-head">
              <span>AI 难度</span>
              <small>下一手生效</small>
            </div>
            <div class="segmented">
              <button
                type="button"
                :class="{ 'is-active': aiDifficulty === 'easy' }"
                :disabled="aiThinking"
                @click="setDifficulty('easy')"
              >
                简单
              </button>
              <button
                type="button"
                :class="{ 'is-active': aiDifficulty === 'medium' }"
                :disabled="aiThinking"
                @click="setDifficulty('medium')"
              >
                中等
              </button>
              <button
                type="button"
                :class="{ 'is-active': aiDifficulty === 'hard' }"
                :disabled="aiThinking"
                @click="setDifficulty('hard')"
              >
                困难
              </button>
            </div>
          </div>

          <p class="setting-tip">人机模式下你执黑、电脑执白。连续两次「虚手」后按中国规则数子，白方贴 6.5 目。</p>
          <button class="primary-button sheet-done" type="button" @click="showSettings = false">开始对局</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

// ============================================================
// 常量定义 - 严格遵循设计规范
// ============================================================

// 棋盘尺寸配置
const BOARD_SIZE = 19; // 标准 19x19 棋盘
const CANVAS_SIZE = 600; // 画布基础尺寸
const CELL_SIZE = CANVAS_SIZE / (BOARD_SIZE + 1); // 格子大小
const STONE_RADIUS = CELL_SIZE * 0.45; // 棋子半径

// 色彩方案 - 围棋主题色：黑白木纹色系
const COLORS = {
  // 棋盘：木质纹理基准色
  BOARD: '#DCB35C',
  BOARD_DARK: '#C9A24F',
  BOARD_LIGHT: '#E6C876',
  
  // 黑棋：径向渐变（#666 → #000）
  BLACK_STONE_LIGHT: '#666',
  BLACK_STONE_DARK: '#000',
  
  // 白棋：径向渐变（#FFF → #CCC）
  WHITE_STONE_LIGHT: '#FFF',
  WHITE_STONE_DARK: '#CCC',
  
  // 最后一手标记：红色脉冲
  LAST_MOVE_MARKER: '#FF4444',
  
  // 线条颜色
  GRID_LINE: '#4A3728',
  STAR_POINT: '#4A3728'
} as const;

// 字体系统（设计系统常量）
// const TYPOGRAPHY = {
//   TITLE_SIZE: '1.5rem - 2rem', // 标题字体大小
//   BODY_SIZE: '1rem' // 正文字体大小
// } as const;

// 间距系统 - 基础单位：4px（设计系统常量）
// const SPACING = {
//   BASE: 4,
//   BUTTON_PADDING: '14px 32px' // 按钮内边距
// } as const;

// 圆角系统（设计系统常量）
// const BORDER_RADIUS = {
//   BUTTON: '12px', // 按钮圆角
//   BOARD: '12px' // 棋盘圆角
// } as const;

// 阴影系统（设计系统常量）
// const SHADOWS = {
//   STONE: '0 2px 8px rgba(0,0,0,0.3)', // 棋子阴影
//   CARD: '0 8px 32px rgba(0,0,0,0.3)' // 卡片阴影
// } as const;

// 动画系统（设计系统常量）
// const ANIMATION = {
//   DURATION: 300, // 过渡时长
//   EASING: 'cubic-bezier(0.4, 0, 0.2, 1)' // 缓动函数
// } as const;

// 无障碍设计 - 触控目标：最小 44x44px（设计系统常量）
// const ACCESSIBILITY = {
//   MIN_TOUCH_TARGET: 44
// } as const;

// 棋子状态常量
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

// 星位坐标（天元+8个星位）
const STAR_POINTS = [
  [3, 3], [3, 9], [3, 15],      // 上方三个星位
  [9, 3], [9, 9], [9, 15],      // 中间三个星位（含天元）
  [15, 3], [15, 9], [15, 15]    // 下方三个星位
] as const;

// ============================================================
// 响应式状态管理
// ============================================================

// 游戏状态
const currentPlayer = ref<number>(BLACK); // 当前执棋方
const board = ref<number[][]>([]); // 棋盘状态二维数组
const blackCaptures = ref<number>(0); // 黑方提子数
const whiteCaptures = ref<number>(0); // 白方提子数
const lastMove = ref<{ row: number; col: number } | null>(null); // 最后一手位置
const koPosition = ref<{ row: number; col: number } | null>(null); // 劫争位置
const consecutivePasses = ref<number>(0); // 连续停一手次数
const winner = ref<number | null>(null); // 获胜方
const blackTerritory = ref<number>(0); // 黑方领地
const whiteTerritory = ref<number>(0); // 白方领地
const isPaused = ref<boolean>(false); // 游戏暂停状态

// 人机对战相关状态
const gameMode = ref<'pvp' | 'pve'>('pvp'); // 游戏模式：'pvp' = 人人对战, 'pve' = 人机对战
const aiDifficulty = ref<'easy' | 'medium' | 'hard'>('medium'); // AI难度：'easy' = 简单, 'medium' = 中等, 'hard' = 困难
const aiThinking = ref(false); // AI是否正在思考
const showSettings = ref(false); // 设置抽屉开关

// 界面状态（仅用于 HUD 展示，不参与规则判定）
const statusText = computed(() => {
  if (winner.value) return winner.value === BLACK ? '黑方胜' : '白方胜';
  if (aiThinking.value) return 'AI 思考中';
  if (consecutivePasses.value === 1) return '虚手一次';
  return history.value.length === 0 ? '黑方先行' : '进行中';
});

const statusTone = computed(() => {
  if (winner.value) return 'is-winner';
  if (aiThinking.value) return 'is-thinking';
  return history.value.length === 0 ? 'is-waiting' : 'is-playing';
});

// 历史记录（用于悔棋）
interface MoveData {
  row: number;
  col: number;
  player: number;
  captures: { black: number; white: number };
}
const history = ref<MoveData[]>([]);

// DOM 引用
const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;

// 鼠标位置（用于悬停预览）
const mousePosition = ref<{ row: number; col: number } | null>(null);

// ============================================================
// 游戏初始化
// ============================================================

// 初始化棋盘
function initBoard(): void {
  // 创建空棋盘
  board.value = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => EMPTY)
  );
  
  // 重置游戏状态
  currentPlayer.value = BLACK;
  blackCaptures.value = 0;
  whiteCaptures.value = 0;
  lastMove.value = null;
  koPosition.value = null;
  consecutivePasses.value = 0;
  winner.value = null;
  blackTerritory.value = 0;
  whiteTerritory.value = 0;
  history.value = [];
  mousePosition.value = null;
}

// 组件挂载时初始化
onMounted(() => {
  initBoard();
  
  if (canvas.value) {
    ctx = canvas.value.getContext('2d');
    if (ctx) {
      drawBoard();
      // 添加事件监听器
      canvas.value.addEventListener('click', handleClick);
      canvas.value.addEventListener('mousemove', handleMouseMove);
      canvas.value.addEventListener('mouseleave', handleMouseLeave);
      // 添加键盘导航支持（无障碍设计）
      canvas.value.setAttribute('tabindex', '0');
      canvas.value.addEventListener('keydown', handleKeyDown);
    }
  }
});

// ============================================================
// 绘图系统
// ============================================================

// 绘制棋盘
function drawBoard(): void {
  if (!ctx || !canvas.value) return;

  // 清空画布
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 绘制木质纹理背景
  drawWoodTexture();

  // 绘制网格线
  drawGridLines();

  // 绘制星位
  drawStarPoints();

  // 绘制棋子
  drawStones();

  // 绘制最后一手标记
  drawLastMoveMarker();

  // 绘制悬停预览
  drawHoverPreview();
}

// 绘制木质纹理背景
// 使用径向渐变和随机贝塞尔曲线模拟木质纹理，营造真实的棋盘质感
function drawWoodTexture(): void {
  if (!ctx) return;

  // 创建木质纹理渐变（设计规范：#DCB35C 基准色）
  const gradient = ctx.createRadialGradient(
    CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0,
    CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE
  );
  gradient.addColorStop(0, COLORS.BOARD_LIGHT);
  gradient.addColorStop(0.5, COLORS.BOARD);
  gradient.addColorStop(1, COLORS.BOARD_DARK);

  // 填充背景
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 添加细微的木纹效果（使用随机贝塞尔曲线模拟木纹）
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * CANVAS_SIZE, 0);
    ctx.bezierCurveTo(
      Math.random() * CANVAS_SIZE, CANVAS_SIZE / 3,
      Math.random() * CANVAS_SIZE, (CANVAS_SIZE * 2) / 3,
      Math.random() * CANVAS_SIZE, CANVAS_SIZE
    );
    ctx.strokeStyle = '#4A3728';
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
}

// 绘制网格线
function drawGridLines(): void {
  if (!ctx) return;

  ctx.strokeStyle = COLORS.GRID_LINE;
  ctx.lineWidth = 1;

  // 绘制横线和竖线
  for (let i = 0; i < BOARD_SIZE; i++) {
    const pos = CELL_SIZE * (i + 1);
    
    // 横线
    ctx.beginPath();
    ctx.moveTo(CELL_SIZE, pos);
    ctx.lineTo(CANVAS_SIZE - CELL_SIZE, pos);
    ctx.stroke();
    
    // 竖线
    ctx.beginPath();
    ctx.moveTo(pos, CELL_SIZE);
    ctx.lineTo(pos, CANVAS_SIZE - CELL_SIZE);
    ctx.stroke();
  }
}

// 绘制星位
function drawStarPoints(): void {
  if (!ctx) return;

  ctx.fillStyle = COLORS.STAR_POINT;

  for (const [row, col] of STAR_POINTS) {
    const x = CELL_SIZE * (col + 1);
    const y = CELL_SIZE * (row + 1);
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 绘制棋子
function drawStones(): void {
  if (!ctx) return;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const stone = board.value[row][col];
      if (stone !== EMPTY) {
        drawStone(row, col, stone);
      }
    }
  }
}

// 绘制单个棋子（带立体效果）
// 使用径向渐变模拟光照，营造立体感
function drawStone(row: number, col: number, player: number): void {
  if (!ctx) return;

  const x = CELL_SIZE * (col + 1);
  const y = CELL_SIZE * (row + 1);

  // 创建径向渐变实现立体效果（光源来自左上方）
  const gradient = ctx.createRadialGradient(
    x - STONE_RADIUS * 0.3, y - STONE_RADIUS * 0.3, 0, // 渐变中心（高光点）
    x, y, STONE_RADIUS // 渐变边缘
  );

  if (player === BLACK) {
    // 黑棋渐变：#666 → #000（设计规范）
    gradient.addColorStop(0, COLORS.BLACK_STONE_LIGHT);
    gradient.addColorStop(1, COLORS.BLACK_STONE_DARK);
  } else {
    // 白棋渐变：#FFF → #CCC（设计规范）
    gradient.addColorStop(0, COLORS.WHITE_STONE_LIGHT);
    gradient.addColorStop(1, COLORS.WHITE_STONE_DARK);
  }

  // 绘制棋子阴影（设计规范：0 2px 8px rgba(0,0,0,0.3)）
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // 绘制棋子圆形
  ctx.beginPath();
  ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // 重置阴影
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// 绘制最后一手标记（红色脉冲效果）
// 使用红色圆点和半透明光晕标记最后落子的位置，方便玩家识别
function drawLastMoveMarker(): void {
  if (!ctx || !lastMove.value) return;

  const x = CELL_SIZE * (lastMove.value.col + 1);
  const y = CELL_SIZE * (lastMove.value.row + 1);

  // 绘制红色圆点标记（设计规范：红色脉冲）
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.LAST_MOVE_MARKER;
  ctx.fill();

  // 绘制外圈光晕效果（模拟脉冲动画）
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.LAST_MOVE_MARKER;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5; // 半透明光晕
  ctx.stroke();
  ctx.globalAlpha = 1.0; // 恢复不透明度
}

// 绘制悬停预览
function drawHoverPreview(): void {
  if (!ctx || !mousePosition.value || winner.value) return;

  const { row, col } = mousePosition.value;
  
  // 检查位置是否为空
  if (board.value[row][col] !== EMPTY) return;

  // 检查是否是劫争位置
  if (koPosition.value && row === koPosition.value.row && col === koPosition.value.col) {
    return;
  }

  // 绘制半透明预览棋子
  ctx.globalAlpha = 0.5;
  drawStone(row, col, currentPlayer.value);
  ctx.globalAlpha = 1.0;
}

// ============================================================
// 事件处理
// ============================================================

// 处理点击事件（落子）
function handleClick(event: MouseEvent): void {
  if (winner.value || isPaused.value) return;

  const rect = canvas.value!.getBoundingClientRect();
  
  // 计算缩放比例：Canvas 实际像素尺寸 / CSS 显示尺寸
  const scaleX = canvas.value!.width / rect.width;
  const scaleY = canvas.value!.height / rect.height;
  
  // 应用缩放比例修正坐标
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  // 计算网格坐标
  const col = Math.round(x / CELL_SIZE) - 1;
  const row = Math.round(y / CELL_SIZE) - 1;

  // 验证坐标有效性
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return;
  }

  // 尝试落子
  placeStone(row, col);
}

// 处理鼠标移动事件（悬停预览）
function handleMouseMove(event: MouseEvent): void {
  if (winner.value || isPaused.value) return;

  const rect = canvas.value!.getBoundingClientRect();
  
  // 计算缩放比例：Canvas 实际像素尺寸 / CSS 显示尺寸
  const scaleX = canvas.value!.width / rect.width;
  const scaleY = canvas.value!.height / rect.height;
  
  // 应用缩放比例修正坐标
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const col = Math.round(x / CELL_SIZE) - 1;
  const row = Math.round(y / CELL_SIZE) - 1;

  // 验证坐标有效性
  if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
    // 检查位置是否为空
    if (board.value[row][col] === EMPTY) {
      mousePosition.value = { row, col };
      drawBoard();
      return;
    }
  }

  // 清除悬停预览
  if (mousePosition.value) {
    mousePosition.value = null;
    drawBoard();
  }
}

// 处理鼠标离开事件
function handleMouseLeave(): void {
  if (mousePosition.value) {
    mousePosition.value = null;
    drawBoard();
  }
}

// 处理键盘事件（无障碍支持）
// 支持键盘导航：方向键移动焦点，空格键或回车键落子
// 触控目标最小 44x44px（设计规范）
function handleKeyDown(event: KeyboardEvent): void {
  if (winner.value || isPaused.value) return;

  const currentPos = mousePosition.value || { row: 9, col: 9 };

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      mousePosition.value = { ...currentPos, row: Math.max(0, currentPos.row - 1) };
      break;
    case 'ArrowDown':
      event.preventDefault();
      mousePosition.value = { ...currentPos, row: Math.min(BOARD_SIZE - 1, currentPos.row + 1) };
      break;
    case 'ArrowLeft':
      event.preventDefault();
      mousePosition.value = { ...currentPos, col: Math.max(0, currentPos.col - 1) };
      break;
    case 'ArrowRight':
      event.preventDefault();
      mousePosition.value = { ...currentPos, col: Math.min(BOARD_SIZE - 1, currentPos.col + 1) };
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (mousePosition.value) {
        placeStone(mousePosition.value.row, mousePosition.value.col);
      }
      break;
  }

  drawBoard();
}

// ============================================================
// 游戏规则实现
// ============================================================

// 落子逻辑（核心游戏规则实现）
// 包含落子验证、提子检查、劫争规则、禁着点检查等完整围棋规则
function placeStone(row: number, col: number): void {
  // 验证位置是否为空
  if (board.value[row][col] !== EMPTY) {
    return;
  }

  // 检查劫争规则（禁止立即回提）
  if (koPosition.value && row === koPosition.value.row && col === koPosition.value.col) {
    return;
  }

  // 临时放置棋子
  board.value[row][col] = currentPlayer.value;

  // 检查并移除被提吃的对方棋子
  const opponent = currentPlayer.value === BLACK ? WHITE : BLACK;
  const capturedStones = captureStones(row, col, opponent);

  // 检查自杀规则（禁着点）：如果落子后没有气且没有提吃对方棋子，则禁止落子
  if (capturedStones.length === 0 && countLiberties(row, col) === 0) {
    // 撤销落子（自杀不允许）
    board.value[row][col] = EMPTY;
    return;
  }

  // 处理劫争：如果只提吃一颗棋子且落子后只有一口气，则形成劫争
  if (capturedStones.length === 1) {
    const captured = capturedStones[0];
    const liberties = countLiberties(row, col);
    if (liberties === 1) {
      // 设置劫争位置（禁止对方立即回提）
      koPosition.value = { row: captured.row, col: captured.col };
    } else {
      koPosition.value = null;
    }
  } else {
    koPosition.value = null;
  }

  // 更新提子统计
  if (currentPlayer.value === BLACK) {
    blackCaptures.value += capturedStones.length;
  } else {
    whiteCaptures.value += capturedStones.length;
  }

  // 记录历史（用于悔棋功能）
  history.value.push({
    row,
    col,
    player: currentPlayer.value,
    captures: {
      black: blackCaptures.value,
      white: whiteCaptures.value
    }
  });

  // 更新最后一手标记
  lastMove.value = { row, col };

  // 重置停一手计数
  consecutivePasses.value = 0;

  // 切换玩家
  currentPlayer.value = opponent;

  // 重绘棋盘
  drawBoard();

  // 人机对战模式：AI自动落子
  if (gameMode.value === 'pve' && currentPlayer.value === WHITE && !winner.value) {
    aiMakeMove();
  }
}

// 提子逻辑（围棋核心规则）
// 检查落子后周围对方棋子是否被完全包围（气数为0），如果是则移除该组棋子
function captureStones(row: number, col: number, targetPlayer: number): { row: number; col: number }[] {
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const captured: { row: number; col: number }[] = [];

  // 检查落子位置四个方向的对方棋子
  for (const [dx, dy] of directions) {
    const newRow = row + dx;
    const newCol = col + dy;

    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
      if (board.value[newRow][newCol] === targetPlayer) {
        // 获取相连的棋子组
        const group = getGroup(newRow, newCol, targetPlayer);
        // 检查该组棋子的气数
        if (countGroupLiberties(group) === 0) {
          // 移除该组棋子（提子）
          for (const stone of group) {
            board.value[stone.row][stone.col] = EMPTY;
            captured.push(stone);
          }
        }
      }
    }
  }

  return captured;
}

// 获取相连的棋子组
// 使用深度优先搜索（DFS）找到所有相连的同色棋子
function getGroup(row: number, col: number, player: number): { row: number; col: number }[] {
  const group: { row: number; col: number }[] = [];
  const visited = new Set<string>();
  const stack = [{ row, col }];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = `${current.row},${current.col}`;

    if (visited.has(key)) continue;
    visited.add(key);

    if (board.value[current.row][current.col] !== player) continue;

    group.push(current);

    // 检查四个方向的相邻位置
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of directions) {
      const newRow = current.row + dx;
      const newCol = current.col + dy;

      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        if (!visited.has(`${newRow},${newCol}`)) {
          stack.push({ row: newRow, col: newCol });
        }
      }
    }
  }

  return group;
}

// 计算棋子组的气
// 气是指棋子组周围空位的数量，气数为0时棋子将被提吃
function countGroupLiberties(group: { row: number; col: number }[]): number {
  const liberties = new Set<string>();

  // 遍历棋子组中的每个棋子
  for (const stone of group) {
    // 检查四个方向的相邻空位
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of directions) {
      const newRow = stone.row + dx;
      const newCol = stone.col + dy;

      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        if (board.value[newRow][newCol] === EMPTY) {
          liberties.add(`${newRow},${newCol}`);
        }
      }
    }
  }

  return liberties.size;
}

// 计算单个棋子的气
function countLiberties(row: number, col: number): number {
  const group = getGroup(row, col, board.value[row][col]);
  return countGroupLiberties(group);
}

// ============================================================
// 停一手功能
// ============================================================

function pass(): void {
  if (winner.value) return;

  consecutivePasses.value++;

  // 连续两次停一手，游戏结束
  if (consecutivePasses.value >= 2) {
    endGame();
    return;
  }

  // 记录停一手
  history.value.push({
    row: -1,
    col: -1,
    player: currentPlayer.value,
    captures: {
      black: blackCaptures.value,
      white: whiteCaptures.value
    }
  });

  // 切换玩家
  currentPlayer.value = currentPlayer.value === BLACK ? WHITE : BLACK;
  koPosition.value = null;

  drawBoard();

  // 人机模式下，玩家虚手后由 AI 应手，避免白方无人落子
  if (gameMode.value === 'pve' && currentPlayer.value === WHITE && !winner.value) {
    aiMakeMove();
  }
}

// ============================================================
// 悔棋功能
// ============================================================

function undo(): void {
  if (history.value.length === 0) return;

  const lastMoveData = history.value.pop()!;

  // 如果是停一手，不需要恢复棋盘
  if (lastMoveData.row === -1 && lastMoveData.col === -1) {
    currentPlayer.value = lastMoveData.player;
    consecutivePasses.value = Math.max(0, consecutivePasses.value - 1);
    winner.value = null;
    koPosition.value = null;
  } else {
    // 恢复棋盘状态
    board.value[lastMoveData.row][lastMoveData.col] = EMPTY;
    currentPlayer.value = lastMoveData.player;

    // 恢复提子统计
    blackCaptures.value = lastMoveData.captures.black;
    whiteCaptures.value = lastMoveData.captures.white;

    // 更新最后一手标记
    if (history.value.length > 0) {
      const prevMove = history.value[history.value.length - 1];
      if (prevMove.row !== -1) {
        lastMove.value = { row: prevMove.row, col: prevMove.col };
      } else {
        lastMove.value = null;
      }
    } else {
      lastMove.value = null;
    }

    koPosition.value = null;
  }

  winner.value = null;

  drawBoard();
}

// ============================================================
// 游戏结束和胜负判定
// ============================================================

function endGame(): void {
  // 使用简单的数子法计算领地
  calculateTerritory();
  winner.value = blackTerritory.value > whiteTerritory.value ? BLACK : WHITE;
}

// 计算领地（简化版数子法）
// 使用中国规则数子法：棋子数 + 领地数 = 最终得分
// 白方有6.5目贴目（贴目规则）
function calculateTerritory(): void {
  const visited = new Set<string>();
  let blackStones = 0;
  let whiteStones = 0;

  // 统计棋子数量
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board.value[row][col] === BLACK) {
        blackStones++;
      } else if (board.value[row][col] === WHITE) {
        whiteStones++;
      }
    }
  }

  // 领地计算：计算被单色棋子完全包围的空位
  let blackTerritoryCount = 0;
  let whiteTerritoryCount = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board.value[row][col] === EMPTY) {
        const territoryInfo = getTerritoryInfo(row, col, visited);
        if (territoryInfo.owner === BLACK) {
          blackTerritoryCount += territoryInfo.size;
        } else if (territoryInfo.owner === WHITE) {
          whiteTerritoryCount += territoryInfo.size;
        }
      }
    }
  }

  // 最终得分：棋子数 + 领地数
  blackTerritory.value = blackStones + blackTerritoryCount;
  whiteTerritory.value = whiteStones + whiteTerritoryCount + 6.5; // 白方有6.5目贴目（中国规则）
}

// 获取领地信息
// 使用广度优先搜索（BFS）分析空位区域的归属
// 如果空位区域只接触一种颜色的棋子，则该区域属于该颜色的领地
function getTerritoryInfo(
  startRow: number,
  startCol: number,
  visited: Set<string>
): { owner: number; size: number } {
  const territory: { row: number; col: number }[] = [];
  const stack: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
  const territoryVisited = new Set<string>();
  let adjacentBlack = false;
  let adjacentWhite = false;

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = `${current.row},${current.col}`;

    if (territoryVisited.has(key)) continue;
    territoryVisited.add(key);

    if (current.row < 0 || current.row >= BOARD_SIZE || 
        current.col < 0 || current.col >= BOARD_SIZE) {
      continue;
    }

    const cell = board.value[current.row][current.col];

    if (cell === EMPTY) {
      if (!visited.has(key)) {
        territory.push(current);
        visited.add(key);

        // 检查四个方向
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of directions) {
          stack.push({ row: current.row + dx, col: current.col + dy });
        }
      }
    } else if (cell === BLACK) {
      adjacentBlack = true;
    } else if (cell === WHITE) {
      adjacentWhite = true;
    }
  }

  // 领地归属判断：
  // - 如果只接触黑棋，则属于黑方领地
  // - 如果只接触白棋，则属于白方领地
  // - 如果同时接触黑白棋子，则为中立领地（公气）
  if (adjacentBlack && !adjacentWhite) {
    return { owner: BLACK, size: territory.length };
  } else if (adjacentWhite && !adjacentBlack) {
    return { owner: WHITE, size: territory.length };
  } else {
    // 中立领地（公气）
    return { owner: 0, size: 0 };
  }
}

// ============================================================
// AI算法实现（Minimax + Alpha-Beta剪枝）
// ============================================================

// 获取AI搜索深度（根据难度）
function getSearchDepth(): number {
  switch (aiDifficulty.value) {
    case 'easy':
      return 1;
    case 'medium':
      return 2;
    case 'hard':
      return 3;
    default:
      return 2;
  }
}

// AI落子入口函数
async function aiMakeMove(): Promise<void> {
  if (winner.value || gameMode.value !== 'pve') return;

  aiThinking.value = true;

  // 使用setTimeout让UI有机会更新加载状态
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const depth = getSearchDepth();
    const bestMove = findBestMove(depth);

    if (bestMove) {
      placeStone(bestMove.row, bestMove.col);
    }
  } catch (error) {
    console.error('AI落子失败:', error);
  } finally {
    aiThinking.value = false;
  }
}

// 寻找最佳落子位置
function findBestMove(depth: number): { row: number; col: number } | null {
  const validMoves = getValidMoves();
  if (validMoves.length === 0) return null;

  let bestMove: { row: number; col: number } | null = null;
  let bestScore = -Infinity;
  const alpha = -Infinity;
  const beta = Infinity;

  // 评估所有可能的落子位置
  for (const move of validMoves) {
    // 模拟落子
    const boardCopy = copyBoard();
    simulateMove(move.row, move.col, currentPlayer.value);

    // 使用Minimax + Alpha-Beta剪枝评估
    const score = minimax(depth - 1, alpha, beta, false);

    // 恢复棋盘
    restoreBoard(boardCopy);

    // 更新最佳移动
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// Minimax算法 + Alpha-Beta剪枝
function minimax(depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
  // 到达搜索深度或游戏结束
  if (depth === 0 || winner.value) {
    return evaluateBoard();
  }

  const validMoves = getValidMoves();
  if (validMoves.length === 0) {
    return evaluateBoard();
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of validMoves) {
      const boardCopy = copyBoard();
      simulateMove(move.row, move.col, currentPlayer.value);
      const score = minimax(depth - 1, alpha, beta, false);
      restoreBoard(boardCopy);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // Alpha-Beta剪枝
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    const opponent = currentPlayer.value === BLACK ? WHITE : BLACK;
    for (const move of validMoves) {
      const boardCopy = copyBoard();
      simulateMove(move.row, move.col, opponent);
      const score = minimax(depth - 1, alpha, beta, true);
      restoreBoard(boardCopy);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // Alpha-Beta剪枝
    }
    return minScore;
  }
}

// 获取所有有效落子位置
function getValidMoves(): { row: number; col: number }[] {
  const moves: { row: number; col: number }[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isValidMove(row, col)) {
        moves.push({ row, col });
      }
    }
  }

  // 优化：只考虑有价值的落子位置（周围有棋子的空位）
  return filterInterestingMoves(moves);
}

// 检查落子是否有效
function isValidMove(row: number, col: number): boolean {
  // 位置必须为空
  if (board.value[row][col] !== EMPTY) return false;

  // 检查劫争
  if (koPosition.value && row === koPosition.value.row && col === koPosition.value.col) {
    return false;
  }

  // 模拟落子检查是否自杀
  const boardCopy = copyBoard();
  board.value[row][col] = currentPlayer.value;
  const opponent = currentPlayer.value === BLACK ? WHITE : BLACK;
  const captured = captureStonesSimulated(row, col, opponent);
  
  // 检查自杀
  if (captured.length === 0 && countLiberties(row, col) === 0) {
    restoreBoard(boardCopy);
    return false;
  }

  restoreBoard(boardCopy);
  return true;
}

// 过滤有趣的落子位置（优化搜索效率）
function filterInterestingMoves(moves: { row: number; col: number }[]): { row: number; col: number }[] {
  const interesting: { row: number; col: number }[] = [];
  const visited = new Set<string>();

  for (const move of moves) {
    const key = `${move.row},${move.col}`;
    if (visited.has(key)) continue;

    // 检查周围是否有棋子
    const hasNeighbor = hasNeighborStone(move.row, move.col);
    if (hasNeighbor) {
      interesting.push(move);
      visited.add(key);
    }
  }

  // 如果没有有趣的落子，返回天元附近的位置
  if (interesting.length === 0 && moves.length > 0) {
    const center = Math.floor(BOARD_SIZE / 2);
    interesting.push({ row: center, col: center });
  }

  return interesting;
}

// 检查周围是否有棋子
function hasNeighborStone(row: number, col: number): boolean {
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dx, dy] of directions) {
    const newRow = row + dx;
    const newCol = col + dy;
    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
      if (board.value[newRow][newCol] !== EMPTY) {
        return true;
      }
    }
  }
  return false;
}

// 模拟落子
function simulateMove(row: number, col: number, player: number): void {
  board.value[row][col] = player;
  const opponent = player === BLACK ? WHITE : BLACK;
  captureStonesSimulated(row, col, opponent);
}

// 模拟提子（不修改历史记录）
function captureStonesSimulated(row: number, col: number, targetPlayer: number): { row: number; col: number }[] {
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const captured: { row: number; col: number }[] = [];

  for (const [dx, dy] of directions) {
    const newRow = row + dx;
    const newCol = col + dy;

    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
      if (board.value[newRow][newCol] === targetPlayer) {
        const group = getGroup(newRow, newCol, targetPlayer);
        if (countGroupLiberties(group) === 0) {
          for (const stone of group) {
            board.value[stone.row][stone.col] = EMPTY;
            captured.push(stone);
          }
        }
      }
    }
  }

  return captured;
}

// 复制棋盘状态
function copyBoard(): number[][] {
  return board.value.map((row: number[]) => [...row]);
}

// 恢复棋盘状态
function restoreBoard(boardCopy: number[][]): void {
  board.value = boardCopy.map((row: number[]) => [...row]);
}

// 评估棋盘局势
function evaluateBoard(): number {
  let score = 0;

  // 1. 领地评估
  const territoryScore = evaluateTerritory();
  score += territoryScore * 10;

  // 2. 提子评估
  const captureScore = evaluateCaptures();
  score += captureScore * 5;

  // 3. 棋形评估
  const shapeScore = evaluateShapes();
  score += shapeScore * 3;

  // 4. 中心控制评估
  const centerScore = evaluateCenterControl();
  score += centerScore * 2;

  return score;
}

// 评估领地
function evaluateTerritory(): number {
  let blackScore = 0;
  let whiteScore = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board.value[row][col] === BLACK) {
        blackScore++;
      } else if (board.value[row][col] === WHITE) {
        whiteScore++;
      }
    }
  }

  // AI是白方，返回白方优势
  return whiteScore - blackScore;
}

// 评估提子
function evaluateCaptures(): number {
  const aiPlayer = WHITE;
  
  if (currentPlayer.value === aiPlayer) {
    return whiteCaptures.value - blackCaptures.value;
  } else {
    return blackCaptures.value - whiteCaptures.value;
  }
}

// 评估棋形（简化版）
function evaluateShapes(): number {
  let score = 0;

  // 检查每个位置的棋形价值
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board.value[row][col] !== EMPTY) {
        score += evaluatePositionValue(row, col, board.value[row][col]);
      }
    }
  }

  return score;
}

// 评估位置价值
function evaluatePositionValue(row: number, col: number, player: number): number {
  let value = 0;
  const center = Math.floor(BOARD_SIZE / 2);

  // 中心位置更有价值
  const distToCenter = Math.abs(row - center) + Math.abs(col - center);
  value += (BOARD_SIZE - distToCenter) * 0.1;

  // 星位更有价值
  for (const [starRow, starCol] of STAR_POINTS) {
    if (row === starRow && col === starCol) {
      value += 0.5;
    }
  }

  // 边缘位置价值较低
  if (row === 0 || row === BOARD_SIZE - 1 || col === 0 || col === BOARD_SIZE - 1) {
    value -= 0.3;
  }

  return player === WHITE ? value : -value;
}

// 评估中心控制
function evaluateCenterControl(): number {
  let score = 0;
  const center = Math.floor(BOARD_SIZE / 2);
  const radius = 3;

  for (let row = center - radius; row <= center + radius; row++) {
    for (let col = center - radius; col <= center + radius; col++) {
      if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        if (board.value[row][col] === WHITE) {
          score += 1;
        } else if (board.value[row][col] === BLACK) {
          score -= 1;
        }
      }
    }
  }

  return score;
}

// ============================================================
// 游戏控制
// ============================================================

// 处理游戏模式变更
function handleGameModeChange(): void {
  if (aiThinking.value) return;
  reset();
}

/** 设置抽屉内切换对战模式（切换后重开） */
function setGameMode(mode: 'pvp' | 'pve'): void {
  if (gameMode.value === mode) return;
  if (aiThinking.value) return;
  gameMode.value = mode;
  handleGameModeChange();
}

/** 设置抽屉内切换 AI 难度（下一手生效） */
function setDifficulty(level: 'easy' | 'medium' | 'hard'): void {
  if (aiDifficulty.value === level) return;
  aiDifficulty.value = level;
}

function reset(): void {
  initBoard();
  drawBoard();
}

// function start(): void {
//   isPaused.value = false;
// }

// function pause(): void {
//   isPaused.value = true;
// }

// function end(): void {
//   isPaused.value = true;
// }

// ============================================================
// 清理
// ============================================================

onBeforeUnmount(() => {
  if (canvas.value) {
    canvas.value.removeEventListener('click', handleClick);
    canvas.value.removeEventListener('mousemove', handleMouseMove);
    canvas.value.removeEventListener('mouseleave', handleMouseLeave);
    canvas.value.removeEventListener('keydown', handleKeyDown);
  }
});

// 暴露方法供父组件调用
function pause() {
  isPaused.value = true;
}

function resume() {
  isPaused.value = false;
}

defineExpose({
  reset,
  pause,
  resume,
  isPaused
});
</script>

<style scoped>
.weiqi-game {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

/* ---------- HUD ---------- */

.game-hud {
  display: grid;
  gap: 8px;
}

.hud-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hud-bottom {
  gap: 12px;
}

.turn-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 62px;
  padding: 9px 15px 9px 11px;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.turn-stone {
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
}

.is-black .turn-stone {
  background: radial-gradient(circle at 34% 28%, #6a6d7d, #24262f 62%, #131418);
  box-shadow: inset -2px -3px 6px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(30, 30, 40, 0.25);
}

.is-white .turn-stone {
  background: radial-gradient(circle at 34% 28%, #ffffff, #ece7df 62%, #d5ccc0);
  box-shadow: inset -2px -3px 6px rgba(120, 105, 90, 0.22), 0 2px 4px rgba(120, 105, 90, 0.18);
}

.turn-text small {
  display: block;
  color: var(--faint);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.turn-text strong {
  display: block;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.status-line {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b9b3a9;
  box-shadow: 0 0 0 4px #f1e7da;
}

.status-dot.is-playing {
  background: #69b783;
  box-shadow: 0 0 0 4px #e0f0d9;
}

.status-dot.is-waiting {
  background: #b9b3a9;
}

.status-dot.is-thinking {
  background: var(--amber);
  box-shadow: 0 0 0 4px #fdf0d6;
  animation: hud-pulse 1.2s ease-in-out infinite;
}

.status-dot.is-winner {
  background: var(--coral);
  box-shadow: 0 0 0 4px var(--coral-soft);
}

@keyframes hud-pulse {
  50% {
    opacity: 0.45;
  }
}

.capture-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.capture-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 5px 10px;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: 999px;
  box-shadow: 0 2px 0 #f0dfd0;
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.capture-chip b {
  color: var(--ink);
  font-size: 15px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.mini-stone {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
}

.mini-stone.is-black {
  background: radial-gradient(circle at 34% 28%, #6a6d7d, #24262f 62%, #131418);
}

.mini-stone.is-white {
  background: radial-gradient(circle at 34% 28%, #ffffff, #ece7df 62%, #d5ccc0);
  border: 1px solid #ddd0bd;
}

.hud-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.hud-actions .ghost-button {
  padding: 8px 14px;
  font-size: 13px;
}

.hud-actions .ghost-button:disabled,
.hud-actions .icon-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 3px 0 #f0dfd0;
}

/* ---------- 棋盘卡 ---------- */

.board-wrap {
  position: relative;
  width: 100%;
  padding: 10px;
  background: var(--panel);
  border: 2px solid #f2ddc8;
  border-radius: 26px;
  box-shadow: var(--shadow-soft), 0 6px 0 #edd9c3;
}

.board {
  display: block;
  width: 100%;
  max-width: 600px;
  height: auto;
  margin: 0 auto;
  border-radius: 16px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.board:focus-visible {
  outline: 3px solid #4d9c73;
  outline-offset: 3px;
}

/* ---------- 结果卡 ---------- */

.result-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(320px, 88%);
  padding: 20px 18px 18px;
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
  margin: 7px 0 10px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.score-rows {
  display: grid;
  gap: 4px;
  padding: 8px 12px;
  text-align: left;
  background: #fffaf1;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
}

.score-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 26px;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 750;
}

.score-row strong {
  margin-left: auto;
  color: var(--ink);
  font-size: 15px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.score-stone {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
}

.score-stone.is-black {
  background: radial-gradient(circle at 34% 28%, #6a6d7d, #24262f 62%, #131418);
}

.score-stone.is-white {
  background: radial-gradient(circle at 34% 28%, #ffffff, #ece7df 62%, #d5ccc0);
  border: 1px solid #ddd0bd;
}

.score-tip {
  margin: 8px 0 0;
  color: var(--faint);
  font-size: 10.5px;
  font-weight: 700;
}

.result-actions {
  display: grid;
  gap: 9px;
  margin-top: 14px;
}

.result-actions .primary-button {
  min-height: 46px;
  min-width: 0;
  font-size: 14px;
}

.result-actions .ghost-button {
  min-height: 44px;
}

/* ---------- 说明 / 设置 ---------- */

.game-note {
  text-align: center;
  color: var(--faint);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.05em;
}

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

.sheet-body .segmented button {
  min-height: 44px;
}

.segmented button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.setting-tip {
  color: var(--faint);
  font-size: 11.5px;
  line-height: 1.6;
}

.sheet-done {
  width: 100%;
  min-height: 48px;
  margin-top: 4px;
  font-size: 15px;
}

/* ---------- 响应式 ---------- */

@media (max-width: 560px) {
  .hud-row {
    gap: 8px;
  }

  .hud-bottom {
    gap: 10px;
  }

  .turn-card {
    flex: 1;
    min-width: 0;
    min-height: 58px;
    padding: 8px 12px 8px 9px;
  }

  .turn-stone {
    width: 32px;
    height: 32px;
  }

  .turn-text strong {
    font-size: 16px;
  }

  .hud-actions {
    gap: 6px;
  }

  .hud-actions .ghost-button {
    padding: 0 11px;
    font-size: 12.5px;
  }

  .capture-chip {
    padding: 4px 9px;
    font-size: 10.5px;
  }

  .capture-chip b {
    font-size: 14px;
  }

  .board-wrap {
    padding: 7px;
    border-radius: 22px;
  }

  .board {
    border-radius: 14px;
  }

  .result-card {
    padding: 18px 16px 16px;
  }

  .result-card h2 {
    font-size: 22px;
  }
}
</style>
