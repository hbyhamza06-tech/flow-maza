import React, { useEffect, useRef } from 'react';
import { generateMazePuzzle } from '../utils/mazeGenerator';

export const TitleBackgroundCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let seedLevel = 14;
    let puzzle = generateMazePuzzle(seedLevel);
    let wallProgress = 0;
    let pathProgress = 0;
    let fadeOut = 0;
    let phase: 'DRAW_WALLS' | 'TRACE_PATH' | 'HOLD' | 'FADE' = 'DRAW_WALLS';

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);

      if (phase === 'DRAW_WALLS') {
        wallProgress = Math.min(1, wallProgress + dt * 0.9);
        if (wallProgress >= 1) phase = 'TRACE_PATH';
      } else if (phase === 'TRACE_PATH') {
        pathProgress = Math.min(
          puzzle.solutionPath.length - 1,
          pathProgress + dt * Math.max(3.5, puzzle.solutionPath.length * 0.38)
        );
        if (pathProgress >= puzzle.solutionPath.length - 1) {
          phase = 'HOLD';
        }
      } else if (phase === 'HOLD') {
        fadeOut += dt * 0.9;
        if (fadeOut >= 0.6) {
          phase = 'FADE';
          fadeOut = 0;
        }
      } else if (phase === 'FADE') {
        fadeOut = Math.min(1, fadeOut + dt * 1.4);
        if (fadeOut >= 1) {
          seedLevel = (seedLevel % 40) + 8;
          puzzle = generateMazePuzzle(seedLevel);
          wallProgress = 0;
          pathProgress = 0;
          fadeOut = 0;
          phase = 'DRAW_WALLS';
        }
      }

      const alphaMultiplier = phase === 'FADE' ? 1 - fadeOut : 1;
      const boardSize = Math.min(width * 0.78, height * 0.44, 340);
      const cellSize = boardSize / Math.max(puzzle.rows, puzzle.cols);
      const offsetX = (width - puzzle.cols * cellSize) / 2;
      const offsetY = height * 0.46 - (puzzle.rows * cellSize) / 2;

      ctx.save();
      ctx.globalAlpha = 0.22 * alphaMultiplier;

      // Draw walls
      ctx.strokeStyle = '#79563C';
      ctx.lineWidth = 1.75;
      ctx.lineCap = 'round';

      for (const seg of puzzle.wallSegments) {
        const localT = Math.max(0, Math.min(1, (wallProgress - seg.drawOrder * 0.55) / 0.45));
        if (localT <= 0) continue;
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

      // Draw animated solution trace
      if (pathProgress > 0 && puzzle.solutionPath.length > 1) {
        const fullIdx = Math.floor(pathProgress);
        const frac = pathProgress - fullIdx;

        ctx.strokeStyle = '#C88D48';
        ctx.lineWidth = Math.max(3, cellSize * 0.24);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (let i = 0; i <= fullIdx && i < puzzle.solutionPath.length; i++) {
          const pt = puzzle.solutionPath[i];
          const cx = offsetX + (pt.c + 0.5) * cellSize;
          const cy = offsetY + (pt.r + 0.5) * cellSize;
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }

        let headX = offsetX + (puzzle.solutionPath[fullIdx].c + 0.5) * cellSize;
        let headY = offsetY + (puzzle.solutionPath[fullIdx].r + 0.5) * cellSize;

        if (fullIdx + 1 < puzzle.solutionPath.length) {
          const nextPt = puzzle.solutionPath[fullIdx + 1];
          const nx = offsetX + (nextPt.c + 0.5) * cellSize;
          const ny = offsetY + (nextPt.r + 0.5) * cellSize;
          headX = headX + (nx - headX) * frac;
          headY = headY + (ny - headY) * frac;
          ctx.lineTo(headX, headY);
        }
        ctx.stroke();

        // Marker head
        ctx.fillStyle = '#79563C';
        ctx.beginPath();
        ctx.arc(headX, headY, Math.max(4, cellSize * 0.22), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
};
