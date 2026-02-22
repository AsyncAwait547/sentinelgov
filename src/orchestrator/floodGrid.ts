// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Cellular Automata Flood Grid — Physics-Based Digital Twin
// ─────────────────────────────────────────────────────────────────────────────
// Converts the abstract map into a grid matrix. When the river overflows,
// water "flows" to adjacent cells based on altitude and drainage capacity.
// The Simulation Agent runs this model 1,000× faster than real-time to
// predict which zones will flood in the next 10 minutes.
// ─────────────────────────────────────────────────────────────────────────────

// ─── GRID CONFIGURATION ─────────────────────────────────────────────────────
export const GRID_COLS = 20;
export const GRID_ROWS = 16;

export interface GridCell {
    row: number;
    col: number;
    altitude: number;         // 0-100 (higher = drier)
    drainageRate: number;     // 0-1 how fast water drains per tick
    waterLevel: number;       // 0-1 how flooded this cell is
    isRiver: boolean;
    zoneId: string | null;    // Maps to zone-1, zone-2, etc.
}

export type FloodGrid = GridCell[][];

// ─── TERRAIN GENERATOR ──────────────────────────────────────────────────────
// Creates a realistic heightmap with a river valley running through the city.

function generateAltitude(row: number, col: number): number {
    // River runs diagonally from top-left to bottom-right
    const riverCenterRow = 3 + (col / GRID_COLS) * 10;
    const distToRiver = Math.abs(row - riverCenterRow);

    // Valley shape: low near river, high on hills
    const baseAltitude = 20 + distToRiver * 6;

    // Add some terrain variation (pseudo-random but deterministic)
    const noise = Math.sin(row * 3.7 + col * 2.3) * 8 + Math.cos(row * 1.1 + col * 5.9) * 5;

    return Math.max(5, Math.min(95, baseAltitude + noise));
}

function isRiverCell(row: number, col: number): boolean {
    const riverCenterRow = 3 + (col / GRID_COLS) * 10;
    return Math.abs(row - riverCenterRow) < 1.2;
}

// Zone mapping: which zone each grid cell belongs to
function getZoneId(row: number, col: number): string | null {
    // Map grid coordinates to zone centers (approximate)
    const zones: { id: string; centerRow: number; centerCol: number; radius: number }[] = [
        { id: 'zone-1', centerRow: 6, centerCol: 10, radius: 2.5 },   // Ward 12 - River Delta
        { id: 'zone-2', centerRow: 4, centerCol: 15, radius: 2 },     // Industrial Hub
        { id: 'zone-3', centerRow: 9, centerCol: 13, radius: 2.5 },   // CBD
        { id: 'zone-4', centerRow: 3, centerCol: 8, radius: 2 },      // North Bridge
        { id: 'zone-5', centerRow: 12, centerCol: 11, radius: 2.5 },  // South Residential
        { id: 'zone-6', centerRow: 7, centerCol: 17, radius: 2 },     // Power Grid
        { id: 'zone-7', centerRow: 8, centerCol: 5, radius: 2.5 },    // Water Treatment
        { id: 'zone-8', centerRow: 12, centerCol: 16, radius: 2 },    // Harbor
    ];

    for (const z of zones) {
        const dist = Math.sqrt((row - z.centerRow) ** 2 + (col - z.centerCol) ** 2);
        if (dist <= z.radius) return z.id;
    }
    return null;
}

// ─── GRID INITIALIZATION ────────────────────────────────────────────────────
export function createFloodGrid(): FloodGrid {
    const grid: FloodGrid = [];
    for (let row = 0; row < GRID_ROWS; row++) {
        const rowCells: GridCell[] = [];
        for (let col = 0; col < GRID_COLS; col++) {
            const alt = generateAltitude(row, col);
            rowCells.push({
                row,
                col,
                altitude: alt,
                drainageRate: isRiverCell(row, col) ? 0.01 : 0.05 + (alt / 100) * 0.15,
                waterLevel: isRiverCell(row, col) ? 0.3 : 0,
                isRiver: isRiverCell(row, col),
                zoneId: getZoneId(row, col),
            });
        }
        grid.push(rowCells);
    }
    return grid;
}

// ─── SIMULATION STEP ────────────────────────────────────────────────────────
// This is the core cellular automata rule:
// 1. Water flows from higher cells to lower adjacent cells.
// 2. Each cell drains at its own drainageRate.
// 3. River cells receive rainfall input.

export interface SimulationParams {
    rainfall: number;          // mm (from telemetry)
    drainageCapacity: number;  // 0-1 (global drainage modifier)
}

export function stepFloodGrid(
    grid: FloodGrid,
    params: SimulationParams,
    deltaTime = 1
): FloodGrid {
    const next: FloodGrid = grid.map((row) =>
        row.map((cell) => ({ ...cell }))
    );

    // Normalize rainfall to water input (0-1 scale per tick)
    const rainfallInput = Math.min(params.rainfall / 150, 1) * 0.08 * deltaTime;

    // Global drainage modifier (when drains fail, drainage drops everywhere)
    const globalDrainMod = params.drainageCapacity;

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const cell = grid[row][col];
            let water = cell.waterLevel;

            // River cells receive direct rainfall
            if (cell.isRiver) {
                water += rainfallInput * 1.5;
            } else {
                water += rainfallInput * 0.3;
            }

            // Water flows to lower neighbors (Von Neumann neighborhood)
            const neighbors = getNeighbors(grid, row, col);
            for (const n of neighbors) {
                const altDiff = cell.altitude - n.altitude;
                if (altDiff > 0 && cell.waterLevel > 0.05) {
                    // Flow rate proportional to altitude difference
                    const flowRate = Math.min(
                        0.02 * (altDiff / 100) * deltaTime,
                        water * 0.25
                    );
                    water -= flowRate;
                    next[n.row][n.col].waterLevel += flowRate;
                } else if (altDiff < 0 && n.waterLevel > 0.05) {
                    // Receive water from higher neighbor
                    const flowRate = Math.min(
                        0.02 * (-altDiff / 100) * deltaTime,
                        n.waterLevel * 0.25
                    );
                    water += flowRate;
                }
            }

            // Natural drainage
            water -= cell.drainageRate * globalDrainMod * deltaTime;

            // Clamp
            next[row][col].waterLevel = Math.max(0, Math.min(1, water));
        }
    }

    return next;
}

// ─── FAST-FORWARD SIMULATION ────────────────────────────────────────────────
// Runs the simulation N steps ahead to predict future flood state.
// This is what the Simulation Agent uses for Monte Carlo predictions.

export interface PredictionResult {
    futureGrid: FloodGrid;
    peakWaterLevel: number;
    floodedZones: string[];
    stepsTaken: number;
    floodedCellCount: number;
}

export function predictFuture(
    grid: FloodGrid,
    params: SimulationParams,
    stepsAhead: number
): PredictionResult {
    let current = grid;
    let peakWater = 0;

    for (let i = 0; i < stepsAhead; i++) {
        current = stepFloodGrid(current, params, 1);
    }

    // Analyze results
    const floodedZones = new Set<string>();
    let floodedCellCount = 0;

    for (const row of current) {
        for (const cell of row) {
            if (cell.waterLevel > peakWater) peakWater = cell.waterLevel;
            if (cell.waterLevel > 0.4) {
                floodedCellCount++;
                if (cell.zoneId) floodedZones.add(cell.zoneId);
            }
        }
    }

    return {
        futureGrid: current,
        peakWaterLevel: peakWater,
        floodedZones: Array.from(floodedZones),
        stepsTaken: stepsAhead,
        floodedCellCount,
    };
}

// ─── ZONE RISK EXTRACTION ───────────────────────────────────────────────────
// Computes per-zone flood risk from the grid state.
export function getZoneFloodRisks(grid: FloodGrid): Map<string, number> {
    const zoneTotals = new Map<string, { totalWater: number; cellCount: number }>();

    for (const row of grid) {
        for (const cell of row) {
            if (cell.zoneId) {
                const existing = zoneTotals.get(cell.zoneId) || { totalWater: 0, cellCount: 0 };
                existing.totalWater += cell.waterLevel;
                existing.cellCount += 1;
                zoneTotals.set(cell.zoneId, existing);
            }
        }
    }

    const risks = new Map<string, number>();
    for (const [zoneId, data] of zoneTotals) {
        risks.set(zoneId, Math.round((data.totalWater / data.cellCount) * 100));
    }
    return risks;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function getNeighbors(grid: FloodGrid, row: number, col: number): GridCell[] {
    const neighbors: GridCell[] = [];
    if (row > 0) neighbors.push(grid[row - 1][col]);
    if (row < GRID_ROWS - 1) neighbors.push(grid[row + 1][col]);
    if (col > 0) neighbors.push(grid[row][col - 1]);
    if (col < GRID_COLS - 1) neighbors.push(grid[row][col + 1]);
    return neighbors;
}
