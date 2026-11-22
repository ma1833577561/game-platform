<template>
  <div class="game-page">
    <header class="game-topbar">
      <button class="icon-button" type="button" aria-label="返回大厅" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>

      <router-link to="/" class="brand" aria-label="游戏研究所首页">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>游戏研究所</span>
        <span class="brand-en">/ GAME LAB</span>
      </router-link>

      <div class="topbar-title">
        <b>{{ gameName }}</b>
        <span>{{ categoryLabel }}</span>
      </div>

      <div class="topbar-spacer"></div>

      <button class="icon-button" type="button" aria-label="玩法说明" @click="showHelp = true">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1 .8-1 1.5v.3" />
          <path d="M12 16.5v.01" />
        </svg>
      </button>
    </header>

    <main class="game-layout" :class="{ 'has-wide-stage': entry?.stage === 'wide' }">
      <aside class="game-intro" aria-label="游戏说明">
        <div class="eyebrow">{{ categoryLabel }}</div>
        <h1>
          {{ gameName }}
          <em v-if="tagline">{{ tagline }}</em>
        </h1>
        <p v-if="description" class="game-intro-copy">{{ description }}</p>

        <div v-if="howTo.length" class="howto">
          <div class="section-label">HOW TO PLAY / 怎么玩</div>
          <ol>
            <li v-for="(line, index) in howTo" :key="index">
              <span aria-hidden="true">{{ index + 1 }}</span>
              {{ line }}
            </li>
          </ol>
        </div>
      </aside>

      <section class="game-stage" :class="{ 'is-narrow': entry?.stage === 'narrow' }" aria-label="游戏区域">
        <component :is="gameComponent" v-if="gameComponent" :key="gameId" />

        <div v-else class="game-error">
          <p>未找到该游戏：{{ gameId }}</p>
          <button class="primary-button" type="button" @click="goBack">返回大厅</button>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="showHelp" class="sheet-backdrop" @click.self="showHelp = false">
        <div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="howto-title">
          <div class="sheet-head">
            <div>
              <h2 id="howto-title">{{ gameName }} · 怎么玩</h2>
              <div class="sheet-sub">HOW TO PLAY</div>
            </div>
            <button class="icon-button" type="button" aria-label="关闭玩法说明" @click="showHelp = false">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div class="sheet-body">
            <p v-if="description">{{ description }}</p>
            <ol v-if="howTo.length" class="sheet-steps">
              <li v-for="(line, index) in howTo" :key="index">
                <span aria-hidden="true">{{ index + 1 }}</span>
                {{ line }}
              </li>
            </ol>
            <p class="sheet-tip">所有操作都支持触屏；电脑端也可以使用鼠标和键盘。</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '@/store/games';
import { getGameEntry } from '@/games/registry';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();

const showHelp = ref(false);

const gameId = computed(() => String(route.params.id ?? ''));
const entry = computed(() => getGameEntry(gameId.value));
const gameComponent = computed(() => entry.value?.component ?? null);
const tagline = computed(() => entry.value?.tagline ?? '');
const howTo = computed(() => entry.value?.howTo ?? []);

const configItem = computed(() =>
  gameStore.gameList.find(game => game.id === gameId.value)
);

const gameName = computed(() => configItem.value?.name ?? entry.value?.name ?? '游戏');
const categoryLabel = computed(() => configItem.value?.category ?? '单机小游戏');
const description = computed(() => configItem.value?.description ?? '');

// 直链/刷新进入时补齐清单，标题与分类才有正式名称
gameStore.loadGameList();

watchEffect(() => {
  document.title = `${gameName.value} · 游戏研究所`;
});

function goBack() {
  router.push('/');
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    showHelp.value = false;
  }
}

watch(showHelp, open => {
  if (open) {
    document.addEventListener('keydown', handleKeydown);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', handleKeydown);
    document.body.style.overflow = '';
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.game-stage.is-narrow {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

@media (min-width: 901px) {
  .game-layout.has-wide-stage {
    max-width: 1240px;
    grid-template-columns: minmax(0, 0.48fr) minmax(0, 1.52fr);
  }
}

.sheet-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.sheet-steps li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.sheet-steps li span {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--green-soft);
  border: 1px solid var(--green-line);
  color: var(--green-strong);
  font-size: 11px;
  font-weight: 900;
}

.sheet-tip {
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  color: var(--faint) !important;
  font-size: 12px !important;
}

.game-error {
  display: grid;
  place-items: center;
  gap: 16px;
  min-height: 320px;
  color: var(--muted);
  text-align: center;
}
</style>
