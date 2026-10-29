import React, { useState } from 'react';
import {
  Achievement,
  Difficulty,
  GameSettings,
  LevelProgress,
  PlayerStats,
} from '../types/game';
import { soundEngine } from '../utils/audio';
import {
  Check,
  Code2,
  Copy,
  Download,
  Home,
  Lock,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface VictoryModalProps {
  levelNumber: number;
  isDaily?: boolean;
  difficulty: Difficulty;
  elapsedSeconds: number;
  stars: number;
  score: number;
  earnedBonusHint: boolean;
  onNextLevel: () => void;
  onRetry: () => void;
  onHome: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  levelNumber,
  isDaily,
  difficulty,
  elapsedSeconds,
  stars,
  score,
  earnedBonusHint,
  onNextLevel,
  onRetry,
  onHome,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-5 bg-[#4A3423]/25 animate-fadeIn">
      <div className="w-full max-w-[350px] rounded-3xl bg-[#FDFBF7] border border-[#79563C]/15 shadow-xl p-6 text-center">
        <p className="text-xs font-medium tracking-widest uppercase text-[#79563C]/70 mb-1">
          {isDaily ? 'Daily Challenge Complete' : `Level ${levelNumber} Complete`}
        </p>
        <h2 className="font-display text-3xl font-semibold text-[#4A3423] mb-4">
          Serene Flow
        </h2>

        {/* Three Animated Stars */}
        <div className="flex items-center justify-center gap-3 my-4">
          {[1, 2, 3].map((idx) => {
            const earned = idx <= stars;
            return (
              <div
                key={idx}
                className={`transition-transform duration-300 ${
                  idx === 2 ? '-translate-y-1.5 scale-110' : ''
                }`}
              >
                <Star
                  className={`w-9 h-9 ${
                    earned
                      ? 'text-[#D4A359] fill-[#D4A359] drop-shadow-sm'
                      : 'text-[#79563C]/20 fill-[#79563C]/10'
                  }`}
                  strokeWidth={1.6}
                />
              </div>
            );
          })}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 my-5 p-4 rounded-2xl bg-[#F8F3E9] border border-[#79563C]/10">
          <div className="text-left">
            <span className="block text-[11px] text-[#79563C]/70">Time</span>
            <span className="font-mono-num text-lg font-semibold text-[#4A3423]">
              {elapsedSeconds.toFixed(1)}s
            </span>
          </div>
          <div className="text-left">
            <span className="block text-[11px] text-[#79563C]/70">Difficulty</span>
            <span className="text-sm font-semibold text-[#4A3423]">{difficulty}</span>
          </div>
          <div className="text-left pt-2 border-t border-[#79563C]/10">
            <span className="block text-[11px] text-[#79563C]/70">Score</span>
            <span className="font-mono-num text-lg font-semibold text-[#4A3423]">
              {score.toLocaleString()}
            </span>
          </div>
          <div className="text-left pt-2 border-t border-[#79563C]/10">
            <span className="block text-[11px] text-[#79563C]/70">Puzzle</span>
            <span className="font-mono-num text-sm font-semibold text-[#4A3423]">
              {isDaily ? 'Daily' : `#${levelNumber}`}
            </span>
          </div>
        </div>

        {earnedBonusHint && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#79563C] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A359]" />
            <span>+1 Free Hint earned from daily goal</span>
          </div>
        )}

        {/* Primary Next Level Button */}
        <button
          onClick={() => {
            soundEngine.playButtonTap();
            onNextLevel();
          }}
          className="w-full py-3.5 px-5 rounded-2xl bg-[#79563C] hover:bg-[#664730] active:scale-[0.98] text-[#FDFBF7] font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm mb-2.5 cursor-pointer whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isDaily ? 'Play Classic Levels' : 'Next Level'}</span>
        </button>

        {/* Secondary Retry & Home Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              soundEngine.playButtonTap();
              onRetry();
            }}
            className="py-2.5 px-4 rounded-xl bg-[#F8F3E9] hover:bg-[#EFE7D6] active:scale-[0.98] text-[#4A3423] text-xs font-medium flex items-center justify-center gap-1.5 border border-[#79563C]/15 transition-all cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playButtonTap();
              onHome();
            }}
            className="py-2.5 px-4 rounded-xl bg-[#F8F3E9] hover:bg-[#EFE7D6] active:scale-[0.98] text-[#4A3423] text-xs font-medium flex items-center justify-center gap-1.5 border border-[#79563C]/15 transition-all cursor-pointer whitespace-nowrap"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-5 bg-[#4A3423]/25">
      <div className="w-full max-w-[350px] rounded-3xl bg-[#FDFBF7] border border-[#79563C]/15 shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-semibold text-[#4A3423]">Settings</h2>
          <button
            onClick={() => {
              soundEngine.playButtonTap();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#F8F3E9] hover:bg-[#EFE7D6] flex items-center justify-center text-[#79563C] transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Sound Effects Toggle & Volume */}
          <div className="p-3.5 rounded-2xl bg-[#F8F3E9] border border-[#79563C]/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#79563C]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#79563C]/50" />
                )}
                <span className="text-sm font-medium text-[#4A3423]">Sound Effects</span>
              </div>
              <button
                onClick={() => {
                  const next = { ...settings, soundEnabled: !settings.soundEnabled };
                  onUpdateSettings(next);
                  soundEngine.playButtonTap();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-[#79563C] text-[#FDFBF7]'
                    : 'bg-[#79563C]/15 text-[#79563C]'
                }`}
              >
                {settings.soundEnabled ? 'On' : 'Muted'}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              disabled={!settings.soundEnabled}
              onChange={(e) =>
                onUpdateSettings({ ...settings, sfxVolume: parseFloat(e.target.value) })
              }
              className="w-full accent-[#79563C] h-1.5 bg-[#79563C]/20 rounded-lg cursor-pointer"
              aria-label="Sound Effects Volume"
            />
          </div>

          {/* Ambient Music Toggle & Volume */}
          <div className="p-3.5 rounded-2xl bg-[#F8F3E9] border border-[#79563C]/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#4A3423]">Ambient Music</span>
              <button
                onClick={() => {
                  const next = { ...settings, musicEnabled: !settings.musicEnabled };
                  onUpdateSettings(next);
                  soundEngine.playButtonTap();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  settings.musicEnabled
                    ? 'bg-[#79563C] text-[#FDFBF7]'
                    : 'bg-[#79563C]/15 text-[#79563C]'
                }`}
              >
                {settings.musicEnabled ? 'On' : 'Muted'}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              disabled={!settings.musicEnabled}
              onChange={(e) =>
                onUpdateSettings({ ...settings, musicVolume: parseFloat(e.target.value) })
              }
              className="w-full accent-[#79563C] h-1.5 bg-[#79563C]/20 rounded-lg cursor-pointer"
              aria-label="Ambient Music Volume"
            />
          </div>

          {/* Haptic Feedback */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F3E9] border border-[#79563C]/10">
            <div>
              <span className="block text-sm font-medium text-[#4A3423]">Haptic Feedback</span>
              <span className="text-[11px] text-[#79563C]/70">Subtle vibration on touch</span>
            </div>
            <button
              onClick={() => {
                const next = { ...settings, hapticsEnabled: !settings.hapticsEnabled };
                onUpdateSettings(next);
                soundEngine.playButtonTap();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                settings.hapticsEnabled
                  ? 'bg-[#79563C] text-[#FDFBF7]'
                  : 'bg-[#79563C]/15 text-[#79563C]'
              }`}
            >
              {settings.hapticsEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Reset Saved Progress */}
          <div className="pt-2">
            {!confirmReset ? (
              <button
                onClick={() => {
                  soundEngine.playButtonTap();
                  setConfirmReset(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-[#79563C]/80 hover:text-[#4A3423] hover:bg-[#F8F3E9] transition-colors cursor-pointer"
              >
                Reset Saved Progress
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#9E3B33] text-white text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  Confirm Reset
                </button>
                <button
                  onClick={() => {
                    soundEngine.playButtonTap();
                    setConfirmReset(false);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#F8F3E9] text-[#4A3423] text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            soundEngine.playButtonTap();
            onClose();
          }}
          className="mt-5 w-full py-3 rounded-2xl bg-[#79563C] text-[#FDFBF7] text-sm font-medium hover:bg-[#664730] transition-colors cursor-pointer"
        >
          Resume
        </button>
      </div>
    </div>
  );
};

interface LevelSelectModalProps {
  progressMap: Record<number, LevelProgress>;
  currentLevel: number;
  onSelectLevel: (levelNumber: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  progressMap,
  currentLevel,
  onSelectLevel,
  onClose,
}) => {
  const tiers: { label: Difficulty; start: number; end: number }[] = [
    { label: 'Easy', start: 1, end: 50 },
    { label: 'Normal', start: 51, end: 100 },
    { label: 'Hard', start: 101, end: 150 },
    { label: 'Expert', start: 151, end: 200 },
  ];

  const initialTier =
    tiers.find((t) => currentLevel >= t.start && currentLevel <= t.end)?.label || 'Easy';
  const [activeTier, setActiveTier] = useState<Difficulty>(initialTier);

  const currentRange = tiers.find((t) => t.label === activeTier)!;
  const levels = Array.from(
    { length: currentRange.end - currentRange.start + 1 },
    (_, i) => currentRange.start + i
  );

  // Highest unlocked level in each difficulty tier (first 3 levels of every tier are always unlocked so players can sample any difficulty!)
  const highestCompleted = Math.max(
    0,
    ...Object.values(progressMap)
      .filter((p) => p.completed)
      .map((p) => p.levelNumber)
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#4A3423]/25">
      <div className="w-full max-w-[380px] max-h-[84vh] flex flex-col rounded-3xl bg-[#FDFBF7] border border-[#79563C]/15 shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#4A3423]">Select Level</h2>
            <p className="text-xs text-[#79563C]/70">
              200 handcrafted & seeded labyrinth puzzles
            </p>
          </div>
          <button
            onClick={() => {
              soundEngine.playButtonTap();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#F8F3E9] hover:bg-[#EFE7D6] flex items-center justify-center text-[#79563C] cursor-pointer"
            aria-label="Close level selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Difficulty Segmented Filter Control */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#F8F3E9] border border-[#79563C]/10 mb-4">
          {tiers.map((t) => (
            <button
              key={t.label}
              onClick={() => {
                soundEngine.playButtonTap();
                setActiveTier(t.label);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTier === t.label
                  ? 'bg-[#79563C] text-[#FDFBF7] shadow-xs'
                  : 'text-[#79563C] hover:text-[#4A3423]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-5 gap-2.5 overflow-y-auto custom-scroll pr-1 py-1">
          {levels.map((lvl) => {
            const prog = progressMap[lvl];
            const isTierStarter = lvl <= currentRange.start + 2;
            const isUnlocked =
              isTierStarter ||
              lvl <= highestCompleted + 1 ||
              Boolean(prog?.completed) ||
              Boolean(progressMap[lvl - 1]?.completed);

            return (
              <button
                key={lvl}
                disabled={!isUnlocked}
                onClick={() => {
                  soundEngine.playButtonTap();
                  onSelectLevel(lvl);
                }}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all ${
                  lvl === currentLevel
                    ? 'bg-[#79563C] text-[#FDFBF7] border-[#79563C] shadow-xs cursor-pointer'
                    : isUnlocked
                    ? 'bg-[#F8F3E9] hover:bg-[#EFE7D6] text-[#4A3423] border-[#79563C]/15 cursor-pointer'
                    : 'bg-[#F8F3E9]/50 text-[#79563C]/35 border-[#79563C]/5 cursor-not-allowed'
                }`}
              >
                {isUnlocked ? (
                  <>
                    <span className="font-mono-num text-sm font-semibold">{lvl}</span>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3].map((s) => (
                        <span
                          key={s}
                          className={`w-1.5 h-1.5 rounded-full ${
                            prog && prog.stars >= s
                              ? lvl === currentLevel
                                ? 'bg-[#F8F3E9]'
                                : 'bg-[#D4A359]'
                              : lvl === currentLevel
                              ? 'bg-[#FDFBF7]/30'
                              : 'bg-[#79563C]/20'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <Lock className="w-3.5 h-3.5 opacity-45" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface StatsAchievementsModalProps {
  stats: PlayerStats;
  achievements: Achievement[];
  onOpenEngineExport: () => void;
  onClose: () => void;
}

export const StatsAchievementsModal: React.FC<StatsAchievementsModalProps> = ({
  stats,
  achievements,
  onOpenEngineExport,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#4A3423]/25">
      <div className="w-full max-w-[380px] max-h-[85vh] flex flex-col rounded-3xl bg-[#FDFBF7] border border-[#79563C]/15 shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-semibold text-[#4A3423]">
            Journey & Milestones
          </h2>
          <button
            onClick={() => {
              soundEngine.playButtonTap();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#F8F3E9] hover:bg-[#EFE7D6] flex items-center justify-center text-[#79563C] cursor-pointer"
            aria-label="Close achievements"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-[#F8F3E9] border border-[#79563C]/10 mb-4 text-center">
          <div>
            <span className="block font-mono-num text-lg font-semibold text-[#4A3423]">
              {stats.totalCompleted}
            </span>
            <span className="text-[11px] text-[#79563C]/75">Solved</span>
          </div>
          <div className="border-x border-[#79563C]/10">
            <span className="block font-mono-num text-lg font-semibold text-[#4A3423]">
              {stats.totalStars}
            </span>
            <span className="text-[11px] text-[#79563C]/75">Total Stars</span>
          </div>
          <div>
            <span className="block font-mono-num text-lg font-semibold text-[#4A3423]">
              {stats.currentStreak}d
            </span>
            <span className="text-[11px] text-[#79563C]/75">Daily Streak</span>
          </div>
        </div>

        {/* Achievements List */}
        <div className="space-y-2.5 overflow-y-auto custom-scroll pr-1 flex-1">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                ach.unlocked
                  ? 'bg-[#F8F3E9] border-[#D4A359]/40'
                  : 'bg-[#F8F3E9]/50 border-[#79563C]/10 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#4A3423]">{ach.title}</span>
                  {ach.unlocked && (
                    <span className="text-[11px] text-[#B67D38] font-medium">Unlocked</span>
                  )}
                </div>
                <p className="text-xs text-[#79563C]/80 mt-0.5">{ach.description}</p>
              </div>
              <span className="font-mono-num text-xs font-medium text-[#79563C] shrink-0">
                {ach.progressText}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            soundEngine.playButtonTap();
            onOpenEngineExport();
          }}
          className="mt-4 w-full py-2.5 px-4 rounded-xl bg-[#F8F3E9] hover:bg-[#EFE7D6] text-[#79563C] text-xs font-medium flex items-center justify-center gap-2 border border-[#79563C]/15 transition-colors cursor-pointer"
        >
          <Code2 className="w-4 h-4" />
          <span>Unity C# / Godot GDScript & Android APK Guide</span>
        </button>
      </div>
    </div>
  );
};

interface EngineExportModalProps {
  onClose: () => void;
}

const UNITY_CSHARP_CODE = `// FlowMazeController.cs — Unity (C#) Modular Maze & Touch Path Controller
using System.Collections.Generic;
using UnityEngine;

public class FlowMazeController : MonoBehaviour
{
    [Header("Visual Theme (#F8F3E9 & #79563C)")]
    public Color backgroundColor = new Color(0.973f, 0.953f, 0.914f);
    public Color wallColor = new Color(0.475f, 0.337f, 0.235f);
    public LineRenderer pathRenderer;
    public Transform markerTransform;

    private List<Vector2Int> tracedPath = new List<Vector2Int>();
    private Vector2Int goalCell;
    private float cellSize = 1.0f;

    public void InitializeLevel(int rows, int cols, Vector2Int start, Vector2Int goal)
    {
        Camera.main.backgroundColor = backgroundColor;
        tracedPath.Clear();
        tracedPath.Add(start);
        goalCell = goal;
        UpdateVisualPath();
    }

    void Update()
    {
        if (Input.GetMouseButton(0))
        {
            Vector3 worldPt = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            Vector2Int targetCell = WorldToGrid(worldPt);
            TryStepToCell(targetCell);
        }
    }

    private void TryStepToCell(Vector2Int next)
    {
        Vector2Int head = tracedPath[tracedPath.Count - 1];
        if (next == head) return;

        // Backtrack support
        if (tracedPath.Count > 1 && tracedPath[tracedPath.Count - 2] == next)
        {
            tracedPath.RemoveAt(tracedPath.Count - 1);
            UpdateVisualPath();
            return;
        }

        if (ManhattanDistance(head, next) == 1 && IsPassageOpen(head, next))
        {
            tracedPath.Add(next);
            UpdateVisualPath();
            if (next == goalCell) OnLevelSolved();
        }
    }

    private int ManhattanDistance(Vector2Int a, Vector2Int b) =>
        Mathf.Abs(a.x - b.x) + Mathf.Abs(a.y - b.y);

    private bool IsPassageOpen(Vector2Int a, Vector2Int b) => true; // Hook to MazeGrid wall bitmask
    private Vector2Int WorldToGrid(Vector3 p) => new Vector2Int(Mathf.RoundToInt(p.x / cellSize), Mathf.RoundToInt(p.y / cellSize));

    private void UpdateVisualPath()
    {
        pathRenderer.positionCount = tracedPath.Count;
        for (int i = 0; i < tracedPath.Count; i++)
            pathRenderer.SetPosition(i, new Vector3(tracedPath[i].x * cellSize, tracedPath[i].y * cellSize, 0));
    }

    private void OnLevelSolved()
    {
        PlayerPrefs.SetInt("SolvedLevel", PlayerPrefs.GetInt("SolvedLevel", 1) + 1);
        PlayerPrefs.Save();
    }
}`;

const GODOT_GDSCRIPT_CODE = `# flow_maze.gd — Godot 4.x (GDScript) Minimalist Maze Renderer & Touch Controller
extends Node2D

const COLOR_BG := Color("#F8F3E9")
const COLOR_WALL := Color("#79563C")
const COLOR_GLOW := Color("#D4A359")

var rows: int = 8
var cols: int = 8
var cell_size: float = 48.0
var path: Array[Vector2i] = []
var start_cell := Vector2i(0, 0)
var goal_cell := Vector2i(7, 7)
var draw_progress: float = 0.0

func _ready() -> void:
    RenderingServer.set_default_clear_color(COLOR_BG)
    path = [start_cell]
    var tween := create_tween().set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
    tween.tween_property(self, "draw_progress", 1.0, 0.65)

func _process(_delta: float) -> void:
    queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventScreenDrag or (event is InputEventMouseMotion and event.button_mask & MOUSE_BUTTON_MASK_LEFT):
        var grid_pos := Vector2i((event.position / cell_size).floor())
        _try_step(grid_pos)

func _try_step(next: Vector2i) -> void:
    var head: Vector2i = path.back()
    if next == head:
        return
    if path.size() > 1 and path[path.size() - 2] == next:
        path.pop_back()
        return
    if abs(next.x - head.x) + abs(next.y - head.y) == 1:
        path.append(next)
        if next == goal_cell:
            _save_progress()

func _draw() -> void:
    var pts := PackedVector2Array()
    for cell in path:
        pts.append((Vector2(cell) + Vector2(0.5, 0.5)) * cell_size)
    if pts.size() >= 2:
        draw_polyline(pts, COLOR_GLOW, 10.0, true)
        draw_polyline(pts, COLOR_WALL, 5.0, true)

func _save_progress() -> void:
    var cfg := ConfigFile.new()
    cfg.set_value("progress", "completed", true)
    cfg.save("user://flow_maze_save.cfg")`;

export const EngineExportModal: React.FC<EngineExportModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'apk' | 'godot' | 'unity'>('apk');
  const [copied, setCopied] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A3423]/30">
      <div className="w-full max-w-[440px] max-h-[86vh] flex flex-col rounded-3xl bg-[#FDFBF7] border border-[#79563C]/15 shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#4A3423]">
              Android APK & Install
            </h2>
            <p className="text-xs text-[#79563C]/75">
              Download the Android APK build kit or install directly on mobile
            </p>
          </div>
          <button
            onClick={() => {
              soundEngine.playButtonTap();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#F8F3E9] hover:bg-[#EFE7D6] flex items-center justify-center text-[#79563C] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Download & Install Action Buttons */}
        <div className="flex flex-col gap-2 mb-3">
          <a
            href="/FlowMaze-Android-APK-Kit.zip"
            download="FlowMaze-Android-APK-Kit.zip"
            onClick={() => soundEngine.playButtonTap()}
            className="w-full py-3 px-4 rounded-2xl bg-[#79563C] hover:bg-[#664730] active:scale-[0.98] text-[#FDFBF7] text-xs font-medium flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Download Android APK Project Kit (.zip)</span>
          </a>

          {isInstallable && !isInstalled && (
            <button
              onClick={() => {
                soundEngine.playButtonTap();
                install();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#D4A359]/20 hover:bg-[#D4A359]/30 border border-[#D4A359]/50 text-[#4A3423] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4 text-[#B67D38]" />
              <span>Install App Now (Android WebAPK)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F8F3E9] border border-[#79563C]/10 mb-3">
          <button
            onClick={() => setTab('apk')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
              tab === 'apk' ? 'bg-[#79563C] text-[#FDFBF7]' : 'text-[#79563C]'
            }`}
          >
            Android APK
          </button>
          <button
            onClick={() => setTab('godot')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
              tab === 'godot' ? 'bg-[#79563C] text-[#FDFBF7]' : 'text-[#79563C]'
            }`}
          >
            Godot GDScript
          </button>
          <button
            onClick={() => setTab('unity')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
              tab === 'unity' ? 'bg-[#79563C] text-[#FDFBF7]' : 'text-[#79563C]'
            }`}
          >
            Unity C#
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll rounded-2xl bg-[#F8F3E9] border border-[#79563C]/15 p-3.5 text-xs text-[#4A3423]">
          {tab === 'apk' && (
            <div className="space-y-3 leading-relaxed">
              <div>
                <h3 className="font-semibold text-[#4A3423] mb-1">
                  1. Instant Android WebAPK (No PC Required)
                </h3>
                <p className="text-[#79563C]">
                  Open this game in <strong>Chrome on Android</strong> and tap{' '}
                  <strong>Install App</strong> (or Chrome Menu ⋮ → <strong>Install app</strong>).
                  Android compiles and installs a standalone native WebAPK with full offline
                  support, 9:16 portrait lock, and haptic feedback.
                  {isIOS && ' On iPhone/iPad: tap Share in Safari → Add to Home Screen.'}
                </p>
              </div>
              <div className="pt-2 border-t border-[#79563C]/10">
                <h3 className="font-semibold text-[#4A3423] mb-1">
                  2. One-Command Standalone .apk Build (Included in .zip)
                </h3>
                <p className="text-[#79563C] mb-1.5">
                  Unzip <code className="font-mono-num bg-[#FDFBF7] px-1 rounded">FlowMaze-Android-APK-Kit.zip</code> into your project folder and run:
                </p>
                <pre className="font-mono-num text-[11px] bg-[#FDFBF7] p-2.5 rounded-xl border border-[#79563C]/10 overflow-x-auto">
{`chmod +x build-android-apk.sh
./build-android-apk.sh
# Outputs: android/app/build/outputs/apk/debug/app-debug.apk`}
                </pre>
              </div>
              <div className="pt-2 border-t border-[#79563C]/10">
                <h3 className="font-semibold text-[#4A3423] mb-1">
                  3. Cloud APK Build via GitHub Actions (Included in .zip)
                </h3>
                <p className="text-[#79563C]">
                  The kit includes <code className="font-mono-num bg-[#FDFBF7] px-1 rounded">.github/workflows/build-apk.yml</code>. Push to any GitHub repository and GitHub Actions automatically compiles and uploads <code className="font-mono-num bg-[#FDFBF7] px-1 rounded">FlowMaze-Android-APK</code> (`app-debug.apk`) under the Actions tab—no local Android SDK installation needed.
                </p>
              </div>
            </div>
          )}

          {tab === 'godot' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[#79563C]">flow_maze.gd (Godot 4.3+)</span>
                <button
                  onClick={() => handleCopy(GODOT_GDSCRIPT_CODE)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDFBF7] border border-[#79563C]/15 text-[11px] font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="font-mono-num text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
                {GODOT_GDSCRIPT_CODE}
              </pre>
            </div>
          )}

          {tab === 'unity' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[#79563C]">FlowMazeController.cs (Unity)</span>
                <button
                  onClick={() => handleCopy(UNITY_CSHARP_CODE)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDFBF7] border border-[#79563C]/15 text-[11px] font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="font-mono-num text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
                {UNITY_CSHARP_CODE}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
