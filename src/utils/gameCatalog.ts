import type { GameConfig, GameConfigItem } from '@/types/game';
import configData from '@/games/config.json';

// 配置随源码一起打包：不依赖 fetch，浏览器/Electron file:// 下行为一致，天然离线
const config = configData as GameConfig;

/**
 * 游戏清单（只读）。
 * 渲染用的组件表在 src/games/registry.ts，两者的 id 必须一致。
 */
class GameCatalog {
  getGameList(): GameConfigItem[] {
    return config.games;
  }

  getGameConfig(gameId: string): GameConfigItem | null {
    return config.games.find(game => game.id === gameId) ?? null;
  }

  getGamesByCategory(category: string): GameConfigItem[] {
    return config.games.filter(game => game.category === category);
  }
}

export const gameCatalog = new GameCatalog();
