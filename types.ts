export type ItemType = 'yuzu' | 'cat' | 'rain';

export interface GameItem {
  id: number;
  x: number;
  y: number;
  type: ItemType;
  speed: number;
  rotation: number;
  rotationSpeed: number;
}

export interface GameState {
  score: number;
  lives: number;
  isPlaying: boolean;
  isGameOver: boolean;
  highScore: number;
}

export enum GameDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}