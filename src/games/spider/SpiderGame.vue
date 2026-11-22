<template>
  <div class="spider-game">
    <div class="spider-hud">
      <button class="stat-card difficulty-card" type="button" aria-label="选择难度关卡" @click="openSettings">
        <small>难度 · 第 {{ levelIndex }} 关</small>
        <strong>{{ difficultyLabel }}</strong>
      </button>
      <div class="stat-card">
        <small>步数</small>
        <strong>{{ moves }}</strong>
      </div>
      <div class="stat-card">
        <small>完成</small>
        <strong>{{ completed }}<em>/8</em></strong>
      </div>
      <div class="stat-card">
        <small>时间</small>
        <strong>{{ timeText }}</strong>
      </div>
    </div>

    <div class="tableau-wrap">
      <div class="tableau" role="application" aria-label="蜘蛛纸牌牌桌：10 列，点击明牌或同花顺后再点目标列">
        <div
          v-for="(column, columnIndex) in columns"
          :key="columnIndex"
          class="column"
          :class="{ 'is-target': hint?.target === columnIndex }"
          @click="onColumnClick(columnIndex)"
        >
          <div v-if="column.length === 0" class="empty-slot" aria-hidden="true">
            <span>空</span>
          </div>
          <button
            v-for="(card, cardIndex) in column"
            :key="card.id"
            type="button"
            class="spider-card"
            :class="{
              'is-down': !card.faceUp,
              'is-red': card.faceUp && isRed(card),
              'is-selected': isSelected(columnIndex, cardIndex),
              'is-hint': isHintSource(columnIndex, cardIndex)
            }"
            :style="{ zIndex: cardIndex + (isSelected(columnIndex, cardIndex) ? 40 : 0) }"
            :data-column="columnIndex"
            :data-index="cardIndex"
            :data-rank="card.rank"
            :data-suit="card.suit"
            :data-faceup="card.faceUp ? '1' : '0'"
            :aria-label="cardAria(card, columnIndex, cardIndex)"
            @click.stop="onCardClick(columnIndex, cardIndex)"
          >
            <template v-if="card.faceUp">
              <span class="card-corner">
                <b>{{ rankLabel(card.rank) }}</b>
                <i>{{ suitSymbol(card.suit) }}</i>
              </span>
              <span class="card-pip" aria-hidden="true">{{ suitSymbol(card.suit) }}</span>
            </template>
          </button>
        </div>
      </div>
    </div>

    <div class="completion-strip" role="group" :aria-label="`已完成 ${completed} / 8 组`">
      <span class="completion-label">完成</span>
      <span v-for="slot in 8" :key="slot" class="completion-pip" :class="{ 'is-done': slot <= completed }" aria-hidden="true">
        <span v-if="slot <= completed">✓</span>
      </span>
      <span class="completion-count">{{ completed }}/8</span>
      <span v-if="currentBest" class="completion-best">最佳 {{ currentBest.moves }} 步</span>
    </div>

    <div class="spider-actions">
      <button class="primary-button" type="button" :disabled="!canDeal" :title="dealTitle" @click="deal">
        发牌
        <small v-if="stockGroups">×{{ stockGroups }}</small>
      </button>
      <button class="ghost-button" type="button" :disabled="!history.length || state !== 'playing'" @click="undo">撤销</button>
      <button class="ghost-button" type="button" :disabled="state !== 'playing'" @click="showHint">提示</button>
      <button class="ghost-button" type="button" :disabled="state !== 'playing'" @click="newGame(difficulty)">新局</button>
    </div>

    <p class="game-note">点一张明牌或一组同花顺，再点目标列 · 发牌前 10 列都不能空</p>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <Transition name="toast">
      <div v-if="message" class="spider-toast" role="status">{{ message }}</div>
    </Transition>

    <Teleport to="body">
      <div v-if="showSettings" class="sheet-backdrop" @click.self="showSettings = false">
        <div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="spider-settings-title">
          <div class="sheet-head">
            <div>
              <h2 id="spider-settings-title">难度关卡</h2>
              <div class="sheet-sub">SPIDER SOLITAIRE</div>
            </div>
            <button class="icon-button" type="button" aria-label="关闭设置" @click="showSettings = false">
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div class="sheet-body">
            <p>花色越多越难。每关目标相同：把 8 组 K → A 的同花顺全部收走。</p>

            <div class="difficulty-options">
              <button
                v-for="level in difficultyOptions"
                :key="level"
                type="button"
                class="difficulty-option"
                :class="{ 'is-active': pendingDifficulty === level }"
                @click="pendingDifficulty = level"
              >
                <span class="diff-main">
                  <b>第 {{ levelIndexOf(level) }} 关 · {{ difficultyLabels[level] }}</b>
                  <em>{{ difficultyDetails[level] }}</em>
                </span>
                <span class="diff-best">{{ bestFor(level) ? `最佳 ${bestFor(level)?.moves} 步` : '未通关' }}</span>
              </button>
            </div>

            <p class="setting-tip">切换难度会立即开始新的一局；当前进度不会保留。</p>
            <button class="primary-button sheet-done" type="button" @click="applySettings">
              开始第 {{ levelIndexOf(pendingDifficulty) }} 关
            </button>
          </div>
        </div>
      </div>

      <div v-if="state === 'won' || state === 'stuck'" class="spider-result-backdrop">
        <div class="spider-result" role="dialog" aria-modal="true" aria-labelledby="spider-result-title">
          <div class="result-mark" aria-hidden="true">{{ state === 'won' ? '♠' : '🕸️' }}</div>
          <h2 id="spider-result-title">{{ state === 'won' ? '八组全部完成！' : '这局走不通了' }}</h2>
          <p v-if="state === 'won'" class="result-line">
            第 {{ levelIndex }} 关 · {{ difficultyLabel }} · {{ moves }} 步 · {{ timeText }}
          </p>
          <p v-else class="result-line">牌堆已空，也没有可移动的牌。撤销一步，或者重新开局。</p>

          <div v-if="state === 'won'" class="result-best">
            <span v-if="newBest">新纪录！</span>
            <span v-else-if="currentBest">本关最佳 {{ currentBest.moves }} 步 · {{ formatSeconds(currentBest.seconds) }}</span>
            <span v-if="!nextDifficulty">三个难度已全部通关</span>
          </div>

          <div class="result-actions">
            <template v-if="state === 'won'">
              <button v-if="nextDifficulty" class="primary-button" type="button" @click="playNextLevel">
                挑战{{ nextLabel }}
              </button>
              <button v-else class="primary-button" type="button" @click="restart">再玩一次</button>
              <button v-if="nextDifficulty" class="ghost-button" type="button" @click="restart">再玩一次</button>
              <button v-else class="ghost-button" type="button" @click="openSettings">切换难度</button>
            </template>
            <template v-else>
              <button class="primary-button" type="button" @click="restart">重新开局</button>
              <button v-if="history.length" class="ghost-button" type="button" @click="undoStuck">撤销一步</button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

type Suit = 'spade' | 'heart' | 'club' | 'diamond';
type Difficulty = 1 | 2 | 4;
type GameState = 'playing' | 'won' | 'stuck';

interface SpiderCard {
  id: string;
  suit: Suit;
  rank: number;
  faceUp: boolean;
}

interface Selection {
  column: number;
  index: number;
}

interface Hint {
  column: number;
  index: number;
  target: number;
}

interface Snapshot {
  columns: SpiderCard[][];
  stock: SpiderCard[];
  completed: number;
  moves: number;
}

interface BestRecord {
  moves: number;
  seconds: number;
}

const BEST_KEY = 'spider-best-v1';
const DIFFICULTY_KEY = 'spider-difficulty-v1';
const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond'];
const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦'
};
const SUIT_LABELS: Record<Suit, string> = {
  spade: '黑桃',
  heart: '红桃',
  club: '梅花',
  diamond: '方块'
};
const RANK_LABELS: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K'
};
const DIFFICULTIES: Difficulty[] = [1, 2, 4];
const DIFFICULTY_LABELS: Record<Difficulty, string> = { 1: '简单', 2: '普通', 4: '困难' };
const DIFFICULTY_DETAILS: Record<Difficulty, string> = {
  1: '1 种花色 · 先熟悉 K → A 的收集',
  2: '2 种花色 · 需要留意花色连续性',
  4: '4 种花色 · 完整规则挑战'
};

const columns = ref<SpiderCard[][]>(Array.from({ length: 10 }, () => []));
const stock = ref<SpiderCard[]>([]);
const completed = ref(0);
const moves = ref(0);
const seconds = ref(0);
const state = ref<GameState>('playing');
const difficulty = ref<Difficulty>(1);
const selection = ref<Selection | null>(null);
const hint = ref<Hint | null>(null);
const message = ref('');
const announcement = ref('');
const showSettings = ref(false);
const pendingDifficulty = ref<Difficulty>(1);
const history = ref<Snapshot[]>([]);
const best = ref<Record<string, BestRecord>>({});
const newBest = ref(false);

let timerId: number | null = null;
let messageTimer: number | null = null;
let hintTimer: number | null = null;

const difficultyOptions = DIFFICULTIES;
const difficultyLabels = DIFFICULTY_LABELS;
const difficultyDetails = DIFFICULTY_DETAILS;

const levelIndex = computed(() => DIFFICULTIES.indexOf(difficulty.value) + 1);
const difficultyLabel = computed(() => DIFFICULTY_LABELS[difficulty.value]);
const timeText = computed(() => formatSeconds(seconds.value));
const stockGroups = computed(() => Math.floor(stock.value.length / 10));
const currentBest = computed<BestRecord | null>(() => best.value[String(difficulty.value)] ?? null);

const nextDifficulty = computed<Difficulty | null>(() => {
  const index = DIFFICULTIES.indexOf(difficulty.value);
  return index >= 0 && index < DIFFICULTIES.length - 1 ? DIFFICULTIES[index + 1] : null;
});
const nextLabel = computed(() => (nextDifficulty.value ? DIFFICULTY_LABELS[nextDifficulty.value] : ''));

const canDeal = computed(
  () =>
    state.value === 'playing' &&
    stock.value.length >= 10 &&
    columns.value.every(column => column.length > 0)
);

const dealTitle = computed(() => {
  if (state.value !== 'playing') return '本局已结束';
  if (stock.value.length < 10) return '牌堆已经空了';
  if (columns.value.some(column => column.length === 0)) return '有空列时不能发牌，先把空列填上';
  return `发牌，还剩 ${stockGroups.value} 组`;
});

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? String(rank);
}

function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit];
}

function isRed(card: SpiderCard): boolean {
  return card.suit === 'heart' || card.suit === 'diamond';
}

function levelIndexOf(level: Difficulty): number {
  return DIFFICULTIES.indexOf(level) + 1;
}

function bestFor(level: Difficulty): BestRecord | null {
  return best.value[String(level)] ?? null;
}

function cardAria(card: SpiderCard, columnIndex: number, cardIndex: number): string {
  if (!card.faceUp) {
    return `第 ${columnIndex + 1} 列第 ${cardIndex + 1} 张，暗牌`;
  }
  return `第 ${columnIndex + 1} 列第 ${cardIndex + 1} 张，${SUIT_LABELS[card.suit]}${rankLabel(card.rank)}`;
}

function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, BestRecord>;
    if (parsed && typeof parsed === 'object') {
      best.value = parsed;
    }
  } catch {
    best.value = {};
  }
}

function loadDifficulty() {
  try {
    const raw = Number(localStorage.getItem(DIFFICULTY_KEY));
    if (DIFFICULTIES.includes(raw as Difficulty)) {
      difficulty.value = raw as Difficulty;
    }
  } catch {
    difficulty.value = 1;
  }
}

function shuffle<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [items[index], items[swap]] = [items[swap], items[index]];
  }
  return items;
}

function buildDeck(level: Difficulty): SpiderCard[] {
  const suits = SUITS.slice(0, level);
  const copies = 8 / level;
  const deck: SpiderCard[] = [];
  let id = 0;

  for (const suit of suits) {
    for (let copy = 0; copy < copies; copy += 1) {
      for (let rank = 1; rank <= 13; rank += 1) {
        deck.push({ id: `spider-${id}`, suit, rank, faceUp: false });
        id += 1;
      }
    }
  }

  return shuffle(deck);
}

function newGame(level: Difficulty = difficulty.value) {
  stopTimer();
  clearHint();
  if (messageTimer !== null) {
    window.clearTimeout(messageTimer);
    messageTimer = null;
  }

  difficulty.value = level;
  pendingDifficulty.value = level;
  try {
    localStorage.setItem(DIFFICULTY_KEY, String(level));
  } catch {
    /* 隐私模式下忽略写入失败 */
  }

  const deck = buildDeck(level);
  const nextColumns: SpiderCard[][] = Array.from({ length: 10 }, () => []);
  for (let index = 0; index < 54; index += 1) {
    const card = deck.pop();
    if (card) {
      nextColumns[index % 10].push(card);
    }
  }
  for (const column of nextColumns) {
    const top = column[column.length - 1];
    if (top) {
      top.faceUp = true;
    }
  }

  columns.value = nextColumns;
  stock.value = deck;
  completed.value = 0;
  moves.value = 0;
  seconds.value = 0;
  state.value = 'playing';
  selection.value = null;
  hint.value = null;
  history.value = [];
  message.value = '';
  newBest.value = false;
  announcement.value = `第 ${levelIndexOf(level)} 关开始，${DIFFICULTY_LABELS[level]}难度。`;
}

function restart() {
  newGame(difficulty.value);
}

function playNextLevel() {
  if (nextDifficulty.value) {
    newGame(nextDifficulty.value);
  }
}

function startTimer() {
  if (timerId !== null) return;
  timerId = window.setInterval(() => {
    seconds.value += 1;
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function showMessage(text: string) {
  message.value = text;
  if (messageTimer !== null) {
    window.clearTimeout(messageTimer);
  }
  messageTimer = window.setTimeout(() => {
    message.value = '';
    messageTimer = null;
  }, 2600);
}

function clearHint() {
  hint.value = null;
  if (hintTimer !== null) {
    window.clearTimeout(hintTimer);
    hintTimer = null;
  }
}

function pushHistory() {
  history.value.push({
    columns: columns.value.map(column => column.map(card => ({ ...card }))),
    stock: stock.value.map(card => ({ ...card })),
    completed: completed.value,
    moves: moves.value
  });
  if (history.value.length > 80) {
    history.value.shift();
  }
}

function flipTop(columnIndex: number) {
  const column = columns.value[columnIndex];
  const top = column[column.length - 1];
  if (top && !top.faceUp) {
    top.faceUp = true;
  }
}

function isValidSequence(column: SpiderCard[], start: number): boolean {
  if (start < 0 || start >= column.length) {
    return false;
  }
  for (let index = start; index < column.length; index += 1) {
    const card = column[index];
    if (!card.faceUp) {
      return false;
    }
    if (index > start) {
      const previous = column[index - 1];
      if (card.suit !== previous.suit || card.rank !== previous.rank - 1) {
        return false;
      }
    }
  }
  return true;
}

function canPlaceOn(card: SpiderCard, target: SpiderCard[]): boolean {
  if (target.length === 0) {
    return true;
  }
  const top = target[target.length - 1];
  return top.faceUp && top.rank === card.rank + 1;
}

function checkCompletionOnce(columnIndex: number): boolean {
  const column = columns.value[columnIndex];
  if (column.length < 13) {
    return false;
  }
  const start = column.length - 13;
  const tail = column.slice(start);
  if (tail.some(card => !card.faceUp)) {
    return false;
  }
  if (tail[0].rank !== 13) {
    return false;
  }
  for (let index = 1; index < 13; index += 1) {
    if (tail[index].suit !== tail[0].suit || tail[index].rank !== tail[index - 1].rank - 1) {
      return false;
    }
  }

  column.splice(start, 13);
  completed.value += 1;
  flipTop(columnIndex);
  showMessage(`完成一组 K → A，已完成 ${completed.value} / 8`);
  announcement.value = `完成一组 K 到 A，当前 ${completed.value} / 8`;
  return true;
}

function checkAllCompletions() {
  for (let columnIndex = 0; columnIndex < columns.value.length; columnIndex += 1) {
    while (checkCompletionOnce(columnIndex)) {
      /* 一列可能叠着多组，连续检查 */
    }
  }
}

function hasAnyMove(): boolean {
  for (let from = 0; from < columns.value.length; from += 1) {
    const column = columns.value[from];
    for (let index = 0; index < column.length; index += 1) {
      if (!column[index].faceUp || !isValidSequence(column, index)) {
        continue;
      }
      for (let to = 0; to < columns.value.length; to += 1) {
        if (to === from) continue;
        if (canPlaceOn(column[index], columns.value[to])) {
          return true;
        }
      }
    }
  }
  return false;
}

function findMove(): Hint | null {
  for (let from = 0; from < columns.value.length; from += 1) {
    const column = columns.value[from];
    for (let index = 0; index < column.length; index += 1) {
      if (!column[index].faceUp || !isValidSequence(column, index)) {
        continue;
      }
      for (let to = 0; to < columns.value.length; to += 1) {
        if (to === from) continue;
        if (canPlaceOn(column[index], columns.value[to])) {
          return { column: from, index, target: to };
        }
      }
    }
  }
  return null;
}

function finishTurn() {
  if (completed.value >= 8) {
    winGame();
    return;
  }
  if (!hasAnyMove() && !canDeal.value) {
    state.value = 'stuck';
    stopTimer();
    announcement.value = '牌堆已空，也没有可移动的牌，本局走不通了。';
  }
}

function winGame() {
  state.value = 'won';
  stopTimer();
  selection.value = null;
  clearHint();

  const key = String(difficulty.value);
  const previous = best.value[key];
  const record: BestRecord = { moves: moves.value, seconds: seconds.value };
  const improved =
    !previous ||
    record.moves < previous.moves ||
    (record.moves === previous.moves && record.seconds < previous.seconds);

  newBest.value = improved;
  if (improved) {
    best.value = { ...best.value, [key]: record };
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(best.value));
    } catch {
      /* 忽略写入失败 */
    }
  }
  announcement.value = `第 ${levelIndex.value} 关通关，共用 ${moves.value} 步。`;
}

function tryMove(fromColumn: number, fromIndex: number, toColumn: number) {
  if (fromColumn === toColumn) {
    selection.value = null;
    return;
  }

  const source = columns.value[fromColumn];
  const moving = source.slice(fromIndex);
  const target = columns.value[toColumn];
  if (!moving.length) {
    selection.value = null;
    return;
  }
  if (!isValidSequence(source, fromIndex)) {
    selection.value = null;
    showMessage('只能整组移动同花色的连续降序牌');
    return;
  }
  if (!canPlaceOn(moving[0], target)) {
    selection.value = null;
    showMessage('只能放到大一点的牌或空列上');
    return;
  }

  pushHistory();
  source.splice(fromIndex);
  target.push(...moving);
  flipTop(fromColumn);
  moves.value += 1;
  selection.value = null;
  clearHint();
  startTimer();
  while (checkCompletionOnce(toColumn)) {
    /* 落子后可能连续完成多组 */
  }
  finishTurn();
}

function onCardClick(columnIndex: number, cardIndex: number) {
  if (state.value !== 'playing') {
    return;
  }

  const card = columns.value[columnIndex][cardIndex];

  if (selection.value) {
    if (selection.value.column === columnIndex) {
      selection.value = null;
      return;
    }
    tryMove(selection.value.column, selection.value.index, columnIndex);
    return;
  }

  if (!card.faceUp) {
    showMessage('暗牌不能移动，先移走上面的牌');
    return;
  }
  if (!isValidSequence(columns.value[columnIndex], cardIndex)) {
    showMessage('从这张牌开始的牌组不是同花顺序，无法整体移动');
    return;
  }

  selection.value = { column: columnIndex, index: cardIndex };
  const count = columns.value[columnIndex].length - cardIndex;
  announcement.value = `已选中第 ${columnIndex + 1} 列的 ${count} 张牌，请选择目标列。`;
}

function onColumnClick(columnIndex: number) {
  if (state.value !== 'playing') {
    return;
  }
  if (selection.value) {
    tryMove(selection.value.column, selection.value.index, columnIndex);
  }
}

function deal() {
  if (state.value !== 'playing') {
    return;
  }
  if (stock.value.length < 10) {
    showMessage('牌堆已经空了');
    return;
  }
  if (columns.value.some(column => column.length === 0)) {
    showMessage('有空列时不能发牌，先把空列填上');
    return;
  }

  pushHistory();
  for (let columnIndex = 0; columnIndex < 10; columnIndex += 1) {
    const card = stock.value.pop();
    if (card) {
      card.faceUp = true;
      columns.value[columnIndex].push(card);
    }
  }
  moves.value += 1;
  selection.value = null;
  clearHint();
  startTimer();
  checkAllCompletions();
  finishTurn();
  showMessage(`发牌完成，还剩 ${stockGroups.value} 组`);
}

function undo() {
  const snapshot = history.value.pop();
  if (!snapshot) {
    showMessage('没有可以撤销的操作');
    return;
  }
  columns.value = snapshot.columns;
  stock.value = snapshot.stock;
  completed.value = snapshot.completed;
  moves.value = snapshot.moves;
  state.value = 'playing';
  selection.value = null;
  clearHint();
  showMessage('已撤销一步');
}

function undoStuck() {
  undo();
}

function showHint() {
  if (state.value !== 'playing') {
    return;
  }
  const found = findMove();
  if (!found) {
    showMessage(canDeal.value ? '没有可走的牌，试试发牌' : '没有可移动的牌了');
    return;
  }

  hint.value = found;
  if (hintTimer !== null) {
    window.clearTimeout(hintTimer);
  }
  hintTimer = window.setTimeout(() => {
    hint.value = null;
    hintTimer = null;
  }, 2600);
  showMessage(`试试把第 ${found.column + 1} 列的牌移到第 ${found.target + 1} 列`);
}

function isSelected(columnIndex: number, cardIndex: number): boolean {
  return selection.value?.column === columnIndex && cardIndex >= selection.value.index;
}

function isHintSource(columnIndex: number, cardIndex: number): boolean {
  return hint.value?.column === columnIndex && cardIndex >= hint.value.index;
}

function openSettings() {
  pendingDifficulty.value = difficulty.value;
  showSettings.value = true;
}

function applySettings() {
  showSettings.value = false;
  newGame(pendingDifficulty.value);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (showSettings.value) {
      showSettings.value = false;
    } else if (selection.value) {
      selection.value = null;
    }
  }
  if (event.code === 'KeyU' && state.value === 'playing') {
    event.preventDefault();
    undo();
  }
  if (event.code === 'KeyD' && state.value === 'playing') {
    event.preventDefault();
    deal();
  }
}

watch(
  [showSettings, state],
  ([settingsOpen, gameState]) => {
    const locked = settingsOpen || gameState === 'won' || gameState === 'stuck';
    document.body.style.overflow = locked ? 'hidden' : '';
  },
  { immediate: true }
);

onMounted(() => {
  loadBest();
  loadDifficulty();
  newGame(difficulty.value);
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  stopTimer();
  clearHint();
  if (messageTimer !== null) {
    window.clearTimeout(messageTimer);
  }
  window.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.spider-game {
  display: grid;
  gap: 10px;
  width: 100%;
}

.spider-hud {
  display: flex;
  gap: 7px;
}

.spider-hud .stat-card {
  padding: 8px 11px;
  min-height: 64px;
}

.spider-hud .stat-card small {
  font-size: 9px;
  letter-spacing: 0.1em;
}

.spider-hud .stat-card strong {
  font-size: clamp(17px, 3.2vw, 24px);
}

.spider-hud .stat-card strong em {
  font-style: normal;
  font-size: 0.6em;
  color: var(--faint);
  margin-left: 1px;
}

.difficulty-card {
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: transform 0.16s, box-shadow 0.16s;
}

.difficulty-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #eedfcd;
}

.tableau-wrap {
  padding: 9px;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.85), transparent 60%),
    linear-gradient(180deg, #f2f8ee 0%, #e8f2e1 100%);
  border: 2px solid var(--green-line);
  border-radius: 24px;
  box-shadow: var(--shadow-soft), 0 6px 0 #d8e7cf;
}

.tableau {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: clamp(2px, 0.45vw, 6px);
  align-items: start;
}

.column {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  min-height: 54px;
  border-radius: 8px;
  transition: background 0.18s;
}

.column.is-target {
  background: rgba(233, 186, 106, 0.16);
}

.empty-slot {
  width: 100%;
  aspect-ratio: 5 / 7;
  display: grid;
  place-items: center;
  border: 2px dashed rgba(68, 141, 103, 0.28);
  border-radius: 8px;
  color: rgba(68, 141, 103, 0.65);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.spider-card {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 5 / 7;
  padding: 0;
  border: 1.5px solid #e2cdb8;
  border-radius: clamp(4px, 0.55vw, 8px);
  background: #fffdf9;
  color: var(--ink);
  box-shadow: 0 2px 0 #e9d9c4;
  overflow: hidden;
  text-align: left;
  transition: box-shadow 0.14s, background 0.14s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.spider-card + .spider-card {
  margin-top: -90%;
}

.spider-card + .spider-card.is-down {
  margin-top: -118%;
}

.spider-card.is-down {
  border-color: #bcd0be;
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.34) 0 2px, transparent 2px 6px),
    #7fa987;
  box-shadow: 0 2px 0 #dbe8d6;
}

.card-corner {
  position: absolute;
  top: 4px;
  left: 5px;
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.03em;
}

.card-corner b {
  font-size: clamp(10px, 1.05vw + 5.5px, 15px);
}

.card-corner i {
  font-style: normal;
  font-size: clamp(8px, 0.9vw + 5px, 13px);
}

.card-pip {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: clamp(15px, 2vw, 26px);
  opacity: 0.92;
  pointer-events: none;
}

.spider-card:not(:last-child) .card-pip {
  display: none;
}

.spider-card.is-red {
  color: #c9524a;
}

.spider-card.is-selected {
  outline: 2px solid var(--coral);
  outline-offset: -2px;
  background: #fff6f2;
  box-shadow: inset 4px 0 0 var(--coral), 0 3px 0 #e9d9c4;
}

.spider-card.is-hint {
  outline: 2px dashed var(--amber);
  outline-offset: -2px;
  box-shadow: inset 4px 0 0 var(--amber), 0 3px 0 #e9d9c4;
}

.completion-strip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 4px;
}

.completion-label {
  margin-right: 2px;
  color: var(--faint);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.completion-pip {
  width: 20px;
  height: 26px;
  display: grid;
  place-items: center;
  border: 1.5px dashed #d8c7b4;
  border-radius: 6px;
  background: rgba(255, 253, 249, 0.7);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}

.completion-pip.is-done {
  border-style: solid;
  border-color: var(--green-strong);
  background: var(--green);
  box-shadow: 0 2px 0 #cfe2c6;
}

.completion-count {
  margin-left: 3px;
  color: var(--faint);
  font-size: 10.5px;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
}

.completion-best {
  margin-left: auto;
  color: #8a8278;
  font-size: 10.5px;
  font-weight: 800;
}

.spider-actions {
  position: sticky;
  bottom: calc(8px + var(--safe-bottom));
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 247, 235, 0.94);
  border: 1.5px solid var(--line);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 26px rgba(113, 75, 47, 0.12);
}

.spider-actions .primary-button,
.spider-actions .ghost-button {
  flex: 1;
  min-width: 0;
  min-height: 46px;
  padding: 0 8px;
  font-size: 13.5px;
}

.spider-actions .primary-button small {
  margin-left: 3px;
  font-size: 10px;
  font-weight: 800;
  opacity: 0.9;
}

.spider-toast {
  position: fixed;
  left: 50%;
  bottom: calc(86px + var(--safe-bottom));
  z-index: 70;
  max-width: min(340px, 84vw);
  padding: 9px 16px;
  border-radius: 999px;
  background: rgba(48, 51, 72, 0.94);
  color: #fff;
  font-size: 12.5px;
  font-weight: 750;
  line-height: 1.45;
  text-align: center;
  transform: translateX(-50%);
  box-shadow: 0 10px 26px rgba(48, 51, 72, 0.24);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.18s, transform 0.18s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}

.game-note {
  text-align: center;
  color: var(--faint);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.04em;
}

.difficulty-options {
  display: grid;
  gap: 8px;
}

.difficulty-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  background: var(--panel-soft);
  text-align: left;
  transition: border-color 0.16s, background 0.16s, transform 0.16s;
}

.difficulty-option:hover {
  transform: translateY(-1px);
}

.difficulty-option.is-active {
  border-color: var(--coral);
  background: #fff7f2;
  box-shadow: 0 0 0 2px rgba(237, 115, 95, 0.14);
}

.diff-main {
  display: grid;
  gap: 3px;
}

.diff-main b {
  font-size: 14px;
  font-weight: 850;
}

.diff-main em {
  font-style: normal;
  color: var(--faint);
  font-size: 11.5px;
}

.diff-best {
  flex: none;
  color: #8a8278;
  font-size: 10.5px;
  font-weight: 800;
  white-space: nowrap;
}

.setting-tip {
  color: var(--faint);
  font-size: 11.5px;
  line-height: 1.6;
}

.sheet-done {
  width: 100%;
  min-height: 48px;
  font-size: 15px;
}

.spider-result-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(48, 51, 72, 0.34);
  backdrop-filter: blur(5px);
}

.spider-result {
  width: min(360px, 100%);
  padding: 24px 22px 20px;
  text-align: center;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
}

.result-mark {
  width: 72px;
  height: 72px;
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--green-soft);
  border: 1px solid var(--green-line);
  color: var(--green-strong);
  font-size: 34px;
  box-shadow: 0 5px 0 #d8e7cf;
}

.spider-result h2 {
  font-size: 23px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.result-line {
  margin-top: 8px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.7;
}

.result-best {
  display: grid;
  gap: 3px;
  margin-top: 12px;
  padding: 9px 12px;
  border-radius: 12px;
  background: var(--green-soft);
  border: 1px solid var(--green-line);
  color: var(--green-strong);
  font-size: 11.5px;
  font-weight: 800;
}

.result-actions {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.result-actions .primary-button,
.result-actions .ghost-button {
  width: 100%;
  min-width: 0;
  min-height: 47px;
  font-size: 14px;
}

@media (max-width: 900px) {
  .spider-hud .stat-card {
    padding: 7px 9px;
  }

  .spider-hud .stat-card strong {
    font-size: 20px;
  }

  .tableau-wrap {
    padding: 8px;
  }

  .card-corner {
    top: 3px;
    left: 4px;
  }
}

@media (max-width: 560px) {
  .spider-hud {
    gap: 5px;
  }

  .spider-hud .stat-card {
    padding: 6px 7px;
    min-height: 58px;
    border-radius: 14px;
  }

  .spider-hud .stat-card small {
    font-size: 8px;
    letter-spacing: 0.06em;
  }

  .spider-hud .stat-card strong {
    font-size: 17px;
  }

  .tableau-wrap {
    padding: 6px;
    border-radius: 20px;
  }

  .completion-strip {
    gap: 4px;
    padding: 0 2px;
  }

  .completion-pip {
    width: 18px;
    height: 23px;
    border-radius: 5px;
    font-size: 10px;
  }

  .completion-best {
    display: none;
  }

  .spider-actions {
    gap: 6px;
    padding: 6px;
    border-radius: 14px;
  }

  .spider-actions .primary-button,
  .spider-actions .ghost-button {
    min-height: 44px;
    font-size: 12.5px;
  }

  .spider-toast {
    bottom: calc(80px + var(--safe-bottom));
    font-size: 12px;
  }
}

@media (max-width: 380px) {
  .spider-hud {
    gap: 4px;
  }

  .spider-hud .stat-card {
    padding: 5px 6px;
  }

  .spider-hud .stat-card strong {
    font-size: 15px;
  }

  .spider-hud .stat-card small {
    font-size: 7.5px;
  }

  .spider-actions .primary-button,
  .spider-actions .ghost-button {
    font-size: 11.5px;
    padding: 0 4px;
  }
}
</style>
