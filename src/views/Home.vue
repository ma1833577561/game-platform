<template>
  <div class="home-page">
    <div class="app-shell">
      <header class="app-topbar">
        <router-link to="/" class="brand" aria-label="游戏研究所首页">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>游戏研究所</span>
          <span class="brand-en">/ GAME LAB</span>
        </router-link>
        <div class="topbar-actions">
          <span class="chip is-green"><i class="chip-dot" aria-hidden="true"></i>离线可玩</span>
        </div>
      </header>

      <main class="home-layout">
        <section class="home-intro" aria-label="游戏大厅介绍">
          <div class="eyebrow">单机小游戏 · 一局就上手</div>
          <h1>八种小游戏，<em>随时来一局。</em></h1>
          <p class="home-copy">
            不用登录，不用联网。棋、牌、益智和合成，选一个就能开始。
            手机、平板、电脑都顺手，记录只留在本机。
          </p>

          <div class="pill-row">
            <span class="pill">✦ 离线可玩</span>
            <span class="pill">✦ 触屏 / 键盘</span>
            <span class="pill">✦ 共 {{ gameList.length }} 款</span>
          </div>

          <div class="intro-actions">
            <button class="primary-button" type="button" @click="playRandom">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8a1 1 0 0 1 1.5-.86l12 7.2a1 1 0 0 1 0 1.72l-12 7.2A1 1 0 0 1 7 19.2V4.8Z"/></svg>
              随机来一局
            </button>
            <span class="intro-hint">不知道该玩什么？交给运气。</span>
          </div>

          <div class="shelf-note">
            <div class="section-label">GAME SHELF / 游戏货架</div>
            <p>从一局棋到一颗大西瓜，慢慢玩。</p>
          </div>
        </section>

        <section class="shelf" aria-label="游戏列表">
          <button
            v-for="(game, index) in gameList"
            :key="game.id"
            type="button"
            class="game-card"
            :style="{ '--accent': accentOf(game.id) }"
            @click="startGame(game.id)"
          >
            <span class="card-top">
              <span class="card-index">{{ String(index + 1).padStart(2, '0') }} · {{ game.category }}</span>
              <span v-if="badgeOf(game.id)" class="card-badge">{{ badgeOf(game.id) }}</span>
            </span>
            <span class="card-token" aria-hidden="true">{{ game.icon }}</span>
            <span class="card-name">{{ game.name }}</span>
            <span class="card-desc">{{ taglineOf(game.id) || game.description }}</span>
            <span class="card-foot">
              <span>{{ game.minPlayers }}-{{ game.maxPlayers }} 人</span>
              <span class="card-go" aria-hidden="true">↗</span>
            </span>
          </button>
        </section>
      </main>

      <footer class="home-footer">
        全部游戏均可离线运行 · 无需登录 · 记录保存在本机
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/store/games';
import { accentOf, getGameEntry } from '@/games/registry';
import type { GameConfigItem } from '@/types/game';

const router = useRouter();
const gameStore = useGameStore();

const gameList = computed(() => gameStore.gameList);

onMounted(() => {
  gameStore.loadGameList();
});

watchEffect(() => {
  document.title = '游戏研究所 · 八种小游戏';
});

function taglineOf(gameId: string): string {
  return getGameEntry(gameId)?.tagline ?? '';
}

function badgeOf(gameId: string): string {
  return getGameEntry(gameId)?.badge ?? '';
}

function startGame(gameId: string) {
  router.push(`/game/${gameId}`);
}

function playRandom() {
  const games: GameConfigItem[] = gameList.value;
  if (!games.length) {
    return;
  }
  const pick = games[Math.floor(Math.random() * games.length)];
  startGame(pick.id);
}
</script>

<style scoped>
.home-page {
  min-height: 100dvh;
}

.home-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
  gap: clamp(26px, 5vw, 66px);
  align-items: start;
}

.home-intro {
  position: sticky;
  top: 28px;
  padding-top: 10px;
}

.home-intro h1 {
  margin: 18px 0 16px;
  font-size: clamp(42px, 5.6vw, 74px);
  line-height: 1.04;
  font-weight: 900;
  letter-spacing: -0.07em;
}

.home-intro h1 em {
  display: block;
  font-style: normal;
  color: var(--coral);
  position: relative;
  width: max-content;
  max-width: 100%;
}

.home-intro h1 em::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -6px;
  width: 90%;
  height: 7px;
  border-radius: 50%;
  background: #ffc685;
  transform: rotate(-2deg);
  z-index: -1;
}

.home-copy {
  max-width: 380px;
  color: #757a82;
  font-size: 15px;
  line-height: 1.95;
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin: 24px 0 26px;
}

.pill {
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--panel-soft);
  border: 1px solid #eddfcd;
  color: #67756b;
  font-size: 12px;
  font-weight: 750;
  box-shadow: 0 3px 0 #f2e4d3;
}

.intro-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.intro-hint {
  color: var(--faint);
  font-size: 12px;
  line-height: 1.5;
}

.shelf-note {
  max-width: 400px;
  margin-top: 34px;
  padding-top: 20px;
  border-top: 1px dashed #e7cdb6;
}

.shelf-note p {
  margin-top: 10px;
  color: var(--faint);
  font-size: 13px;
}

.shelf {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.game-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-height: 160px;
  padding: 12px 13px 11px;
  text-align: left;
  background: var(--panel);
  border: 1.5px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 0 #eedfcd;
  transition: transform 0.18s, box-shadow 0.18s, background 0.18s;
}

.game-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 0 #eedfcd, 0 16px 30px rgba(113, 75, 47, 0.12);
  background: #fffefb;
}

.game-card:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #eedfcd;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.card-index {
  color: #a49b90;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.card-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--coral-soft);
  color: #b35337;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.card-token {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-top: 2px;
  border-radius: 15px;
  font-size: 23px;
  line-height: 1;
  background: color-mix(in srgb, var(--accent) 14%, #fffdf9);
  border: 1.5px solid color-mix(in srgb, var(--accent) 22%, #f2deca);
  box-shadow: inset 0 -3px 0 color-mix(in srgb, var(--accent) 10%, transparent);
  transition: transform 0.2s;
}

.game-card:hover .card-token {
  transform: rotate(-5deg) scale(1.04);
}

.card-name {
  font-size: 15.5px;
  font-weight: 850;
  letter-spacing: -0.03em;
  color: var(--ink);
}

.card-desc {
  color: #7d7f88;
  font-size: 11.5px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: auto;
  padding-top: 6px;
  color: var(--faint);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.card-go {
  color: var(--accent);
  font-size: 14px;
  font-weight: 900;
  opacity: 0;
  transform: translate(-2px, 2px);
  transition: opacity 0.18s, transform 0.18s;
}

.game-card:hover .card-go,
.game-card:focus-visible .card-go {
  opacity: 1;
  transform: translate(0, 0);
}

.home-footer {
  margin-top: 34px;
  padding-top: 18px;
  border-top: 1px dashed #e7cdb6;
  text-align: center;
  color: #a49b90;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.06em;
}

@media (max-width: 900px) {
  .home-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .home-intro {
    position: static;
    padding-top: 0;
  }

  .home-intro h1 {
    margin: 14px 0 12px;
    font-size: clamp(30px, 7.4vw, 44px);
    line-height: 1.1;
    letter-spacing: -0.05em;
  }

  .home-intro h1 em {
    display: inline;
  }

  .home-intro h1 em::after {
    bottom: -3px;
    height: 5px;
  }

  .home-copy,
  .pill-row,
  .shelf-note,
  .intro-hint {
    display: none;
  }

  .intro-actions {
    margin: 14px 0 4px;
  }

  .primary-button {
    min-height: 46px;
    min-width: 150px;
    font-size: 14px;
  }

  .shelf {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .game-card {
    min-height: 146px;
    padding: 11px;
  }

  .card-token {
    width: 46px;
    height: 46px;
    font-size: 23px;
    border-radius: 14px;
  }

  .card-name {
    font-size: 15px;
  }

  .card-desc {
    font-size: 11px;
  }
}

@media (max-width: 620px) {
  .shelf {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .game-card {
    min-height: 142px;
    padding: 11px;
    gap: 6px;
  }

  .card-token {
    width: 42px;
    height: 42px;
    font-size: 21px;
    border-radius: 13px;
  }

  .card-name {
    font-size: 14.5px;
  }

  .card-desc {
    -webkit-line-clamp: 1;
  }

  .card-foot {
    font-size: 10px;
  }
}

@media (max-width: 380px) {
  .shelf {
    grid-template-columns: minmax(0, 1fr);
  }

  .game-card {
    min-height: 112px;
  }

  .card-desc {
    -webkit-line-clamp: 2;
  }
}
</style>
