# 单机游戏大厅

一个完全离线的单机 Web 游戏大厅，内置 8 款棋牌/休闲/合成游戏，基于 Vue 3 + TypeScript + Vite 构建。

**在线试玩**：[game.extra9705.top](https://game.extra9705.top/) —— 纯静态、可离线，手机打开也能玩。

## 特性

- 🎮 **纯前端、零后端**：构建产物不发起任何网络请求，可完全离线运行
- 🔗 **直链可用**：`/#/game/:id` 可直接打开、刷新，不需要服务器 rewrite
- 🧩 **单一渲染入口**：`id → 组件注册表`，新增游戏不需要改 `Game.vue`
- 🎛️ **统一控制栏**：重置 / 暂停 / 横屏，游戏组件按需暴露能力
- 🎨 **统一视觉**：GAME LAB 设计系统（暖纸底 + 珊瑚/苔绿 + 软 3D 按压），移动端 / 平板 / 桌面一致
- 🍉 **合成西瓜**：十关积分挑战、连击加分、本地最高纪录，参考 fruit-lab 实现
- 🕷️ **蜘蛛纸牌**：1/2/4 花色三档难度关卡，发牌、撤销、提示、最佳纪录，通关后可挑战下一关

## 快速开始

```bash
npm install

npm run dev        # 开发服务器（默认 5173）
npm run build      # 生产构建到 dist/
npm run preview    # 预览生产构建
npm run type-check # vue-tsc 类型检查
```

## 路由与直链

项目使用 **hash 路由**：

| 页面 | 地址 |
|------|------|
| 游戏大厅 | `/` |
| 某款游戏 | `/#/game/gomoku` |

- 任意静态托管都可直接打开/刷新游戏页，不需要配置 SPA fallback。
- 构建产物使用相对路径（`base: './'`），部署到子路径（如 `/repo/`）也能直接工作。
- 旧的 `/game/:id` 路径形式已不再支持，请使用 `#/game/:id`。
- 未知的 `:id` 会显示“未找到该游戏”并提供返回大厅按钮。

## 项目结构

```
game-platform/
├── src/
│   ├── games/
│   │   ├── config.json        # 游戏清单（大厅卡片：名称/图标/分类/人数）
│   │   ├── registry.ts        # id → 组件，唯一渲染入口
│   │   ├── fruit/             # 合成西瓜
│   │   ├── spider/            # 蜘蛛纸牌
│   │   ├── gomoku/            # 五子棋
│   │   ├── xiangqi/           # 中国象棋
│   │   ├── weiqi/             # 围棋
│   │   ├── minesweeper/       # 扫雷
│   │   ├── mahjong-match/     # 麻将对对碰
│   │   ├── doudizhu/          # 三人斗地主
│   │   ├── 2048/              # 历史遗留资源，未接入应用
│   │   └── wuziqi.html        # 历史遗留单页，未接入应用
│   ├── types/game.ts          # GameConfig / GameConfigItem 类型
│   ├── utils/gameCatalog.ts   # 读取静态配置（只读）
│   ├── store/games.ts         # Pinia：游戏清单状态
│   ├── views/Home.vue         # 大厅
│   ├── views/Game.vue         # 游戏页（按 id 渲染对应组件）
│   └── router/index.ts        # hash 路由
└── index.html
```

## 添加新游戏（3 步）

1. **写组件**：`src/games/xxx/XxxGame.vue`

   可选暴露统一控制面，接入顶部控制栏：

   ```ts
   defineExpose({
     reset: restart,       // 重置
     pause: () => {},      // 暂停
     resume: () => {}      // 继续
   })
   ```

2. **登记配置**：在 `src/games/config.json` 增加一项

   ```json
   {
     "id": "xxx",
     "name": "我的游戏",
     "icon": "🎲",
     "description": "一句话描述",
     "category": "休闲",
     "minPlayers": 1,
     "maxPlayers": 1
   }
   ```

3. **注册组件**：在 `src/games/registry.ts` 中 import 并登记

   ```ts
   import XxxGame from './xxx/XxxGame.vue'

   export const gameRegistry = {
     // ...
     xxx: { id: 'xxx', name: '我的游戏', component: XxxGame }
   }
   ```

完成。大厅卡片与 `/#/game/xxx` 直链会自动可用；若不支持暂停，给注册项加 `supportsPause: false` 即可隐藏暂停按钮。

## 已包含的游戏

| 游戏 | 类型 | 人数 | 说明 |
|------|------|------|------|
| 合成西瓜 | 休闲 | 1 | 十关积分挑战、连击加分、11 种水果合成，本地最高纪录 |
| 蜘蛛纸牌 | 纸牌 | 1 | 10 列 104 张牌，1/2/4 花色三档难度，收齐 8 组 K→A 同花顺通关 |
| 五子棋 | 策略 | 2 | 人人/人机（3 档难度），强制防御规则可切换 |
| 中国象棋 | 策略 | 2 | 完整走子规则、长将判负、困毙、自然限着 |
| 围棋 | 策略 | 2 | 劫争、提子、虚手、数子法终局 |
| 扫雷 | 益智 | 1 | 三档难度、首点保护、撤销、最佳记录 |
| 麻将对对碰 | 休闲 | 1 | 经典/金字塔布局、提示/洗牌、连击计分 |
| 三人斗地主 | 扑克 | 3 | 叫地主、牌型判定、倍数、提示 |

## 设计系统

界面统一为「GAME LAB」语言：暖纸底 + 珊瑚/苔绿、圆角面板、软 3D 按压按钮、实验室式英文小标签。
所有 token 与通用组件类集中在 `src/assets/styles/global.css`，游戏页共用 `Game.vue` 外壳（返回 / 标题 / 玩法说明）。

## 技术栈

- Vue 3（`<script setup>`）+ TypeScript
- Vite 5
- Pinia、Vue Router（hash 模式）
- Canvas 手绘棋盘/牌桌 + scoped CSS

Tailwind/PostCSS 仍保留在依赖中，但当前样式全部为组件内 scoped CSS，未启用 Tailwind 指令。

## 已知限制

- 高难度 AI（围棋 19×19、象棋深度 4）使用朴素的 Minimax + αβ，长考时可能明显卡顿。
- 扫雷在触屏设备上通过「插旗模式」标记，电脑也可右键插旗。
- 暂无自动化测试与 ESLint；`type-check` 可用。
- 页面以 390 / 834 / 1440 三档视口为验收基准，超窄屏（<340px）体验会明显变紧。
- 蜘蛛纸牌在 390 宽下 10 列牌面较小，横屏或平板/桌面体验更好。
- `src/games/2048/`、`src/games/wuziqi.html` 为历史遗留资源，未接入构建与路由。

## 部署

构建产物是纯静态的，`dist/` 丢到任何静态托管都能跑（`base: './'`，子路径和根域名都适用）。

仓库自带 `.github/workflows/pages.yml`：push 到 `main` 自动构建并发布到 GitHub Pages。
自定义域名 `game.extra9705.top` 由 `public/CNAME` 声明，首次部署后需要在
**Settings → Pages → Custom domain** 确认一次，并由 DNS 添加记录：

```
CNAME   game   ma1833577561.github.io
```

## 许可证

MIT License

