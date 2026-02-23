import { describe, it, expect } from 'vitest';
import { calculateLiveRisk, computeSensitivity, runMonteCarlo, type TelemetryPacket } from '../crisisEngine';

// ─── calculateLiveRisk ──────────────────────────────────────────────────────

describe('calculateLiveRisk', () => {
    it('should return 0 when all inputs are at their safest', () => {
        const telemetry: TelemetryPacket = {
            rainfall: 0,
            drainageCapacity: 1,
            populationDensity: 0,
            socialSpike: 0,
        };
        expect(calculateLiveRisk(telemetry)).toBe(0);
    });

    it('should return 100 at maximum crisis values', () => {
        const telemetry: TelemetryPacket = {
            rainfall: 150,
            drainageCapacity: 0,
            populationDensity: 1,
            socialSpike: 1,
        };
        expect(calculateLiveRisk(telemetry)).toBe(100);
    });

    it('should clamp rainfall normalization at 150mm', () => {
        const telemetry: TelemetryPacket = {
            rainfall: 300, // double the cap
            drainageCapacity: 1,
            populationDensity: 0,
            socialSpike: 0,
        };
        // rainfall is capped at 150 -> normalized to 1.0 -> risk = 0.4 * 100 = 40
        expect(calculateLiveRisk(telemetry)).toBe(40);
    });

    it('should always return a value between 0 and 100', () => {
        for (let i = 0; i < 20; i++) {
            const telemetry: TelemetryPacket = {
                rainfall: Math.random() * 200,
                drainageCapacity: Math.random(),
                populationDensity: Math.random(),
                socialSpike: Math.random(),
            };
            const risk = calculateLiveRisk(telemetry);
            expect(risk).toBeGreaterThanOrEqual(0);
            expect(risk).toBeLessThanOrEqual(100);
        }
    });

    it('should weight rainfall most heavily (40%)', () => {
        const high_rain: TelemetryPacket = { rainfall: 150, drainageCapacity: 1, populationDensity: 0, socialSpike: 0 };
        const high_social: TelemetryPacket = { rainfall: 0, drainageCapacity: 1, populationDensity: 0, socialSpike: 1 };
        expect(calculateLiveRisk(high_rain)).toBeGreaterThan(calculateLiveRisk(high_social));
    });
});

// ─── computeSensitivity ─────────────────────────────────────────────────────

describe('computeSensitivity', () => {
    it('should return percentage breakdown summing close to 100', () => {
        const telemetry: TelemetryPacket = { rainfall: 75, drainageCapacity: 0.5, populationDensity: 0.5, socialSpike: 0.5 };
        const sens = computeSensitivity(telemetry);
        const total = sens.rainfallImpact + sens.drainageImpact + sens.populationImpact + sens.socialImpact;
        // Due to rounding, it can be 99-101
        expect(total).toBeGreaterThanOrEqual(98);
        expect(total).toBeLessThanOrEqual(102);
    });

    it('should show rainfall as dominant factor when rainfall is high', () => {
        const telemetry: TelemetryPacket = { rainfall: 150, drainageCapacity: 0.9, populationDensity: 0.1, socialSpike: 0.1 };
        const sens = computeSensitivity(telemetry);
        expect(sens.rainfallImpact).toBeGreaterThan(sens.drainageImpact);
        expect(sens.rainfallImpact).toBeGreaterThan(sens.populationImpact);
        expect(sens.rainfallImpact).toBeGreaterThan(sens.socialImpact);
    });

    it('should handle zero inputs without dividing by zero', () => {
        const telemetry: TelemetryPacket = { rainfall: 0, drainageCapacity: 1, populationDensity: 0, socialSpike: 0 };
        const sens = computeSensitivity(telemetry);
        expect(sens.rainfallImpact).toBe(0);
        expect(sens.drainageImpact).toBe(0);
        expect(sens.populationImpact).toBe(0);
        expect(sens.socialImpact).toBe(0);
    });
});

// ─── runMonteCarlo ──────────────────────────────────────────────────────────

describe('runMonteCarlo', () => {
    it('should produce deterministic results with the same seed', () => {
        const telemetry: TelemetryPacket = { rainfall: 80, drainageCapacity: 0.5, populationDensity: 0.6, socialSpike: 0.3 };
        const run1 = runMonteCarlo(telemetry, 500, 42);
        const run2 = runMonteCarlo(telemetry, 500, 42);
        expect(run1.mean).toBe(run2.mean);
        expect(run1.ci95).toEqual(run2.ci95);
    });

    it('should produce different distributions with different seeds', () => {
        const telemetry: TelemetryPacket = { rainfall: 80, drainageCapacity: 0.5, populationDensity: 0.6, socialSpike: 0.3 };
        const run1 = runMonteCarlo(telemetry, 500, 42);
        const run2 = runMonteCarlo(telemetry, 500, 999);
        // At least one statistical property should differ across seeds
        const differs = run1.mean !== run2.mean || run1.stdDev !== run2.stdDev || run1.ci95[0] !== run2.ci95[0];
        expect(differs).toBe(true);
    });

    it('should return valid statistical measures', () => {
        const telemetry: TelemetryPacket = { rainfall: 80, drainageCapacity: 0.5, populationDensity: 0.6, socialSpike: 0.3 };
        const result = runMonteCarlo(telemetry, 1000, 42);
        expect(result.mean).toBeGreaterThanOrEqual(0);
        expect(result.mean).toBeLessThanOrEqual(100);
        expect(result.stdDev).toBeGreaterThanOrEqual(0);
        expect(result.ci95[0]).toBeLessThanOrEqual(result.ci95[1]);
        expect(result.scenariosRun).toBe(1000);
    });

    it('should identify at-risk zones', () => {
        const telemetry: TelemetryPacket = { rainfall: 120, drainageCapacity: 0.2, populationDensity: 0.8, socialSpike: 0.7 };
        const result = runMonteCarlo(telemetry, 500, 42);
        expect(result.zoneBreakdown.length).toBeGreaterThan(0);
        result.zoneBreakdown.forEach((z: { zone: string; risk: number }) => {
            expect(z.zone).toBeTruthy();
            expect(z.risk).toBeGreaterThanOrEqual(0);
        });
    });
});
