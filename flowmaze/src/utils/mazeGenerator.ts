import {
  CellCoord,
  Difficulty,
  MazeCell,
  MazePuzzle,
  MazeShape,
  PortalPair,
  WallSegment,
} from '../types/game';

// Deterministic seeded PRNG (Mulberry32)
function createRNG(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDifficultyForLevel(levelNumber: number): Difficulty {
  if (levelNumber <= 50) return 'Easy';
  if (levelNumber <= 100) return 'Normal';
  if (levelNumber <= 150) return 'Hard';
  return 'Expert';
}

function getDimensionsForLevel(levelNumber: number): { rows: number; cols: number; shape: MazeShape } {
  // Progressive sizing from tiny 4x4 tutorial mazes up to intricate 16x16 Expert labyrinths
  if (levelNumber === 1) return { rows: 4, cols: 4, shape: 'Classic' };
  if (levelNumber === 2) return { rows: 5, cols: 5, shape: 'Classic' };
  if (levelNumber === 3) return { rows: 6, cols: 6, shape: 'Classic' };

  const shapes: MazeShape[] = ['Classic', 'Octagon', 'Courtyard', 'Cross', 'Diamond'];
  const shapeIndex = levelNumber % 5 === 0 ? (Math.floor(levelNumber / 5) % shapes.length) : 0;
  const selectedShape: MazeShape = levelNumber <= 4 ? 'Classic' : shapes[shapeIndex];

  if (levelNumber <= 15) {
    const size = 5 + (levelNumber % 3); // 5..7
    return { rows: size, cols: size, shape: selectedShape };
  }
  if (levelNumber <= 50) {
    const size = 6 + (levelNumber % 3); // 6..8
    return { rows: size, cols: size, shape: selectedShape };
  }
  if (levelNumber <= 100) {
    const size = 8 + (levelNumber % 4); // 8..11
    return { rows: size, cols: size, shape: selectedShape };
  }
  if (levelNumber <= 150) {
    const size = 11 + (levelNumber % 4); // 11..14
    return { rows: size, cols: size, shape: selectedShape };
  }
  const size = 14 + (levelNumber % 4); // 14..17
  return { rows: size, cols: size, shape: selectedShape };
}

function isCellActiveInShape(r: number, c: number, rows: number, cols: number, shape: MazeShape): boolean {
  if (shape === 'Classic' || rows < 6 || cols < 6) return true;

  const cr = (rows - 1) / 2;
  const cc = (cols - 1) / 2;
  const nr = Math.abs(r - cr) / (rows / 2);
  const nc = Math.abs(c - cc) / (cols / 2);

  if (shape === 'Octagon') {
    return nr + nc <= 1.45;
  }
  if (shape === 'Diamond') {
    return nr + nc <= 1.22;
  }
  if (shape === 'Courtyard') {
    // Open central hole
    const holeRadius = Math.max(1, Math.floor(Math.min(rows, cols) / 5));
    if (Math.abs(r - cr) < holeRadius && Math.abs(c - cc) < holeRadius) {
      return false;
    }
    return true;
  }
  if (shape === 'Cross') {
    const arm = Math.max(1, Math.floor(Math.min(rows, cols) / 4));
    const inCorner =
      (r < arm || r >= rows - arm) &&
      (c < arm || c >= cols - arm);
    return !inCorner;
  }
  return true;
}

function coordKey(c: CellCoord): string {
  return `${c.r},${c.c}`;
}

export function areCoordsEqual(a: CellCoord, b: CellCoord): boolean {
  return a.r === b.r && a.c === b.c;
}

// Check if two cells are directly connected by an open passage OR linked via portal
export function canMoveBetweenCells(
  puzzle: MazePuzzle,
  from: CellCoord,
  to: CellCoord
): boolean {
  if (
    to.r < 0 ||
    to.r >= puzzle.rows ||
    to.c < 0 ||
    to.c >= puzzle.cols ||
    !puzzle.grid[to.r][to.c].active
  ) {
    return false;
  }

  const dr = to.r - from.r;
  const dc = to.c - from.c;

  if (Math.abs(dr) + Math.abs(dc) === 1) {
    const cell = puzzle.grid[from.r][from.c];
    if (dr === -1 && !cell.walls.top) return true;
    if (dr === 1 && !cell.walls.bottom) return true;
    if (dc === -1 && !cell.walls.left) return true;
    if (dc === 1 && !cell.walls.right) return true;
  }

  // Check portals
  for (const portal of puzzle.portals) {
    if (
      (areCoordsEqual(from, portal.a) && areCoordsEqual(to, portal.b)) ||
      (areCoordsEqual(from, portal.b) && areCoordsEqual(to, portal.a))
    ) {
      return true;
    }
  }

  return false;
}

// Get all valid neighbors from a given cell
export function getAccessibleNeighbors(puzzle: MazePuzzle, cell: CellCoord): CellCoord[] {
  const neighbors: CellCoord[] = [];
  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
  ];

  for (const d of dirs) {
    const next = { r: cell.r + d.dr, c: cell.c + d.dc };
    if (canMoveBetweenCells(puzzle, cell, next)) {
      neighbors.push(next);
    }
  }

  for (const portal of puzzle.portals) {
    if (areCoordsEqual(cell, portal.a)) neighbors.push(portal.b);
    else if (areCoordsEqual(cell, portal.b)) neighbors.push(portal.a);
  }

  return neighbors;
}

// Find shortest path via BFS between any two cells
export function findShortestPath(
  grid: MazeCell[][],
  rows: number,
  cols: number,
  start: CellCoord,
  goal: CellCoord,
  portals: PortalPair[] = []
): CellCoord[] {
  const queue: CellCoord[] = [start];
  const parent = new Map<string, CellCoord | null>();
  parent.set(coordKey(start), null);

  const dirs = [
    { dr: -1, dc: 0, wall: 'top' as const },
    { dr: 0, dc: 1, wall: 'right' as const },
    { dr: 1, dc: 0, wall: 'bottom' as const },
    { dr: 0, dc: -1, wall: 'left' as const },
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.r === goal.r && curr.c === goal.c) {
      const path: CellCoord[] = [];
      let trace: CellCoord | null = curr;
      while (trace) {
        path.push(trace);
        trace = parent.get(coordKey(trace)) ?? null;
      }
      return path.reverse();
    }

    const cell = grid[curr.r][curr.c];
    for (const d of dirs) {
      if (!cell.walls[d.wall]) {
        const nr = curr.r + d.dr;
        const nc = curr.c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].active) {
          const next = { r: nr, c: nc };
          const key = coordKey(next);
          if (!parent.has(key)) {
            parent.set(key, curr);
            queue.push(next);
          }
        }
      }
    }

    for (const p of portals) {
      let target: CellCoord | null = null;
      if (areCoordsEqual(curr, p.a)) target = p.b;
      else if (areCoordsEqual(curr, p.b)) target = p.a;
      if (target) {
        const key = coordKey(target);
        if (!parent.has(key)) {
          parent.set(key, curr);
          queue.push(target);
        }
      }
    }
  }

  return [start];
}

// Find farthest reachable cell from a given start to make engaging mazes
function findFarthestCell(
  grid: MazeCell[][],
  rows: number,
  cols: number,
  from: CellCoord
): { cell: CellCoord; dist: number } {
  const queue: { coord: CellCoord; dist: number }[] = [{ coord: from, dist: 0 }];
  const visited = new Set<string>([coordKey(from)]);
  let farthest = from;
  let maxDist = 0;

  const dirs = [
    { dr: -1, dc: 0, wall: 'top' as const },
    { dr: 0, dc: 1, wall: 'right' as const },
    { dr: 1, dc: 0, wall: 'bottom' as const },
    { dr: 0, dc: -1, wall: 'left' as const },
  ];

  while (queue.length > 0) {
    const { coord, dist } = queue.shift()!;
    if (dist > maxDist) {
      maxDist = dist;
      farthest = coord;
    }

    const cell = grid[coord.r][coord.c];
    for (const d of dirs) {
      if (!cell.walls[d.wall]) {
        const nr = coord.r + d.dr;
        const nc = coord.c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].active) {
          const next = { r: nr, c: nc };
          const k = coordKey(next);
          if (!visited.has(k)) {
            visited.add(k);
            queue.push({ coord: next, dist: dist + 1 });
          }
        }
      }
    }
  }

  return { cell: farthest, dist: maxDist };
}

function buildWallSegments(grid: MazeCell[][], rows: number, cols: number): WallSegment[] {
  const segments: WallSegment[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (!cell.active) continue;

      const orderBase = (r + c) / Math.max(1, rows + cols - 2);

      // Always draw top wall if exposed or top boundary of active region
      if (cell.walls.top) {
        segments.push({
          x1: c,
          y1: r,
          x2: c + 1,
          y2: r,
          drawOrder: orderBase,
        });
      }
      // Left wall
      if (cell.walls.left) {
        segments.push({
          x1: c,
          y1: r,
          x2: c,
          y2: r + 1,
          drawOrder: orderBase,
        });
      }
      // Bottom wall only if bottom neighbor is inactive or out of bounds
      if (cell.walls.bottom && (r === rows - 1 || !grid[r + 1][c].active)) {
        segments.push({
          x1: c,
          y1: r + 1,
          x2: c + 1,
          y2: r + 1,
          drawOrder: orderBase,
        });
      }
      // Right wall only if right neighbor is inactive or out of bounds
      if (cell.walls.right && (c === cols - 1 || !grid[r][c + 1].active)) {
        segments.push({
          x1: c + 1,
          y1: r,
          x2: c + 1,
          y2: r + 1,
          drawOrder: orderBase,
        });
      }
    }
  }

  return segments;
}

export function generateMazePuzzle(
  levelNumber: number,
  options?: { isDaily?: boolean; dailyDateKey?: string }
): MazePuzzle {
  const seedBase = options?.isDaily && options.dailyDateKey
    ? options.dailyDateKey.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7919)
    : levelNumber * 2654435761 + 1013904223;

  const rng = createRNG(seedBase);
  const difficulty = options?.isDaily ? 'Normal' : getDifficultyForLevel(levelNumber);
  const { rows, cols, shape } = options?.isDaily
    ? { rows: 10, cols: 10, shape: 'Octagon' as MazeShape }
    : getDimensionsForLevel(levelNumber);

  // Initialize grid
  const grid: MazeCell[][] = [];
  const activeCoords: CellCoord[] = [];

  for (let r = 0; r < rows; r++) {
    const rowCells: MazeCell[] = [];
    for (let c = 0; c < cols; c++) {
      const active = isCellActiveInShape(r, c, rows, cols, shape);
      rowCells.push({
        r,
        c,
        active,
        walls: { top: true, right: true, bottom: true, left: true },
      });
      if (active) activeCoords.push({ r, c });
    }
    grid.push(rowCells);
  }

  // Growing Tree / Recursive Backtracker hybrid for organic, flowing corridors
  const startSeed = activeCoords[0];
  const visited = new Set<string>([coordKey(startSeed)]);
  const stack: CellCoord[] = [startSeed];

  const dirs = [
    { dr: -1, dc: 0, wall: 'top' as const, opp: 'bottom' as const },
    { dr: 0, dc: 1, wall: 'right' as const, opp: 'left' as const },
    { dr: 1, dc: 0, wall: 'bottom' as const, opp: 'top' as const },
    { dr: 0, dc: -1, wall: 'left' as const, opp: 'right' as const },
  ];

  while (stack.length > 0) {
    // 85% newest cell (long flowing passages), 15% random recent cell (natural branching)
    const index =
      rng() < 0.85
        ? stack.length - 1
        : Math.max(0, stack.length - 1 - Math.floor(rng() * Math.min(4, stack.length)));
    const curr = stack[index];

    const unvisitedDirs = dirs.filter((d) => {
      const nr = curr.r + d.dr;
      const nc = curr.c + d.dc;
      return (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        grid[nr][nc].active &&
        !visited.has(`${nr},${nc}`)
      );
    });

    if (unvisitedDirs.length > 0) {
      const chosen = unvisitedDirs[Math.floor(rng() * unvisitedDirs.length)];
      const nr = curr.r + chosen.dr;
      const nc = curr.c + chosen.dc;

      grid[curr.r][curr.c].walls[chosen.wall] = false;
      grid[nr][nc].walls[chosen.opp] = false;

      visited.add(`${nr},${nc}`);
      stack.push({ r: nr, c: nc });
    } else {
      stack.splice(index, 1);
    }
  }

  // Ensure any isolated active cells (due to shape masks) are deactivated cleanly
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].active && !visited.has(`${r},${c}`)) {
        grid[r][c].active = false;
      }
    }
  }

  // Pick diameter endpoints (longest path in tree) for deeply satisfying start -> exit flow
  const firstPass = findFarthestCell(grid, rows, cols, startSeed);
  const secondPass = findFarthestCell(grid, rows, cols, firstPass.cell);

  const start = firstPass.cell;
  const goal = secondPass.cell;

  // On levels >= 12, subtly braid 1..3 dead-ends to introduce multi-route choices
  if (levelNumber >= 12 || options?.isDaily) {
    const loopCount = Math.min(3, Math.floor(levelNumber / 25) + 1);
    let loopsAdded = 0;
    for (let attempt = 0; attempt < 30 && loopsAdded < loopCount; attempt++) {
      const candidate = activeCoords[Math.floor(rng() * activeCoords.length)];
      if (!grid[candidate.r][candidate.c].active) continue;
      const d = dirs[Math.floor(rng() * dirs.length)];
      const nr = candidate.r + d.dr;
      const nc = candidate.c + d.dc;
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        grid[nr][nc].active &&
        grid[candidate.r][candidate.c].walls[d.wall]
      ) {
        grid[candidate.r][candidate.c].walls[d.wall] = false;
        grid[nr][nc].walls[d.opp] = false;
        loopsAdded++;
      }
    }
  }

  const portals: PortalPair[] = [];
  const solutionPath = findShortestPath(grid, rows, cols, start, goal, portals);

  // Place 1 to 2 collectible star waypoints along the solution path for variety
  const waypoints: CellCoord[] = [];
  if (solutionPath.length >= 9) {
    const mid1 = solutionPath[Math.floor(solutionPath.length * 0.36)];
    if (!areCoordsEqual(mid1, start) && !areCoordsEqual(mid1, goal)) {
      waypoints.push(mid1);
    }
    if (solutionPath.length >= 16) {
      const mid2 = solutionPath[Math.floor(solutionPath.length * 0.68)];
      if (
        !areCoordsEqual(mid2, start) &&
        !areCoordsEqual(mid2, goal) &&
        !areCoordsEqual(mid2, mid1)
      ) {
        waypoints.push(mid2);
      }
    }
  }

  const wallSegments = buildWallSegments(grid, rows, cols);
  const parTimeSeconds = Math.max(8, Math.round(solutionPath.length * 0.85 + rows * 0.9));

  return {
    levelNumber,
    isDaily: options?.isDaily,
    dailyDateKey: options?.dailyDateKey,
    difficulty,
    shape,
    rows,
    cols,
    grid,
    start,
    goal,
    waypoints,
    portals,
    solutionPath,
    wallSegments,
    parTimeSeconds,
  };
}
