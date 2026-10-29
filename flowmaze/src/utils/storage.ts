import {
  Achievement,
  GameSettings,
  LevelProgress,
  PlayerStats,
} from '../types/game';

const STORAGE_KEY_PROGRESS = 'flow_maze_progress_v1';
const STORAGE_KEY_SETTINGS = 'flow_maze_settings_v1';
const STORAGE_KEY_STATS = 'flow_maze_stats_v1';

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadProgressMap(): Record<number, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveProgressMap(map: Record<number, LevelProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(map));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadSettings(): GameSettings {
  const defaults: GameSettings = {
    soundEnabled: true,
    musicEnabled: true,
    hapticsEnabled: true,
    sfxVolume: 0.75,
    musicVolume: 0.45,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function loadPlayerStats(): PlayerStats {
  const today = getTodayDateKey();
  const defaults: PlayerStats = {
    totalCompleted: 0,
    totalStars: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastDailyCompletedDate: null,
    dailyGoalDate: today,
    dailyLevelsSolvedToday: 0,
    dailyGoalTarget: 3,
    hintsRemaining: 5,
    hintsUsedTotal: 0,
    fastestSolveSeconds: null,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (!raw) return defaults;
    const parsed: PlayerStats = { ...defaults, ...JSON.parse(raw) };
    // Reset daily goal counter if day changed
    if (parsed.dailyGoalDate !== today) {
      parsed.dailyGoalDate = today;
      parsed.dailyLevelsSolvedToday = 0;
    }
    return parsed;
  } catch {
    return defaults;
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch {
    // Ignore
  }
}

export function recordLevelCompletion(
  levelNumber: number,
  stars: number,
  timeSeconds: number,
  score: number,
  isDaily = false
): {
  progressMap: Record<number, LevelProgress>;
  stats: PlayerStats;
  earnedBonusHint: boolean;
} {
  const progressMap = loadProgressMap();
  const stats = loadPlayerStats();
  const today = getTodayDateKey();

  if (!isDaily) {
    const existing = progressMap[levelNumber];
    if (!existing) {
      progressMap[levelNumber] = {
        levelNumber,
        completed: true,
        stars,
        bestTimeSeconds: timeSeconds,
        bestScore: score,
      };
      stats.totalCompleted += 1;
      stats.totalStars += stars;
    } else {
      const starDiff = Math.max(0, stars - existing.stars);
      stats.totalStars += starDiff;
      progressMap[levelNumber] = {
        levelNumber,
        completed: true,
        stars: Math.max(existing.stars, stars),
        bestTimeSeconds: Math.min(existing.bestTimeSeconds, timeSeconds),
        bestScore: Math.max(existing.bestScore, score),
      };
    }
  }

  // Update fastest solve
  if (stats.fastestSolveSeconds === null || timeSeconds < stats.fastestSolveSeconds) {
    stats.fastestSolveSeconds = timeSeconds;
  }

  // Update daily goal & streak
  if (stats.dailyGoalDate !== today) {
    stats.dailyGoalDate = today;
    stats.dailyLevelsSolvedToday = 0;
  }
  stats.dailyLevelsSolvedToday += 1;

  let earnedBonusHint = false;
  if (stats.dailyLevelsSolvedToday === stats.dailyGoalTarget || isDaily) {
    stats.hintsRemaining += 1;
    earnedBonusHint = true;
  }

  if (stats.lastDailyCompletedDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (stats.lastDailyCompletedDate === yKey) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.lastDailyCompletedDate = today;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  }

  saveProgressMap(progressMap);
  savePlayerStats(stats);

  return { progressMap, stats, earnedBonusHint };
}

export function computeAchievements(stats: PlayerStats, progressMap: Record<number, LevelProgress>): Achievement[] {
  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;
  const threeStarCount = Object.values(progressMap).filter((p) => p.stars === 3).length;

  return [
    {
      id: 'first_flow',
      title: 'First Steps',
      description: 'Complete your very first maze puzzle.',
      unlocked: completedCount >= 1,
      progressText: `${Math.min(1, completedCount)} / 1`,
    },
    {
      id: 'calm_explorer',
      title: 'Calm Explorer',
      description: 'Solve 10 maze puzzles across any difficulty.',
      unlocked: completedCount >= 10,
      progressText: `${Math.min(10, completedCount)} / 10`,
    },
    {
      id: 'starlight_collector',
      title: 'Starlight Collector',
      description: 'Earn 3 stars on 15 different levels.',
      unlocked: threeStarCount >= 15,
      progressText: `${Math.min(15, threeStarCount)} / 15`,
    },
    {
      id: 'swift_mind',
      title: 'Swift Clarity',
      description: 'Solve a maze in under 6.0 seconds.',
      unlocked: stats.fastestSolveSeconds !== null && stats.fastestSolveSeconds < 6,
      progressText: stats.fastestSolveSeconds !== null ? `${stats.fastestSolveSeconds.toFixed(1)}s` : '—',
    },
    {
      id: 'daily_ritual',
      title: 'Daily Ritual',
      description: 'Reach your daily goal of 3 solved puzzles in a day.',
      unlocked: stats.dailyLevelsSolvedToday >= stats.dailyGoalTarget || stats.bestStreak >= 2,
      progressText: `${Math.min(stats.dailyGoalTarget, stats.dailyLevelsSolvedToday)} / ${stats.dailyGoalTarget}`,
    },
    {
      id: 'master_architect',
      title: 'Labyrinth Master',
      description: 'Accumulate 50 total stars across all levels.',
      unlocked: stats.totalStars >= 50,
      progressText: `${Math.min(50, stats.totalStars)} / 50`,
    },
  ];
}
