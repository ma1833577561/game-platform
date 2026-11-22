<template>
  <div class="doudizhu-game">
    <div class="game-hud">
      <div class="hud-stats">
        <span class="chip">第 {{ currentRound }} 局</span>
        <span class="chip">底分 {{ baseScore }}</span>
        <span class="chip multiplier-chip">倍数 ×{{ multiplier }}</span>
      </div>
      <div class="turn-pill" :class="{ 'is-mine': currentPlayerIndex === 0 && gameState !== 'ended' }" aria-live="polite">
        <i class="turn-dot" aria-hidden="true"></i>
        <span>{{ turnText }}</span>
      </div>
      <button class="text-button hud-restart" type="button" @click="restartGame">重开一局</button>
    </div>

    <div class="table">
      <div class="opponents">
        <section
          v-for="index in [1, 2]"
          :key="index"
          class="opponent"
          :class="{ active: currentPlayerIndex === index }"
        >
          <span class="avatar" :class="players[index].role ?? 'unknown'" aria-hidden="true">{{ index === 1 ? '左' : '右' }}</span>
          <div class="opp-meta">
            <b>{{ players[index].name }}</b>
            <span class="role-chip" :class="players[index].role ?? 'unknown'">{{ roleLabel(index) }}</span>
            <span class="card-count">{{ players[index].handCards.length }} 张</span>
          </div>
          <div class="card-backs" :aria-label="`${players[index].handCards.length} 张手牌`">
            <i v-for="i in Math.min(players[index].handCards.length, 8)" :key="i" aria-hidden="true"></i>
          </div>
        </section>
      </div>

      <div class="table-center">
        <div class="bottom-row">
          <span class="table-label">底牌</span>
          <div class="bottom-cards">
            <div
              v-for="(card, index) in bottomCards"
              :key="index"
              class="mini-card"
              :class="{ back: gameState === 'bidding' || gameState === 'waiting', red: isRed(card) }"
            >
              <template v-if="gameState === 'playing' || gameState === 'ended'">
                <span class="mini-rank">{{ getCardDisplay(card).rank }}</span>
                <span class="mini-suit">{{ getCardDisplay(card).suit }}</span>
              </template>
              <span v-else class="mini-back-mark">?</span>
            </div>
          </div>
        </div>

        <div class="play-zone">
          <div v-if="lastPlayedCards.length > 0" class="played-cards">
            <div
              v-for="(card, index) in lastPlayedCards"
              :key="index"
              class="mini-card played"
              :class="{ red: isRed(card) }"
              :style="{ transform: `translateX(${index * 9}px)` }"
            >
              <span class="mini-rank">{{ getCardDisplay(card).rank }}</span>
              <span class="mini-suit">{{ getCardDisplay(card).suit }}</span>
            </div>
          </div>
          <div v-else-if="lastAction === 'pass'" class="pass-badge">不出</div>
          <p v-else-if="centerHint" class="zone-hint">{{ centerHint }}</p>
        </div>

        <p v-if="message && gameState !== 'ended'" class="game-message">{{ message }}</p>
      </div>

      <div class="player-panel" :class="{ active: currentPlayerIndex === 0 }">
        <div class="player-meta">
          <span class="avatar is-me" aria-hidden="true">我</span>
          <span class="role-chip" :class="players[0].role ?? 'unknown'">{{ roleLabel(0) }}</span>
          <span class="card-count">{{ players[0].handCards.length }} 张</span>
        </div>
        <div class="hand">
          <button
            v-for="(card, index) in players[0].handCards"
            :key="index"
            type="button"
            class="hand-card"
            :class="{ selected: card.selected, red: isRed(card) }"
            :aria-label="`${getCardDisplay(card).rank}${getCardDisplay(card).suit}${card.selected ? '，已选中' : ''}`"
            :aria-pressed="Boolean(card.selected)"
            @click="toggleCardSelection(index)"
          >
            <span class="hand-rank">{{ getCardDisplay(card).rank }}</span>
            <span class="hand-suit">{{ getCardDisplay(card).suit }}</span>
            <span class="hand-pip" aria-hidden="true">{{ getCardDisplay(card).suit }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="gameState === 'ended'" class="result-banner" role="status">
      <span aria-hidden="true">🏆</span>
      <strong>{{ message }}</strong>
    </div>

    <div class="action-bar">
      <template v-if="gameState === 'bidding' && currentPlayerIndex === 0">
        <button class="ghost-button" type="button" @click="passBid">不抢</button>
        <button class="primary-button" type="button" @click="bidLandlord">抢地主</button>
      </template>

      <template v-else-if="gameState === 'playing' && currentPlayerIndex === 0">
        <button class="ghost-button" type="button" :disabled="lastPlayedCards.length === 0" @click="passPlay">不出</button>
        <button class="ghost-button" type="button" @click="showHint">提示</button>
        <button class="primary-button" type="button" :disabled="selectedCards.length === 0" @click="playCards">出牌</button>
      </template>

      <template v-else-if="gameState === 'ended'">
        <button class="primary-button" type="button" @click="restartGame">再来一局</button>
      </template>

      <span v-else class="waiting">
        <i class="waiting-dot" aria-hidden="true"></i>
        {{ gameState === 'bidding' ? '等待对手抢地主…' : '等待对手出牌…' }}
      </span>
    </div>

    <p class="game-note">叫地主 · 先出完手牌获胜 · 炸弹翻倍</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ==================== 类型定义 ====================

interface Card {
  suit: 'spade' | 'heart' | 'club' | 'diamond' | 'joker'
  rank: number // 3-15 (3-10, J=11, Q=12, K=13, A=14, 2=15), joker: 16(small), 17(big)
  selected?: boolean
}

interface Player {
  id: number
  name: string
  handCards: Card[]
  role: 'landlord' | 'farmer' | null
}

type CardType = 
  | 'single'       // 单张
  | 'pair'         // 对子
  | 'triple'       // 三张
  | 'triple_one'   // 三带一
  | 'triple_pair'  // 三带二
  | 'straight'     // 顺子
  | 'pair_straight'// 连对
  | 'airplane'     // 飞机
  | 'bomb'         // 炸弹
  | 'rocket'       // 王炸
  | 'invalid'      // 无效牌型

interface CardPattern {
  type: CardType
  rank: number
  cards: Card[]
}

type GameState = 'waiting' | 'bidding' | 'playing' | 'ended'

// ==================== 游戏状态 ====================

const gameState = ref<GameState>('waiting')
const currentRound = ref(1)
const baseScore = ref(100)
const multiplier = ref(1)
const currentPlayerIndex = ref(0)
const landlordIndex = ref(-1)
const bottomCards = ref<Card[]>([])
const lastPlayedCards = ref<Card[]>([])
const lastPattern = ref<CardPattern | null>(null)
const lastAction = ref<'play' | 'pass' | null>(null)
const lastPlayerIndex = ref(-1)
const message = ref<string>('')

const players = ref<Player[]>([
  { id: 0, name: '我', handCards: [], role: null },
  { id: 1, name: '对手1', handCards: [], role: null },
  { id: 2, name: '对手2', handCards: [], role: null }
])

// ==================== 计算属性 ====================

const selectedCards = computed(() => {
  return players.value[0].handCards.filter(card => card.selected)
})

const turnText = computed(() => {
  if (gameState.value === 'ended') {
    return '本局结束'
  }
  if (gameState.value === 'bidding') {
    return currentPlayerIndex.value === 0 ? '轮到你抢地主' : '等待对手抢地主…'
  }
  return currentPlayerIndex.value === 0 ? '轮到你出牌' : '对手思考中…'
})

const centerHint = computed(() => {
  if (gameState.value === 'bidding') {
    return '叫地主后开始出牌'
  }
  if (gameState.value === 'ended') {
    return ''
  }
  return currentPlayerIndex.value === 0 ? '点选牌后出牌，或要一个提示' : ''
})

function roleLabel(index: number): string {
  const role = players.value[index]?.role
  return role === 'landlord' ? '地主' : role === 'farmer' ? '农民' : '待定'
}

function isRed(card: Card): boolean {
  return card.suit === 'heart' || card.suit === 'diamond' || (card.suit === 'joker' && card.rank === 17)
}

// ==================== 扑克牌工具函数 ====================

const createDeck = (): Card[] => {
  const deck: Card[] = []
  
  // 普通牌
  const suits: ('spade' | 'heart' | 'club' | 'diamond')[] = ['spade', 'heart', 'club', 'diamond']
  for (let suit of suits) {
    for (let rank = 3; rank <= 15; rank++) {
      deck.push({ suit, rank })
    }
  }
  
  // 大小王
  deck.push({ suit: 'joker', rank: 16 }) // 小王
  deck.push({ suit: 'joker', rank: 17 }) // 大王
  
  return deck
}

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const sortCards = (cards: Card[]): Card[] => {
  return [...cards].sort((a, b) => {
    if (a.suit === 'joker' && b.suit === 'joker') {
      return b.rank - a.rank
    }
    if (a.suit === 'joker') return 1
    if (b.suit === 'joker') return -1
    return b.rank - a.rank
  })
}

const getCardDisplay = (card: Card): { rank: string; suit: string; isJoker: boolean } => {
  if (card.suit === 'joker') {
    return { 
      rank: card.rank === 16 ? '小' : '大', 
      suit: card.rank === 16 ? '🃏' : '👑',
      isJoker: true 
    }
  }
  
  const suitSymbols: Record<string, string> = {
    spade: '♠',
    heart: '♥',
    club: '♣',
    diamond: '♦'
  }
  
  const rankSymbols: Record<number, string> = {
    11: 'J',
    12: 'Q',
    13: 'K',
    14: 'A',
    15: '2'
  }
  
  const rank = card.rank <= 10 ? card.rank.toString() : rankSymbols[card.rank]
  return { rank, suit: suitSymbols[card.suit], isJoker: false }
}


// ==================== 牌型判断 ====================

const getCardPattern = (cards: Card[]): CardPattern => {
  const sorted = sortCards(cards)
  const len = sorted.length
  
  if (len === 0) {
    return { type: 'invalid', rank: 0, cards: [] }
  }
  
  // 王炸
  if (len === 2 && sorted[0].suit === 'joker' && sorted[1].suit === 'joker') {
    return { type: 'rocket', rank: 17, cards: sorted }
  }
  
  // 炸弹
  if (len === 4 && sorted.every(c => c.rank === sorted[0].rank)) {
    return { type: 'bomb', rank: sorted[0].rank, cards: sorted }
  }
  
  // 单张
  if (len === 1) {
    return { type: 'single', rank: sorted[0].rank, cards: sorted }
  }
  
  // 对子
  if (len === 2 && sorted[0].rank === sorted[1].rank) {
    return { type: 'pair', rank: sorted[0].rank, cards: sorted }
  }
  
  // 三张
  if (len === 3 && sorted.every(c => c.rank === sorted[0].rank)) {
    return { type: 'triple', rank: sorted[0].rank, cards: sorted }
  }
  
  // 三带一
  if (len === 4) {
    const ranks = sorted.map(c => c.rank)
    const rankCount: Record<string, number> = {}
    ranks.forEach(r => rankCount[r] = (rankCount[r] || 0) + 1)
    
    for (let rank in rankCount) {
      if (rankCount[rank] === 3) {
        return { type: 'triple_one', rank: parseInt(rank), cards: sorted }
      }
    }
  }
  // 三带二
  if (len === 5) {
    const ranks = sorted.map(c => c.rank)
    const rankCount: Record<string, number> = {}
    ranks.forEach(r => rankCount[r] = (rankCount[r] || 0) + 1)
    
    const counts: number[] = Object.values(rankCount).sort((a, b) => b - a)
    const [firstCount, secondCount] = counts
    if (firstCount === 3 && secondCount === 2) {
      const tripleRank = parseInt(Object.keys(rankCount).find(k => rankCount[k] === 3)!)
      return { type: 'triple_pair', rank: tripleRank, cards: sorted }
    }
  }
  
  // 顺子 (至少5张)
  if (len >= 5) {
    const ranks = sorted.map(c => c.rank)
    const isConsecutive = ranks.every((r, i) => i === 0 || ranks[i-1] - r === 1)
    const noJoker = !sorted.some(c => c.suit === 'joker')
    const maxRank = Math.max(...ranks)
    
    if (isConsecutive && noJoker && maxRank < 15) { // 不能包含2和王
      return { type: 'straight', rank: maxRank, cards: sorted }
    }
  }
  
  // 连对 (至少3对)
  if (len >= 6 && len % 2 === 0) {
    const ranks = sorted.map(c => c.rank)
    const pairs: number[] = []
    
    for (let i = 0; i < len; i += 2) {
      if (ranks[i] !== ranks[i+1]) break
      pairs.push(ranks[i])
    }
    
    if (pairs.length === len / 2) {
      const isConsecutive = pairs.every((r, i) => i === 0 || pairs[i-1] - r === 1)
      const maxRank = Math.max(...pairs)
      
      if (isConsecutive && maxRank < 15) {
        return { type: 'pair_straight', rank: maxRank, cards: sorted }
      }
    }
  }
  
  return { type: 'invalid', rank: 0, cards: [] }
}

const canBeat = (pattern: CardPattern, lastPattern: CardPattern): boolean => {
  // 王炸最大
  if (pattern.type === 'rocket') return true
  if (lastPattern.type === 'rocket') return false
  
  // 炸弹可以打非炸弹
  if (pattern.type === 'bomb' && lastPattern.type !== 'bomb') return true
  if (pattern.type !== 'bomb' && lastPattern.type === 'bomb') return false
  
  // 同类型比较
  if (pattern.type === lastPattern.type) {
    if (pattern.type === 'straight' || pattern.type === 'pair_straight') {
      return pattern.cards.length === lastPattern.cards.length && pattern.rank > lastPattern.rank
    }
    return pattern.rank > lastPattern.rank
  }
  
  return false
}

// ==================== 游戏逻辑 ====================

const startGame = () => {
  gameState.value = 'bidding'
  message.value = ''
  lastPlayedCards.value = []
  lastPattern.value = null
  lastAction.value = null
  lastPlayerIndex.value = -1
  multiplier.value = 1
  
  // 洗牌发牌
  const deck = shuffleDeck(createDeck())
  
  players.value[0].handCards = sortCards(deck.slice(0, 17))
  players.value[1].handCards = sortCards(deck.slice(17, 34))
  players.value[2].handCards = sortCards(deck.slice(34, 51))
  bottomCards.value = deck.slice(51, 54)
  
  // 随机起始玩家
  currentPlayerIndex.value = Math.floor(Math.random() * 3)
  
  // 如果不是玩家先手，AI自动抢地主
  if (currentPlayerIndex.value !== 0) {
    setTimeout(() => aiBid(), 1000)
  }
}

const bidLandlord = () => {
  landlordIndex.value = 0
  players.value[0].role = 'landlord'
  players.value[1].role = 'farmer'
  players.value[2].role = 'farmer'
  
  // 获得底牌
  players.value[0].handCards = sortCards([...players.value[0].handCards, ...bottomCards.value])
  
  gameState.value = 'playing'
  currentPlayerIndex.value = 0
  message.value = '你是地主，先出牌'
  
  setTimeout(() => {
    message.value = ''
  }, 2000)
}

const passBid = () => {
  currentPlayerIndex.value = (currentPlayerIndex.value + 1) % 3
  
  if (currentPlayerIndex.value === 0) {
    // 玩家放弃，AI决定
    setTimeout(() => aiBid(), 1000)
  } else {
    setTimeout(() => aiBid(), 1000)
  }
}

const aiBid = () => {
  const playerIndex = currentPlayerIndex.value
  const player = players.value[playerIndex]
  
  // 简单AI：根据手牌强度决定是否抢地主
  const cards = player.handCards
  const hasJoker = cards.some(c => c.suit === 'joker')
  const hasBomb = checkHasBomb(cards)
  const highCards = cards.filter(c => c.rank >= 14).length
  
  const shouldBid = hasJoker || hasBomb || highCards >= 3
  
  if (shouldBid) {
    landlordIndex.value = playerIndex
    player.role = 'landlord'
    
    // 其他玩家设为农民
    players.value.forEach((p, i) => {
      if (i !== playerIndex) p.role = 'farmer'
    })
    
    // 获得底牌
    player.handCards = sortCards([...player.handCards, ...bottomCards.value])
    
    gameState.value = 'playing'
    message.value = `${player.name} 成为地主`
    
    setTimeout(() => {
      message.value = ''
      currentPlayerIndex.value = (playerIndex + 1) % 3
      if (currentPlayerIndex.value !== 0) {
        setTimeout(() => aiPlay(), 1500)
      }
    }, 2000)
  } else {
    currentPlayerIndex.value = (playerIndex + 1) % 3
    
    if (currentPlayerIndex.value === 0) {
      message.value = '轮到你抢地主'
    } else {
      setTimeout(() => aiBid(), 1000)
    }
  }
}

const checkHasBomb = (cards: Card[]): boolean => {
  const ranks = cards.map(c => c.rank)
  const rankCount: Record<string, number> = {}
  ranks.forEach(r => rankCount[r] = (rankCount[r] || 0) + 1)
  return Object.values(rankCount).some(count => count === 4)
}

const toggleCardSelection = (index: number) => {
  if (gameState.value !== 'playing' || currentPlayerIndex.value !== 0) return
  
  players.value[0].handCards[index].selected = !players.value[0].handCards[index].selected
}

const playCards = () => {
  if (selectedCards.value.length === 0) return
  
  const pattern = getCardPattern(selectedCards.value)
  
  if (pattern.type === 'invalid') {
    message.value = '无效牌型'
    setTimeout(() => message.value = '', 2000)
    return
  }
  
  // 检查是否能打过上家
  if (lastPattern.value && lastPlayerIndex.value !== 0) {
    if (!canBeat(pattern, lastPattern.value)) {
      message.value = '打不过上家'
      setTimeout(() => message.value = '', 2000)
      return
    }
  }
  
  // 出牌
  const playedCards = selectedCards.value
  players.value[0].handCards = players.value[0].handCards.filter(c => !c.selected)
  
  lastPlayedCards.value = playedCards
  lastPattern.value = pattern
  lastAction.value = 'play'
  lastPlayerIndex.value = 0
  
  // 炸弹加倍
  if (pattern.type === 'bomb' || pattern.type === 'rocket') {
    multiplier.value *= 2
  }
  
  // 检查胜利
  if (players.value[0].handCards.length === 0) {
    endGame(0)
    return
  }
  
  // 下一个玩家
  currentPlayerIndex.value = 1
  setTimeout(() => aiPlay(), 1500)
}

const passPlay = () => {
  if (lastPlayedCards.value.length === 0) return
  
  lastAction.value = 'pass'
  currentPlayerIndex.value = 1
  setTimeout(() => aiPlay(), 1500)
}

const showHint = () => {
  if (gameState.value !== 'playing' || currentPlayerIndex.value !== 0) return
  
  // 清除当前选择
  players.value[0].handCards.forEach(c => c.selected = false)
  
  const handCards = players.value[0].handCards
  const hintCards = findBestPlay(handCards, lastPattern.value, lastPlayerIndex.value === 0)
  
  if (hintCards) {
    hintCards.forEach(card => {
      const index = handCards.findIndex(c => c.suit === card.suit && c.rank === card.rank)
      if (index !== -1 && !handCards[index].selected) {
        handCards[index].selected = true
      }
    })
  }
}

const findBestPlay = (cards: Card[], lastPattern: CardPattern | null, isNewRound: boolean): Card[] | null => {
  const sorted = sortCards(cards)
  
  if (isNewRound || !lastPattern) {
    // 新回合，出最小的单张
    return [sorted[sorted.length - 1]]
  }
  
  // 尝试找到能打过的牌
  if (lastPattern.type === 'single') {
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].rank > lastPattern.rank) {
        return [sorted[i]]
      }
    }
  }
  
  if (lastPattern.type === 'pair') {
    const pairs: Card[][] = []
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].rank === sorted[i + 1].rank && sorted[i].rank > lastPattern.rank) {
        pairs.push([sorted[i], sorted[i + 1]])
        i++
      }
    }
    if (pairs.length > 0) return pairs[0]
  }
  
  if (lastPattern.type === 'triple') {
    const triples: Card[][] = []
    for (let i = 0; i < sorted.length - 2; i++) {
      if (sorted[i].rank === sorted[i + 1].rank && sorted[i].rank === sorted[i + 2].rank) {
        if (sorted[i].rank > lastPattern.rank) {
          triples.push([sorted[i], sorted[i + 1], sorted[i + 2]])
          i += 2
        }
      }
    }
    if (triples.length > 0) return triples[0]
  }
  
  // 检查炸弹
  const bombs = findBombs(sorted)
  if (lastPattern.type !== 'bomb' && lastPattern.type !== 'rocket') {
    if (bombs.length > 0) return bombs[0]
  } else if (lastPattern.type === 'bomb') {
    for (const bomb of bombs) {
      if (bomb[0].rank > lastPattern.rank) {
        return bomb
      }
    }
  }
  
  // 王炸
  const jokers = sorted.filter(c => c.suit === 'joker')
  if (jokers.length === 2 && lastPattern.type !== 'rocket') {
    return jokers
  }
  
  return null
}

const findBombs = (cards: Card[]): Card[][] => {
  const bombs: Card[][] = []
  const sorted = sortCards(cards)
  
  for (let i = 0; i < sorted.length - 3; i++) {
    if (sorted[i].rank === sorted[i + 1].rank && 
        sorted[i].rank === sorted[i + 2].rank && 
        sorted[i].rank === sorted[i + 3].rank) {
      bombs.push([sorted[i], sorted[i + 1], sorted[i + 2], sorted[i + 3]])
      i += 3
    }
  }
  
  return bombs
}

const aiPlay = () => {
  const playerIndex = currentPlayerIndex.value
  const player = players.value[playerIndex]
  
  // 检查是否需要出牌
  const isNewRound = lastPlayerIndex.value === -1 || lastPlayerIndex.value === playerIndex
  
  const playedCards = findBestPlay(player.handCards, lastPattern.value, isNewRound)
  
  if (playedCards) {
    // 出牌
    const pattern = getCardPattern(playedCards)
    player.handCards = player.handCards.filter(c => 
      !playedCards.some(pc => pc.suit === c.suit && pc.rank === c.rank)
    )
    
    lastPlayedCards.value = playedCards
    lastPattern.value = pattern
    lastAction.value = 'play'
    lastPlayerIndex.value = playerIndex
    
    // 炸弹加倍
    if (pattern.type === 'bomb' || pattern.type === 'rocket') {
      multiplier.value *= 2
    }
    
    // 检查胜利
    if (player.handCards.length === 0) {
      endGame(playerIndex)
      return
    }
  } else {
    // 不出
    lastAction.value = 'pass'
  }
  
  // 下一个玩家
  currentPlayerIndex.value = (playerIndex + 1) % 3
  
  if (currentPlayerIndex.value !== 0) {
    setTimeout(() => aiPlay(), 1500)
  }
}

const endGame = (winnerIndex: number) => {
  gameState.value = 'ended'
  const winner = players.value[winnerIndex]
  const isLandlordWin = winner.role === 'landlord'
  
  if (winnerIndex === 0) {
    message.value = isLandlordWin ? '你赢了！地主胜利' : '你赢了！农民胜利'
  } else {
    message.value = isLandlordWin ? '地主胜利' : '农民胜利'
  }
}

const restartGame = () => {
  currentRound.value++
  players.value.forEach(p => {
    p.handCards = []
    p.role = null
  })
  startGame()
}

// 暴露方法供父组件（Game.vue 顶部控制栏）调用；牌局本身不可暂停，pause/resume 为空操作
defineExpose({
  reset: restartGame,
  pause: () => {},
  resume: () => {}
})

onMounted(() => {
  startGame()
})
</script>

<style scoped>
.doudizhu-game {
  display: grid;
  gap: 10px;
  width: 100%;
}

.game-hud {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hud-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.multiplier-chip {
  background: var(--coral-soft);
  border-color: #f3cbb8;
  color: #b35337;
}

.turn-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 4px 13px;
  border-radius: 999px;
  background: #f1e7da;
  border: 1px solid #e8d6c3;
  color: #8a8278;
  font-size: 12px;
  font-weight: 800;
}

.turn-pill.is-mine {
  background: var(--coral-soft);
  border-color: #f3cbb8;
  color: #b35337;
}

.turn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b9b3a9;
}

.turn-pill.is-mine .turn-dot {
  background: var(--coral);
  box-shadow: 0 0 0 3px rgba(237, 115, 95, 0.18);
}

.hud-restart {
  margin-left: auto;
  font-size: 12px;
}

.table {
  display: grid;
  gap: 10px;
  padding: 12px;
  background:
    radial-gradient(circle at 50% 0%, #fffdf9 0%, transparent 55%),
    linear-gradient(180deg, #fdf7ec, #fbefdd);
  border: 2px solid #f2ddc8;
  border-radius: 26px;
  box-shadow: var(--shadow-soft), 0 6px 0 #edd9c3;
}

.opponents {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.opponent {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 9px 11px;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 3px 0 #eedfcd;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.opponent.active {
  border-color: var(--coral);
  box-shadow: 0 0 0 2px rgba(237, 115, 95, 0.22), 0 3px 0 #eedfcd;
}

.avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: #f1e7da;
  color: #8a8278;
  font-size: 13px;
  font-weight: 900;
}

.avatar.landlord {
  background: var(--coral-soft);
  color: #b35337;
}

.avatar.farmer {
  background: var(--green-soft);
  color: var(--green-strong);
}

.avatar.is-me {
  background: var(--green-soft);
  color: var(--green-strong);
}

.opp-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.opp-meta b {
  font-size: 12.5px;
  font-weight: 850;
  white-space: nowrap;
}

.role-chip {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 850;
  background: #f1e7da;
  color: #8a8278;
}

.role-chip.landlord {
  background: var(--coral-soft);
  color: #b35337;
}

.role-chip.farmer {
  background: var(--green-soft);
  color: var(--green-strong);
}

.card-count {
  color: var(--faint);
  font-size: 10.5px;
  font-weight: 750;
  white-space: nowrap;
}

.card-backs {
  display: flex;
  grid-column: 1 / -1;
  padding-left: 2px;
  min-height: 18px;
}

.card-backs i {
  width: 15px;
  height: 21px;
  margin-left: -7px;
  border-radius: 4px;
  border: 1px solid #bfd2c2;
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.35) 0 2px, transparent 2px 5px),
    #7fa987;
  box-shadow: 0 1px 2px rgba(80, 100, 85, 0.18);
}

.card-backs i:first-child {
  margin-left: 0;
}

.table-center {
  display: grid;
  gap: 8px;
  justify-items: center;
  min-height: 142px;
  padding: 4px 0;
}

.bottom-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-label {
  color: var(--faint);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.bottom-cards {
  display: flex;
  gap: 5px;
}

.mini-card {
  position: relative;
  width: 30px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: #fffdf9;
  border: 1.5px solid #e8d6c3;
  box-shadow: 0 2px 0 #efe2d2;
  color: #303348;
  font-weight: 900;
}

.mini-card.back {
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.34) 0 3px, transparent 3px 7px),
    #7fa987;
  border-color: #bfd2c2;
  color: #4d6b52;
}

.mini-card.red {
  color: #c9524a;
}

.mini-rank {
  font-size: 13px;
  line-height: 1;
}

.mini-suit {
  font-size: 10px;
  line-height: 1;
}

.mini-back-mark {
  font-size: 13px;
  font-weight: 900;
  color: #4d6b52;
}

.play-zone {
  display: grid;
  place-items: center;
  min-height: 62px;
  width: 100%;
}

.played-cards {
  display: flex;
  padding-left: 4px;
}

.mini-card.played {
  width: 38px;
  height: 54px;
  margin-left: -4px;
}

.mini-card.played:first-child {
  margin-left: 0;
}

.played-cards .mini-rank {
  font-size: 15px;
}

.played-cards .mini-suit {
  font-size: 11px;
}

.pass-badge {
  padding: 5px 14px;
  border-radius: 999px;
  background: #f1e7da;
  border: 1px solid #e8d6c3;
  color: #8a8278;
  font-size: 13px;
  font-weight: 850;
}

.zone-hint {
  color: var(--faint);
  font-size: 12px;
  text-align: center;
}

.game-message {
  color: #67756b;
  font-size: 12.5px;
  font-weight: 700;
  text-align: center;
  line-height: 1.5;
}

.player-panel {
  display: grid;
  gap: 6px;
  padding: 9px 11px 7px;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 3px 0 #eedfcd;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.player-panel.active {
  border-color: var(--coral);
  box-shadow: 0 0 0 2px rgba(237, 115, 95, 0.18), 0 3px 0 #eedfcd;
}

.player-meta {
  display: flex;
  align-items: center;
  gap: 7px;
}

.hand {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 12px 2px 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.hand::-webkit-scrollbar {
  display: none;
}

.hand-card {
  position: relative;
  flex: none;
  width: 52px;
  height: 74px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0;
  padding: 4px 5px;
  margin-left: -28px;
  border: 1.5px solid #e8d6c3;
  border-radius: 8px;
  background: #fffdf9;
  color: #303348;
  box-shadow: 0 2px 0 #efe2d2;
  transition: transform 0.16s, box-shadow 0.16s, border-color 0.16s;
}

.hand-card:first-child {
  margin-left: 0;
}

.hand-card:nth-child(even) {
  transform: translateY(3px);
}

.hand-card.red {
  color: #c9524a;
}

.hand-card.selected {
  transform: translateY(-12px);
  border-color: var(--coral);
  box-shadow: 0 0 0 2px rgba(237, 115, 95, 0.25), 0 6px 12px rgba(113, 75, 47, 0.16);
}

.hand-card:hover {
  transform: translateY(-6px);
}

.hand-card.selected:hover {
  transform: translateY(-14px);
}

.hand-rank {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.05em;
}

.hand-suit {
  font-size: 11px;
  line-height: 1.1;
}

.hand-card:not(:last-child) .hand-pip {
  display: none;
}

.hand-pip {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 26px;
  line-height: 1;
  opacity: 0.16;
  pointer-events: none;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 52px;
  padding: 2px 2px 0;
}

.action-bar .primary-button,
.action-bar .ghost-button {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  font-size: 14px;
}

.waiting {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--faint);
  font-size: 12.5px;
  font-weight: 750;
}

.waiting-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 0 4px #fdf0d6;
  animation: waiting-pulse 1.2s ease-in-out infinite;
}

@keyframes waiting-pulse {
  50% {
    opacity: 0.4;
  }
}

.result-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--green-soft);
  border: 1.5px solid var(--green-line);
  border-radius: 14px;
  color: var(--green-strong);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

.result-banner span {
  font-size: 17px;
}

.game-note {
  text-align: center;
  color: var(--faint);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.04em;
}

@media (max-width: 560px) {
  .hud-stats .chip {
    min-height: 25px;
    padding: 2px 9px;
    font-size: 10px;
  }

  .turn-pill {
    width: 100%;
    justify-content: center;
  }

  .hud-restart {
    order: 2;
    margin-left: auto;
  }

  .table {
    padding: 9px;
    border-radius: 22px;
    gap: 8px;
  }

  .opponents {
    gap: 7px;
  }

  .opponent {
    padding: 7px 8px;
    border-radius: 14px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 11px;
    font-size: 11px;
  }

  .opp-meta b {
    font-size: 11.5px;
  }

  .card-count {
    font-size: 10px;
  }

  .table-center {
    min-height: 132px;
  }

  .hand-card {
    width: 44px;
    height: 64px;
    margin-left: -24px;
    border-radius: 7px;
  }

  .hand-card:nth-child(even) {
    transform: translateY(2px);
  }

  .hand-rank {
    font-size: 15px;
  }

  .hand-suit {
    font-size: 10px;
  }

  .hand-pip {
    font-size: 22px;
  }

  .player-panel {
    padding: 8px 9px 6px;
  }

  .hand {
    padding-top: 10px;
  }

  .action-bar .primary-button,
  .action-bar .ghost-button {
    min-height: 46px;
    font-size: 13.5px;
  }
}
</style>
