import React, { useEffect, useRef } from 'react';
import { CellCoord, MazePuzzle } from '../types/game';
import {
  areCoordsEqual,
  canMoveBetweenCells,
  findShortestPath,
  getAccessibleNeighbors,
} from '../utils/mazeGenerator';
import { soundEngine } from '../utils/audio';

interface MazeCanvasProps {
  puzzle: MazePuzzle;
  hintRevealCount: number; // how many steps of solution hint are visible
  resetTrigger: number;
  isPaused: boolean;
  onProgressChange: (progressRatio: number, waypointsCollected: number) => void;
  onLevelComplete: (elapsedSeconds: number, waypointsCollected: number) => void;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  isStar: boolean;
  rotation: number;
  vRot: number;
  color: string;
}

function drawStarPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  rotation = 0
) {
  let rot = (Math.PI / 2) * 3 + rotation;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius;
    let y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.closePath();
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  puzzle,
  hintRevealCount,
  resetTrigger,
  isPaused,
  onProgressChange,
  onLevelComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Refs for latest callbacks so the 60fps loop never restarts on parent state change
  const callbacksRef = useRef({ onProgressChange, onLevelComplete });
  useEffect(() => {
    callbacksRef.current = { onProgressChange, onLevelComplete };
  }, [onProgressChange, onLevelComplete]);

  const stateRef = useRef<{
    puzzle: MazePuzzle;
    path: CellCoord[];
    collectedWaypoints: Set<string>;
    wallDrawProgress: number; // 0..1
    visualHeadX: number; // in grid units (c + 0.5)
    visualHeadY: number; // in grid units (r + 0.5)
    headScaleX: number;
    headScaleY: number;
    hitstopTimer: number;
    boardShake: number;
    isDragging: boolean;
    pointerX: number;
    pointerY: number;
    completed: boolean;
    completionWave: number; // 0..1 wave along completed path
    elapsedSeconds: number;
    hintCount: number;
    heldKeys: Set<string>;
    keyMoveCooldown: number;
    particles: Particle[];
    layout: {
      cellSize: number;
      offsetX: number;
      offsetY: number;
      boardWidth: number;
      boardHeight: number;
    };
  }>({
    puzzle,
    path: [puzzle.start],
    collectedWaypoints: new Set<string>(),
    wallDrawProgress: 0,
    visualHeadX: puzzle.start.c + 0.5,
    visualHeadY: puzzle.start.r + 0.5,
    headScaleX: 1,
    headScaleY: 1,
    hitstopTimer: 0,
    boardShake: 0,
    isDragging: false,
    pointerX: 0,
    pointerY: 0,
    completed: false,
    completionWave: 0,
    elapsedSeconds: 0,
    hintCount: hintRevealCount,
    heldKeys: new Set<string>(),
    keyMoveCooldown: 0,
    particles: Array.from({ length: 65 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      alpha: 1,
      life: 0,
      maxLife: 1,
      isStar: false,
      rotation: 0,
      vRot: 0,
      color: '#D4A359',
    })),
    layout: {
      cellSize: 40,
      offsetX: 0,
      offsetY: 0,
      boardWidth: 0,
      boardHeight: 0,
    },
  });

  // Sync hint count into stateRef without resetting path
  useEffect(() => {
    stateRef.current.hintCount = hintRevealCount;
  }, [hintRevealCount]);

  // Reset when puzzle or resetTrigger changes
  useEffect(() => {
    const st = stateRef.current;
    st.puzzle = puzzle;
    st.path = [puzzle.start];
    st.collectedWaypoints = new Set<string>();
    st.wallDrawProgress = resetTrigger > 0 && st.puzzle === puzzle ? 1 : 0;
    st.visualHeadX = puzzle.start.c + 0.5;
    st.visualHeadY = puzzle.start.r + 0.5;
    st.headScaleX = 1;
    st.headScaleY = 1;
    st.hitstopTimer = 0;
    st.boardShake = 0;
    st.isDragging = false;
    st.completed = false;
    st.completionWave = 0;
    st.elapsedSeconds = 0;
    st.particles.forEach((p) => (p.active = false));
    callbacksRef.current.onProgressChange(0, 0);
  }, [puzzle, resetTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const spawnParticles = (cx: number, cy: number, count: number, includeStars: boolean) => {
      const palette = ['#D4A359', '#79563C', '#E6C280', '#C98A4B'];
      let spawned = 0;
      for (const p of stateRef.current.particles) {
        if (!p.active) {
          p.active = true;
          const angle = Math.random() * Math.PI * 2;
          const speed = 28 + Math.random() * 95;
          p.x = cx;
          p.y = cy;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - (includeStars ? 32 : 10);
          p.size = includeStars && spawned % 3 === 0 ? 7 + Math.random() * 4 : 2.5 + Math.random() * 3.5;
          p.isStar = includeStars && spawned % 3 === 0;
          p.life = 0;
          p.maxLife = 0.65 + Math.random() * 0.55;
          p.alpha = 1;
          p.rotation = Math.random() * Math.PI * 2;
          p.vRot = (Math.random() - 0.5) * 4;
          p.color = palette[spawned % palette.length];
          spawned++;
          if (spawned >= count) break;
        }
      }
    };

    const computeProgressAndNotify = () => {
      const st = stateRef.current;
      const head = st.path[st.path.length - 1];
      const remPath = findShortestPath(
        st.puzzle.grid,
        st.puzzle.rows,
        st.puzzle.cols,
        head,
        st.puzzle.goal,
        st.puzzle.portals
      );
      const totalLen = Math.max(1, st.puzzle.solutionPath.length - 1);
      const remLen = Math.max(0, remPath.length - 1);
      const ratio = Math.max(0, Math.min(1, 1 - remLen / totalLen));
      callbacksRef.current.onProgressChange(ratio, st.collectedWaypoints.size);
    };

    const stepToCell = (nextCell: CellCoord) => {
      const st = stateRef.current;
      if (st.completed) return;

      const currentHead = st.path[st.path.length - 1];
      if (areCoordsEqual(currentHead, nextCell)) return;

      // Check if backtracking to the immediately previous cell
      if (st.path.length >= 2 && areCoordsEqual(st.path[st.path.length - 2], nextCell)) {
        st.path.pop();
        soundEngine.playPathStep(st.path.length, true);
        computeProgressAndNotify();
        return;
      }

      // Check if nextCell is already earlier in the path (loop cut / rewind)
      const existingIdx = st.path.findIndex((c) => areCoordsEqual(c, nextCell));
      if (existingIdx !== -1 && canMoveBetweenCells(st.puzzle, currentHead, nextCell)) {
        st.path = st.path.slice(0, existingIdx + 1);
        soundEngine.playPathStep(st.path.length, true);
        computeProgressAndNotify();
        return;
      }

      // Validate forward step
      if (canMoveBetweenCells(st.puzzle, currentHead, nextCell)) {
        const dx = nextCell.c - currentHead.c;
        const dy = nextCell.r - currentHead.r;
        st.headScaleX = Math.abs(dx) > 0 ? 1.24 : 0.84;
        st.headScaleY = Math.abs(dy) > 0 ? 1.24 : 0.84;

        st.path.push(nextCell);
        soundEngine.playPathStep(st.path.length, false);

        // Check waypoint star collection
        for (const wp of st.puzzle.waypoints) {
          const key = `${wp.r},${wp.c}`;
          if (areCoordsEqual(wp, nextCell) && !st.collectedWaypoints.has(key)) {
            st.collectedWaypoints.add(key);
            soundEngine.playWaypointChime();
            const wx = st.layout.offsetX + (wp.c + 0.5) * st.layout.cellSize;
            const wy = st.layout.offsetY + (wp.r + 0.5) * st.layout.cellSize;
            spawnParticles(wx, wy, 14, true);
          }
        }

        computeProgressAndNotify();

        // Check victory condition!
        if (areCoordsEqual(nextCell, st.puzzle.goal)) {
          st.completed = true;
          st.isDragging = false;
          st.hitstopTimer = 0.055; // Brief 55ms impact pause
          st.boardShake = 3.5;
          st.headScaleX = 1.45;
          st.headScaleY = 1.45;

          const gx = st.layout.offsetX + (nextCell.c + 0.5) * st.layout.cellSize;
          const gy = st.layout.offsetY + (nextCell.r + 0.5) * st.layout.cellSize;
          spawnParticles(gx, gy, 32, true);

          const finalElapsed = st.elapsedSeconds;
          const finalWaypoints = st.collectedWaypoints.size;
          window.setTimeout(() => {
            callbacksRef.current.onLevelComplete(finalElapsed, finalWaypoints);
          }, 680);
        }
      }
    };

    // Smart pointer tracking with corridor corner-turning assist
    const handlePointerMoveToward = (clientX: number, clientY: number) => {
      const st = stateRef.current;
      if (st.completed || st.wallDrawProgress < 0.35) return;

      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      st.pointerX = px;
      st.pointerY = py;

      const { cellSize, offsetX, offsetY } = st.layout;
      if (cellSize <= 0) return;

      // Allow up to 3 cell steps per frame during fast swipes
      for (let stepIter = 0; stepIter < 3; stepIter++) {
        if (st.completed) break;
        const head = st.path[st.path.length - 1];
        const headCenterX = offsetX + (head.c + 0.5) * cellSize;
        const headCenterY = offsetY + (head.r + 0.5) * cellSize;

        const dx = px - headCenterX;
        const dy = py - headCenterY;
        const dist = Math.hypot(dx, dy);

        // Require moving at least 38% of a cell width from current cell center
        if (dist < cellSize * 0.38) break;

        const neighbors = getAccessibleNeighbors(st.puzzle, head);
        if (neighbors.length === 0) break;

        // Score each accessible neighbor by how well it aligns with the drag vector
        let bestNeighbor: CellCoord | null = null;
        let bestScore = -Infinity;

        for (const n of neighbors) {
          const ncx = offsetX + (n.c + 0.5) * cellSize;
          const ncy = offsetY + (n.r + 0.5) * cellSize;
          const vx = ncx - headCenterX;
          const vy = ncy - headCenterY;
          const vLen = Math.hypot(vx, vy) || 1;

          // Dot product projection along neighbor direction
          const projection = (dx * vx + dy * vy) / vLen;
          // Distance from pointer to neighbor center
          const distToNeighbor = Math.hypot(px - ncx, py - ncy);

          // If pointer is closer to this neighbor than to head, or strongly aligned
          if (projection > cellSize * 0.28 || distToNeighbor < dist * 0.88) {
            const score = projection - distToNeighbor * 0.35;
            if (score > bestScore) {
              bestScore = score;
              bestNeighbor = n;
            }
          }
        }

        if (bestNeighbor) {
          stepToCell(bestNeighbor);
        } else {
          break;
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      soundEngine.unlockAudio();
      const st = stateRef.current;
      if (st.completed) return;

      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const { cellSize, offsetX, offsetY } = st.layout;
      const col = Math.floor((px - offsetX) / cellSize);
      const row = Math.floor((py - offsetY) / cellSize);

      // If user taps an existing cell earlier in their traced path, smoothly rewind to it
      if (row >= 0 && row < st.puzzle.rows && col >= 0 && col < st.puzzle.cols) {
        const tappedCoord = { r: row, c: col };
        const idxInPath = st.path.findIndex((c) => areCoordsEqual(c, tappedCoord));
        if (idxInPath !== -1 && idxInPath < st.path.length - 1) {
          st.path = st.path.slice(0, idxInPath + 1);
          soundEngine.playPathStep(st.path.length, true);
          computeProgressAndNotify();
        }
      }

      st.isDragging = true;
      handlePointerMoveToward(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!stateRef.current.isDragging) return;
      handlePointerMoveToward(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      stateRef.current.isDragging = false;
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const dirMap: Record<string, { dr: number; dc: number }> = {
        arrowup: { dr: -1, dc: 0 },
        w: { dr: -1, dc: 0 },
        arrowdown: { dr: 1, dc: 0 },
        s: { dr: 1, dc: 0 },
        arrowleft: { dr: 0, dc: -1 },
        a: { dr: 0, dc: -1 },
        arrowright: { dr: 0, dc: 1 },
        d: { dr: 0, dc: 1 },
      };

      if (dirMap[key]) {
        e.preventDefault();
        soundEngine.unlockAudio();
        const st = stateRef.current;
        if (!st.heldKeys.has(key)) {
          st.heldKeys.add(key);
          // Immediate edge-triggered step
          const head = st.path[st.path.length - 1];
          const target = { r: head.r + dirMap[key].dr, c: head.c + dirMap[key].dc };
          stepToCell(target);
          st.keyMoveCooldown = 0.14;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.heldKeys.delete(e.key.toLowerCase());
    };

    const onWindowBlur = () => {
      stateRef.current.heldKeys.clear();
      stateRef.current.isDragging = false;
    };

    const updateLayout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const st = stateRef.current;
      const pad = 28;
      const availW = Math.max(120, rect.width - pad * 2);
      const availH = Math.max(120, rect.height - pad * 2);
      const cellSize = Math.floor(Math.min(availW / st.puzzle.cols, availH / st.puzzle.rows));
      const boardWidth = cellSize * st.puzzle.cols;
      const boardHeight = cellSize * st.puzzle.rows;
      const offsetX = Math.floor((rect.width - boardWidth) / 2);
      const offsetY = Math.floor((rect.height - boardHeight) / 2);

      st.layout = { cellSize, offsetX, offsetY, boardWidth, boardHeight };
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    let animId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const st = stateRef.current;
      updateLayout();

      if (!st.completed && st.wallDrawProgress >= 0.8) {
        st.elapsedSeconds += dt;
      }

      // Hitstop handling
      if (st.hitstopTimer > 0) {
        st.hitstopTimer = Math.max(0, st.hitstopTimer - dt);
      } else {
        // Wall entrance animation
        if (st.wallDrawProgress < 1) {
          st.wallDrawProgress = Math.min(1, st.wallDrawProgress + dt * 1.65);
        }

        // Continuous held keyboard movement
        if (st.heldKeys.size > 0 && !st.completed) {
          st.keyMoveCooldown -= dt;
          if (st.keyMoveCooldown <= 0) {
            const lastKey = Array.from(st.heldKeys).pop()!;
            const dirMap: Record<string, { dr: number; dc: number }> = {
              arrowup: { dr: -1, dc: 0 },
              w: { dr: -1, dc: 0 },
              arrowdown: { dr: 1, dc: 0 },
              s: { dr: 1, dc: 0 },
              arrowleft: { dr: 0, dc: -1 },
              a: { dr: 0, dc: -1 },
              arrowright: { dr: 0, dc: 1 },
              d: { dr: 0, dc: 1 },
            };
            if (dirMap[lastKey]) {
              const head = st.path[st.path.length - 1];
              stepToCell({ r: head.r + dirMap[lastKey].dr, c: head.c + dirMap[lastKey].dc });
              st.keyMoveCooldown = 0.085;
            }
          }
        }

        // Smooth interpolation of visual marker head
        const targetHead = st.path[st.path.length - 1];
        const targetX = targetHead.c + 0.5;
        const targetY = targetHead.r + 0.5;
        const lerpSpeed = Math.min(1, dt * 24);
        st.visualHeadX += (targetX - st.visualHeadX) * lerpSpeed;
        st.visualHeadY += (targetY - st.visualHeadY) * lerpSpeed;

        // Relax squash-and-stretch
        st.headScaleX += (1 - st.headScaleX) * Math.min(1, dt * 14);
        st.headScaleY += (1 - st.headScaleY) * Math.min(1, dt * 14);

        // Decay board shake
        if (st.boardShake > 0.05) {
          st.boardShake *= Math.pow(0.02, dt);
        } else {
          st.boardShake = 0;
        }

        // Victory wave animation
        if (st.completed) {
          st.completionWave = Math.min(1, st.completionWave + dt * 1.9);
        }
      }

      // Render frame
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);

      const { cellSize, offsetX, offsetY } = st.layout;
      const shakeX = st.boardShake > 0 ? (Math.random() - 0.5) * st.boardShake * 2 : 0;
      const shakeY = st.boardShake > 0 ? (Math.random() - 0.5) * st.boardShake * 2 : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 1. Subtle warm cream fill for active maze cells
      ctx.fillStyle = '#FDFBF7';
      for (let r = 0; r < st.puzzle.rows; r++) {
        for (let c = 0; c < st.puzzle.cols; c++) {
          if (!st.puzzle.grid[r][c].active) continue;
          ctx.fillRect(
            offsetX + c * cellSize - 0.5,
            offsetY + r * cellSize - 0.5,
            cellSize + 1,
            cellSize + 1
          );
        }
      }

      // 2. Hint path soft golden glow if active
      if (st.hintCount > 0 && st.puzzle.solutionPath.length > 1) {
        const limit = Math.min(st.puzzle.solutionPath.length, st.hintCount);
        const pulse = 0.45 + 0.25 * Math.sin(now * 0.005);
        ctx.save();
        ctx.strokeStyle = `rgba(212, 163, 89, ${pulse})`;
        ctx.lineWidth = Math.max(4, cellSize * 0.28);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([cellSize * 0.22, cellSize * 0.22]);
        ctx.lineDashOffset = -now * 0.02;

        ctx.beginPath();
        for (let i = 0; i < limit; i++) {
          const pt = st.puzzle.solutionPath[i];
          const cx = offsetX + (pt.c + 0.5) * cellSize;
          const cy = offsetY + (pt.r + 0.5) * cellSize;
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. Collectible waypoint stars inside maze
      for (const wp of st.puzzle.waypoints) {
        const key = `${wp.r},${wp.c}`;
        const collected = st.collectedWaypoints.has(key);
        const wx = offsetX + (wp.c + 0.5) * cellSize;
        const wy = offsetY + (wp.r + 0.5) * cellSize;

        ctx.save();
        if (collected) {
          ctx.fillStyle = 'rgba(212, 163, 89, 0.25)';
          drawStarPolygon(ctx, wx, wy, 5, cellSize * 0.2, cellSize * 0.09, 0);
          ctx.fill();
        } else {
          const floatOffset = Math.sin(now * 0.004 + wp.r + wp.c) * 1.8;
          ctx.fillStyle = '#D4A359';
          ctx.shadowColor = 'rgba(212, 163, 89, 0.45)';
          ctx.shadowBlur = 8;
          drawStarPolygon(
            ctx,
            wx,
            wy + floatOffset,
            5,
            Math.max(4.5, cellSize * 0.24),
            Math.max(2.2, cellSize * 0.11),
            now * 0.0008
          );
          ctx.fill();
        }
        ctx.restore();
      }

      // 4. Start indicator (quiet minimalist double circle)
      const startX = offsetX + (st.puzzle.start.c + 0.5) * cellSize;
      const startY = offsetY + (st.puzzle.start.r + 0.5) * cellSize;
      ctx.save();
      ctx.strokeStyle = 'rgba(121, 86, 60, 0.38)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(startX, startY, Math.max(4, cellSize * 0.22), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 5. Goal / Exit beacon (warm breathing concentric ring + diamond center)
      const goalX = offsetX + (st.puzzle.goal.c + 0.5) * cellSize;
      const goalY = offsetY + (st.puzzle.goal.r + 0.5) * cellSize;
      const goalPulse = 1 + 0.14 * Math.sin(now * 0.0045);

      ctx.save();
      ctx.strokeStyle = 'rgba(200, 141, 72, 0.55)';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.arc(goalX, goalY, Math.max(6, cellSize * 0.28) * goalPulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = st.completed ? '#D4A359' : '#79563C';
      ctx.beginPath();
      ctx.arc(goalX, goalY, Math.max(3.5, cellSize * 0.15), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Player traced path with soft warm glow
      if (st.path.length >= 1) {
        const traceWidth = Math.max(4, cellSize * 0.28);

        // Soft outer warm glow
        ctx.save();
        ctx.strokeStyle = st.completed
          ? 'rgba(212, 163, 89, 0.55)'
          : 'rgba(212, 163, 89, 0.28)';
        ctx.lineWidth = traceWidth * 2.1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (let i = 1; i < st.path.length - 1; i++) {
          const pt = st.path[i];
          ctx.lineTo(offsetX + (pt.c + 0.5) * cellSize, offsetY + (pt.r + 0.5) * cellSize);
        }
        const headCanvasX = offsetX + st.visualHeadX * cellSize;
        const headCanvasY = offsetY + st.visualHeadY * cellSize;
        ctx.lineTo(headCanvasX, headCanvasY);
        ctx.stroke();

        // Crisp core path line
        ctx.strokeStyle = st.completed ? '#B67D38' : '#79563C';
        ctx.lineWidth = traceWidth;
        ctx.stroke();

        // Victory wave highlight sweeping from start to finish
        if (st.completed && st.completionWave > 0) {
          const waveCount = Math.floor(st.path.length * st.completionWave);
          if (waveCount > 1) {
            ctx.strokeStyle = '#E5B869';
            ctx.lineWidth = traceWidth * 0.72;
            ctx.beginPath();
            for (let i = 0; i < waveCount; i++) {
              const pt = st.path[i];
              const px = offsetX + (pt.c + 0.5) * cellSize;
              const py = offsetY + (pt.r + 0.5) * cellSize;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
        }

        // Player Marker Head with squash-and-stretch
        ctx.save();
        ctx.translate(headCanvasX, headCanvasY);
        ctx.scale(st.headScaleX, st.headScaleY);

        const markerRadius = Math.max(5.5, cellSize * 0.25);
        ctx.fillStyle = '#FDFBF7';
        ctx.shadowColor = 'rgba(121, 86, 60, 0.28)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, markerRadius + 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = st.completed ? '#D4A359' : '#79563C';
        ctx.beginPath();
        ctx.arc(0, 0, markerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
      }

      // 7. Thin dark brown (#79563C) maze walls with smooth staggered line-drawing entrance
      ctx.save();
      ctx.strokeStyle = '#79563C';
      ctx.lineWidth = Math.max(1.75, Math.min(2.6, cellSize * 0.068));
      ctx.lineCap = 'round';

      for (const seg of st.puzzle.wallSegments) {
        const localT = Math.max(
          0,
          Math.min(1, (st.wallDrawProgress - seg.drawOrder * 0.52) / 0.48)
        );
        if (localT <= 0) continue;

        // Smooth cubic ease-out
        const ease = 1 - Math.pow(1 - localT, 3);
        const sx = offsetX + seg.x1 * cellSize;
        const sy = offsetY + seg.y1 * cellSize;
        const ex = sx + (seg.x2 - seg.x1) * cellSize * ease;
        const ey = sy + (seg.y2 - seg.y1) * cellSize * ease;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.restore();

      // 8. Pooled victory / star particles
      for (const p of st.particles) {
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 42 * dt; // gentle float gravity
        p.rotation += p.vRot * dt;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        if (p.isStar) {
          drawStarPolygon(ctx, p.x, p.y, 5, p.size, p.size * 0.45, p.rotation);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateLayout);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-pointer"
        aria-label={`Flow Maze Level ${puzzle.levelNumber}`}
      />
      {isPaused && (
        <div className="absolute inset-0 bg-[#F8F3E9]/80 flex items-center justify-center pointer-events-none">
          <span className="font-display text-2xl text-[#79563C] tracking-wide">Paused</span>
        </div>
      )}
    </div>
  );
};
