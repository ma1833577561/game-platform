import type { Component } from 'vue';
import GomokuGame from './gomoku/GomokuGame.vue';
import XiangqiGame from './xiangqi/XiangqiGame.vue';
import WeiqiGame from './weiqi/WeiqiGame.vue';
import MinesweeperGame from './minesweeper/MinesweeperGame.vue';
import MahjongMatchGame from './mahjong-match/MahjongMatchGame.vue';
import DoudizhuGame from './doudizhu/DoudizhuGame.vue';
import FruitGame from './fruit/FruitGame.vue';
import SpiderGame from './spider/SpiderGame.vue';

export interface GameRegistryEntry {
  /** 与 games/config.json 中的 id 一致 */
  id: string;
  /** 组件默认名称，游戏清单加载失败时兜底显示 */
  name: string;
  component: Component;
  /** 是否支持暂停/继续；单机牌局内部不可暂停时设为 false */
  supportsPause?: boolean;
  /** 每款游戏的主题强调色，用于大厅卡片与游戏页点缀 */
  accent: string;
  /** 大厅卡片上的一句话卖点 */
  tagline: string;
  /** 打开游戏页时展示的 3 条上手说明 */
  howTo: string[];
  /** 游戏区宽度：narrow 适合单列卡牌/合成，wide 适合棋盘 */
  stage?: 'narrow' | 'wide';
  /** 卡片角标，例如 NEW */
  badge?: string;
}

/**
 * 游戏渲染表：id -> 组件。
 * 这是唯一的渲染入口，路由参数 id 直接映射到组件，不再依赖游戏清单里的中文名。
 * 新增游戏：在这里注册一行（同时把配置补进 src/games/config.json）。
 */
export const gameRegistry: Record<string, GameRegistryEntry> = {
  fruit: {
    id: 'fruit',
    name: '合成西瓜',
    component: FruitGame,
    accent: '#ed735f',
    tagline: '同类碰撞，合成大西瓜',
    howTo: [
      '左右移动瞄准，点击或松开手指投放水果',
      '两个相同的水果碰到一起，会合成更大的水果',
      '水果堆过警戒线 2 秒就结束，连续合成有连击加分'
    ],
    stage: 'narrow'
  },
  spider: {
    id: 'spider',
    name: '蜘蛛纸牌',
    component: SpiderGame,
    accent: '#7a6aa8',
    tagline: '把 K 到 A 的同花顺收走',
    howTo: [
      '点一张明牌或一组同花顺序，再点目标列放下',
      '只有同花色的连续降序牌才能整组移动，单张可放到大一点的牌上',
      '凑齐 K→A 的同花顺会自动收走；收完 8 组通关，发牌前不能有空列'
    ],
    stage: 'wide',
    badge: 'NEW'
  },
  gomoku: {
    id: 'gomoku',
    name: '五子棋',
    component: GomokuGame,
    accent: '#5d5f74',
    tagline: '先连成五子的人赢',
    howTo: [
      '黑方先行，双方轮流在交叉点落子',
      '横、竖、斜任意方向先连成五子即获胜',
      '点右上角「设置」可切换人机对战与强制防御'
    ]
  },
  xiangqi: {
    id: 'xiangqi',
    name: '中国象棋',
    component: XiangqiGame,
    accent: '#d2553f',
    tagline: '将死对方，或困毙取胜',
    howTo: [
      '红方先行：先点自己的棋子，再点目标位置',
      '马走日、象走田、炮隔一子吃，将帅不能照面',
      '点「设置」可切换人机难度，支持悔棋'
    ]
  },
  weiqi: {
    id: 'weiqi',
    name: '围棋',
    component: WeiqiGame,
    accent: '#3f7d5c',
    tagline: '围地多者胜',
    howTo: [
      '黑方先行，点击交叉点落子',
      '围住对方棋子的气即可提子，禁入点和劫争会被拦截',
      '连续两次「虚手」后自动数子结算，白方贴 6.5 目'
    ]
  },
  minesweeper: {
    id: 'minesweeper',
    name: '扫雷',
    component: MinesweeperGame,
    accent: '#d99b3f',
    tagline: '翻开所有安全格',
    howTo: [
      '点开格子，数字表示周围八格里的地雷数量',
      '手机用「插旗模式」标记地雷，电脑也可右键标记',
      '第一次点击不会踩雷，还可以撤销上一步'
    ]
  },
  'mahjong-match': {
    id: 'mahjong-match',
    name: '麻将对对碰',
    component: MahjongMatchGame,
    accent: '#c9524a',
    tagline: '配对消除，连击拿高分',
    howTo: [
      '点击两张相同的牌即可配对消除',
      '被上层或两侧挡住的牌不能点，先清外圈',
      '提示和洗牌次数有限，连续消除有连击加成'
    ]
  },
  doudizhu: {
    id: 'doudizhu',
    name: '三人斗地主',
    component: DoudizhuGame,
    accent: '#4a6fa5',
    tagline: '抢地主，先出完牌',
    howTo: [
      '叫地主后地主多拿三张底牌，先出完手牌的一方获胜',
      '点选手中牌后点「出牌」，也可以「不出」或要「提示」',
      '炸弹和王炸会让倍数翻倍，留意顶部倍数变化'
    ],
    supportsPause: false
  }
};

export function getGameEntry(gameId: string): GameRegistryEntry | null {
  return gameRegistry[gameId] ?? null;
}

export function hasGame(gameId: string): boolean {
  return gameId in gameRegistry;
}

export function accentOf(gameId: string): string {
  return gameRegistry[gameId]?.accent ?? '#ed735f';
}
