<template>
  <main class="gomoku-game" role="application" aria-label="五子棋游戏">
    <div class="game-hud">
      <div class="turn-card" :class="currentPlayer === 1 ? 'is-black' : 'is-white'">
        <span class="turn-stone" aria-hidden="true"></span>
        <div class="turn-text">
          <small>当前回合</small>
          <strong>{{ currentPlayer === 1 ? '黑方' : '白方' }}</strong>
        </div>
      </div>

      <div class="status-line" aria-live="assertive">
        <i class="status-dot" :class="gameStatusClass" aria-hidden="true"></i>
        <span>{{ winner ? `${winnerText}获胜` : gameStatusText }}</span>
      </div>

      <div class="hud-actions">
        <button class="ghost-button" type="button" :disabled="history.length === 0 || isAiThinking" @click="undo">悔棋</button>
        <button class="ghost-button" type="button" @click="reset">新局</button>
        <button class="icon-button" type="button" aria-label="对局设置" @click="showSettings = true">
          <svg viewBox="0 0 24 24">
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
        tabindex="0"
        aria-label="15x15 五子棋棋盘，点击落子"
        @keydown.enter="handleKeyPress"
        @keydown.space="handleKeyPress"
      ></canvas>

      <div v-if="winner" class="result-card" role="dialog" aria-label="对局结果">
        <span class="result-eyebrow">GAME OVER</span>
        <h2>{{ winnerText }}获胜</h2>
        <p>本局共 {{ history.length }} 手</p>
        <div class="result-actions">
          <button class="primary-button" type="button" @click="reset">再来一局</button>
          <button class="ghost-button" type="button" @click="showSettings = true">调整设置</button>
        </div>
      </div>
    </div>

    <div v-if="forcedDefensePoints.length > 0 && !winner" class="defense-alert" role="alert" aria-live="polite">
      <span class="defense-icon" aria-hidden="true">⚠️</span>
      <span class="defense-text">
        对方形成{{ currentThreats[0]?.type === 'live_four' ? '活四' : currentThreats[0]?.type === 'rush_four' ? '冲四' : '活三' }}！
        <template v-if="defenseMode !== 'hint'">必须落子在高亮位置防守。</template>
        <template v-else>建议落子在高亮位置防守。</template>
      </span>
      <span v-if="isDoubleThreat" class="double-badge">双杀</span>
    </div>

    <p class="game-note">黑方先行 · 横竖斜先连成五子获胜</p>

    <div v-if="showSettings" class="sheet-backdrop" @click.self="showSettings = false">
      <div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="gomoku-settings-title">
        <div class="sheet-head">
          <div>
            <h2 id="gomoku-settings-title">对局设置</h2>
            <div class="sheet-sub">SETTINGS</div>
          </div>
          <button class="icon-button" type="button" aria-label="关闭设置" @click="showSettings = false">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div class="sheet-body">
          <div class="setting-block">
            <div class="setting-head">
              <span>对战模式</span>
              <small v-if="history.length > 0 || winner !== null">对局中不可切换</small>
            </div>
            <div class="segmented">
              <button type="button" :class="{ 'is-active': gameMode === 'pvp' }" :disabled="history.length > 0 || winner !== null" @click="setGameMode('pvp')">人人对战</button>
              <button type="button" :class="{ 'is-active': gameMode === 'pve' }" :disabled="history.length > 0 || winner !== null" @click="setGameMode('pve')">人机对战</button>
            </div>
          </div>

          <div v-if="gameMode === 'pve'" class="setting-block">
            <div class="setting-head"><span>AI 难度</span></div>
            <div class="segmented">
              <button type="button" :class="{ 'is-active': aiDifficulty === 'easy' }" @click="aiDifficulty = 'easy'">简单</button>
              <button type="button" :class="{ 'is-active': aiDifficulty === 'medium' }" @click="aiDifficulty = 'medium'">中等</button>
              <button type="button" :class="{ 'is-active': aiDifficulty === 'hard' }" @click="aiDifficulty = 'hard'">困难</button>
            </div>
          </div>

          <div class="setting-block">
            <div class="setting-head"><span>强制防御</span><small>当前：{{ getDefenseModeLabel() }}</small></div>
            <div class="segmented wrap">
              <button type="button" :class="{ 'is-active': defenseMode === 'off' }" @click="setDefenseMode('off')">关闭</button>
              <button type="button" :class="{ 'is-active': defenseMode === 'basic' }" @click="setDefenseMode('basic')">基础</button>
              <button type="button" :class="{ 'is-active': defenseMode === 'strict' }" @click="setDefenseMode('strict')">严格</button>
              <button type="button" :class="{ 'is-active': defenseMode === 'hint' }" @click="setDefenseMode('hint')">仅提示</button>
            </div>
            <p class="setting-tip">开启后，对方形成四或活三时，必须落在高亮防守点，否则不能落子。</p>
          </div>

          <button class="primary-button sheet-done" type="button" @click="showSettings = false">开始对局</button>
        </div>
      </div>
    </div>

    <div v-if="showDefenseWarning" class="sheet-backdrop" @click.self="cancelMove">
      <div class="sheet-card warning-card" role="alertdialog" aria-modal="true" aria-labelledby="warning-title">
        <div class="warning-mark" aria-hidden="true">⚠️</div>
        <h2 id="warning-title">需要防守</h2>
        <p>{{ defenseWarningMessage }}</p>
        <div class="warning-actions">
          <template v-if="defenseMode === 'hint' && pendingMove">
            <button class="ghost-button" type="button" @click="confirmIgnoreWarning">确认忽略</button>
            <button class="primary-button" type="button" @click="cancelMove">取消落子</button>
          </template>
          <button v-else class="primary-button" type="button" @click="dismissWarning">知道了</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const canvas = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

// 游戏常量配置
const BOARD_SIZE = 15;
const CELL_SIZE = 40;
const PADDING = 30;
const BOARD_PIXEL_SIZE = CELL_SIZE * (BOARD_SIZE - 1) + PADDING * 2;

// 游戏状态
const board = ref<number[][]>([]);
const currentPlayer = ref<number>(1); // 1: 黑方, 2: 白方
const history = ref<Array<{ row: number; col: number; player: number }>>([]);
const winner = ref<number | null>(null);
const isPaused = ref(false);

// 游戏模式和AI状态
const gameMode = ref<'pvp' | 'pve'>('pvp'); // pvp: 人人对战, pve: 人机对战
const aiDifficulty = ref<'easy' | 'medium' | 'hard'>('medium'); // AI难度
const isAiThinking = ref(false); // AI思考状态
const aiPlayer = ref<number>(2); // AI执白棋(2)

// ===== 强制防御模式相关状态 =====
// 强制防御模式类型：'off' 关闭, 'basic' 基础强制(仅四), 'strict' 严格强制(含活三), 'hint' 智能提示
type DefenseMode = 'off' | 'basic' | 'strict' | 'hint';
const defenseMode = ref<DefenseMode>('basic'); // 默认开启基础强制模式

// 威胁信息接口
interface ThreatInfo {
  level: 3 | 2 | 1; // 威胁等级：3=绝杀(四), 2=严重(活三), 1=潜在(眠三/活二)
  type: 'live_four' | 'rush_four' | 'live_three' | 'sleep_three' | 'live_two';
  player: number; // 形成威胁的玩家
  positions: Array<{ row: number; col: number }>; // 威胁棋子位置
  defensePoints: Array<{ row: number; col: number }>; // 防守点位
}

// 当前必须防守的点位（高亮显示）
const forcedDefensePoints = ref<Array<{ row: number; col: number }>>([]);
// 当前检测到的威胁列表
const currentThreats = ref<ThreatInfo[]>([]);
// 是否显示强制防御警告
const showDefenseWarning = ref(false);
// 警告消息
const defenseWarningMessage = ref('');
// 是否为双杀局面（无法防守）
const isDoubleThreat = ref(false);

// 动画相关状态
const lastMove = ref<{ row: number; col: number } | null>(null);
const animationFrame = ref<number | null>(null);

// 悬停预览状态
const hoverPosition = ref<{ row: number; col: number } | null>(null);
const showSettings = ref(false);

// 计算属性
const winnerText = computed(() => {
  return winner.value === 1 ? '黑方' : '白方';
});

// 游戏状态文本
const gameStatusText = computed(() => {
  if (winner.value) {
    return '已结束';
  }
  if (history.value.length === 0) {
    return '等待开始';
  }
  if (isAiThinking.value) {
    return 'AI思考中';
  }
  return '游戏中';
});

// 游戏状态样式类
const gameStatusClass = computed(() => {
  if (winner.value) {
    return 'status-winner';
  }
  if (history.value.length === 0) {
    return 'status-waiting';
  }
  if (isAiThinking.value) {
    return 'status-thinking';
  }
  return 'status-playing';
});

// 生命周期钩子
onMounted(() => {
  initBoard();
  // 初始化 Canvas 上下文
  if (canvas.value) {
    ctx.value = canvas.value.getContext('2d');
    drawBoard();
    // 绑定点击事件
    canvas.value.addEventListener('click', handleClick);
    canvas.value.addEventListener('mousemove', handleMouseMove);
    canvas.value.addEventListener('mouseleave', handleMouseLeave);
  }
});

// 初始化棋盘
function initBoard() {
  board.value = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  currentPlayer.value = 1;
  history.value = [];
  winner.value = null;
  lastMove.value = null;
}

// 绘制棋盘
function drawBoard() {
  if (!canvas.value || !ctx.value) return;

  const c = canvas.value;
  const context = ctx.value;

  // 设置画布大小（支持高DPI屏幕）
  const dpr = window.devicePixelRatio || 1;
  const width = CELL_SIZE * (BOARD_SIZE - 1) + PADDING * 2;
  const height = CELL_SIZE * (BOARD_SIZE - 1) + PADDING * 2;
  
  // 只在尺寸变化时重新设置画布大小，避免重复 scale
  const targetWidth = width * dpr;
  const targetHeight = height * dpr;
  
  if (c.width !== targetWidth || c.height !== targetHeight) {
    c.width = targetWidth;
    c.height = targetHeight;
    // 只在重新设置画布大小后才 scale，因为设置 width/height 会重置 transform
    context.scale(dpr, dpr);
  } else {
    // 重置变换矩阵，避免 scale 累积
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // 清空画布
  context.clearRect(0, 0, width, height);

  // 绘制棋盘背景 - 使用渐变和纹理效果
  drawBoardBackground(context, width, height);

  // 绘制网格线
  drawGridLines(context);

  // 绘制星位点
  drawStarPoints(context);

  // 绘制棋子
  board.value.forEach((row: number[], rowIndex: number) => {
    row.forEach((cell: number, colIndex: number) => {
      if (cell !== 0) {
        const isLastMove: boolean = lastMove.value !== null && 
                          lastMove.value.row === rowIndex && 
                          lastMove.value.col === colIndex;
        drawPiece(rowIndex, colIndex, cell, isLastMove);
      }
    });
  });

  // 绘制强制防御点高亮
  if (forcedDefensePoints.value.length > 0 && !winner.value) {
    drawForcedDefensePoints(context);
  }

  // 绘制悬停预览（半透明棋子）
  if (hoverPosition.value && !winner.value && !isPaused.value) {
    drawHoverPreview(context, hoverPosition.value.row, hoverPosition.value.col);
  }

  // 绘制最后一子标记
  if (lastMove.value) {
    drawLastMoveMarker(context, lastMove.value.row, lastMove.value.col);
  }
}

// 绘制强制防御点高亮 - 使用醒目的脉冲动画效果
function drawForcedDefensePoints(context: CanvasRenderingContext2D) {
  const time = Date.now() / 1000;
  
  for (const point of forcedDefensePoints.value) {
    const x = PADDING + point.col * CELL_SIZE;
    const y = PADDING + point.row * CELL_SIZE;
    
    // 脉冲动画效果
    const pulseScale = 1 + Math.sin(time * 4) * 0.15;
    const baseRadius = CELL_SIZE / 2 - 4;
    const radius = baseRadius * pulseScale;
    
    // 绘制外层光晕
    const glowRadius = radius + 8 + Math.sin(time * 3) * 4;
    context.beginPath();
    context.arc(x, y, glowRadius, 0, Math.PI * 2);
    const glowGradient = context.createRadialGradient(x, y, radius, x, y, glowRadius);
    
    // 根据威胁等级使用不同颜色
    const threatLevel = currentThreats.value[0]?.level || 3;
    if (threatLevel === 3) {
      // LV.3 绝杀威胁 - 红色
      glowGradient.addColorStop(0, 'rgba(255, 82, 82, 0.6)');
      glowGradient.addColorStop(1, 'rgba(255, 82, 82, 0)');
    } else if (threatLevel === 2) {
      // LV.2 严重威胁 - 橙色
      glowGradient.addColorStop(0, 'rgba(255, 152, 0, 0.6)');
      glowGradient.addColorStop(1, 'rgba(255, 152, 0, 0)');
    } else {
      // LV.1 潜在威胁 - 黄色
      glowGradient.addColorStop(0, 'rgba(255, 235, 59, 0.6)');
      glowGradient.addColorStop(1, 'rgba(255, 235, 59, 0)');
    }
    context.fillStyle = glowGradient;
    context.fill();
    
    // 绘制内层高亮圆环
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.strokeStyle = threatLevel === 3 ? 'rgba(255, 82, 82, 0.9)' : 
                          threatLevel === 2 ? 'rgba(255, 152, 0, 0.9)' : 
                          'rgba(255, 235, 59, 0.9)';
    context.lineWidth = 3;
    context.stroke();
    
    // 绘制中心标记（十字或感叹号）
    context.save();
    context.strokeStyle = threatLevel === 3 ? '#FF5252' : 
                          threatLevel === 2 ? '#FF9800' : 
                          '#FFEB3B';
    context.lineWidth = 2;
    context.lineCap = 'round';
    
    // 绘制十字标记
    const crossSize = 6;
    context.beginPath();
    context.moveTo(x - crossSize, y);
    context.lineTo(x + crossSize, y);
    context.moveTo(x, y - crossSize);
    context.lineTo(x, y + crossSize);
    context.stroke();
    
    context.restore();
  }
}

// 绘制棋盘背景 - 采用木质纹理渐变
function drawBoardBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  // 创建木质渐变背景
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#E8C39E');
  gradient.addColorStop(0.3, '#DEB887');
  gradient.addColorStop(0.7, '#D2A679');
  gradient.addColorStop(1, '#C49A6C');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // 添加细微的木纹效果
  context.save();
  context.globalAlpha = 0.03;
  for (let i = 0; i < height; i += 2) {
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(width, i);
    context.strokeStyle = '#8B4513';
    context.lineWidth = 1;
    context.stroke();
  }
  context.restore();

  // 添加内阴影效果，增加立体感
  const innerShadow = context.createLinearGradient(0, 0, 0, height);
  innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
  innerShadow.addColorStop(0.1, 'rgba(0, 0, 0, 0)');
  innerShadow.addColorStop(0.9, 'rgba(0, 0, 0, 0)');
  innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  
  context.fillStyle = innerShadow;
  context.fillRect(0, 0, width, height);
}

// 绘制网格线
function drawGridLines(context: CanvasRenderingContext2D) {
  context.strokeStyle = '#8B4513';
  context.lineWidth = 1.5;
  context.lineCap = 'round';

  for (let i = 0; i < BOARD_SIZE; i++) {
    // 横线
    context.beginPath();
    context.moveTo(PADDING, PADDING + i * CELL_SIZE);
    context.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, PADDING + i * CELL_SIZE);
    context.stroke();

    // 竖线
    context.beginPath();
    context.moveTo(PADDING + i * CELL_SIZE, PADDING);
    context.lineTo(PADDING + i * CELL_SIZE, PADDING + (BOARD_SIZE - 1) * CELL_SIZE);
    context.stroke();
  }
}

// 绘制星位点
function drawStarPoints(context: CanvasRenderingContext2D) {
  const starPoints = [
    { row: 3, col: 3 },
    { row: 3, col: 11 },
    { row: 7, col: 7 },
    { row: 11, col: 3 },
    { row: 11, col: 11 }
  ];

  context.fillStyle = '#5D4037';
  starPoints.forEach(point => {
    const x = PADDING + point.col * CELL_SIZE;
    const y = PADDING + point.row * CELL_SIZE;
    
    // 绘制星位点阴影
    context.beginPath();
    context.arc(x + 1, y + 1, 5, 0, Math.PI * 2);
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fill();
    
    // 绘制星位点
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    const gradient = context.createRadialGradient(x, y, 0, x, y, 5);
    gradient.addColorStop(0, '#6D4C41');
    gradient.addColorStop(1, '#4E342E');
    context.fillStyle = gradient;
    context.fill();
  });
}

// 绘制棋子 - 采用3D立体效果
function drawPiece(row: number, col: number, player: number, isLastMove = false) {
  const context = ctx.value!;
  const x = PADDING + col * CELL_SIZE;
  const y = PADDING + row * CELL_SIZE;
  const radius = CELL_SIZE / 2 - 2;

  // 绘制棋子投影 - 增强立体感
  const shadowOffset = 3;
  context.beginPath();
  context.arc(x + shadowOffset, y + shadowOffset, radius, 0, Math.PI * 2);
  context.fillStyle = 'rgba(0, 0, 0, 0.25)';
  context.fill();

  // 绘制棋子主体
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);

  if (player === 1) {
    // 黑方棋子 - 多层渐变实现立体感
    const gradient = context.createRadialGradient(
      x - radius * 0.3, 
      y - radius * 0.3, 
      radius * 0.1, 
      x, 
      y, 
      radius
    );
    gradient.addColorStop(0, '#5a5a5a');
    gradient.addColorStop(0.3, '#3d3d3d');
    gradient.addColorStop(0.7, '#1a1a1a');
    gradient.addColorStop(1, '#000000');
    context.fillStyle = gradient;
  } else {
    // 白方棋子 - 温暖色调渐变
    const gradient = context.createRadialGradient(
      x - radius * 0.3, 
      y - radius * 0.3, 
      radius * 0.1, 
      x, 
      y, 
      radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#f5f5f5');
    gradient.addColorStop(0.7, '#e0e0e0');
    gradient.addColorStop(1, '#c0c0c0');
    context.fillStyle = gradient;
  }

  context.fill();

  // 添加高光效果 - 增强光泽感
  context.beginPath();
  context.arc(
    x - radius * 0.3, 
    y - radius * 0.3, 
    radius * 0.25, 
    0, 
    Math.PI * 2
  );
  const highlightGradient = context.createRadialGradient(
    x - radius * 0.3, 
    y - radius * 0.3, 
    0, 
    x - radius * 0.3, 
    y - radius * 0.3, 
    radius * 0.25
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = highlightGradient;
  context.fill();

  // 最后一子添加脉冲动画效果
  if (isLastMove) {
    animateLastMove(context, x, y, radius);
  }
}

// 绘制最后一子标记 - 增强红色脉冲动画效果
function drawLastMoveMarker(context: CanvasRenderingContext2D, row: number, col: number) {
  const x = PADDING + col * CELL_SIZE;
  const y = PADDING + row * CELL_SIZE;
  
  // 脉冲动画 - 使用时间计算动态半径
  const time = Date.now() / 1000;
  const pulseRadius = 4 + Math.sin(time * 4) * 2; // 持续脉冲效果
  const glowRadius = 8 + Math.sin(time * 4) * 3;
  
  // 绘制外部光晕（脉冲效果）
  context.beginPath();
  context.arc(x, y, glowRadius, 0, Math.PI * 2);
  const glowGradient = context.createRadialGradient(x, y, 4, x, y, glowRadius);
  glowGradient.addColorStop(0, 'rgba(255, 82, 82, 0.6)');
  glowGradient.addColorStop(1, 'rgba(255, 82, 82, 0)');
  context.fillStyle = glowGradient;
  context.fill();
  
  // 绘制红色标记点
  context.beginPath();
  context.arc(x, y, pulseRadius, 0, Math.PI * 2);
  context.fillStyle = '#FF5252';
  context.fill();
  
  // 绘制标记边框
  context.beginPath();
  context.arc(x, y, pulseRadius, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(255, 82, 82, 0.8)';
  context.lineWidth = 2;
  context.stroke();
}

// 绘制悬停预览 - 半透明棋子预览
function drawHoverPreview(context: CanvasRenderingContext2D, row: number, col: number) {
  const x = PADDING + col * CELL_SIZE;
  const y = PADDING + row * CELL_SIZE;
  const radius = CELL_SIZE / 2 - 2;
  
  context.save();
  context.globalAlpha = 0.5; // 半透明效果
  
  if (currentPlayer.value === 1) {
    // 黑棋预览
    const gradient = context.createRadialGradient(
      x - radius * 0.3, 
      y - radius * 0.3, 
      radius * 0.1, 
      x, 
      y, 
      radius
    );
    gradient.addColorStop(0, '#5a5a5a');
    gradient.addColorStop(0.3, '#3d3d3d');
    gradient.addColorStop(0.7, '#1a1a1a');
    gradient.addColorStop(1, '#000000');
    context.fillStyle = gradient;
  } else {
    // 白棋预览
    const gradient = context.createRadialGradient(
      x - radius * 0.3, 
      y - radius * 0.3, 
      radius * 0.1, 
      x, 
      y, 
      radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#f5f5f5');
    gradient.addColorStop(0.7, '#e0e0e0');
    gradient.addColorStop(1, '#c0c0c0');
    context.fillStyle = gradient;
  }
  
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  
  // 添加预览边框
  context.globalAlpha = 0.8;
  context.strokeStyle = currentPlayer.value === 1 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
  context.lineWidth = 2;
  context.stroke();
  
  context.restore();
}

// 最后一子脉冲动画
function animateLastMove(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  const time = Date.now() / 1000;
  const pulseSize = Math.sin(time * 3) * 3 + 5;
  
  context.beginPath();
  context.arc(x, y, radius + pulseSize, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(255, 82, 82, 0.3)';
  context.lineWidth = 2;
  context.stroke();
}

// 处理鼠标移动 - 实现悬停预览
function handleMouseMove(event: MouseEvent) {
  if (isPaused.value || winner.value || !canvas.value) {
    hoverPosition.value = null;
    drawBoard();
    return;
  }

  const { x, y } = toBoardPoint(event);

  const col = Math.round((x - PADDING) / CELL_SIZE);
  const row = Math.round((y - PADDING) / CELL_SIZE);

  if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && board.value[row][col] === 0) {
    // 只有位置改变时才重绘，优化性能
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

// 处理鼠标离开棋盘
function handleMouseLeave() {
  if (hoverPosition.value) {
    hoverPosition.value = null;
    drawBoard();
  }
}

// 处理键盘按键 - 支持键盘导航
function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    // 在棋盘中心落子（简化实现）
    const center = Math.floor(BOARD_SIZE / 2);
    if (board.value[center][center] === 0) {
      makeMove(center, center);
    }
  }
}

// 把 CSS 坐标换算成棋盘逻辑坐标（棋盘会随容器自适应缩放）
function toBoardPoint(event: MouseEvent): { x: number; y: number } {
  if (!canvas.value) {
    return { x: 0, y: 0 };
  }
  const rect = canvas.value.getBoundingClientRect();
  const scale = BOARD_PIXEL_SIZE / rect.width;
  return {
    x: (event.clientX - rect.left) * scale,
    y: (event.clientY - rect.top) * scale
  };
}

// 处理点击事件
function handleClick(event: MouseEvent) {
  if (isPaused.value || winner.value) return;
  if (!canvas.value) return;

  const { x, y } = toBoardPoint(event);

  const col = Math.round((x - PADDING) / CELL_SIZE);
  const row = Math.round((y - PADDING) / CELL_SIZE);

  if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
    makeMove(row, col);
  }
}

// 用于智能提示模式的待确认落子
const pendingMove = ref<{ row: number; col: number } | null>(null);

// 落子
function makeMove(row: number, col: number) {
  if (board.value[row][col] !== 0) return;

  // 强制防御模式验证
  if (defenseMode.value !== 'off' && defenseMode.value !== 'hint') {
    const validation = validateMoveForDefense(row, col);
    if (!validation.valid) {
      // 违规落子，判负
      defenseWarningMessage.value = validation.message;
      showDefenseWarning.value = true;
      // 判当前玩家负（对手获胜）
      winner.value = currentPlayer.value === 1 ? 2 : 1;
      playWinSound();
      return;
    }
  }
  
  // 智能提示模式：显示警告但不强制
  if (defenseMode.value === 'hint' && forcedDefensePoints.value.length > 0) {
    const isOnDefensePoint = forcedDefensePoints.value.some(
      (p: { row: number; col: number }) => p.row === row && p.col === col
    );
    if (!isOnDefensePoint) {
      // 检查是否能一步获胜
      const tempBoard = board.value.map((r: number[]) => [...r]);
      tempBoard[row][col] = currentPlayer.value;
      let canWin = false;
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (const [dx, dy] of directions) {
        let count = 1;
        for (let i = 1; i < 5; i++) {
          const nr = row + dx * i;
          const nc = col + dy * i;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && tempBoard[nr][nc] === currentPlayer.value) {
            count++;
          } else break;
        }
        for (let i = 1; i < 5; i++) {
          const nr = row - dx * i;
          const nc = col - dy * i;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && tempBoard[nr][nc] === currentPlayer.value) {
            count++;
          } else break;
        }
        if (count >= 5) {
          canWin = true;
          break;
        }
      }
      
      if (!canWin) {
        // 显示警告，等待用户确认
        pendingMove.value = { row, col };
        const threatType = currentThreats.value[0]?.type === 'live_four' ? '活四' : 
                           currentThreats.value[0]?.type === 'rush_four' ? '冲四' : '活三';
        defenseWarningMessage.value = `警告：对方已形成${threatType}！您确定要忽略威胁吗？忽略后若对方获胜将判您负。`;
        showDefenseWarning.value = true;
        return;
      }
    }
  }

  // 执行实际落子
  executeMoveInternal(row, col);
}

// 确认忽略警告并落子（智能提示模式）
function confirmIgnoreWarning() {
  if (pendingMove.value) {
    const { row, col } = pendingMove.value;
    pendingMove.value = null;
    showDefenseWarning.value = false;
    defenseWarningMessage.value = '';
    executeMoveInternal(row, col);
  }
}

// 取消落子（智能提示模式）
function cancelMove() {
  pendingMove.value = null;
  showDefenseWarning.value = false;
  defenseWarningMessage.value = '';
}

// 内部执行落子逻辑
function executeMoveInternal(row: number, col: number) {
  board.value[row][col] = currentPlayer.value;
  lastMove.value = { row, col };
  history.value.push({ row, col, player: currentPlayer.value });

  // 播放落子音效（可选）
  playMoveSound();

  drawBoard();

  if (checkWin(row, col)) {
    winner.value = currentPlayer.value;
    // 清除强制防御状态
    forcedDefensePoints.value = [];
    currentThreats.value = [];
    playWinSound();
    return;
  }

  // 切换玩家
  currentPlayer.value = currentPlayer.value === 1 ? 2 : 1;
  
  // 更新强制防御状态（检测刚落子的玩家是否形成了威胁）
  updateForcedDefenseState();
  
  // 重新绘制以显示强制防御点高亮
  drawBoard();
  
  // 如果是人机模式且轮到AI走棋
  if (gameMode.value === 'pve' && currentPlayer.value === aiPlayer.value && !winner.value) {
    aiMove();
  }
}

// 处理游戏模式变更
function handleGameModeChange() {
  // 使用 v-model 绑定，模式已自动更新
  // 切换模式时重置游戏
  reset();
}

// 检查获胜
function checkWin(row: number, col: number): boolean {
  const player = board.value[row][col];
  const directions = [
    [0, 1],   // 水平
    [1, 0],   // 垂直
    [1, 1],   // 对角线
    [1, -1]   // 反对角线
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    // 正方向检查
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (
        newRow >= 0 && newRow < BOARD_SIZE &&
        newCol >= 0 && newCol < BOARD_SIZE &&
        board.value[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }

    // 反方向检查
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (
        newRow >= 0 && newRow < BOARD_SIZE &&
        newCol >= 0 && newCol < BOARD_SIZE &&
        board.value[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
}

// 重置游戏
function reset() {
  initBoard();
  // 重置强制防御相关状态
  forcedDefensePoints.value = [];
  currentThreats.value = [];
  showDefenseWarning.value = false;
  defenseWarningMessage.value = '';
  isDoubleThreat.value = false;
  drawBoard();
}

// ===== 强制防御模式实现 =====

/**
 * 检测指定玩家在棋盘上形成的所有威胁
 * @param player 要检测威胁的玩家 (1=黑, 2=白)
 * @returns 威胁信息数组
 */
function detectThreatsForPlayer(player: number): ThreatInfo[] {
  const threats: ThreatInfo[] = [];
  const directions = [
    { dx: 0, dy: 1, name: 'horizontal' },   // 水平
    { dx: 1, dy: 0, name: 'vertical' },     // 垂直
    { dx: 1, dy: 1, name: 'diagonal' },     // 对角线
    { dx: 1, dy: -1, name: 'antiDiagonal' } // 反对角线
  ];

  // 遍历棋盘上的每个位置
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // 只检查当前玩家的棋子作为起点
      if (board.value[row][col] !== player) continue;

      // 检查四个方向
      for (const { dx, dy } of directions) {
        const threat = checkLineForThreat(row, col, dx, dy, player);
        if (threat) {
          // 避免重复添加相同的威胁（通过检查防守点是否相同）
          const isDuplicate = threats.some(existingThreat => 
            existingThreat.type === threat.type &&
            existingThreat.defensePoints.length === threat.defensePoints.length &&
            existingThreat.defensePoints.every(dp => 
              threat.defensePoints.some(tdp => tdp.row === dp.row && tdp.col === dp.col)
            )
          );
          if (!isDuplicate) {
            threats.push(threat);
          }
        }
      }
    }
  }

  return threats;
}

/**
 * 检查一条线上是否存在威胁棋型
 * @param startRow 起始行
 * @param startCol 起始列
 * @param dx 行方向增量
 * @param dy 列方向增量
 * @param player 玩家
 * @returns 威胁信息或null
 */
function checkLineForThreat(
  startRow: number, 
  startCol: number, 
  dx: number, 
  dy: number, 
  player: number
): ThreatInfo | null {
  // 收集这条线上连续的6个位置（检测五子需要看6个位置来判断两端）
  const linePositions: Array<{ row: number; col: number; value: number }> = [];
  
  // 向负方向延伸找起点
  let extendBack = 0;
  for (let i = 1; i <= 5; i++) {
    const checkRow = startRow - dx * i;
    const checkCol = startCol - dy * i;
    if (checkRow < 0 || checkRow >= BOARD_SIZE || checkCol < 0 || checkCol >= BOARD_SIZE) break;
    if (board.value[checkRow][checkCol] !== player && board.value[checkRow][checkCol] !== 0) break;
    extendBack = i;
  }

  // 从最远的有效位置开始收集
  for (let i = -extendBack; i <= 5; i++) {
    const checkRow = startRow + dx * i;
    const checkCol = startCol + dy * i;
    if (checkRow < 0 || checkRow >= BOARD_SIZE || checkCol < 0 || checkCol >= BOARD_SIZE) continue;
    linePositions.push({
      row: checkRow,
      col: checkCol,
      value: board.value[checkRow][checkCol]
    });
  }

  // 在收集的位置中寻找威胁棋型
  // 检查活四: _XXXX_ (两端都是空)
  // 检查冲四: OXXXX_ 或 _XXXXO 或 XXXX_ (一端被堵或到边界)
  // 检查活三: _XXX_ (两端都是空，且再外一格不是对方棋子)
  
  const opponent = player === 1 ? 2 : 1;
  
  // 滑动窗口检查
  for (let windowStart = 0; windowStart <= linePositions.length - 5; windowStart++) {
    const window = linePositions.slice(windowStart, windowStart + 5);
    const windowValues = window.map(p => p.value);
    
    // 统计窗口内的棋子
    let playerCount = 0;
    let emptyCount = 0;
    let emptyPositions: Array<{ row: number; col: number }> = [];
    
    for (let i = 0; i < 5; i++) {
      if (windowValues[i] === player) {
        playerCount++;
      } else if (windowValues[i] === 0) {
        emptyCount++;
        emptyPositions.push({ row: window[i].row, col: window[i].col });
      } else {
        // 有对方棋子，这个窗口无效
        playerCount = -1;
        break;
      }
    }
    
    if (playerCount === -1) continue;
    
    // 检查四子（活四或冲四）
    if (playerCount === 4 && emptyCount === 1) {
      // 找到四子，检查是活四还是冲四
      const emptyPos = emptyPositions[0];
      const emptyIndex = window.findIndex(p => p.row === emptyPos.row && p.col === emptyPos.col);
      
      // 获取窗口外两端的位置
      const beforeWindow = linePositions[windowStart - 1];
      const afterWindow = linePositions[windowStart + 5];
      
      // 判断是活四还是冲四
      // 活四：空位在中间，或者空位在端点且外侧也是空
      let isLiveFour = false;
      let defensePoints: Array<{ row: number; col: number }> = [];
      
      if (emptyIndex === 0) {
        // 空位在窗口开头 _XXXX
        if (beforeWindow && beforeWindow.value === 0) {
          // 外侧也是空，但这不是活四，是冲四（只有一个防守点）
          defensePoints = [emptyPos];
        } else if (afterWindow && afterWindow.value === 0) {
          // 另一端是空，这是活四
          isLiveFour = true;
          defensePoints = [emptyPos, { row: afterWindow.row, col: afterWindow.col }];
        } else {
          defensePoints = [emptyPos];
        }
      } else if (emptyIndex === 4) {
        // 空位在窗口结尾 XXXX_
        if (afterWindow && afterWindow.value === 0) {
          defensePoints = [emptyPos];
        } else if (beforeWindow && beforeWindow.value === 0) {
          isLiveFour = true;
          defensePoints = [emptyPos, { row: beforeWindow.row, col: beforeWindow.col }];
        } else {
          defensePoints = [emptyPos];
        }
      } else {
        // 空位在中间 XX_XX 或 X_XXX 或 XXX_X
        // 这种情况只有一个防守点
        defensePoints = [emptyPos];
      }
      
      const positions = window.filter(p => p.value === player).map(p => ({ row: p.row, col: p.col }));
      
      return {
        level: 3,
        type: isLiveFour ? 'live_four' : 'rush_four',
        player,
        positions,
        defensePoints
      };
    }
    
    // 检查活三（仅在严格模式下需要）
    if (playerCount === 3 && emptyCount === 2) {
      // 检查是否是活三：两端都是空，且形成连续的三子
      // 活三的形态：_XXX_ 或 _X_XX_ 或 _XX_X_
      
      // 简化判断：如果三子连续且两端都是空位
      const sortedPositions = window
        .map((p, i) => ({ ...p, index: i }))
        .filter(p => p.value === player)
        .sort((a, b) => a.index - b.index);
      
      // 检查是否连续
      const isConsecutive = sortedPositions.length === 3 &&
        sortedPositions[2].index - sortedPositions[0].index === 2;
      
      if (isConsecutive) {
        // 检查两端是否都是空
        const firstPlayerIndex = sortedPositions[0].index;
        const lastPlayerIndex = sortedPositions[2].index;
        
        const hasEmptyBefore = firstPlayerIndex > 0 && windowValues[firstPlayerIndex - 1] === 0;
        const hasEmptyAfter = lastPlayerIndex < 4 && windowValues[lastPlayerIndex + 1] === 0;
        
        // 还需要检查窗口外是否被堵
        const outerBefore = linePositions[windowStart + firstPlayerIndex - 2];
        const outerAfter = linePositions[windowStart + lastPlayerIndex + 2];
        
        const isBlockedBefore = outerBefore && outerBefore.value === opponent;
        const isBlockedAfter = outerAfter && outerAfter.value === opponent;
        
        if (hasEmptyBefore && hasEmptyAfter && !isBlockedBefore && !isBlockedAfter) {
          // 这是活三
          const positions = sortedPositions.map((p: { row: number; col: number; value: number; index: number }) => ({ row: window[p.index].row, col: window[p.index].col }));
          
          return {
            level: 2,
            type: 'live_three',
            player,
            positions,
            defensePoints: emptyPositions
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * 检测当前玩家的对手是否形成了威胁，并计算强制防守点
 * @returns 是否存在必须防守的威胁
 */
function updateForcedDefenseState(): boolean {
  if (defenseMode.value === 'off') {
    forcedDefensePoints.value = [];
    currentThreats.value = [];
    isDoubleThreat.value = false;
    return false;
  }

  // 检测对手（上一个落子的玩家）形成的威胁
  const opponent = currentPlayer.value === 1 ? 2 : 1;
  const threats = detectThreatsForPlayer(opponent);
  
  // 根据模式筛选需要强制防守的威胁
  let forcedThreats: ThreatInfo[] = [];
  
  if (defenseMode.value === 'basic' || defenseMode.value === 'hint') {
    // 基础模式和提示模式：只强制防守四（LV.3）
    forcedThreats = threats.filter(t => t.level === 3);
  } else if (defenseMode.value === 'strict') {
    // 严格模式：四和活三都要防守（LV.3 和 LV.2）
    forcedThreats = threats.filter(t => t.level >= 2);
  }
  
  currentThreats.value = forcedThreats;
  
  // 收集所有强制防守点
  const allDefensePoints: Array<{ row: number; col: number }> = [];
  for (const threat of forcedThreats) {
    for (const point of threat.defensePoints) {
      // 避免重复
      if (!allDefensePoints.some((p: { row: number; col: number }) => p.row === point.row && p.col === point.col)) {
        allDefensePoints.push(point);
      }
    }
  }
  
  forcedDefensePoints.value = allDefensePoints;
  
  // 检测是否为双杀局面（多个四，或者活四）
  const fourThreats = forcedThreats.filter(t => t.level === 3);
  if (fourThreats.length >= 2) {
    // 多个四，无法同时防守
    isDoubleThreat.value = true;
  } else if (fourThreats.length === 1 && fourThreats[0].type === 'live_four') {
    // 活四有两个防守点，但只能堵一个，对方下一步必赢
    // 实际上活四只要堵一个就行，但对方可以下另一个点赢
    isDoubleThreat.value = false; // 活四可以防，但防不住
  } else {
    isDoubleThreat.value = false;
  }
  
  return forcedThreats.length > 0;
}

/**
 * 验证落子是否符合强制防御规则
 * @param row 落子行
 * @param col 落子列
 * @returns { valid: boolean, message: string }
 */
function validateMoveForDefense(row: number, col: number): { valid: boolean; message: string } {
  // 关闭模式下不验证
  if (defenseMode.value === 'off') {
    return { valid: true, message: '' };
  }
  
  // 提示模式下不强制，只提示
  if (defenseMode.value === 'hint') {
    return { valid: true, message: '' };
  }
  
  // 如果没有强制防守点，允许自由落子
  if (forcedDefensePoints.value.length === 0) {
    return { valid: true, message: '' };
  }
  
  // 检查落子是否在强制防守点上
  const isOnDefensePoint = forcedDefensePoints.value.some(
    (p: { row: number; col: number }) => p.row === row && p.col === col
  );
  
  if (isOnDefensePoint) {
    return { valid: true, message: '' };
  }
  
  // 检查当前玩家是否能一步获胜（如果能赢，可以不防守）
  const tempBoard = board.value.map((r: number[]) => [...r]);
  tempBoard[row][col] = currentPlayer.value;
  
  // 检查这一步是否能赢
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dx, dy] of directions) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const nr = row + dx * i;
      const nc = col + dy * i;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && tempBoard[nr][nc] === currentPlayer.value) {
        count++;
      } else break;
    }
    for (let i = 1; i < 5; i++) {
      const nr = row - dx * i;
      const nc = col - dy * i;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && tempBoard[nr][nc] === currentPlayer.value) {
        count++;
      } else break;
    }
    if (count >= 5) {
      // 这一步能赢，允许落子
      return { valid: true, message: '' };
    }
  }
  
  // 不在防守点上且不能赢，违规
  const threatType = currentThreats.value[0]?.type === 'live_four' ? '活四' : 
                     currentThreats.value[0]?.type === 'rush_four' ? '冲四' : '活三';
  return { 
    valid: false, 
    message: `对方已形成${threatType}！必须落子在高亮的防守点上，否则判负。`
  };
}

/**
 * 关闭警告弹窗
 */
function dismissWarning() {
  showDefenseWarning.value = false;
  defenseWarningMessage.value = '';
}

/**
 * 设置对战模式：对局中不允许切换，切换后重开
 */
function setGameMode(mode: 'pvp' | 'pve') {
  if (history.value.length > 0 || winner.value || gameMode.value === mode) {
    return;
  }
  gameMode.value = mode;
  handleGameModeChange();
}

/**
 * 设置强制防御模式
 */
function setDefenseMode(mode: DefenseMode) {
  if (defenseMode.value === mode) {
    return;
  }
  defenseMode.value = mode;
  if (history.value.length > 0) {
    updateForcedDefenseState();
    drawBoard();
  }
}

/**
 * 获取当前模式的显示名称
 */
function getDefenseModeLabel(): string {
  switch (defenseMode.value) {
    case 'off': return '关闭';
    case 'basic': return '基础强制';
    case 'strict': return '严格强制';
    case 'hint': return '智能提示';
    default: return '未知';
  }
}

// ===== AI算法实现 =====

// AI主入口函数
function aiMove() {
  isAiThinking.value = true;
  
  // 使用setTimeout让UI有时间更新加载状态
  setTimeout(() => {
    const move = getBestMove();
    if (move) {
      makeMove(move.row, move.col);
    }
    isAiThinking.value = false;
  }, 100);
}

// 获取最佳落子位置
function getBestMove(): { row: number; col: number } | null {
  const emptyCells = getEmptyCells();
  
  // 如果是第一步，下在中心附近
  if (emptyCells.length === BOARD_SIZE * BOARD_SIZE) {
    const center = Math.floor(BOARD_SIZE / 2);
    return { row: center, col: center };
  }
  
  // 根据难度选择不同的搜索深度
  let searchDepth = 2;
  if (aiDifficulty.value === 'easy') {
    searchDepth = 1;
  } else if (aiDifficulty.value === 'medium') {
    searchDepth = 2;
  } else if (aiDifficulty.value === 'hard') {
    searchDepth = 3;
  }
  
  // 使用Minimax算法获取最佳位置
  const bestMove = minimax(board.value, searchDepth, -Infinity, Infinity, true);
  
  if (bestMove.move) {
    return bestMove.move;
  }
  
  // 如果没有找到好的位置，返回第一个空位
  return emptyCells[0] || null;
}

// 获取所有空位
function getEmptyCells(): Array<{ row: number; col: number }> {
  const emptyCells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board.value[row][col] === 0) {
        // 只考虑周围有棋子的空位，优化性能
        if (hasNeighbor(row, col)) {
          emptyCells.push({ row, col });
        }
      }
    }
  }
  
  // 如果没有找到有邻居的空位（第一步），返回中心位置
  if (emptyCells.length === 0) {
    const center = Math.floor(BOARD_SIZE / 2);
    if (board.value[center][center] === 0) {
      return [{ row: center, col: center }];
    }
  }
  
  return emptyCells;
}

// 检查位置周围是否有棋子
function hasNeighbor(row: number, col: number, distance = 2): boolean {
  for (let dr = -distance; dr <= distance; dr++) {
    for (let dc = -distance; dc <= distance; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board.value[nr][nc] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// Minimax算法带Alpha-Beta剪枝
function minimax(
  currentBoard: number[][], 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean
): { score: number; move: { row: number; col: number } | null } {
  
  // 检查终止条件
  const winner = checkWinner(currentBoard);
  if (winner === aiPlayer.value) {
    return { score: 100000, move: null };
  }
  if (winner === (aiPlayer.value === 1 ? 2 : 1)) {
    return { score: -100000, move: null };
  }
  if (depth === 0) {
    return { score: evaluateBoard(currentBoard), move: null };
  }
  
  const emptyCells = getEmptyCellsFromBoard(currentBoard);
  if (emptyCells.length === 0) {
    return { score: 0, move: null };
  }
  
  // 对空位进行排序，优先考虑更有价值的位置
  emptyCells.sort((a, b) => {
    const scoreA = evaluatePosition(currentBoard, a.row, a.col);
    const scoreB = evaluatePosition(currentBoard, b.row, b.col);
    return scoreB - scoreA;
  });
  
  // 只考虑前N个最有希望的位置，优化性能
  const maxCandidates = Math.min(emptyCells.length, 10);
  const candidates = emptyCells.slice(0, maxCandidates);
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    let bestMove: { row: number; col: number } | null = null;
    
    for (const cell of candidates) {
      const newBoard = cloneBoard(currentBoard);
      newBoard[cell.row][cell.col] = aiPlayer.value;
      
      const result = minimax(newBoard, depth - 1, alpha, beta, false);
      
      if (result.score > maxScore) {
        maxScore = result.score;
        bestMove = cell;
      }
      
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) {
        break; // Alpha-Beta剪枝
      }
    }
    
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    let bestMove: { row: number; col: number } | null = null;
    const opponent = aiPlayer.value === 1 ? 2 : 1;
    
    for (const cell of candidates) {
      const newBoard = cloneBoard(currentBoard);
      newBoard[cell.row][cell.col] = opponent;
      
      const result = minimax(newBoard, depth - 1, alpha, beta, true);
      
      if (result.score < minScore) {
        minScore = result.score;
        bestMove = cell;
      }
      
      beta = Math.min(beta, result.score);
      if (beta <= alpha) {
        break; // Alpha-Beta剪枝
      }
    }
    
    return { score: minScore, move: bestMove };
  }
}

// 评估整个棋盘局势
function evaluateBoard(currentBoard: number[][]): number {
  let score = 0;
  
  // 评估AI的棋型
  score += evaluatePlayer(currentBoard, aiPlayer.value);
  
  // 评估对手的棋型（负分）
  const opponent = aiPlayer.value === 1 ? 2 : 1;
  score -= evaluatePlayer(currentBoard, opponent);
  
  return score;
}

// 评估某个玩家的局势
function evaluatePlayer(currentBoard: number[][], player: number): number {
  let score = 0;
  
  // 检查所有行、列、对角线
  // 水平方向
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 4; col++) {
      score += evaluateLine(
        currentBoard[row][col],
        currentBoard[row][col + 1],
        currentBoard[row][col + 2],
        currentBoard[row][col + 3],
        currentBoard[row][col + 4],
        player
      );
    }
  }
  
  // 垂直方向
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 4; row++) {
      score += evaluateLine(
        currentBoard[row][col],
        currentBoard[row + 1][col],
        currentBoard[row + 2][col],
        currentBoard[row + 3][col],
        currentBoard[row + 4][col],
        player
      );
    }
  }
  
  // 对角线方向
  for (let row = 0; row < BOARD_SIZE - 4; row++) {
    for (let col = 0; col < BOARD_SIZE - 4; col++) {
      score += evaluateLine(
        currentBoard[row][col],
        currentBoard[row + 1][col + 1],
        currentBoard[row + 2][col + 2],
        currentBoard[row + 3][col + 3],
        currentBoard[row + 4][col + 4],
        player
      );
    }
  }
  
  // 反对角线方向
  for (let row = 4; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 4; col++) {
      score += evaluateLine(
        currentBoard[row][col],
        currentBoard[row - 1][col + 1],
        currentBoard[row - 2][col + 2],
        currentBoard[row - 3][col + 3],
        currentBoard[row - 4][col + 4],
        player
      );
    }
  }
  
  return score;
}

// 评估一条线上的棋型
function evaluateLine(c1: number, c2: number, c3: number, c4: number, c5: number, player: number): number {
  const cells = [c1, c2, c3, c4, c5];
  let playerCount = 0;
  let emptyCount = 0;
  
  for (const cell of cells) {
    if (cell === player) {
      playerCount++;
    } else if (cell === 0) {
      emptyCount++;
    } else {
      return 0; // 被对手阻挡
    }
  }
  
  // 根据棋型评分
  if (playerCount === 5) {
    return 100000; // 五连
  } else if (playerCount === 4 && emptyCount === 1) {
    return 10000; // 活四
  } else if (playerCount === 3 && emptyCount === 2) {
    return 1000; // 活三
  } else if (playerCount === 2 && emptyCount === 3) {
    return 100; // 活二
  } else if (playerCount === 1 && emptyCount === 4) {
    return 10; // 活一
  }
  
  return 0;
}

// 评估特定位置的分数
function evaluatePosition(currentBoard: number[][], row: number, col: number): number {
  let score = 0;
  
  // 临时落子
  currentBoard[row][col] = aiPlayer.value;
  score += evaluatePlayer(currentBoard, aiPlayer.value);
  currentBoard[row][col] = 0;
  
  // 评估如果对手在这里落子
  const opponent = aiPlayer.value === 1 ? 2 : 1;
  currentBoard[row][col] = opponent;
  score -= evaluatePlayer(currentBoard, opponent) * 0.8; // 稍微降低防守权重
  currentBoard[row][col] = 0;
  
  // 位置权重（中心位置更有价值）
  const center = Math.floor(BOARD_SIZE / 2);
  const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center);
  score += (BOARD_SIZE - distanceFromCenter) * 5;
  
  return score;
}

// 检查赢家
function checkWinner(currentBoard: number[][]): number | null {
  const directions = [
    [0, 1],   // 水平
    [1, 0],   // 垂直
    [1, 1],   // 对角线
    [1, -1]   // 反对角线
  ];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const player = currentBoard[row][col];
      if (player === 0) continue;
      
      for (const [dx, dy] of directions) {
        let count = 1;
        for (let i = 1; i < 5; i++) {
          const newRow = row + dx * i;
          const newCol = col + dy * i;
          if (
            newRow >= 0 && newRow < BOARD_SIZE &&
            newCol >= 0 && newCol < BOARD_SIZE &&
            currentBoard[newRow][newCol] === player
          ) {
            count++;
          } else {
            break;
          }
        }
        
        if (count >= 5) {
          return player;
        }
      }
    }
  }
  
  return null;
}

// 从棋盘获取空位
function getEmptyCellsFromBoard(currentBoard: number[][]): Array<{ row: number; col: number }> {
  const emptyCells: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (currentBoard[row][col] === 0) {
        if (hasNeighborFromBoard(currentBoard, row, col)) {
          emptyCells.push({ row, col });
        }
      }
    }
  }
  
  if (emptyCells.length === 0) {
    const center = Math.floor(BOARD_SIZE / 2);
    if (currentBoard[center][center] === 0) {
      return [{ row: center, col: center }];
    }
  }
  
  return emptyCells;
}

// 从棋盘检查周围是否有棋子
function hasNeighborFromBoard(currentBoard: number[][], row: number, col: number, distance = 2): boolean {
  for (let dr = -distance; dr <= distance; dr++) {
    for (let dc = -distance; dc <= distance; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (currentBoard[nr][nc] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// 克隆棋盘
function cloneBoard(currentBoard: number[][]): number[][] {
  return currentBoard.map(row => [...row]);
}

// 悔棋
function undo() {
  if (history.value.length === 0) return;

  const moveToRemove = history.value.pop()!;
  board.value[moveToRemove.row][moveToRemove.col] = 0;
  currentPlayer.value = moveToRemove.player;
  winner.value = null;
  
  // 更新最后一子标记
  if (history.value.length > 0) {
    const prevMove = history.value[history.value.length - 1];
    lastMove.value = { row: prevMove.row, col: prevMove.col };
  } else {
    lastMove.value = null;
  }
  
  drawBoard();
}

// 播放落子音效（使用 Web Audio API）
function playMoveSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // 音频不支持时静默失败
  }
}

// 播放获胜音效
function playWinSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
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
    // 音频不支持时静默失败
  }
}

// 清理事件监听器
onBeforeUnmount(() => {
  canvas.value?.removeEventListener('click', handleClick);
  canvas.value?.removeEventListener('mousemove', handleMouseMove);
  canvas.value?.removeEventListener('mouseleave', handleMouseLeave);
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
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
.gomoku-game {
  display: grid;
  gap: 12px;
  width: 100%;
}

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
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b9b3a9;
  box-shadow: 0 0 0 4px #f1e7da;
}

.status-dot.status-playing {
  background: #69b783;
  box-shadow: 0 0 0 4px #e0f0d9;
}

.status-dot.status-thinking {
  background: var(--amber);
  box-shadow: 0 0 0 4px #fdf0d6;
  animation: thinking-pulse 1.2s ease-in-out infinite;
}

.status-dot.status-winner {
  background: var(--coral);
  box-shadow: 0 0 0 4px var(--coral-soft);
}

.status-dot.status-waiting {
  background: #b9b3a9;
}

@keyframes thinking-pulse {
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
  min-height: 40px;
  padding: 7px 14px;
  font-size: 13px;
}

.hud-actions .icon-button {
  width: 40px;
  height: 40px;
  min-width: 40px;
}

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
  max-width: 620px;
  height: auto;
  margin: 0 auto;
  border-radius: 18px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.result-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(300px, 84%);
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
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 18px;
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
  min-height: 42px;
}

.defense-alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  background: var(--amber-soft);
  border: 1.5px solid #f0ddb4;
  border-radius: 14px;
  color: #8a6431;
  font-size: 12.5px;
  font-weight: 650;
  line-height: 1.5;
}

.defense-icon {
  flex: none;
  font-size: 16px;
}

.defense-text {
  flex: 1;
  min-width: 0;
}

.double-badge {
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f6d9c8;
  color: #a4482c;
  font-size: 10px;
  font-weight: 900;
}

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

.segmented.wrap {
  flex-wrap: wrap;
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

.warning-card {
  max-width: 400px;
  padding: 26px 22px 22px;
  text-align: center;
  border-radius: 24px;
  border-bottom: 1.5px solid var(--line);
  margin-bottom: 10px;
}

.warning-mark {
  font-size: 36px;
  line-height: 1;
  margin-bottom: 10px;
}

.warning-card h2 {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.03em;
  margin-bottom: 8px;
}

.warning-card p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

.warning-actions {
  display: flex;
  justify-content: center;
  gap: 9px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.warning-actions .primary-button,
.warning-actions .ghost-button {
  min-height: 44px;
  min-width: 120px;
  font-size: 13.5px;
}

@media (max-width: 560px) {
  .game-hud {
    gap: 8px;
  }

  .turn-card {
    flex: 1;
    min-width: 0;
  }

  .status-line {
    order: 3;
    width: 100%;
    padding-left: 4px;
  }

  .hud-actions {
    order: 2;
    margin-left: 0;
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
    border-radius: 16px;
  }

  .result-card {
    padding: 18px 16px 16px;
  }

  .result-card h2 {
    font-size: 22px;
  }
}
</style>
