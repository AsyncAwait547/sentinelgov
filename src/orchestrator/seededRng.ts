// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Seeded PRNG — Deterministic Reproducible Randomness
// ─────────────────────────────────────────────────────────────────────────────
// Uses a Mulberry32 PRNG seeded with a configurable seed value.
// Monte Carlo becomes reproducible: same seed → same results.
// ─────────────────────────────────────────────────────────────────────────────

// Mulberry32 — fast, small, high-quality 32-bit PRNG
function mulberry32(seed: number): () => number {
    return function (): number {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export class SeededRNG {
    private rng: () => number;
    private seed: number;
    private callCount = 0;

    constructor(seed?: number) {
        this.seed = seed ?? Date.now();
        this.rng = mulberry32(this.seed);
    }

    // ─── BASIC RANDOM [0, 1) ────────────────────────────────────────────
    random(): number {
        this.callCount++;
        return this.rng();
    }

    // ─── RANGE ──────────────────────────────────────────────────────────
    range(min: number, max: number): number {
        return min + this.random() * (max - min);
    }

    // ─── INTEGER RANGE ──────────────────────────────────────────────────
    int(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }

    // ─── NORMAL DISTRIBUTION (Box-Muller, seeded) ───────────────────────
    normal(mean: number, stdDev: number): number {
        const u1 = this.random();
        const u2 = this.random();
        const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
        return mean + z * stdDev;
    }

    // ─── CURRENT SEED & STATE ───────────────────────────────────────────
    getSeed(): number { return this.seed; }
    getCallCount(): number { return this.callCount; }

    // ─── RESEED ─────────────────────────────────────────────────────────
    reseed(seed: number): void {
        this.seed = seed;
        this.rng = mulberry32(seed);
        this.callCount = 0;
    }
}

// Default global instance with a reproducible seed
export const seededRng = new SeededRNG(42);
