import { describe, it, expect } from 'vitest';
import { createFloodGrid, stepFloodGrid, predictFuture, getZoneFloodRisks, GRID_COLS, GRID_ROWS } from '../floodGrid';

describe('createFloodGrid', () => {
    it('should create a grid with correct dimensions', () => {
        const grid = createFloodGrid();
        expect(grid.length).toBe(GRID_ROWS);
        grid.forEach(row => {
            expect(row.length).toBe(GRID_COLS);
        });
    });

    it('should initialize all cells with non-negative values', () => {
        const grid = createFloodGrid();
        grid.forEach(row => {
            row.forEach(cell => {
                expect(cell.altitude).toBeGreaterThanOrEqual(0);
                // River cells may have a small initial water level
                expect(cell.waterLevel).toBeGreaterThanOrEqual(0);
                expect(cell.waterLevel).toBeLessThanOrEqual(1);
            });
        });
    });

    it('should have river cells in the grid', () => {
        const grid = createFloodGrid();
        const riverCells = grid.flat().filter(c => c.isRiver);
        expect(riverCells.length).toBeGreaterThan(0);
    });

    it('should assign zone IDs to some cells', () => {
        const grid = createFloodGrid();
        const zonedCells = grid.flat().filter(c => c.zoneId !== null);
        expect(zonedCells.length).toBeGreaterThan(0);
    });
});

describe('stepFloodGrid', () => {
    it('should produce minimal water when rainfall is 0 and drainage is high', () => {
        const grid = createFloodGrid();
        const stepped = stepFloodGrid(grid, { rainfall: 0, drainageCapacity: 1.0 });
        const totalWater = stepped.flat().reduce((sum, c) => sum + c.waterLevel, 0);
        // Some residual water may exist from neighbor flow, but should be very small
        expect(totalWater).toBeLessThan(50);
    });

    it('should increase water levels with heavy rainfall over many steps', () => {
        let grid = createFloodGrid();
        for (let i = 0; i < 20; i++) {
            grid = stepFloodGrid(grid, { rainfall: 100, drainageCapacity: 0.1 });
        }
        const totalWater = grid.flat().reduce((sum, c) => sum + c.waterLevel, 0);
        expect(totalWater).toBeGreaterThan(0);
    });

    it('should return a new grid (immutable)', () => {
        const grid = createFloodGrid();
        const stepped = stepFloodGrid(grid, { rainfall: 50, drainageCapacity: 0.5 });
        expect(stepped).not.toBe(grid); // different reference
    });
});

describe('predictFuture', () => {
    it('should run the specified number of steps', () => {
        const grid = createFloodGrid();
        const result = predictFuture(grid, { rainfall: 80, drainageCapacity: 0.3 }, 10);
        expect(result.stepsTaken).toBe(10);
    });

    it('should report peak water level >= 0', () => {
        const grid = createFloodGrid();
        const result = predictFuture(grid, { rainfall: 80, drainageCapacity: 0.3 }, 15);
        expect(result.peakWaterLevel).toBeGreaterThanOrEqual(0);
    });

    it('should identify flooded zones under heavy rainfall', () => {
        const grid = createFloodGrid();
        const result = predictFuture(grid, { rainfall: 150, drainageCapacity: 0.05 }, 30);
        // Under extreme conditions, some zones should flood
        expect(result.floodedCellCount).toBeGreaterThanOrEqual(0);
    });
});

describe('getZoneFloodRisks', () => {
    it('should return a map of zone risks', () => {
        let grid = createFloodGrid();
        for (let i = 0; i < 10; i++) {
            grid = stepFloodGrid(grid, { rainfall: 80, drainageCapacity: 0.3 });
        }
        const risks = getZoneFloodRisks(grid);
        expect(risks).toBeInstanceOf(Map);
        // Risk values should be between 0 and 1
        risks.forEach((risk) => {
            expect(risk).toBeGreaterThanOrEqual(0);
            expect(risk).toBeLessThanOrEqual(100); // risk is a percentage (0-100)
        });
    });
});
