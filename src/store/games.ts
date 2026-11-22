import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GameConfigItem } from '@/types/game';
import { gameCatalog } from '@/utils/gameCatalog';

/**
 * 只负责游戏清单状态。
 * 游戏实例由 Game.vue 直接按 registry 渲染，store 不再参与挂载/生命周期，
 * 避免出现“父组件渲染一份 + loader 再挂载一份”的双实例。
 */
export const useGameStore = defineStore('games', () => {
  const gameList = ref<GameConfigItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const hasGames = computed(() => gameList.value.length > 0);

  /**
   * 加载游戏清单。配置是静态导入，这里保留 async 以兼容页面加载时序。
   * 任意页面首次进入都可以安全调用（含直链刷新）。
   */
  async function loadGameList(force = false) {
    if (gameList.value.length > 0 && !force) {
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      gameList.value = gameCatalog.getGameList();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load games';
      console.error('Error loading game list:', err);
    } finally {
      isLoading.value = false;
    }
  }

  function getGameById(gameId: string): GameConfigItem | null {
    return gameList.value.find(game => game.id === gameId) ?? null;
  }

  function getGamesByCategory(category: string): GameConfigItem[] {
    return gameList.value.filter(game => game.category === category);
  }

  return {
    gameList,
    isLoading,
    error,
    hasGames,
    loadGameList,
    getGameById,
    getGamesByCategory
  };
});
