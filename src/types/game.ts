// 游戏配置项
export interface GameConfigItem {
  id: string;
  name: string;
  /** 大厅卡片图标：当前用 emoji，后续可换成图片路径 */
  icon: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  category?: string;
}

// 游戏配置文件
export interface GameConfig {
  version: string;
  games: GameConfigItem[];
}
