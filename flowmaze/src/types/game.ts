export type Difficulty = 'Easy' | 'Normal' | 'Hard' | 'Expert';

export type MazeShape = 'Classic' | 'Diamond' | 'Courtyard' | 'Cross' | 'Octagon';

export type GameState =
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'LEVEL_SELECT'
  | 'STATS_ACHIEVEMENTS'
  | 'ENGINE_EXPORT';

export interface CellCoord {
  r: number;
  c: number;
}

export interface MazeCell {
  r: number;
  c: number;
  active: boolean; // false if masked out by shape
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  drawOrder: number; // 0..1 normalized appearance timing
}

export interface PortalPair {
  id: number;
  a: CellCoord;
  b: CellCoord;
  color: string;
}

export interface MazePuzzle {
  levelNumber: number;
  isDaily?: boolean;
  dailyDateKey?: string;
  difficulty: Difficulty;
  shape: MazeShape;
  rows: number;
  cols: number;
  grid: MazeCell[][];
  start: CellCoord;
  goal: CellCoord;
  waypoints: CellCoord[]; // optional star checkpoints inside maze
  portals: PortalPair[];
  solutionPath: CellCoord[];
  wallSegments: WallSegment[];
  parTimeSeconds: number;
}

export interface LevelProgress {
  levelNumber: number;
  completed: boolean;
  stars: number; // 1..3
  bestTimeSeconds: number;
  bestScore: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
}

export interface PlayerStats {
  totalCompleted: number;
  totalStars: number;
  currentStreak: number;
  bestStreak: number;
  lastDailyCompletedDate: string | null;
  dailyGoalDate: string;
  dailyLevelsSolvedToday: number;
  dailyGoalTarget: number;
  hintsRemaining: number;
  hintsUsedTotal: number;
  fastestSolveSeconds: number | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
}
