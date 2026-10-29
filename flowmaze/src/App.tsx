import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Compass,
  Download,
  Grid,
  Lightbulb,
  RotateCcw,
  Settings,
  Smartphone,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePWAInstall } from './hooks/usePWAInstall';
import { GameSettings, GameState, LevelProgress, PlayerStats } from './types/game';
import { generateMazePuzzle } from './utils/mazeGenerator';
import {
  computeAchievements,
  getTodayDateKey,
  loadPlayerStats,
  loadProgressMap,
  loadSettings,
  recordLevelCompletion,
  savePlayerStats,
  saveProgressMap,
  saveSettings,
} from './utils/storage';
import { soundEngine } from './utils/audio';
import { MazeCanvas } from './components/MazeCanvas';
import { TitleBackgroundCanvas } from './components/TitleBackgroundCanvas';
import {
  EngineExportModal,
  LevelSelectModal,
  SettingsModal,
  StatsAchievementsModal,
  VictoryModal,
} from './components/Modals';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [progressMap, setProgressMap] = useState<Record<number, LevelProgress>>(() =>
    loadProgressMap()
  );
  const [stats, setStats] = useState<PlayerStats>(() => loadPlayerStats());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Determine the next uncompleted level to resume from
  const highestCompletedLevel = useMemo(() => {
    const completedNums = Object.values(progressMap)
      .filter((p) => p.completed)
      .map((p) => p.levelNumber);
    return completedNums.length > 0 ? Math.max(...completedNums) : 0;
  }, [progressMap]);

  const [currentLevel, setCurrentLevel] = useState<number>(() =>
    Math.min(200, highestCompletedLevel + 1)
  );
  const [returnScreen, setReturnScreen] = useState<'TITLE' | 'PLAYING'>('TITLE');
  const [isDailyMode, setIsDailyMode] = useState<boolean>(false);
  const [hintRevealCount, setHintRevealCount] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [liveProgressRatio, setLiveProgressRatio] = useState<number>(0);
  const [victoryData, setVictoryData] = useState<{
    elapsedSeconds: number;
    stars: number;
    score: number;
    earnedBonusHint: boolean;
  } | null>(null);

  // Sync audio settings on mount & updates
  useEffect(() => {
    soundEngine.updateSettings(settings);
  }, [settings]);

  const todayDateKey = getTodayDateKey();

  // Generate current puzzle deterministically
  const currentPuzzle = useMemo(() => {
    if (isDailyMode) {
      return generateMazePuzzle(999, { isDaily: true, dailyDateKey: todayDateKey });
    }
    return generateMazePuzzle(currentLevel);
  }, [currentLevel, isDailyMode, todayDateKey]);

  const achievements = useMemo(
    () => computeAchievements(stats, progressMap),
    [stats, progressMap]
  );

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    soundEngine.updateSettings(next);
  }, []);

  const handleStartLevel = useCallback((levelNum: number, daily = false) => {
    soundEngine.unlockAudio();
    setIsDailyMode(daily);
    if (!daily) {
      setCurrentLevel(levelNum);
    }
    setHintRevealCount(0);
    setLiveProgressRatio(0);
    setVictoryData(null);
    setResetTrigger((prev) => prev + 1);
    setGameState('PLAYING');
  }, []);

  const handleUseHint = useCallback(() => {
    soundEngine.unlockAudio();
    if (gameState !== 'PLAYING') return;

    const totalSolutionSteps = currentPuzzle.solutionPath.length;
    if (hintRevealCount >= totalSolutionSteps) return;

    // First hint increment on a level deducts 1 hint if hintRevealCount === 0
    if (hintRevealCount === 0) {
      if (stats.hintsRemaining <= 0) {
        soundEngine.playButtonTap();
        return;
      }
      const nextStats: PlayerStats = {
        ...stats,
        hintsRemaining: stats.hintsRemaining - 1,
        hintsUsedTotal: stats.hintsUsedTotal + 1,
      };
      setStats(nextStats);
      savePlayerStats(nextStats);
    }

    soundEngine.playHintChime();
    const stepChunk = Math.max(4, Math.ceil(totalSolutionSteps * 0.45));
    setHintRevealCount((prev) => Math.min(totalSolutionSteps, prev + stepChunk));
  }, [gameState, currentPuzzle, hintRevealCount, stats]);

  const handleRetryLevel = useCallback(() => {
    soundEngine.playButtonTap();
    setLiveProgressRatio(0);
    setVictoryData(null);
    setResetTrigger((prev) => prev + 1);
    setGameState('PLAYING');
  }, []);

  const handleLevelComplete = useCallback(
    (elapsedSeconds: number, waypointsCollected: number) => {
      const par = currentPuzzle.parTimeSeconds;
      const totalWaypoints = currentPuzzle.waypoints.length;
      const allWaypointsFound = waypointsCollected >= totalWaypoints;

      let stars = 3;
      if (elapsedSeconds > par * 2.2) {
        stars = 1;
      } else if (elapsedSeconds > par * 1.35 || !allWaypointsFound) {
        stars = 2;
      }

      const baseScore = currentPuzzle.rows * currentPuzzle.cols * 25;
      const timeBonus = Math.max(0, Math.round((par * 2 - elapsedSeconds) * 35));
      const waypointBonus = waypointsCollected * 150;
      const score = baseScore + timeBonus + waypointBonus;

      soundEngine.playVictoryChime(stars);

      const {
        progressMap: nextProgress,
        stats: nextStats,
        earnedBonusHint,
      } = recordLevelCompletion(
        currentPuzzle.levelNumber,
        stars,
        elapsedSeconds,
        score,
        Boolean(currentPuzzle.isDaily)
      );

      setProgressMap(nextProgress);
      setStats(nextStats);
      setLiveProgressRatio(1);
      setVictoryData({
        elapsedSeconds,
        stars,
        score,
        earnedBonusHint,
      });
      setGameState('VICTORY');
    },
    [currentPuzzle]
  );

  const handleNextLevel = useCallback(() => {
    if (isDailyMode) {
      const resumeLvl = Math.min(200, highestCompletedLevel + 1);
      handleStartLevel(resumeLvl, false);
    } else {
      const nextLvl = Math.min(200, currentLevel + 1);
      handleStartLevel(nextLvl, false);
    }
  }, [isDailyMode, highestCompletedLevel, currentLevel, handleStartLevel]);

  const handleResetAllProgress = useCallback(() => {
    localStorage.clear();
    const freshProgress = {};
    const freshStats = loadPlayerStats();
    saveProgressMap(freshProgress);
    savePlayerStats(freshStats);
    setProgressMap(freshProgress);
    setStats(freshStats);
    setCurrentLevel(1);
    setHintRevealCount(0);
    setResetTrigger((prev) => prev + 1);
  }, []);

  // Keyboard shortcuts for shell navigation and gameplay actions
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundEngine.playButtonTap();
        setGameState((prev) => {
          if (prev === 'PLAYING') return 'PAUSED';
          if (prev === 'PAUSED' || prev === 'LEVEL_SELECT' || prev === 'STATS_ACHIEVEMENTS') {
            return 'PLAYING';
          }
          return prev;
        });
      } else if ((e.key === 'Enter' || e.key === ' ') && gameState === 'TITLE') {
        e.preventDefault();
        soundEngine.playButtonTap();
        const resumeLvl = Math.min(200, highestCompletedLevel + 1);
        handleStartLevel(resumeLvl, false);
      } else if ((e.key === 'Enter' || e.key === ' ') && gameState === 'VICTORY') {
        e.preventDefault();
        soundEngine.playButtonTap();
        handleNextLevel();
      } else if (e.key.toLowerCase() === 'h' && gameState === 'PLAYING') {
        e.preventDefault();
        handleUseHint();
      } else if (e.key.toLowerCase() === 'r' && gameState === 'PLAYING') {
        e.preventDefault();
        handleRetryLevel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    highestCompletedLevel,
    handleStartLevel,
    handleNextLevel,
    handleUseHint,
    handleRetryLevel,
  ]);

  // Progress milestones (3 subtle progress indicators below header)
  const indicatorStates = [
    liveProgressRatio >= 0.33,
    liveProgressRatio >= 0.66,
    liveProgressRatio >= 0.99,
  ];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex items-center justify-center select-none"
      style={{
        background:
          'radial-gradient(circle at 50% 25%, #FDFBF7 0%, #F8F3E9 65%, #EFE7D8 100%)',
      }}
    >
      {/* Portrait 9:16 Mobile Frame Container */}
      <div className="relative w-full h-full sm:h-[94vh] sm:max-h-[860px] sm:w-auto sm:aspect-[9/16] sm:rounded-[40px] bg-[#F8F3E9] sm:border sm:border-[#79563C]/15 sm:shadow-[0_24px_60px_rgba(74,52,35,0.10)] flex flex-col justify-between overflow-hidden">
        {/* ==================== TITLE SCREEN ==================== */}
        {(gameState === 'TITLE' ||
          (gameState !== 'PLAYING' &&
            gameState !== 'VICTORY' &&
            returnScreen === 'TITLE')) && (
          <div className="relative w-full h-full flex flex-col justify-between p-7 z-10">
            <TitleBackgroundCanvas />

            {/* Top Bar on Title Screen */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="text-xs text-[#79563C]/80 flex items-center gap-2 font-medium">
                <span className="font-mono-num">{stats.totalStars} ★</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">{stats.currentStreak}d Streak</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">
                  Goal {Math.min(stats.dailyGoalTarget, stats.dailyLevelsSolvedToday)}/
                  {stats.dailyGoalTarget}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = { ...settings, soundEnabled: !settings.soundEnabled };
                    handleUpdateSettings(next);
                    soundEngine.playButtonTap();
                  }}
                  className="w-10 h-10 rounded-full bg-[#FDFBF7]/90 hover:bg-[#FDFBF7] border border-[#79563C]/12 flex items-center justify-center text-[#79563C] transition-transform active:scale-95 cursor-pointer"
                  aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4 opacity-50" />
                  )}
                </button>
                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    setReturnScreen('TITLE');
                    setGameState('PAUSED');
                  }}
                  className="w-10 h-10 rounded-full bg-[#FDFBF7]/90 hover:bg-[#FDFBF7] border border-[#79563C]/12 flex items-center justify-center text-[#79563C] transition-transform active:scale-95 cursor-pointer"
                  aria-label="Open settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bespoke Inline SVG Title Lockup over Generous Negative Space */}
            <div className="relative z-10 my-auto flex flex-col items-center text-center py-6">
              <svg
                viewBox="0 0 120 72"
                className="w-24 h-16 mb-3 text-[#79563C]"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="18"
                  y="10"
                  width="84"
                  height="52"
                  rx="14"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeOpacity="0.3"
                />
                <path
                  d="M32 36 H52 V22 H74 V48 H88"
                  stroke="#D4A359"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M32 36 H52 V22 H74 V48 H88"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="32" cy="36" r="4" fill="currentColor" />
                <circle cx="88" cy="48" r="5" fill="#D4A359" stroke="currentColor" strokeWidth="2" />
              </svg>

              <h1 className="font-display text-5xl font-semibold tracking-tight text-[#4A3423]">
                Flow Maze
              </h1>
              <p className="text-xs tracking-[0.22em] uppercase text-[#79563C]/75 mt-1.5 font-medium">
                Minimalist Labyrinth Puzzle
              </p>
            </div>

            {/* Primary Start CTA & Secondary Navigation */}
            <div className="relative z-10 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  soundEngine.playButtonTap();
                  const nextLvl = Math.min(200, highestCompletedLevel + 1);
                  handleStartLevel(nextLvl, false);
                }}
                className="w-full py-4 px-6 rounded-2xl bg-[#79563C] hover:bg-[#664730] active:scale-[0.98] text-[#FDFBF7] font-medium text-base flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-5 h-5" />
                <span>
                  {highestCompletedLevel > 0
                    ? `Continue · Level ${Math.min(200, highestCompletedLevel + 1)}`
                    : 'Start Journey · Level 1'}
                </span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    handleStartLevel(999, true);
                  }}
                  className="py-3 px-3 rounded-2xl bg-[#FDFBF7]/90 hover:bg-[#FDFBF7] active:scale-[0.98] border border-[#79563C]/15 text-[#4A3423] text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4 text-[#B67D38]" />
                  <span>Daily Puzzle</span>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    setReturnScreen('TITLE');
                    setGameState('LEVEL_SELECT');
                  }}
                  className="py-3 px-3 rounded-2xl bg-[#FDFBF7]/90 hover:bg-[#FDFBF7] active:scale-[0.98] border border-[#79563C]/15 text-[#4A3423] text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Grid className="w-4 h-4 text-[#79563C]" />
                  <span>Levels (200)</span>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    setReturnScreen('TITLE');
                    setGameState('STATS_ACHIEVEMENTS');
                  }}
                  className="py-3 px-3 rounded-2xl bg-[#FDFBF7]/90 hover:bg-[#FDFBF7] active:scale-[0.98] border border-[#79563C]/15 text-[#4A3423] text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-4 h-4 text-[#79563C]" />
                  <span>Milestones</span>
                </button>
              </div>

              {/* Direct Android APK / WebAPK Install Bar */}
              <div className="flex items-center gap-2">
                {isInstallable && !isInstalled && (
                  <button
                    onClick={() => {
                      soundEngine.playButtonTap();
                      install();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#FDFBF7]/90 hover:bg-[#FDFBF7] border border-[#D4A359]/45 text-[#4A3423] text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#B67D38]" />
                    <span>Install Android App</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    setReturnScreen('TITLE');
                    setGameState('ENGINE_EXPORT');
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#FDFBF7]/90 hover:bg-[#FDFBF7] border border-[#79563C]/15 text-[#79563C] hover:text-[#4A3423] text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Get Android APK (.zip)</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-[#79563C]/65 pt-1 font-medium">
                Drag or WASD Move · H Hint · R Retry · Esc Pause
              </p>
            </div>
          </div>
        )}

        {/* ==================== MAIN GAME SCREEN ==================== */}
        {(gameState === 'PLAYING' ||
          gameState === 'VICTORY' ||
          (gameState !== 'TITLE' && returnScreen === 'PLAYING')) && (
          <div className="relative w-full h-full flex flex-col justify-between px-5 py-5">
            {/* Top Header: Back Button (Top-Left), Level Number (Top-Center), Hint & Settings (Top-Right) */}
            <header className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between">
                {/* Back Button in Top-Left Corner */}
                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    setGameState('TITLE');
                  }}
                  className="w-10 h-10 rounded-full bg-[#FDFBF7] hover:bg-[#EFE7D6] active:scale-95 border border-[#79563C]/12 flex items-center justify-center text-[#79563C] transition-all shadow-2xs cursor-pointer"
                  aria-label="Back to main menu"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Level Number at Top Center */}
                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    setReturnScreen('PLAYING');
                    setGameState('LEVEL_SELECT');
                  }}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <span className="font-display text-2xl font-semibold text-[#4A3423] leading-none group-hover:text-[#79563C] transition-colors">
                    {isDailyMode ? 'Daily Maze' : `Level ${currentPuzzle.levelNumber}`}
                  </span>
                  <span className="text-[11px] text-[#79563C]/70 mt-1 font-medium">
                    {currentPuzzle.difficulty} · {currentPuzzle.rows}×{currentPuzzle.cols}
                    {currentPuzzle.shape !== 'Classic' ? ` · ${currentPuzzle.shape}` : ''}
                  </span>
                </button>

                {/* Settings and Hint Icons in Top-Right Corner */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUseHint}
                    className="w-10 h-10 rounded-full bg-[#FDFBF7] hover:bg-[#EFE7D6] active:scale-95 border border-[#79563C]/12 flex items-center justify-center text-[#79563C] transition-all shadow-2xs cursor-pointer"
                    aria-label="Reveal path hint"
                    title="Hint (H)"
                  >
                    <Lightbulb className="w-4 h-4 text-[#B67D38]" />
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playButtonTap();
                      setReturnScreen('PLAYING');
                      setGameState('PAUSED');
                    }}
                    className="w-10 h-10 rounded-full bg-[#FDFBF7] hover:bg-[#EFE7D6] active:scale-95 border border-[#79563C]/12 flex items-center justify-center text-[#79563C] transition-all shadow-2xs cursor-pointer"
                    aria-label="Settings"
                    title="Settings (Esc)"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Three Small Progress Indicators Below the Header */}
              <div
                className="flex items-center justify-center gap-2.5 mt-3.5"
                aria-label="Path completion progress"
              >
                {indicatorStates.map((active, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      active
                        ? 'w-6 bg-[#79563C]'
                        : 'w-2.5 bg-[#79563C]/20'
                    }`}
                  />
                ))}
              </div>
            </header>

            {/* Centered Maze Playfield with Generous Breathing Space */}
            <main className="flex-1 w-full my-2 flex items-center justify-center overflow-hidden">
              <MazeCanvas
                puzzle={currentPuzzle}
                hintRevealCount={hintRevealCount}
                resetTrigger={resetTrigger}
                isPaused={gameState === 'PAUSED'}
                onProgressChange={(ratio) => setLiveProgressRatio(ratio)}
                onLevelComplete={handleLevelComplete}
              />
            </main>

            {/* Subtle Bottom Controls: Hint Button & Reset Path */}
            <footer className="w-full flex items-center justify-between px-1 pt-1">
              <button
                onClick={handleRetryLevel}
                className="py-2.5 px-4 rounded-2xl bg-[#FDFBF7] hover:bg-[#EFE7D6] active:scale-95 border border-[#79563C]/12 text-[#79563C] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Path</span>
              </button>

              <div className="text-[11px] text-[#79563C]/65 font-medium hidden sm:block">
                {currentPuzzle.waypoints.length > 0
                  ? 'Collect stars & reach the beacon'
                  : 'Guide the marker to the beacon'}
              </div>

              <button
                onClick={handleUseHint}
                disabled={stats.hintsRemaining <= 0 && hintRevealCount === 0}
                className={`py-2.5 px-4 rounded-2xl border text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  stats.hintsRemaining > 0 || hintRevealCount > 0
                    ? 'bg-[#FDFBF7] hover:bg-[#EFE7D6] active:scale-95 border-[#79563C]/12 text-[#4A3423] cursor-pointer'
                    : 'bg-[#FDFBF7]/50 border-[#79563C]/8 text-[#79563C]/40 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4A359]" />
                <span>Hint</span>
                <span className="font-mono-num text-[#79563C]/75">({stats.hintsRemaining})</span>
              </button>
            </footer>
          </div>
        )}

        {/* ==================== MODALS ==================== */}
        {gameState === 'VICTORY' && victoryData && (
          <VictoryModal
            levelNumber={currentPuzzle.levelNumber}
            isDaily={currentPuzzle.isDaily}
            difficulty={currentPuzzle.difficulty}
            elapsedSeconds={victoryData.elapsedSeconds}
            stars={victoryData.stars}
            score={victoryData.score}
            earnedBonusHint={victoryData.earnedBonusHint}
            onNextLevel={handleNextLevel}
            onRetry={handleRetryLevel}
            onHome={() => setGameState('TITLE')}
          />
        )}

        {gameState === 'PAUSED' && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetProgress={handleResetAllProgress}
            onClose={() => setGameState(victoryData ? 'VICTORY' : returnScreen)}
          />
        )}

        {gameState === 'LEVEL_SELECT' && (
          <LevelSelectModal
            progressMap={progressMap}
            currentLevel={currentLevel}
            onSelectLevel={(lvl) => handleStartLevel(lvl, false)}
            onClose={() => setGameState(returnScreen)}
          />
        )}

        {gameState === 'STATS_ACHIEVEMENTS' && (
          <StatsAchievementsModal
            stats={stats}
            achievements={achievements}
            onOpenEngineExport={() => setGameState('ENGINE_EXPORT')}
            onClose={() => setGameState(returnScreen)}
          />
        )}

        {gameState === 'ENGINE_EXPORT' && (
          <EngineExportModal onClose={() => setGameState(returnScreen)} />
        )}
      </div>
    </div>
  );
}
