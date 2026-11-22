<template>
  <main class="xiangqi-game" role="application" aria-label="中国象棋游戏">
    <div class="sr-only" aria-live="polite">
      棋盘上有 {{ board.length }} 个棋子，当前{{ currentPlayer === 'red' ? '红方' : '黑方' }}走棋{{ winner ? `，${winner === 'red' ? '红方' : '黑方'}获胜` : '' }}
    </div>

    <div class="game-hud">
      <div class="turn-card" :class="currentPlayer === 'red' ? 'is-red' : 'is-black'">
        <span class="turn-piece" aria-hidden="true">{{ currentPlayer === 'red' ? '帅' : '将' }}</span>
        <div class="turn-text">
          <small>当前回合</small>
          <strong>{{ currentPlayer === 'red' ? '红方' : '黑方' }}</strong>
        </div>
      </div>

      <div class="status-line" aria-live="assertive">
        <i class="status-dot" :class="statusTone" aria-hidden="true"></i>
        <span>{{ statusText }}</span>
      </div>

      <div class="hud-actions">
        <button
          class="ghost-button"
          type="button"
          :disabled="history.length === 0 || isAiThinking"
          @click="undo"
        >
          悔棋
        </button>
        <button class="ghost-button" type="button" :disabled="isAiThinking" @click="reset">新局</button>
        <button class="icon-button" type="button" aria-label="对局设置" @click="showSettings = true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1Z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="board-wrap">
      <canvas
        ref="canvas"
        class="board"
        :width="CANVAS_WIDTH"
        :height="CANVAS_HEIGHT"
        role="img"
        :aria-label="`中国象棋棋盘，当前${currentPlayer === 'red' ? '红方' : '黑方'}走棋`"
        tabindex="0"
      ></canvas>

      <div
        v-if="winner || isDraw"
        class="result-card"
        role="dialog"
        aria-modal="true"
        aria-label="对局结果"
      >
        <span class="result-eyebrow">GAME OVER</span>
        <h2>{{ resultTitle }}</h2>
        <p>{{ resultSubtitle }}</p>
        <div class="result-actions">
          <button class="primary-button" type="button" @click="reset">再来一局</button>
          <button class="ghost-button" type="button" @click="showSettings = true">调整设置</button>
        </div>
      </div>
    </div>

    <p class="game-note">红方先行 · 先点自己的棋子，再点高亮点落子</p>

    <div v-if="showSettings" class="sheet-backdrop" @click.self="showSettings = false">
      <div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="xiangqi-settings-title">
        <div class="sheet-head">
          <div>
            <h2 id="xiangqi-settings-title">对局设置</h2>
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
              <button type="button" :class="{ 'is-active': gameMode === 'pvp' }" :disabled="isAiThinking" @click="setGameMode('pvp')">
                人人对战
              </button>
              <button type="button" :class="{ 'is-active': gameMode === 'pve' }" :disabled="isAiThinking" @click="setGameMode('pve')">
                人机对战
              </button>
            </div>
          </div>

          <div v-if="gameMode === 'pve'" class="setting-block">
            <div class="setting-head">
              <span>AI 难度</span>
              <small>切换即重开</small>
            </div>
            <div class="segmented">
              <button type="button" :class="{ 'is-active': aiDifficulty === 'easy' }" :disabled="isAiThinking" @click="setDifficulty('easy')">
                简单
              </button>
              <button type="button" :class="{ 'is-active': aiDifficulty === 'medium' }" :disabled="isAiThinking" @click="setDifficulty('medium')">
                中等
              </button>
              <button type="button" :class="{ 'is-active': aiDifficulty === 'hard' }" :disabled="isAiThinking" @click="setDifficulty('hard')">
                困难
              </button>
            </div>
          </div>

          <p class="setting-tip">红方先行。人机模式下你执红、电脑执黑；「悔棋」可撤销上一手。</p>
          <button class="primary-button sheet-done" type="button" @click="showSettings = false">开始对局</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

// ==================== 常量定义 ====================

/** 棋盘列数（9列） */
const BOARD_COLS = 9;
/** 棋盘行数（10行） */
const BOARD_ROWS = 10;
/** 默认格子大小（像素） */
const DEFAULT_CELL_SIZE = 50;
/** 默认边距（像素） */
const DEFAULT_PADDING = 40;
/** 响应式格子大小（像素） */
const CELL_SIZE = ref(DEFAULT_CELL_SIZE);
/** 响应式边距（像素） */
const PADDING = ref(DEFAULT_PADDING);
/** 画布宽度（像素）- 动态计算 */
const CANVAS_WIDTH = computed(() => PADDING.value * 2 + (BOARD_COLS - 1) * CELL_SIZE.value);
/** 画布高度（像素）- 动态计算 */
const CANVAS_HEIGHT = computed(() => PADDING.value * 2 + (BOARD_ROWS - 1) * CELL_SIZE.value);

// ==================== 类型定义 ====================

/** 棋子类型枚举 */
type PieceType = 'king' | 'advisor' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier';

/** 玩家类型 */
type Player = 'red' | 'black';

interface Piece {
  id: string;
  type: PieceType;
  player: Player;
  row: number;
  col: number;
}

interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
  captured: Piece | null;
}

interface AIMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  score: number;
}

// ==================== 响应式状态 ====================

/** Canvas 元素引用 */
const canvas = ref<HTMLCanvasElement | null>(null);
/** Canvas 2D 上下文 */
const ctx = ref<CanvasRenderingContext2D | null>(null);
/** 棋盘上的棋子列表 */
const board = ref<Piece[]>([]);
/** 当前玩家 */
const currentPlayer = ref<Player>('red');
/** 获胜方 */
const winner = ref<Player | null>(null);
/** 选中的棋子 */
const selectedPiece = ref<Piece | null>(null);
/** 历史记录 */
const history = ref<Move[]>([]);
/** 暂停状态 */
const isPaused = ref<boolean>(false);
/** 无吃子回合计数（用于自然限着判和） */
const noCaptureMoves = ref<number>(0);
/** 局面历史（用于检测循环局面） */
const positionHistory = ref<string[]>([]);
/** 连续将军计数（用于检测长将） */
const consecutiveChecks = ref<{ red: number; black: number }>({ red: 0, black: 0 });
/** 和棋状态 */
const isDraw = ref<boolean>(false);
/** 和棋原因 */
const drawReason = ref<string>('');

// ==================== 人机对战相关状态 ====================
/** 游戏模式：人人对战/人机对战 */
const gameMode = ref<'pvp' | 'pve'>('pvp');
/** AI难度 */
const aiDifficulty = ref<'easy' | 'medium' | 'hard'>('medium');
/** AI是否正在思考 */
const isAiThinking = ref(false);
/** 设置抽屉开关 */
const showSettings = ref(false);

// ==================== 界面状态（不参与规则判定） ====================

/** 当前走棋方是否被将军（仅用于 HUD 状态展示） */
const isCurrentInCheck = computed(() => {
  if (winner.value || isDraw.value) return false;
  return isInCheck(currentPlayer.value);
});

/** HUD 状态文案 */
const statusText = computed(() => {
  if (winner.value) return winner.value === 'red' ? '红方胜' : '黑方胜';
  if (isDraw.value) return '和棋';
  if (isAiThinking.value) return 'AI 思考中';
  if (isCurrentInCheck.value) return '将军';
  return history.value.length === 0 ? '红方先行' : '进行中';
});

/** HUD 状态点配色 */
const statusTone = computed(() => {
  if (winner.value) return 'is-winner';
  if (isDraw.value) return 'is-draw';
  if (isAiThinking.value) return 'is-thinking';
  if (isCurrentInCheck.value) return 'is-check';
  return history.value.length === 0 ? 'is-waiting' : 'is-playing';
});

/** 结果卡标题 */
const resultTitle = computed(() => {
  if (winner.value) return winner.value === 'red' ? '红方胜' : '黑方胜';
  return '和棋';
});

/** 结果卡副标题 */
const resultSubtitle = computed(() => {
  if (isDraw.value) return drawReason.value || '双方和棋';
  return `本局共 ${history.value.length} 手`;
});

// ==================== 常量映射 ====================

/** 棋子名称映射（红方和黑方） */
const pieceNames: Record<PieceType, { red: string; black: string }> = {
  king: { red: '帅', black: '将' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '马', black: '马' },
  chariot: { red: '车', black: '车' },
  cannon: { red: '炮', black: '炮' },
  soldier: { red: '兵', black: '卒' }
};

// ==================== 计算属性 ====================

/** 胜利文本 */
// const winnerText = computed(() => {
//   return winner.value === 'red' ? '红方' : '黑方';
// });

// ==================== 初始化函数 ====================

/** 初始化棋盘，放置所有棋子 */
function initBoard() {
  board.value = [];
  currentPlayer.value = 'red';
  selectedPiece.value = null;
  history.value = [];
  winner.value = null;
  isPaused.value = false;
  // 重置新增的规则状态
  noCaptureMoves.value = 0;
  positionHistory.value = [];
  consecutiveChecks.value = { red: 0, black: 0 };
  isDraw.value = false;
  drawReason.value = '';
  // 重置 AI 走法历史
  aiMoveHistory.value = [];
  
  // 初始化黑方棋子（上方）
  createPiece('chariot', 'black', 0, 0);
  createPiece('horse', 'black', 0, 1);
  createPiece('elephant', 'black', 0, 2);
  createPiece('advisor', 'black', 0, 3);
  createPiece('king', 'black', 0, 4);
  createPiece('advisor', 'black', 0, 5);
  createPiece('elephant', 'black', 0, 6);
  createPiece('horse', 'black', 0, 7);
  createPiece('chariot', 'black', 0, 8);
  createPiece('cannon', 'black', 2, 1);
  createPiece('cannon', 'black', 2, 7);
  createPiece('soldier', 'black', 3, 0);
  createPiece('soldier', 'black', 3, 2);
  createPiece('soldier', 'black', 3, 4);
  createPiece('soldier', 'black', 3, 6);
  createPiece('soldier', 'black', 3, 8);

  // 初始化红方棋子（下方）
  createPiece('chariot', 'red', 9, 0);
  createPiece('horse', 'red', 9, 1);
  createPiece('elephant', 'red', 9, 2);
  createPiece('advisor', 'red', 9, 3);
  createPiece('king', 'red', 9, 4);
  createPiece('advisor', 'red', 9, 5);
  createPiece('elephant', 'red', 9, 6);
  createPiece('horse', 'red', 9, 7);
  createPiece('chariot', 'red', 9, 8);
  createPiece('cannon', 'red', 7, 1);
  createPiece('cannon', 'red', 7, 7);
  createPiece('soldier', 'red', 6, 0);
  createPiece('soldier', 'red', 6, 2);
  createPiece('soldier', 'red', 6, 4);
  createPiece('soldier', 'red', 6, 6);
  createPiece('soldier', 'red', 6, 8);
  
  // 初始化响应式尺寸
  adjustCanvasSize();
}

/**
 * 保持逻辑分辨率不变，棋盘由 CSS 等比缩放适配容器。
 * 这里只保证后备缓冲区尺寸正确，避免写死 canvas 的样式宽高。
 */
function adjustCanvasSize() {
  if (!canvas.value) return;
  if (canvas.value.width !== CANVAS_WIDTH.value) canvas.value.width = CANVAS_WIDTH.value;
  if (canvas.value.height !== CANVAS_HEIGHT.value) canvas.value.height = CANVAS_HEIGHT.value;
  drawBoard();
}

/** 创建棋子并添加到棋盘 */
function createPiece(type: PieceType, player: Player, row: number, col: number) {
  board.value.push({ id: `${type}-${player}-${row}-${col}`, type, player, row, col });
}

// ==================== 绘制函数 ====================

/** 绘制棋盘 */
function drawBoard() {
  if (!ctx.value || !canvas.value) return;

  const context = ctx.value;
  
  // 棋盘背景（修复1：从 #FFF8DC（cornsilk）改为 #F5DEB3（wheat））
  context.fillStyle = '#F5DEB3'; // wheat
  context.fillRect(0, 0, CANVAS_WIDTH.value, CANVAS_HEIGHT.value);

  // 绘制网格
  drawGrid(context);
  drawRiver(context);
  drawPalaceLines(context);

  // 绘制所有棋子
  board.value.forEach((piece: Piece) => {
    drawPiece(piece);
  });

  // 绘制选中棋子标记 + 可走点提示
  if (selectedPiece.value) {
    drawMoveHints(selectedPiece.value);
    drawSelectedPiece(selectedPiece.value);
  }
}

/** 绘制棋盘网格线 */
function drawGrid(context: CanvasRenderingContext2D) {
  context.strokeStyle = '#8B4513';
  context.lineWidth = 2;

  // 绘制横线（10条）
  for (let row = 0; row < BOARD_ROWS; row++) {
    const y = PADDING.value + row * CELL_SIZE.value;
    context.beginPath();
    context.moveTo(PADDING.value, y);
    context.lineTo(PADDING.value + (BOARD_COLS - 1) * CELL_SIZE.value, y);
    context.stroke();
  }

  // 绘制竖线（9条，中间断开楚河汉界）
  for (let col = 0; col < BOARD_COLS; col++) {
    const x = PADDING.value + col * CELL_SIZE.value;
    
    // 上半部分竖线
    context.beginPath();
    context.moveTo(x, PADDING.value);
    context.lineTo(x, PADDING.value + 4 * CELL_SIZE.value);
    context.stroke();
    
    // 下半部分竖线
    context.beginPath();
    context.moveTo(x, PADDING.value + 5 * CELL_SIZE.value);
    context.lineTo(x, PADDING.value + 9 * CELL_SIZE.value);
    context.stroke();
  }

  // 左右边框完整竖线
  context.beginPath();
  context.moveTo(PADDING.value, PADDING.value + 4 * CELL_SIZE.value);
  context.lineTo(PADDING.value, PADDING.value + 5 * CELL_SIZE.value);
  context.stroke();
  
  context.beginPath();
  context.moveTo(PADDING.value + 8 * CELL_SIZE.value, PADDING.value + 4 * CELL_SIZE.value);
  context.lineTo(PADDING.value + 8 * CELL_SIZE.value, PADDING.value + 5 * CELL_SIZE.value);
  context.stroke();
}

/** 绘制楚河汉界 */
function drawRiver(context: CanvasRenderingContext2D) {
  const riverY = PADDING.value + 4.5 * CELL_SIZE.value;
  const fontSize = Math.max(16, Math.floor(CELL_SIZE.value * 0.48));
  
  context.font = `bold ${fontSize}px Arial`;
  context.fillStyle = '#8B4513';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // 楚河
  context.fillText('楚 河', PADDING.value + 2 * CELL_SIZE.value, riverY);
  // 汉界
  context.fillText('汉 界', PADDING.value + 6 * CELL_SIZE.value, riverY);
}

/** 绘制九宫格斜线 */
function drawPalaceLines(context: CanvasRenderingContext2D) {
  context.strokeStyle = '#8B4513';
  context.lineWidth = 2;

  // 黑方九宫格（上方）
  context.beginPath();
  context.moveTo(PADDING.value + 3 * CELL_SIZE.value, PADDING.value);
  context.lineTo(PADDING.value + 5 * CELL_SIZE.value, PADDING.value + 2 * CELL_SIZE.value);
  context.stroke();
  
  context.beginPath();
  context.moveTo(PADDING.value + 5 * CELL_SIZE.value, PADDING.value);
  context.lineTo(PADDING.value + 3 * CELL_SIZE.value, PADDING.value + 2 * CELL_SIZE.value);
  context.stroke();

  // 红方九宫格（下方）
  context.beginPath();
  context.moveTo(PADDING.value + 3 * CELL_SIZE.value, PADDING.value + 7 * CELL_SIZE.value);
  context.lineTo(PADDING.value + 5 * CELL_SIZE.value, PADDING.value + 9 * CELL_SIZE.value);
  context.stroke();
  
  context.beginPath();
  context.moveTo(PADDING.value + 5 * CELL_SIZE.value, PADDING.value + 7 * CELL_SIZE.value);
  context.lineTo(PADDING.value + 3 * CELL_SIZE.value, PADDING.value + 9 * CELL_SIZE.value);
  context.stroke();
}

/** 绘制单个棋子 */
function drawPiece(piece: Piece) {
  if (!ctx.value) return;

  const context = ctx.value;
  const x = PADDING.value + piece.col * CELL_SIZE.value;
  const y = PADDING.value + piece.row * CELL_SIZE.value;
  const radius = CELL_SIZE.value / 2 - 4;

  // 绘制棋子阴影（符合设计规范：0 2px 8px rgba(0,0,0,0.3)）
  context.beginPath();
  context.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
  context.fillStyle = 'rgba(0, 0, 0, 0.3)';
  context.fill();

  // 绘制棋子圆形背景
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  
  // 棋子立体渐变色（符合设计规范）
  const gradient = context.createRadialGradient(x - 5, y - 5, 2, x, y, radius);
  if (piece.player === 'red') {
    // 红方棋子：#FFF5E6 → #DEB887 渐变
    gradient.addColorStop(0, '#FFF5E6');
    gradient.addColorStop(0.5, '#FFE4C4');
    gradient.addColorStop(1, '#DEB887');
  } else {
    // 黑方棋子：#E8E8E8 → #A9A9A9 渐变
    gradient.addColorStop(0, '#E8E8E8');
    gradient.addColorStop(0.5, '#D0D0D0');
    gradient.addColorStop(1, '#A9A9A9');
  }
  context.fillStyle = gradient;
  context.fill();

  // 棋子边框
  context.strokeStyle = piece.player === 'red' ? '#8B0000' : '#2F4F4F';
  context.lineWidth = 2;
  context.stroke();

  // 绘制棋子文字（符合设计规范：Arial, 粗体, 大小为棋子直径的 50%）
  const fontSize = Math.max(14, Math.floor(CELL_SIZE.value * 0.5));
  context.font = `bold ${fontSize}px Arial`;
  context.fillStyle = piece.player === 'red' ? '#DC143C' : '#1A1A1A';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(pieceNames[piece.type][piece.player], x, y);
}

/** 绘制选中标记 */
function drawSelectedPiece(piece: Piece) {
  if (!ctx.value) return;

  const context = ctx.value;
  const x = PADDING.value + piece.col * CELL_SIZE.value;
  const y = PADDING.value + piece.row * CELL_SIZE.value;
  const radius = CELL_SIZE.value / 2 - 2;

  // 选中高亮边框（苔绿，和纸色界面同一套语言）
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.strokeStyle = '#448d67';
  context.lineWidth = 3.5;
  context.stroke();
}

/** 绘制可走点提示：空位显示实心点，可吃子显示描边圆环 */
function drawMoveHints(piece: Piece) {
  if (!ctx.value) return;

  const context = ctx.value;
  const dotRadius = Math.max(3, Math.floor(CELL_SIZE.value * 0.11));

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (!isValidMove(piece, row, col)) continue;

      const x = PADDING.value + col * CELL_SIZE.value;
      const y = PADDING.value + row * CELL_SIZE.value;
      const occupied = board.value.some((p: Piece) => p.row === row && p.col === col);

      context.beginPath();
      if (occupied) {
        // 可吃子：画一圈绿色描边
        context.arc(x, y, CELL_SIZE.value / 2 - 2, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(68, 141, 103, 0.92)';
        context.lineWidth = 3;
        context.stroke();
      } else {
        // 空位：画一个小绿点
        context.arc(x, y, dotRadius, 0, Math.PI * 2);
        context.fillStyle = 'rgba(68, 141, 103, 0.55)';
        context.fill();
      }
    }
  }
}

// ==================== 交互处理 ====================

/** 处理鼠标点击事件 */
function handleClick(event: MouseEvent) {
  if (isPaused.value || winner.value) return;

  const rect = canvas.value?.getBoundingClientRect();
  if (!rect || !canvas.value) return;

  // 计算缩放比例：Canvas 实际像素尺寸 / CSS 显示尺寸
  const scaleX = canvas.value.width / rect.width;
  const scaleY = canvas.value.height / rect.height;
  
  // 应用缩放比例修正坐标
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const col = Math.round((x - PADDING.value) / CELL_SIZE.value);
  const row = Math.round((y - PADDING.value) / CELL_SIZE.value);

  // 检查点击位置是否在棋盘范围内
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
    return;
  }

  const clickedPiece = board.value.find((p: Piece) => p.row === row && p.col === col);

  // 如果已选中棋子，尝试移动
  if (selectedPiece.value) {
    // 点击自己的棋子，重新选择
    if (clickedPiece && clickedPiece.player === currentPlayer.value) {
      selectedPiece.value = clickedPiece;
      drawBoard();
      return;
    }

    // 尝试移动到目标位置
    if (isValidMove(selectedPiece.value, row, col)) {
      movePiece(selectedPiece.value, row, col);
    } else {
      // 无效移动，取消选择
      selectedPiece.value = null;
      drawBoard();
    }
  } else {
    // 选择棋子
    if (clickedPiece && clickedPiece.player === currentPlayer.value) {
      selectedPiece.value = clickedPiece;
      drawBoard();
    }
  }
}

/** 处理触摸事件 */
function handleTouchStart(event: TouchEvent) {
  event.preventDefault(); // 防止滚动
  const touch = event.touches[0];
  const mouseEvent = new MouseEvent('click', {
    clientX: touch.clientX,
    clientY: touch.clientY,
    bubbles: true,
    cancelable: true
  });
  canvas.value?.dispatchEvent(mouseEvent);
}

/** 处理键盘导航（无障碍设计） - 暂时禁用 */
// function handleKeyDown(event: KeyboardEvent) {
//   if (!selectedPiece.value) return;
//
//   let targetRow = selectedPiece.value.row;
//   let targetCol = selectedPiece.value.col;
//
//   switch (event.key) {
//     case 'ArrowUp':
//       targetRow--;
//       break;
//     case 'ArrowDown':
//       targetRow++;
//       break;
//     case 'ArrowLeft':
//       targetCol--;
//       break;
//     case 'ArrowRight':
//       targetCol++;
//       break;
//     case 'Enter':
//     case ' ':
//       // 确认移动
//       if (isValidMove(selectedPiece.value, targetRow, targetCol)) {
//         movePiece(selectedPiece.value, targetRow, targetCol);
//       }
//       return;
//     case 'Escape':
//       // 取消选择
//       selectedPiece.value = null;
//       drawBoard();
//       return;
//     default:
//       return;
//   }
//
//   // 检查边界
//   if (targetRow >= 0 && targetRow < BOARD_ROWS && targetCol >= 0 && targetCol < BOARD_COLS) {
//     const clickedPiece = board.value.find((p: Piece) => p.row === targetRow && p.col === targetCol);
//     
//     if (clickedPiece && clickedPiece.player === currentPlayer.value) {
//       // 选择新棋子
//       selectedPiece.value = clickedPiece;
//     } else if (isValidMove(selectedPiece.value, targetRow, targetCol)) {
//       // 移动到目标位置
//       movePiece(selectedPiece.value, targetRow, targetCol);
//     }
//     
//     drawBoard();
//   }
// }

// ==================== 规则验证 ====================

/** 验证移动是否合法 */
function isValidMove(piece: Piece, toRow: number, toCol: number): boolean {
  // 不能移动到原位置
  if (piece.row === toRow && piece.col === toCol) {
    return false;
  }

  // 边界检查
  if (toRow < 0 || toRow >= BOARD_ROWS || toCol < 0 || toCol >= BOARD_COLS) {
    return false;
  }

  // 不能吃自己的棋子
  const targetPiece = board.value.find((p: Piece) => p.row === toRow && p.col === toCol);
  if (targetPiece && targetPiece.player === piece.player) {
    return false;
  }

  // 根据棋子类型验证移动规则
  let validMove = false;
  switch (piece.type) {
    case 'king':
      validMove = isValidKingMove(piece, toRow, toCol);
      break;
    case 'advisor':
      validMove = isValidAdvisorMove(piece, toRow, toCol);
      break;
    case 'elephant':
      validMove = isValidElephantMove(piece, toRow, toCol);
      break;
    case 'horse':
      validMove = isValidHorseMove(piece, toRow, toCol);
      break;
    case 'chariot':
      validMove = isValidChariotMove(piece, toRow, toCol);
      break;
    case 'cannon':
      validMove = isValidCannonMove(piece, toRow, toCol);
      break;
    case 'soldier':
      validMove = isValidSoldierMove(piece, toRow, toCol);
      break;
    default:
      return false;
  }

  if (!validMove) {
    return false;
  }

  // 模拟移动后检查是否会导致将帅照面
  if (wouldCauseKingsFacing(piece, toRow, toCol)) {
    return false;
  }

  return true;
}

/** 将/帅移动规则：只能在九宫格内，每次只能走一格（横或竖） */
function isValidKingMove(piece: Piece, toRow: number, toCol: number): boolean {
  // 检查是否在九宫格内
  const inPalace = piece.player === 'red'
    ? toRow >= 7 && toRow <= 9 && toCol >= 3 && toCol <= 5
    : toRow >= 0 && toRow <= 2 && toCol >= 3 && toCol <= 5;

  if (!inPalace) {
    return false;
  }

  // 检查是否只移动一格
  const rowDiff = Math.abs(toRow - piece.row);
  const colDiff = Math.abs(toCol - piece.col);

  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/** 士/仕移动规则：只能在九宫格内，斜走一格 */
function isValidAdvisorMove(piece: Piece, toRow: number, toCol: number): boolean {
  // 检查是否在九宫格内
  const inPalace = piece.player === 'red'
    ? toRow >= 7 && toRow <= 9 && toCol >= 3 && toCol <= 5
    : toRow >= 0 && toRow <= 2 && toCol >= 3 && toCol <= 5;

  if (!inPalace) {
    return false;
  }

  // 检查是否斜走一格
  const rowDiff = Math.abs(toRow - piece.row);
  const colDiff = Math.abs(toCol - piece.col);

  return rowDiff === 1 && colDiff === 1;
}

/** 象/相移动规则：走田字，不能过河，有塞象眼 */
function isValidElephantMove(piece: Piece, toRow: number, toCol: number): boolean {
  // 检查是否过河
  const crossedRiver = piece.player === 'red' ? toRow < 5 : toRow > 4;
  if (crossedRiver) {
    return false;
  }

  // 检查是否走田字
  const rowDiff = Math.abs(toRow - piece.row);
  const colDiff = Math.abs(toCol - piece.col);

  if (rowDiff !== 2 || colDiff !== 2) {
    return false;
  }

  // 检查塞象眼
  const eyeRow = (piece.row + toRow) / 2;
  const eyeCol = (piece.col + toCol) / 2;
  const eyePiece = board.value.find((p: Piece) => p.row === eyeRow && p.col === eyeCol);

  return !eyePiece;
}

/** 马移动规则：走日字，有蹩马腿 */
function isValidHorseMove(piece: Piece, toRow: number, toCol: number): boolean {
  const rowDiff = Math.abs(toRow - piece.row);
  const colDiff = Math.abs(toCol - piece.col);

  // 检查是否走日字
  if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
    return false;
  }

  // 检查蹩马腿
  let legRow: number, legCol: number;

  if (rowDiff === 2) {
    // 竖着走日
    legRow = piece.row + (toRow > piece.row ? 1 : -1);
    legCol = piece.col;
  } else {
    // 横着走日
    legRow = piece.row;
    legCol = piece.col + (toCol > piece.col ? 1 : -1);
  }

  const legPiece = board.value.find((p: Piece) => p.row === legRow && p.col === legCol);

  return !legPiece;
}

/** 车移动规则：横竖走，不能跨越棋子 */
function isValidChariotMove(piece: Piece, toRow: number, toCol: number): boolean {
  // 检查是否横竖走
  if (piece.row !== toRow && piece.col !== toCol) {
    return false;
  }

  // 检查路径上是否有棋子
  return !hasPieceInPath(piece.row, piece.col, toRow, toCol);
}

/** 炮移动规则：横竖走，移动时不能跨越棋子，吃子时必须跨越一个棋子 */
function isValidCannonMove(piece: Piece, toRow: number, toCol: number): boolean {
  // 检查是否横竖走
  if (piece.row !== toRow && piece.col !== toCol) {
    return false;
  }

  const targetPiece = board.value.find((p: Piece) => p.row === toRow && p.col === toCol);
  const piecesInPath = countPiecesInPath(piece.row, piece.col, toRow, toCol);

  if (targetPiece) {
    // 吃子：必须跨越一个棋子
    return piecesInPath === 1;
  } else {
    // 移动：不能跨越棋子
    return piecesInPath === 0;
  }
}

/** 兵/卒移动规则：只能前进，过河后可以横走 */
function isValidSoldierMove(piece: Piece, toRow: number, toCol: number): boolean {
  const rowDiff = toRow - piece.row;
  const colDiff = Math.abs(toCol - piece.col);

  if (piece.player === 'red') {
    // 红方兵：向上移动
    const crossedRiver = piece.row <= 4;

    if (crossedRiver) {
      // 过河后：可以前进或横走
      return (rowDiff === -1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    } else {
      // 未过河：只能前进
      return rowDiff === -1 && colDiff === 0;
    }
  } else {
    // 黑方卒：向下移动
    const crossedRiver = piece.row >= 5;

    if (crossedRiver) {
      // 过河后：可以前进或横走
      return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    } else {
      // 未过河：只能前进
      return rowDiff === 1 && colDiff === 0;
    }
  }
}

/** 检查路径上是否有棋子 */
function hasPieceInPath(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
  return countPiecesInPath(fromRow, fromCol, toRow, toCol) > 0;
}

/** 计算路径上的棋子数量 */
function countPiecesInPath(fromRow: number, fromCol: number, toRow: number, toCol: number): number {
  let count = 0;

  if (fromRow === toRow) {
    // 横向移动
    const minCol = Math.min(fromCol, toCol);
    const maxCol = Math.max(fromCol, toCol);
    for (let col = minCol + 1; col < maxCol; col++) {
      if (board.value.find((p: Piece) => p.row === fromRow && p.col === col)) {
        count++;
      }
    }
  } else if (fromCol === toCol) {
    // 纵向移动
    const minRow = Math.min(fromRow, toRow);
    const maxRow = Math.max(fromRow, toRow);
    for (let row = minRow + 1; row < maxRow; row++) {
      if (board.value.find((p: Piece) => p.row === row && p.col === fromCol)) {
        count++;
      }
    }
  }

  return count;
}

/** 检查将帅是否照面（中国象棋特殊规则） */
function wouldCauseKingsFacing(movingPiece: Piece, toRow: number, toCol: number): boolean {
  // 模拟移动
  const originalRow = movingPiece.row;
  const originalCol = movingPiece.col;
  const targetPiece = board.value.find((p: Piece) => p.row === toRow && p.col === toCol);
  
  movingPiece.row = toRow;
  movingPiece.col = toCol;
  
  // 临时移除被吃的棋子
  let tempBoard = [...board.value];
  if (targetPiece) {
    tempBoard = tempBoard.filter((p: Piece) => p !== targetPiece);
  }
  
  // 找到红方和黑方的将/帅
  const redKing = tempBoard.find((p: Piece) => p.type === 'king' && p.player === 'red');
  const blackKing = tempBoard.find((p: Piece) => p.type === 'king' && p.player === 'black');
  
  let facing = false;
  
  // 如果两个将/帅都在同一列
  if (redKing && blackKing && redKing.col === blackKing.col) {
    // 检查中间是否有棋子
    const piecesBetween = countPiecesInPath(redKing.row, redKing.col, blackKing.row, blackKing.col);
    if (piecesBetween === 0) {
      facing = true;
    }
  }
  
  // 恢复位置
  movingPiece.row = originalRow;
  movingPiece.col = originalCol;
  
  return facing;
}

/** 检查某个玩家是否被将军 */
function isInCheck(player: Player): boolean {
  // 找到该玩家的将/帅
  const king = board.value.find((p: Piece) => p.type === 'king' && p.player === player);
  if (!king) return false;
  
  // 检查对方所有棋子是否能攻击到将/帅
  const opponent = player === 'red' ? 'black' : 'red';
  const opponentPieces = board.value.filter((p: Piece) => p.player === opponent);
  
  for (const piece of opponentPieces) {
    // 直接调用基本移动规则，不检查将帅照面（避免递归）
    if (canPieceAttack(piece, king.row, king.col)) {
      return true;
    }
  }
  
  return false;
}

/** 检查棋子是否能攻击指定位置（不考虑将帅照面规则） */
function canPieceAttack(piece: Piece, toRow: number, toCol: number): boolean {
  // 不能吃自己的棋子
  const targetPiece = board.value.find((p: Piece) => p.row === toRow && p.col === toCol);
  if (targetPiece && targetPiece.player === piece.player) {
    return false;
  }

  switch (piece.type) {
    case 'king':
      return isValidKingMove(piece, toRow, toCol);
    case 'advisor':
      return isValidAdvisorMove(piece, toRow, toCol);
    case 'elephant':
      return isValidElephantMove(piece, toRow, toCol);
    case 'horse':
      return isValidHorseMove(piece, toRow, toCol);
    case 'chariot':
      return isValidChariotMove(piece, toRow, toCol);
    case 'cannon':
      return isValidCannonMove(piece, toRow, toCol);
    case 'soldier':
      return isValidSoldierMove(piece, toRow, toCol);
    default:
      return false;
  }
}

/** 
 * 检查某个玩家是否有任何合法走法
 * @param player 玩家
 * @param checkBoard 棋盘状态（用于模拟，避免污染实际状态）
 * @returns 是否有合法走法
 */
function hasLegalMoves(player: Player, checkBoard: Piece[]): boolean {
  const playerPieces = checkBoard.filter((p: Piece) => p.player === player);
  
  for (const piece of playerPieces) {
    for (let toRow = 0; toRow < BOARD_ROWS; toRow++) {
      for (let toCol = 0; toCol < BOARD_COLS; toCol++) {
        if (isValidMoveOnBoard(piece, toRow, toCol, checkBoard)) {
          // 模拟移动后检查是否会导致自己被将军
          if (!wouldBeInCheckAfterMove(piece, toRow, toCol, checkBoard, player)) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

/**
 * 在指定棋盘上验证移动是否合法（不修改实际棋盘状态）
 */
function isValidMoveOnBoard(piece: Piece, toRow: number, toCol: number, checkBoard: Piece[]): boolean {
  // 不能移动到原位置
  if (piece.row === toRow && piece.col === toCol) {
    return false;
  }

  // 边界检查
  if (toRow < 0 || toRow >= BOARD_ROWS || toCol < 0 || toCol >= BOARD_COLS) {
    return false;
  }

  // 不能吃自己的棋子
  const targetPiece = checkBoard.find((p: Piece) => p.row === toRow && p.col === toCol);
  if (targetPiece && targetPiece.player === piece.player) {
    return false;
  }

  // 根据棋子类型验证移动规则
  let validMove = false;
  switch (piece.type) {
    case 'king':
      validMove = isValidKingMove(piece, toRow, toCol);
      break;
    case 'advisor':
      validMove = isValidAdvisorMove(piece, toRow, toCol);
      break;
    case 'elephant':
      validMove = isValidElephantMoveOnBoard(piece, toRow, toCol, checkBoard);
      break;
    case 'horse':
      validMove = isValidHorseMoveOnBoard(piece, toRow, toCol, checkBoard);
      break;
    case 'chariot':
      validMove = isValidChariotMoveOnBoard(piece, toRow, toCol, checkBoard);
      break;
    case 'cannon':
      validMove = isValidCannonMoveOnBoard(piece, toRow, toCol, checkBoard);
      break;
    case 'soldier':
      validMove = isValidSoldierMove(piece, toRow, toCol);
      break;
    default:
      return false;
  }

  return validMove;
}

/** 象/相移动规则（指定棋盘版本） */
function isValidElephantMoveOnBoard(piece: Piece, toRow: number, toCol: number, checkBoard: Piece[]): boolean {
  const crossedRiver = piece.player === 'red' ? toRow < 5 : toRow > 4;
  if (crossedRiver) return false;

  const rowDiff = Math.abs(toRow - piece.row);
  const colDiff = Math.abs(toCol - piece.col);
  if (rowDiff !== 2 || colDiff !== 2) return false;

  const eyeRow = (piece.row + toRow) / 2;
  const eyeCol = (piece.col + toCol) / 2;
  const eyePiece = checkBoard.find((p: Piece) => p.row === eyeRow && p.col === eyeCol);
  return !eyePiece;
}

/** 马移动规则（指定棋盘版本） */
function isValidHorseMoveOnBoard(piece: Piece, toRow: number, toCol: number, checkBoard: Piece[]): boolean {
  const rowDiff = Math.abs(toRow - piece.row);
  const colDiff = Math.abs(toCol - piece.col);

  if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
    return false;
  }

  let legRow: number, legCol: number;
  if (rowDiff === 2) {
    legRow = piece.row + (toRow > piece.row ? 1 : -1);
    legCol = piece.col;
  } else {
    legRow = piece.row;
    legCol = piece.col + (toCol > piece.col ? 1 : -1);
  }

  const legPiece = checkBoard.find((p: Piece) => p.row === legRow && p.col === legCol);
  return !legPiece;
}

/** 车移动规则（指定棋盘版本） */
function isValidChariotMoveOnBoard(piece: Piece, toRow: number, toCol: number, checkBoard: Piece[]): boolean {
  if (piece.row !== toRow && piece.col !== toCol) return false;
  return !hasPieceInPathOnBoard(piece.row, piece.col, toRow, toCol, checkBoard);
}

/** 炮移动规则（指定棋盘版本） */
function isValidCannonMoveOnBoard(piece: Piece, toRow: number, toCol: number, checkBoard: Piece[]): boolean {
  if (piece.row !== toRow && piece.col !== toCol) return false;

  const targetPiece = checkBoard.find((p: Piece) => p.row === toRow && p.col === toCol);
  const piecesInPath = countPiecesInPathOnBoard(piece.row, piece.col, toRow, toCol, checkBoard);

  if (targetPiece) {
    return piecesInPath === 1;
  } else {
    return piecesInPath === 0;
  }
}

/** 检查路径上是否有棋子（指定棋盘版本） */
function hasPieceInPathOnBoard(fromRow: number, fromCol: number, toRow: number, toCol: number, checkBoard: Piece[]): boolean {
  return countPiecesInPathOnBoard(fromRow, fromCol, toRow, toCol, checkBoard) > 0;
}

/** 计算路径上的棋子数量（指定棋盘版本） */
function countPiecesInPathOnBoard(fromRow: number, fromCol: number, toRow: number, toCol: number, checkBoard: Piece[]): number {
  let count = 0;

  if (fromRow === toRow) {
    const minCol = Math.min(fromCol, toCol);
    const maxCol = Math.max(fromCol, toCol);
    for (let col = minCol + 1; col < maxCol; col++) {
      if (checkBoard.find((p: Piece) => p.row === fromRow && p.col === col)) {
        count++;
      }
    }
  } else if (fromCol === toCol) {
    const minRow = Math.min(fromRow, toRow);
    const maxRow = Math.max(fromRow, toRow);
    for (let row = minRow + 1; row < maxRow; row++) {
      if (checkBoard.find((p: Piece) => p.row === row && p.col === fromCol)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * 检查移动后是否会导致自己被将军
 */
function wouldBeInCheckAfterMove(piece: Piece, toRow: number, toCol: number, checkBoard: Piece[], player: Player): boolean {
  // 深拷贝棋盘
  const simulatedBoard = checkBoard.map((p: Piece) => ({ ...p }));
  
  // 找到要移动的棋子
  const movingPiece = simulatedBoard.find((p: Piece) => p.row === piece.row && p.col === piece.col && p.id === piece.id);
  if (!movingPiece) return true;
  
  // 移除目标位置的棋子（如果有）
  const targetIndex = simulatedBoard.findIndex((p: Piece) => p.row === toRow && p.col === toCol);
  if (targetIndex !== -1) {
    simulatedBoard.splice(targetIndex, 1);
  }
  
  // 执行移动
  movingPiece.row = toRow;
  movingPiece.col = toCol;
  
  // 检查是否被将军
  const inCheck = isInCheckOnBoard(player, simulatedBoard);
  
  // 检查是否会导致将帅照面
  const kingsFacing = wouldCauseKingsFacingOnBoard(simulatedBoard);
  
  return inCheck || kingsFacing;
}

/**
 * 在指定棋盘上检查某个玩家是否被将军
 */
function isInCheckOnBoard(player: Player, checkBoard: Piece[]): boolean {
  const king = checkBoard.find((p: Piece) => p.type === 'king' && p.player === player);
  if (!king) return false;
  
  const opponent = player === 'red' ? 'black' : 'red';
  const opponentPieces = checkBoard.filter((p: Piece) => p.player === opponent);
  
  for (const piece of opponentPieces) {
    if (canPieceAttackOnBoard(piece, king.row, king.col, checkBoard)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 检查棋子是否能攻击指定位置（指定棋盘版本）
 */
function canPieceAttackOnBoard(piece: Piece, toRow: number, toCol: number, checkBoard: Piece[]): boolean {
  const targetPiece = checkBoard.find((p: Piece) => p.row === toRow && p.col === toCol);
  if (targetPiece && targetPiece.player === piece.player) {
    return false;
  }

  switch (piece.type) {
    case 'king':
      return isValidKingMove(piece, toRow, toCol);
    case 'advisor':
      return isValidAdvisorMove(piece, toRow, toCol);
    case 'elephant':
      return isValidElephantMoveOnBoard(piece, toRow, toCol, checkBoard);
    case 'horse':
      return isValidHorseMoveOnBoard(piece, toRow, toCol, checkBoard);
    case 'chariot':
      return isValidChariotMoveOnBoard(piece, toRow, toCol, checkBoard);
    case 'cannon':
      return isValidCannonMoveOnBoard(piece, toRow, toCol, checkBoard);
    case 'soldier':
      return isValidSoldierMove(piece, toRow, toCol);
    default:
      return false;
  }
}

/**
 * 检查棋盘上是否存在将帅照面
 */
function wouldCauseKingsFacingOnBoard(checkBoard: Piece[]): boolean {
  const redKing = checkBoard.find((p: Piece) => p.type === 'king' && p.player === 'red');
  const blackKing = checkBoard.find((p: Piece) => p.type === 'king' && p.player === 'black');
  
  if (!redKing || !blackKing) return false;
  
  if (redKing.col !== blackKing.col) return false;
  
  const piecesBetween = countPiecesInPathOnBoard(redKing.row, redKing.col, blackKing.row, blackKing.col, checkBoard);
  return piecesBetween === 0;
}

/** 
 * 检查某个玩家是否被将死
 * 将死：被将军且无法解除
 */
function isCheckmate(player: Player): boolean {
  if (!isInCheck(player)) {
    return false;
  }
  
  // 使用深拷贝的棋盘进行检查，避免污染实际状态
  const checkBoard = board.value.map((p: Piece) => ({ ...p }));
  return !hasLegalMoves(player, checkBoard);
}

/**
 * 检查某个玩家是否被困毙
 * 困毙：未被将军但无子可动（中国象棋中判负）
 */
function isStalemate(player: Player): boolean {
  if (isInCheck(player)) {
    return false;
  }
  
  const checkBoard = board.value.map((p: Piece) => ({ ...p }));
  return !hasLegalMoves(player, checkBoard);
}

/**
 * 生成当前局面的唯一标识（用于检测循环局面）
 */
function generatePositionKey(): string {
  const pieces = board.value
    .map((p: Piece) => `${p.type}:${p.player}:${p.row}:${p.col}`)
    .sort()
    .join('|');
  return `${currentPlayer.value}:${pieces}`;
}

/**
 * 检查和棋条件
 * @returns 和棋原因，如果不是和棋则返回 null
 */
function checkDrawConditions(): string | null {
  // 1. 自然限着：连续60回合（120步）无吃子
  if (noCaptureMoves.value >= 120) {
    return '自然限着（连续60回合无吃子）';
  }
  
  // 2. 循环局面：同一局面出现3次
  const currentPosition = generatePositionKey();
  const positionCount = positionHistory.value.filter((p: string) => p === currentPosition).length;
  if (positionCount >= 2) { // 加上当前这次就是3次
    return '循环局面（同一局面出现3次）';
  }
  
  // 3. 理论必和：检查剩余棋子是否无法取胜
  if (isTheoreticalDraw()) {
    return '理论必和（剩余棋子无法取胜）';
  }
  
  return null;
}

/**
 * 检查是否为理论必和局面
 * 例如：单马对单士、单炮对单士等
 */
function isTheoreticalDraw(): boolean {
  const redPieces = board.value.filter((p: Piece) => p.player === 'red');
  const blackPieces = board.value.filter((p: Piece) => p.player === 'black');
  
  // 只剩将帅
  const redNonKing = redPieces.filter((p: Piece) => p.type !== 'king');
  const blackNonKing = blackPieces.filter((p: Piece) => p.type !== 'king');
  
  // 双方都只剩将帅
  if (redNonKing.length === 0 && blackNonKing.length === 0) {
    return true;
  }
  
  // 一方只有将帅，另一方只有单马或单炮（无法单独将死）
  if (redNonKing.length === 0) {
    if (blackNonKing.length === 1) {
      const piece = blackNonKing[0];
      if (piece.type === 'horse' || piece.type === 'cannon') {
        return true;
      }
    }
  }
  
  if (blackNonKing.length === 0) {
    if (redNonKing.length === 1) {
      const piece = redNonKing[0];
      if (piece.type === 'horse' || piece.type === 'cannon') {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 检查长将（连续将军3次以上）
 * @param player 执行将军的玩家
 * @returns 是否构成长将
 */
function isPerpetualCheck(player: Player): boolean {
  return consecutiveChecks.value[player] >= 3;
}

// ==================== 游戏控制 ====================

/** 移动棋子 */
function movePiece(piece: Piece, toRow: number, toCol: number) {
  const targetPiece = board.value.find((p: Piece) => p.row === toRow && p.col === toCol);
  const movingPlayer = currentPlayer.value;

  // 记录历史
  history.value.push({
    from: { row: piece.row, col: piece.col },
    to: { row: toRow, col: toCol },
    captured: targetPiece || null
  });

  // 移动棋子
  piece.row = toRow;
  piece.col = toCol;

  // 如果吃子，移除被吃的棋子并重置无吃子计数
  if (targetPiece) {
    board.value = board.value.filter((p: Piece) => p !== targetPiece);
    noCaptureMoves.value = 0; // 重置无吃子计数

    // 检查是否吃掉将/帅
    if (targetPiece.type === 'king') {
      winner.value = currentPlayer.value;
    }
  } else {
    // 无吃子，计数加1
    noCaptureMoves.value++;
  }

  // 记录当前局面（用于检测循环局面）
  const positionKey = generatePositionKey();
  positionHistory.value.push(positionKey);

  // 取消选择
  selectedPiece.value = null;

  // 重绘棋盘
  drawBoard();

  // 切换玩家并进行胜负判定
  if (!winner.value && !isDraw.value) {
    const opponent = currentPlayer.value === 'red' ? 'black' : 'red';
    currentPlayer.value = opponent;
    
    // 检查对手是否被将军
    const opponentInCheck = isInCheck(opponent);
    
    if (opponentInCheck) {
      // 更新连续将军计数
      consecutiveChecks.value[movingPlayer]++;
      
      // 检查是否构成长将（连续将军3次以上）
      if (isPerpetualCheck(movingPlayer)) {
        // 长将方判负（根据中国象棋规则，长将方需变着，不变判负）
        winner.value = opponent;
      } else if (isCheckmate(opponent)) {
        // 检查是否将死
        winner.value = movingPlayer;
      }
    } else {
      // 对手未被将军，重置该方的连续将军计数
      consecutiveChecks.value[movingPlayer] = 0;
      
      // 检查是否困毙（未被将军但无子可动）
      if (isStalemate(opponent)) {
        // 困毙方判负（中国象棋规则）
        winner.value = movingPlayer;
      }
    }
    
    // 检查和棋条件
    if (!winner.value) {
      const drawResult = checkDrawConditions();
      if (drawResult) {
        isDraw.value = true;
        drawReason.value = drawResult;
      }
    }
    
    // 如果是人机对战模式且轮到黑方（AI），触发AI走棋
    if (gameMode.value === 'pve' && currentPlayer.value === 'black' && !winner.value && !isDraw.value) {
      setTimeout(() => makeAiMove(), 100);
    }
  }
}

/** 悔棋 */
function undo() {
  if (history.value.length === 0) return;

  const lastMove = history.value.pop()!;
  const movedPiece = board.value.find((p: Piece) => p.row === lastMove.to.row && p.col === lastMove.to.col);

  if (movedPiece) {
    // 恢复棋子位置
    movedPiece.row = lastMove.from.row;
    movedPiece.col = lastMove.from.col;

    // 恢复被吃的棋子
    if (lastMove.captured) {
      board.value.push(lastMove.captured);
    }

    // 切换回上一个玩家
    currentPlayer.value = currentPlayer.value === 'red' ? 'black' : 'red';
    winner.value = null;
    selectedPiece.value = null;

    drawBoard();
  }
}

/** 重置游戏 */
function reset() {
  initBoard();
  drawBoard();
}

// ==================== AI相关函数 ====================

/** 棋子价值表 */
const pieceValues: Record<PieceType, number> = {
  king: 10000,
  advisor: 20,
  elephant: 25,
  horse: 50,
  chariot: 100,
  cannon: 50,
  soldier: 10
};

/** AI 走法历史（用于检测重复走法） */
const aiMoveHistory = ref<string[]>([]);

/** 评估棋局（返回黑方的优势分数，正数表示黑方优势） */
function evaluateBoardState(currentBoard: Piece[], player: Player): number {
  let score = 0;
  
  for (const piece of currentBoard) {
    const baseValue = pieceValues[piece.type] || 0;
    const positionBonus = getPositionBonusForPiece(piece);
    const mobilityBonus = getMobilityBonus(piece, currentBoard);
    const totalValue = baseValue + positionBonus + mobilityBonus;
    
    if (piece.player === 'black') {
      score += totalValue;
    } else {
      score -= totalValue;
    }
  }
  
  // 检查是否将军对方（加分）
  if (isInCheckOnBoard('red', currentBoard)) {
    score += 30;
  }
  if (isInCheckOnBoard('black', currentBoard)) {
    score -= 30;
  }
  
  return player === 'black' ? score : -score;
}

/** 获取位置加成 */
function getPositionBonusForPiece(piece: Piece): number {
  const { row, col, type, player } = piece;
  let bonus = 0;
  
  // 兵/卒：过河后价值增加
  if (type === 'soldier') {
    if (player === 'black') {
      // 黑卒：越靠近红方底线越有价值
      if (row >= 5) {
        bonus = (row - 4) * 5; // 过河后每前进一行加5分
      }
    } else {
      // 红兵：越靠近黑方底线越有价值
      if (row <= 4) {
        bonus = (5 - row) * 5;
      }
    }
  }
  
  // 车：控制中路和肋道更有价值
  if (type === 'chariot') {
    if (col === 4) {
      bonus += 10; // 中路
    } else if (col === 3 || col === 5) {
      bonus += 5; // 肋道
    }
  }
  
  // 炮：在开局和中局更有价值
  if (type === 'cannon') {
    // 炮在中路或肋道加分
    if (col >= 3 && col <= 5) {
      bonus += 5;
    }
  }
  
  // 马：中心位置更有价值
  if (type === 'horse') {
    const centerDistance = Math.abs(col - 4) + Math.abs(row - 4.5);
    bonus += Math.max(0, 8 - centerDistance);
  }
  
  return bonus;
}

/** 获取棋子机动性加成（能走的位置越多越好） */
function getMobilityBonus(piece: Piece, currentBoard: Piece[]): number {
  // 只对车、马、炮计算机动性
  if (piece.type !== 'chariot' && piece.type !== 'horse' && piece.type !== 'cannon') {
    return 0;
  }
  
  let mobility = 0;
  for (let toRow = 0; toRow < BOARD_ROWS; toRow++) {
    for (let toCol = 0; toCol < BOARD_COLS; toCol++) {
      if (isValidMoveOnBoard(piece, toRow, toCol, currentBoard)) {
        mobility++;
      }
    }
  }
  
  // 每个可走位置加0.5分
  return mobility * 0.5;
}

/** 生成某个玩家的所有合法走法（基于指定棋盘） */
function generateAllMovesOnBoard(player: Player, currentBoard: Piece[]): AIMove[] {
  const moves: AIMove[] = [];
  const playerPieces = currentBoard.filter((p: Piece) => p.player === player);
  
  for (const piece of playerPieces) {
    for (let toRow = 0; toRow < BOARD_ROWS; toRow++) {
      for (let toCol = 0; toCol < BOARD_COLS; toCol++) {
        if (isValidMoveOnBoard(piece, toRow, toCol, currentBoard)) {
          // 检查移动后是否会导致自己被将军
          if (!wouldBeInCheckAfterMove(piece, toRow, toCol, currentBoard, player)) {
            moves.push({
              from: { row: piece.row, col: piece.col },
              to: { row: toRow, col: toCol },
              score: 0
            });
          }
        }
      }
    }
  }
  
  return moves;
}

/** 执行走法并返回被吃的棋子（用于模拟，直接修改传入的棋盘） */
function simulateMoveOnBoard(move: AIMove, currentBoard: Piece[]): Piece | null {
  const movingPiece = currentBoard.find((p: Piece) => p.row === move.from.row && p.col === move.from.col);
  if (!movingPiece) return null;
  
  const capturedIndex = currentBoard.findIndex((p: Piece) => p.row === move.to.row && p.col === move.to.col);
  let capturedPiece: Piece | null = null;
  
  if (capturedIndex !== -1) {
    capturedPiece = { ...currentBoard[capturedIndex] };
    currentBoard.splice(capturedIndex, 1);
  }
  
  movingPiece.row = move.to.row;
  movingPiece.col = move.to.col;
  
  return capturedPiece;
}

/** 撤销走法（用于模拟） */
function undoMoveOnBoard(move: AIMove, currentBoard: Piece[], capturedPiece: Piece | null) {
  const movedPiece = currentBoard.find((p: Piece) => p.row === move.to.row && p.col === move.to.col);
  if (movedPiece) {
    movedPiece.row = move.from.row;
    movedPiece.col = move.from.col;
  }
  
  if (capturedPiece) {
    currentBoard.push(capturedPiece);
  }
}

/** Minimax算法带Alpha-Beta剪枝（正确传递棋盘状态） */
function minimax(
  currentBoard: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player
): number {
  // 终止条件：达到搜索深度
  if (depth === 0) {
    return evaluateBoardState(currentBoard, aiPlayer);
  }
  
  const currentPlayer = isMaximizing ? aiPlayer : (aiPlayer === 'red' ? 'black' : 'red');
  const moves = generateAllMovesOnBoard(currentPlayer, currentBoard);
  
  // 无合法走法：被将死或困毙
  if (moves.length === 0) {
    if (isInCheckOnBoard(currentPlayer, currentBoard)) {
      // 被将死
      return isMaximizing ? -99999 + (4 - depth) : 99999 - (4 - depth);
    } else {
      // 困毙
      return isMaximizing ? -99999 + (4 - depth) : 99999 - (4 - depth);
    }
  }
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const capturedPiece = simulateMoveOnBoard(move, currentBoard);
      const evalScore = minimax(currentBoard, depth - 1, alpha, beta, false, aiPlayer);
      undoMoveOnBoard(move, currentBoard, capturedPiece);
      
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const capturedPiece = simulateMoveOnBoard(move, currentBoard);
      const evalScore = minimax(currentBoard, depth - 1, alpha, beta, true, aiPlayer);
      undoMoveOnBoard(move, currentBoard, capturedPiece);
      
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/** 生成走法的唯一标识 */
function getMoveKey(move: AIMove): string {
  return `${move.from.row},${move.from.col}-${move.to.row},${move.to.col}`;
}

/** 获取AI最佳走法 */
function getBestAiMove(): AIMove | null {
  const boardCopy = JSON.parse(JSON.stringify(board.value)) as Piece[];
  const moves = generateAllMovesOnBoard('black', boardCopy);
  
  if (moves.length === 0) return null;
  
  const depthMap: Record<string, number> = { easy: 2, medium: 3, hard: 4 };
  const depth = depthMap[aiDifficulty.value];
  
  // 计算每个走法的分数
  const scoredMoves: Array<{ move: AIMove; score: number }> = [];
  
  for (const move of moves) {
    const evalBoard = JSON.parse(JSON.stringify(board.value)) as Piece[];
    const capturedPiece = simulateMoveOnBoard(move, evalBoard);
    
    let score = minimax(evalBoard, depth - 1, -Infinity, Infinity, false, 'black');
    
    // 吃子加分
    if (capturedPiece) {
      score += pieceValues[capturedPiece.type] * 0.1;
    }
    
    // 重复走法惩罚（避免循环）
    const moveKey = getMoveKey(move);
    const repeatCount = aiMoveHistory.value.filter((k: string) => k === moveKey).length;
    if (repeatCount > 0) {
      score -= repeatCount * 50; // 每重复一次扣50分
    }
    
    // 来回走同一个棋子的惩罚
    if (aiMoveHistory.value.length >= 2) {
      const lastMove = aiMoveHistory.value[aiMoveHistory.value.length - 1];
      const secondLastMove = aiMoveHistory.value[aiMoveHistory.value.length - 2];
      
      // 检查是否是来回走
      const reverseKey = `${move.to.row},${move.to.col}-${move.from.row},${move.from.col}`;
      if (lastMove === reverseKey) {
        score -= 100; // 来回走惩罚
      }
      
      // 检查是否和两步前走法相同
      if (secondLastMove === moveKey) {
        score -= 80;
      }
    }
    
    undoMoveOnBoard(move, evalBoard, capturedPiece);
    
    scoredMoves.push({ move, score });
  }
  
  // 按分数排序
  scoredMoves.sort((a, b) => b.score - a.score);
  
  // 选择最佳走法（如果分数相同，随机选择以增加变化）
  const bestScore = scoredMoves[0].score;
  const bestMoves = scoredMoves.filter(m => m.score === bestScore);
  const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)].move;
  
  // 记录走法历史（保留最近10步）
  aiMoveHistory.value.push(getMoveKey(selectedMove));
  if (aiMoveHistory.value.length > 10) {
    aiMoveHistory.value.shift();
  }
  
  return selectedMove;
}

/** AI走棋 */
function makeAiMove() {
  if (isAiThinking.value || winner.value || currentPlayer.value !== 'black') {
    return;
  }
  
  isAiThinking.value = true;
  
  setTimeout(() => {
    const bestMove = getBestAiMove();
    
    if (bestMove) {
      const piece = board.value.find((p: Piece) => p.row === bestMove.from.row && p.col === bestMove.from.col);
      if (piece) {
        movePiece(piece, bestMove.to.row, bestMove.to.col);
      }
    }
    
    isAiThinking.value = false;
  }, 500);
}

/** 处理游戏模式变更 */
function handleGameModeChange() {
  reset();
}

/** 设置抽屉内切换对战模式（切换后重开） */
function setGameMode(mode: 'pvp' | 'pve') {
  if (gameMode.value === mode || isAiThinking.value) return;
  gameMode.value = mode;
  handleGameModeChange();
}

/** 设置抽屉内切换 AI 难度 */
function setDifficulty(level: 'easy' | 'medium' | 'hard') {
  if (aiDifficulty.value === level || isAiThinking.value) return;
  aiDifficulty.value = level;
  handleDifficultyChange();
}

/** 处理AI难度变更 */
function handleDifficultyChange() {
  if (gameMode.value === 'pve') {
    reset();
  }
}

// ==================== 生命周期 ====================

/** 组件挂载时初始化 */
onMounted(() => {
  // 使用 nextTick 确保 DOM 已经渲染完成
  nextTick(() => {
    // 初始化 Canvas 上下文
    if (canvas.value) {
      ctx.value = canvas.value.getContext('2d');
    }
    
    initBoard();
    
    // 确保 ctx 已初始化后再绘制
    if (ctx.value) {
      drawBoard();
    }
    
    // 添加点击事件
    canvas.value?.addEventListener('click', handleClick);
    
    // 添加触摸事件
    canvas.value?.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // 监听窗口大小变化
    window.addEventListener('resize', adjustCanvasSize);
  });
});

/** 组件卸载时移除事件监听 */
onBeforeUnmount(() => {
  canvas.value?.removeEventListener('click', handleClick);
  canvas.value?.removeEventListener('touchstart', handleTouchStart);
  window.removeEventListener('resize', adjustCanvasSize);
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
.xiangqi-game {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

/* ---------- HUD ---------- */

.game-hud {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.turn-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 62px;
  padding: 8px 15px 8px 10px;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.turn-piece {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 50%;
  font-family: "Kaiti SC", "STKaiti", "Songti SC", serif;
  font-size: 21px;
  font-weight: 900;
  line-height: 1;
  background: radial-gradient(circle at 35% 28%, #fffaf0, #f4e2c6 62%, #e3cca8);
  box-shadow: inset -2px -3px 6px rgba(150, 110, 70, 0.22), 0 2px 4px rgba(120, 90, 60, 0.16);
}

.turn-card.is-red .turn-piece {
  color: #c53a2c;
  border: 2px solid rgba(197, 58, 44, 0.42);
}

.turn-card.is-black .turn-piece {
  color: #303348;
  border: 2px solid rgba(48, 51, 72, 0.32);
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

.status-dot.is-check {
  background: var(--coral);
  box-shadow: 0 0 0 4px var(--coral-soft);
  animation: hud-pulse 1s ease-in-out infinite;
}

.status-dot.is-winner {
  background: var(--coral);
  box-shadow: 0 0 0 4px var(--coral-soft);
}

.status-dot.is-draw {
  background: var(--violet);
  box-shadow: 0 0 0 4px #efe7f7;
}

@keyframes hud-pulse {
  50% {
    opacity: 0.45;
  }
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
  max-width: 480px;
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
  margin: 7px 0 4px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.result-card p {
  margin-bottom: 18px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
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
  .game-hud {
    gap: 8px;
  }

  .turn-card {
    flex: 1;
    min-width: 0;
    min-height: 58px;
    padding: 7px 12px 7px 8px;
  }

  .turn-piece {
    width: 36px;
    height: 36px;
    font-size: 19px;
  }

  .turn-text strong {
    font-size: 16px;
  }

  .status-line {
    order: 3;
    width: 100%;
    padding-left: 4px;
  }

  .hud-actions {
    order: 2;
    margin-left: 0;
    gap: 6px;
  }

  .hud-actions .ghost-button {
    padding: 0 11px;
    font-size: 12.5px;
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