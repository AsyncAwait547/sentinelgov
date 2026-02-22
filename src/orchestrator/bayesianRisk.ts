// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Bayesian Risk Engine — Adaptive Confidence Updating
// ─────────────────────────────────────────────────────────────────────────────
// Uses Bayes' theorem to update risk posteriors as new evidence arrives.
// posteriorRisk = (likelihood × prior) / evidence
// ─────────────────────────────────────────────────────────────────────────────

export interface BayesianState {
    prior: number;              // P(flood) before evidence
    posterior: number;           // P(flood | evidence)
    likelihood: number;          // P(evidence | flood)
    evidenceStrength: number;    // P(evidence) — normalization factor
    confidenceInterval: [number, number]; // uncertainty range
    updateCount: number;         // how many Bayesian updates we've done
    history: BayesianUpdate[];   // audit trail of updates
}

export interface BayesianUpdate {
    timestamp: number;
    evidenceType: string;
    priorBefore: number;
    posteriorAfter: number;
    likelihoodUsed: number;
    delta: number;
}

// ─── LIKELIHOOD FUNCTIONS for different evidence types ──────────────────────
const LIKELIHOOD_TABLE: Record<string, (value: number) => number> = {
    rainfall: (mm) => {
        // P(observation | flood) — sigmoid function
        return 1 / (1 + Math.exp(-0.08 * (mm - 60)));
    },
    drainage_failure: (capacity) => {
        // Lower drainage capacity → higher likelihood of flood
        return 1 - capacity;
    },
    social_spike: (spike) => {
        // Social media panic often precedes actual flooding
        return spike * 0.85;
    },
    sensor_alert: (severity) => {
        // Direct sensor readings
        return Math.min(1, severity * 0.9);
    },
    river_level: (level) => {
        // River level in meters
        return 1 / (1 + Math.exp(-1.5 * (level - 5)));
    },
    historical_frequency: (freq) => {
        // How often this area floods historically
        return Math.min(1, freq);
    },
};

// ─── BAYESIAN RISK ENGINE ───────────────────────────────────────────────────

export class BayesianRiskEngine {
    private state: BayesianState;

    constructor(prior = 0.15) {
        this.state = {
            prior,
            posterior: prior,
            likelihood: 0.5,
            evidenceStrength: 0.5,
            confidenceInterval: [prior * 0.7, Math.min(1, prior * 1.3)],
            updateCount: 0,
            history: [],
        };
    }

    // ─── BAYES UPDATE ───────────────────────────────────────────────────
    // P(H|E) = P(E|H) * P(H) / P(E)
    // where P(E) = P(E|H)*P(H) + P(E|¬H)*P(¬H)
    update(evidenceType: string, observedValue: number): BayesianUpdate {
        const likelihoodFn = LIKELIHOOD_TABLE[evidenceType];
        if (!likelihoodFn) {
            throw new Error(`Unknown evidence type: ${evidenceType}`);
        }

        const priorBefore = this.state.posterior;
        const likelihood = likelihoodFn(observedValue);

        // P(E|¬H) — probability of evidence given NO flood
        // Generally lower than P(E|H)
        const likelihoodNoFlood = Math.max(0.05, 1 - likelihood * 0.8);

        // P(E) = P(E|H)*P(H) + P(E|¬H)*P(¬H) — total evidence probability
        const evidence = likelihood * priorBefore + likelihoodNoFlood * (1 - priorBefore);

        // Bayes' theorem
        const posterior = evidence > 0 ? (likelihood * priorBefore) / evidence : priorBefore;

        // Clamp to [0.01, 0.99] to avoid certainty collapse
        this.state.posterior = Math.max(0.01, Math.min(0.99, posterior));
        this.state.likelihood = likelihood;
        this.state.evidenceStrength = evidence;
        this.state.updateCount++;

        // Update confidence interval — narrows with more evidence
        const uncertainty = Math.max(0.03, 0.25 / Math.sqrt(this.state.updateCount + 1));
        this.state.confidenceInterval = [
            Math.max(0, this.state.posterior - uncertainty),
            Math.min(1, this.state.posterior + uncertainty),
        ];

        const update: BayesianUpdate = {
            timestamp: Date.now(),
            evidenceType,
            priorBefore,
            posteriorAfter: this.state.posterior,
            likelihoodUsed: likelihood,
            delta: this.state.posterior - priorBefore,
        };
        this.state.history.push(update);

        return update;
    }

    // ─── BATCH UPDATE — process multiple evidence pieces at once ─────────
    batchUpdate(evidence: Array<{ type: string; value: number }>): BayesianUpdate[] {
        return evidence.map(e => this.update(e.type, e.value));
    }

    // ─── GET CURRENT STATE ──────────────────────────────────────────────
    getState(): Readonly<BayesianState> {
        return { ...this.state, history: [...this.state.history] };
    }

    // ─── GET RISK LEVEL (0-100) ─────────────────────────────────────────
    getRiskLevel(): number {
        return Math.round(this.state.posterior * 100);
    }

    // ─── GET CONFIDENCE INTERVAL (0-100) ────────────────────────────────
    getConfidenceInterval(): [number, number] {
        return [
            Math.round(this.state.confidenceInterval[0] * 100),
            Math.round(this.state.confidenceInterval[1] * 100),
        ];
    }

    // ─── RESET ──────────────────────────────────────────────────────────
    reset(prior = 0.15): void {
        this.state = {
            prior,
            posterior: prior,
            likelihood: 0.5,
            evidenceStrength: 0.5,
            confidenceInterval: [prior * 0.7, Math.min(1, prior * 1.3)],
            updateCount: 0,
            history: [],
        };
    }
}

export const bayesianRisk = new BayesianRiskEngine();
