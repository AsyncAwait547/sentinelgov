import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../seededRng';

describe('SeededRNG', () => {
    it('should produce deterministic sequences with the same seed', () => {
        const rng1 = new SeededRNG(42);
        const rng2 = new SeededRNG(42);
        for (let i = 0; i < 100; i++) {
            expect(rng1.random()).toBe(rng2.random());
        }
    });

    it('should produce different sequences with different seeds', () => {
        const rng1 = new SeededRNG(42);
        const rng2 = new SeededRNG(99);
        let same = true;
        for (let i = 0; i < 10; i++) {
            if (rng1.random() !== rng2.random()) { same = false; break; }
        }
        expect(same).toBe(false);
    });

    it('random() should return values in [0, 1)', () => {
        const rng = new SeededRNG(123);
        for (let i = 0; i < 1000; i++) {
            const val = rng.random();
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(1);
        }
    });

    it('range() should return values within bounds', () => {
        const rng = new SeededRNG(7);
        for (let i = 0; i < 200; i++) {
            const val = rng.range(5, 10);
            expect(val).toBeGreaterThanOrEqual(5);
            expect(val).toBeLessThan(10);
        }
    });

    it('int() should return integers within bounds', () => {
        const rng = new SeededRNG(7);
        for (let i = 0; i < 200; i++) {
            const val = rng.int(1, 6);
            expect(val).toBeGreaterThanOrEqual(1);
            expect(val).toBeLessThanOrEqual(6);
            expect(Number.isInteger(val)).toBe(true);
        }
    });

    it('normal() should produce values centered around the mean', () => {
        const rng = new SeededRNG(42);
        const samples: number[] = [];
        for (let i = 0; i < 5000; i++) {
            samples.push(rng.normal(50, 5));
        }
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        // Mean should be close to 50 (within 1 std dev of the sampling error)
        expect(avg).toBeGreaterThan(48);
        expect(avg).toBeLessThan(52);
    });

    it('reseed() should reset the sequence', () => {
        const rng = new SeededRNG(42);
        const first = rng.random();
        rng.random(); rng.random(); // advance
        rng.reseed(42);
        expect(rng.random()).toBe(first);
        expect(rng.getCallCount()).toBe(1);
    });

    it('getCallCount() should track calls', () => {
        const rng = new SeededRNG(1);
        expect(rng.getCallCount()).toBe(0);
        rng.random();
        rng.random();
        rng.random();
        expect(rng.getCallCount()).toBe(3);
    });
});
