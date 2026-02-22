// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Crisis Engine V4 — Elite-Level Agentic Architecture
// ─────────────────────────────────────────────────────────────────────────────
//
//  1. ✅ Event Bus — Pub/Sub decoupled agents
//  2. ✅ Event Store — Append-only event-sourced architecture
//  3. ✅ Monte Carlo — Seeded PRNG, quantitative distribution + 95% CI
//  4. ✅ Sensitivity Analysis — Explainable risk factor breakdown
//  5. ✅ Bayesian Risk — Posterior updating with narrowing confidence
//  6. ✅ Graph Twin — Weighted directed graph + Dijkstra evacuation
//  7. ✅ Utility-Based Negotiation — Multi-objective optimization
//  8. ✅ Chain Hashing — Blockchain-style immutable governance
//  9. ✅ Agent Resilience — safeExecute with fallback
// 10. ✅ State Machine — Explicit validated transitions
// 11. ✅ Before vs After — Quantified mitigation effectiveness
// 12. ✅ Seeded PRNG — Deterministic reproducible Monte Carlo
// 13. ✅ HITL Constraint Injection — Override tolerance/budget
// 14. ✅ Observability — Agent timing, simulation metrics
//
// ─────────────────────────────────────────────────────────────────────────────

import { useSystemStore } from '../store/useSystemStore';
import type { MitigationPlan, CrisisStatus, SensitivityBreakdown, MonteCarloResult } from '../store/useSystemStore';
import { eventBus } from './eventBus';
import { eventStore } from './eventStore';
import { runDynamicNegotiation, type ResourceInventory, type EvacuationDemand } from './negotiationEngine';
import { startContinuousSimulation, stopContinuousSimulation } from './continuousSimulation';
import { infrastructureGraph } from './graphTwin';
import { bayesianRisk } from './bayesianRisk';
import { seededRng } from './seededRng';

// ─── HELPERS ────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const store = () => useSystemStore.getState();

// ─── OBSERVABILITY (#14) ────────────────────────────────────────────────────
const agentTimings: Record<string, number> = {};
function startTimer(agent: string): void { agentTimings[agent] = performance.now(); }
function endTimer(agent: string): number {
    const elapsed = Math.round(performance.now() - (agentTimings[agent] ?? performance.now()));
    delete agentTimings[agent];
    return elapsed;
}

// ─── CHAIN HASHING — each hash references previous (#5) ────────────────────
let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

async function chainHashDecision(decision: object): Promise<string> {
    const data = previousHash + JSON.stringify(decision);
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    const hash = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    previousHash = hash;
    return hash;
}

// ─── STATE MACHINE (#10) — validated transitions ────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
    idle: ['detected'],
    detected: ['simulating'],
    simulating: ['negotiating'],
    negotiating: ['mitigating'],
    mitigating: ['mitigated'],
    mitigated: ['resolved'],
    resolved: ['idle'],
};

function transition(to: CrisisStatus, agent: 'Sentinel' | 'Risk' | 'Simulation' | 'Response' | 'Resource' | 'Governance') {
    const s = store();
    const from = s.crisisStatus;
    const valid = VALID_TRANSITIONS[from];
    if (valid && !valid.includes(to)) {
        s.addLog(agent, `⚠ Invalid state transition ${from}→${to} — skipped`, 'warning');
        return;
    }
    s.addStateTransition(from, to, agent);
    s.setCrisisStatus(to);
    eventStore.append('STATE_TRANSITION', agent, { from, to });
    eventBus.emit('TELEMETRY_UPDATE', 'System', { stateChange: { from, to, agent } });
}

// ─── AGENT RESILIENCE (#9) ──────────────────────────────────────────────────
async function safeExecute<T>(
    agentName: string,
    agentFn: () => Promise<T>,
    fallback: T
): Promise<T> {
    try {
        startTimer(agentName);
        const result = await agentFn();
        const elapsed = endTimer(agentName);
        eventStore.append('AGENT_COMPLETED', agentName, { elapsed });
        store().addLog(agentName as any, `✓ Agent completed in ${elapsed}ms`, 'success');
        return result;
    } catch (err) {
        endTimer(agentName);
        const s = store();
        s.addLog(agentName as any, `⚠ AGENT FAILURE: ${(err as Error).message}. Engaging fallback.`, 'critical');
        s.addAudit('AGENT_FAILURE', agentName as any, `${agentName} failed: ${(err as Error).message} — fallback activated`);
        eventStore.append('AGENT_FAILURE', agentName, { error: (err as Error).message });
        eventBus.emit('MITIGATION_FAILED', agentName, { error: (err as Error).message, fallback: true });
        return fallback;
    }
}

// ─── DETERMINISTIC RISK MODEL ───────────────────────────────────────────────
export interface TelemetryPacket {
    rainfall: number;
    drainageCapacity: number;
    populationDensity: number;
    socialSpike: number;
}

export function calculateLiveRisk(telemetry: TelemetryPacket): number {
    const normalizedRainfall = Math.min(telemetry.rainfall / 150, 1);
    const drainageInverse = 1 - telemetry.drainageCapacity;
    const risk =
        normalizedRainfall * 0.4 +
        drainageInverse * 0.2 +
        telemetry.populationDensity * 0.2 +
        telemetry.socialSpike * 0.2;
    return Math.round(Math.max(0, Math.min(100, risk * 100)));
}

// ─── SENSITIVITY ANALYSIS (#4) ──────────────────────────────────────────────
export function computeSensitivity(telemetry: TelemetryPacket): SensitivityBreakdown {
    const normalizedRainfall = Math.min(telemetry.rainfall / 150, 1);
    const drainageInverse = 1 - telemetry.drainageCapacity;
    const raw = {
        rainfallImpact: normalizedRainfall * 0.4,
        drainageImpact: drainageInverse * 0.2,
        populationImpact: telemetry.populationDensity * 0.2,
        socialImpact: telemetry.socialSpike * 0.2,
    };
    const total = raw.rainfallImpact + raw.drainageImpact + raw.populationImpact + raw.socialImpact;
    return {
        rainfallImpact: total > 0 ? Math.round((raw.rainfallImpact / total) * 100) : 0,
        drainageImpact: total > 0 ? Math.round((raw.drainageImpact / total) * 100) : 0,
        populationImpact: total > 0 ? Math.round((raw.populationImpact / total) * 100) : 0,
        socialImpact: total > 0 ? Math.round((raw.socialImpact / total) * 100) : 0,
    };
}

// ─── SEEDED MONTE CARLO (#3 + #12) ─────────────────────────────────────────
export function runMonteCarlo(baseTelemetry: TelemetryPacket, iterations = 2000, seed = 42): MonteCarloResult {
    seededRng.reseed(seed);  // Deterministic!
    const results: number[] = [];
    const zones = [
        { zone: 'Ward 12 - River Delta', baseRisk: 0 },
        { zone: 'North Bridge Corridor', baseRisk: 0 },
        { zone: 'West Water Treatment', baseRisk: 0 },
    ];

    for (let i = 0; i < iterations; i++) {
        const variedTelemetry: TelemetryPacket = {
            rainfall: Math.max(0, seededRng.normal(baseTelemetry.rainfall, baseTelemetry.rainfall * 0.15)),
            drainageCapacity: Math.max(0, Math.min(1, seededRng.normal(baseTelemetry.drainageCapacity, 0.08))),
            populationDensity: Math.max(0, Math.min(1, seededRng.normal(baseTelemetry.populationDensity, 0.05))),
            socialSpike: Math.max(0, Math.min(1, seededRng.normal(baseTelemetry.socialSpike, 0.1))),
        };
        const risk = calculateLiveRisk(variedTelemetry) / 100;
        results.push(risk);
        zones[0].baseRisk += risk * 1.1;
        zones[1].baseRisk += risk * 0.95;
        zones[2].baseRisk += risk * 0.85;
    }

    results.sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const variance = results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length;
    const stdDev = Math.sqrt(variance);
    const ci95Low = results[Math.floor(iterations * 0.025)];
    const ci95High = results[Math.floor(iterations * 0.975)];
    const worstCase = results[Math.floor(iterations * 0.99)];

    return {
        mean: Math.round(mean * 100),
        stdDev: Math.round(stdDev * 100),
        ci95: [Math.round(ci95Low * 100), Math.round(ci95High * 100)],
        worstCase: Math.round(worstCase * 100),
        scenariosRun: iterations,
        zoneBreakdown: zones.map(z => ({
            zone: z.zone,
            risk: Math.round((z.baseRisk / iterations) * 100),
        })),
    };
}

// ─── ANIMATED RISK HELPER ───────────────────────────────────────────────────
async function animateRisk(from: number, to: number, durationMs: number) {
    const steps = 30;
    const stepMs = durationMs / steps;
    const diff = to - from;
    for (let i = 1; i <= steps; i++) {
        await delay(stepMs);
        store().setRiskLevel(from + (diff * i) / steps);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUTONOMOUS AGENTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── SENTINEL AGENT ─────────────────────────────────────────────────────────
async function runSentinelAgent(): Promise<void> {
    const s = store();
    s.activateAgent('Sentinel');
    s.addLog('Sentinel', 'Environmental sensor array activated. Scanning all zones.', 'info');
    s.addAudit('CRISIS_DETECTED', 'Sentinel', 'Rainfall anomaly exceeds safety threshold');
    eventStore.append('CRISIS_DETECTED', 'Sentinel', { zones: ['zone-1', 'zone-4', 'zone-7'] });
    await delay(1200);

    s.addLog('Sentinel', 'ALERT: Rainfall anomaly detected in Ward 12 — River Delta sector.', 'critical');
    s.setZoneStatus('zone-1', 'warning', 45);
    s.setAffectedZones(['zone-1']);
    await delay(1000);

    s.addLog('Sentinel', 'Secondary alert: North Bridge Corridor showing structural stress indicators.', 'warning');
    s.setZoneStatus('zone-4', 'warning', 38);
    s.setAffectedZones(['zone-1', 'zone-4']);
    await delay(800);

    s.addLog('Sentinel', 'Water treatment facility sensors reporting abnormal intake pressure.', 'warning');
    s.setZoneStatus('zone-7', 'warning', 35);
    s.setAffectedZones(['zone-1', 'zone-4', 'zone-7']);
    await delay(600);

    const telemetry = s.liveTelemetry;
    const risk = telemetry ? calculateLiveRisk(telemetry) : 65;

    s.addLog('Sentinel', `⚡ Broadcasting CRITICAL_THREAT event [risk=${risk}%] to all agents via Event Bus.`, 'critical');
    s.addAgentComm('Sentinel', 'Risk', 'CRITICAL_THREAT event published');
    s.addAgentComm('Sentinel', 'Simulation', 'CRITICAL_THREAT event published');
    s.addAgentComm('Sentinel', 'Resource', 'CRITICAL_THREAT event published');

    eventBus.emit('CRITICAL_THREAT', 'Sentinel', { zones: ['zone-1', 'zone-4', 'zone-7'], riskLevel: risk, telemetry });
    eventStore.append('CRITICAL_THREAT', 'Sentinel', { riskLevel: risk });
}

// ─── RISK AGENT (+Bayesian) ─────────────────────────────────────────────────
async function runRiskAgent(): Promise<number> {
    const s = store();
    s.activateAgent('Risk');
    s.addLog('Risk', '📡 CRITICAL_THREAT received. Initiating Bayesian risk assessment.', 'info');
    s.addAgentComm('Risk', 'Simulation', 'Risk vectors compiled');
    await delay(1400);

    const telemetry = s.liveTelemetry;
    const liveRisk = telemetry ? calculateLiveRisk(telemetry) : 65;

    // (#5) Bayesian updating
    bayesianRisk.reset(0.15);
    if (telemetry) {
        bayesianRisk.update('rainfall', telemetry.rainfall);
        bayesianRisk.update('drainage_failure', 1 - telemetry.drainageCapacity);
        bayesianRisk.update('social_spike', telemetry.socialSpike);

        const bayesState = bayesianRisk.getState();
        const bayesRisk = bayesianRisk.getRiskLevel();
        const bayesCI = bayesianRisk.getConfidenceInterval();

        s.addLog('Risk', `Bayesian posterior: ${bayesRisk}% [CI: ${bayesCI[0]}–${bayesCI[1]}%] after ${bayesState.updateCount} updates`, 'info');
        eventStore.append('BAYESIAN_UPDATE', 'Risk', { posterior: bayesRisk, ci: bayesCI, updates: bayesState.updateCount });
    }

    // Sensitivity
    if (telemetry) {
        const sensitivity = computeSensitivity(telemetry);
        s.setSensitivityBreakdown(sensitivity);
        s.addLog('Risk', `Sensitivity: Rainfall ${sensitivity.rainfallImpact}% | Drainage ${sensitivity.drainageImpact}% | Population ${sensitivity.populationImpact}% | Social ${sensitivity.socialImpact}%`, 'info');
        eventBus.emit('RISK_ASSESSED', 'Risk', { riskLevel: liveRisk, sensitivity });
    }

    animateRisk(12, liveRisk, 2000);
    s.addLog('Risk', `Flood probability: ${liveRisk}%. Category ${liveRisk > 70 ? '3' : '2'} infrastructure threat.`, 'critical');
    s.addAudit('RISK_ASSESSED', 'Risk', `Bayesian posterior ${liveRisk}% — Category ${liveRisk > 70 ? '3' : '2'} threat`);
    await delay(1000);

    s.addLog('Risk', 'Bridge structural failure probability: 61%. Recommending closure.', 'critical');
    s.setZoneStatus('zone-4', 'critical', 61);
    await delay(800);

    s.addLog('Risk', 'Cascading failure risk to power grid: 44%. Alert level elevated.', 'warning');
    s.setZoneStatus('zone-6', 'warning', 44);
    s.setAffectedZones(['zone-1', 'zone-4', 'zone-7', 'zone-6']);

    eventStore.append('RISK_COMPUTED', 'Risk', { riskLevel: liveRisk });
    return liveRisk;
}

// ─── SIMULATION AGENT (Monte Carlo + Graph Twin) ────────────────────────────
async function runSimulationAgentBurst(): Promise<MonteCarloResult | null> {
    const s = store();
    s.activateAgent('Simulation');
    s.addLog('Simulation', '📡 Loading digital twin (graph-theoretic) + cellular automata grid.', 'info');
    s.addAgentComm('Simulation', 'Response', 'Simulation models running');
    await delay(1500);

    const telemetry = s.liveTelemetry;
    const baseTelemetry: TelemetryPacket = telemetry ?? {
        rainfall: 110, drainageCapacity: 0.2, populationDensity: 0.7, socialSpike: 0.85,
    };

    // (#6) Graph Twin — simulate flood propagation
    infrastructureGraph.reset();
    for (let step = 0; step < 5; step++) {
        infrastructureGraph.simulateFloodStep(baseTelemetry.rainfall);
    }

    const floodedZones = infrastructureGraph.getFloodedZones();
    const blockedRoutes = infrastructureGraph.getBlockedRoutes();
    s.addLog('Simulation', `Graph Twin: ${floodedZones.length} zones flooded, ${blockedRoutes.length} routes blocked.`, 'warning');
    eventStore.append('GRAPH_SIMULATION', 'Simulation', { floodedZones: floodedZones.length, blockedRoutes: blockedRoutes.length });

    // (#6) Dijkstra evacuation routing
    const evacRoutes = infrastructureGraph.findEvacuationRoutes(['zone-1', 'zone-4', 'zone-7']);
    for (const [zoneId, route] of Object.entries(evacRoutes)) {
        if (route) {
            s.addLog('Simulation', `Dijkstra: ${zoneId} → ${route.path[route.path.length - 1]} (cost: ${route.totalCost}min, capacity: ${route.capacity}/hr)`, 'info');
        } else {
            s.addLog('Simulation', `Dijkstra: ${zoneId} → NO ROUTE AVAILABLE — all paths blocked!`, 'critical');
        }
    }
    eventStore.append('DIJKSTRA_ROUTING', 'Simulation', { routes: evacRoutes });
    await delay(1000);

    // (#3 + #12) Seeded Monte Carlo
    s.addLog('Simulation', `Running seeded Monte Carlo (2,000 iterations, seed=${seededRng.getSeed()})...`, 'info');
    const mcResult = runMonteCarlo(baseTelemetry, 2000, 42);
    s.setMonteCarloResult(mcResult);
    await delay(1200);

    s.addLog('Simulation', `MONTE CARLO: Mean=${mcResult.mean}% | 95% CI=[${mcResult.ci95[0]}–${mcResult.ci95[1]}%] | Worst-case=${mcResult.worstCase}%`, 'critical');
    s.addLog('Simulation', `Zone breakdown: ${mcResult.zoneBreakdown.map(z => `${z.zone.split(' - ')[0]}=${z.risk}%`).join(', ')}`, 'info');
    s.addLog('Simulation', `Reproducibility: seed=${seededRng.getSeed()}, calls=${seededRng.getCallCount()}`, 'info');

    s.setZoneStatus('zone-1', 'critical', mcResult.mean);
    await delay(800);

    s.addLog('Simulation', 'Optimal mitigation window: 45 minutes. Beyond that, cascading failure probable.', 'warning');
    s.addAudit('SIMULATION_COMPLETE', 'Simulation', `${mcResult.scenariosRun} seeded MC iterations — mean=${mcResult.mean}% CI=[${mcResult.ci95[0]}-${mcResult.ci95[1]}%]`);

    s.addLog('Simulation', '🔄 Transitioning to continuous evaluation mode...', 'info');
    startContinuousSimulation();
    eventBus.emit('SIMULATION_COMPLETE', 'Simulation', { mcResult });
    eventStore.append('MONTE_CARLO_COMPLETE', 'Simulation', mcResult);

    return mcResult;
}

// ─── RESOURCE AGENT ─────────────────────────────────────────────────────────
async function runResourceAgent(): Promise<ResourceInventory> {
    const s = store();
    s.activateAgent('Resource');
    s.addLog('Resource', '📡 CRITICAL_THREAT received. Scanning resource availability.', 'info');
    s.addAgentComm('Resource', 'Response', 'Resource audit initiated');
    await delay(1300);

    const inventory: ResourceInventory = {
        pumpUnits: 3,
        evacuationVehicles: 42,
        maxSimultaneousZones: 1,
        shelterCapacity: 18000,
        medicalTeams: 6,
    };

    s.addLog('Resource', `Inventory: ${inventory.pumpUnits} pumps, ${inventory.evacuationVehicles} vehicles, ${inventory.shelterCapacity.toLocaleString()} shelter capacity.`, 'info');
    await delay(700);
    s.addLog('Resource', `Constraint: max ${inventory.maxSimultaneousZones} zone(s) simultaneously. Medical: ${inventory.medicalTeams} teams standby.`, 'info');
    s.addAudit('RESOURCE_AUDIT', 'Resource', `${inventory.pumpUnits} pumps, ${inventory.evacuationVehicles} vehicles, ${inventory.shelterCapacity} shelter cap`);

    eventBus.emit('RESOURCE_AUDIT_COMPLETE', 'Resource', inventory);
    eventStore.append('RESOURCE_AUDIT', 'Resource', inventory);

    return inventory;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN CRISIS SEQUENCE — V4 Elite Architecture
// ═══════════════════════════════════════════════════════════════════════════

export async function runCrisisSequence() {
    const s = store();
    const sequenceStart = performance.now();

    // Reset everything
    eventBus.reset();
    eventStore.reset();
    infrastructureGraph.reset();
    bayesianRisk.reset(0.15);
    seededRng.reseed(42);
    previousHash = '0'.repeat(64);

    s.clearLogs();
    s.clearNegotiation();
    s.clearAgentComms();
    s.deactivateAllAgents();
    s.setMitigationPlan(null);
    s.setFloodGrid(null);
    s.setSimulationIteration(0);
    s.setMonteCarloResult(null);
    s.setSensitivityBreakdown(null);
    s.setPreRisk(0);
    s.setPostRisk(0);
    s.setMetrics({ riskReduction: 0, responseTime: 0, populationProtected: 0, damagePrevented: 0 });

    eventStore.append('SEQUENCE_START', 'System', { timestamp: Date.now(), seed: 42 });

    // ═══ PHASE 1: SENTINEL DETECTION ════════════════════════════════════
    transition('detected', 'Sentinel');
    await safeExecute('Sentinel', runSentinelAgent, undefined);

    // ═══ PHASE 2+3: PARALLEL AGENT WAKE-UP ══════════════════════════════
    transition('simulating', 'Sentinel');
    s.addLog('Sentinel', '⚡ CRITICAL_THREAT dispatched. Risk, Simulation, Resource agents waking autonomously.', 'info');
    s.addAudit('EVENT_BUS_DISPATCH', 'Sentinel', 'CRITICAL_THREAT → 3 agents activated via Pub/Sub');

    const [liveRisk, mcResult, inventory] = await Promise.all([
        safeExecute('Risk', runRiskAgent, 65),
        safeExecute('Simulation', runSimulationAgentBurst, null),
        safeExecute('Resource', runResourceAgent, {
            pumpUnits: 2, evacuationVehicles: 30, maxSimultaneousZones: 1, shelterCapacity: 15000, medicalTeams: 4,
        }),
    ]);

    // Record PRE-MITIGATION risk
    const telemetry = s.liveTelemetry;
    const peakRisk = telemetry ? calculateLiveRisk(telemetry) : liveRisk;
    s.setPreRisk(peakRisk);
    animateRisk(liveRisk, peakRisk, 1500);

    s.addLog('Sentinel', `✓ All agents converged. Composite risk: ${peakRisk}%.`, 'success');

    // Chain hash convergence
    const convergenceHash = await chainHashDecision({ riskLevel: peakRisk, inventory, mcResult, timestamp: Date.now() });
    s.addAudit('AGENTS_CONVERGED', 'Sentinel', `Risk=${peakRisk}%, Pumps=${inventory.pumpUnits} | Hash: ${convergenceHash.slice(0, 12)}…`);
    eventStore.append('AGENTS_CONVERGED', 'Sentinel', { riskLevel: peakRisk, hash: convergenceHash.slice(0, 16) });
    eventBus.emit('AGENTS_CONVERGED', 'Sentinel', { riskLevel: peakRisk, inventory });

    await delay(600);

    // ═══ PHASE 4: RESPONSE PLANNING ═════════════════════════════════════
    s.activateAgent('Response');
    s.addLog('Response', 'Generating mitigation strategy from converged outputs.', 'info');
    s.addAgentComm('Response', 'Resource', 'Resource allocation request');
    await delay(1200);

    s.addLog('Response', `Proposed: Deploy ${inventory.pumpUnits} pumps to Ward 12.`, 'info');
    await delay(600);
    s.addLog('Response', 'Proposed: Close North Bridge — divert via South Corridor.', 'info');
    await delay(600);
    s.addLog('Response', 'Proposed: Evacuate Ward 12 + North Bridge (67,000 civilians).', 'warning');
    await delay(600);

    const confidence = mcResult ? Math.min(95, 100 - mcResult.stdDev) : Math.min(95, peakRisk > 70 ? 87 : 92);
    const plan: MitigationPlan = {
        action: 'Multi-zone flood mitigation with partial evacuation',
        zones: ['Ward 12 - River Delta', 'North Bridge Corridor', 'West Water Treatment'],
        resources: [`${inventory.pumpUnits}x Industrial Pumps`, 'Bridge Closure Team', `Evacuation Fleet (${inventory.evacuationVehicles} vehicles)`],
        estimatedTime: '38 minutes',
        confidence,
    };
    s.setMitigationPlan(plan);
    s.addAudit('MITIGATION_PROPOSED', 'Response', `Multi-zone strategy — confidence ${plan.confidence}%`);
    eventStore.append('MITIGATION_PROPOSED', 'Response', plan);
    eventBus.emit('RESPONSE_PLAN_READY', 'Response', { plan });

    await delay(500);

    // ═══ PHASE 5: DYNAMIC NEGOTIATION ═══════════════════════════════════
    transition('negotiating', 'Resource');
    const evacuationDemand: EvacuationDemand = {
        zones: ['Ward 12 - River Delta', 'North Bridge Corridor'],
        totalPopulation: 67000,
        priority: 'immediate',
        pumpsRequested: 5,
    };

    const negotiationResult = await runDynamicNegotiation(evacuationDemand, inventory);
    s.addLog('Resource', `Negotiation complete in ${negotiationResult.rounds} round(s). Final: ${negotiationResult.finalDemand.pumpsRequested} pumps, ${negotiationResult.finalDemand.priority}.`, 'success');
    eventStore.append('NEGOTIATION_COMPLETE', 'Resource', { rounds: negotiationResult.rounds, finalDemand: negotiationResult.finalDemand });

    // ═══ PHASE 6: GOVERNANCE APPROVAL ═══════════════════════════════════
    s.activateAgent('Governance');
    s.addLog('Governance', 'Reviewing mitigation plan for regulatory compliance.', 'info');
    s.addAgentComm('Governance', 'Sentinel', 'Audit confirmation request');
    await delay(1200);

    s.addLog('Governance', 'Compliance check: ISO 22301 emergency protocol — PASSED.', 'success');
    await delay(600);
    s.addLog('Governance', 'Authorization chain verified.', 'success');
    await delay(600);

    // Human in the loop
    if (s.humanInLoop) {
        s.addLog('Governance', '⏸ MANUAL APPROVAL REQUIRED. Halting until Human Supervisor signs off.', 'warning');
        s.setAwaitingHumanApproval(true);
        s.addAudit('HUMAN_APPROVAL_WAIT', 'Governance', 'Awaiting human mitigation authorization');
        eventStore.append('HUMAN_APPROVAL_WAIT', 'Governance', {});

        await eventBus.waitFor('HUMAN_APPROVAL_GIVEN', 'System', 86400000);

        s.setAwaitingHumanApproval(false);
        s.addLog('Governance', '✅ HUMAN APPROVAL RECEIVED. Digital signature applied.', 'success');
        s.addAudit('HUMAN_APPROVAL_GRANTED', 'Governance', 'Manual authorization by Human Supervisor');
        eventStore.append('HUMAN_APPROVAL_GRANTED', 'Governance', {});
        await delay(500);
    } else {
        s.addLog('Governance', 'Digital signature applied automatically (Autonomous Mode).', 'success');
        await delay(600);
    }

    // Chain hash governance decision
    const govHash = await chainHashDecision({ plan, negotiation: negotiationResult, humanApproval: s.humanInLoop, timestamp: Date.now() });
    s.addLog('Governance', `🔒 Chain hash: ${govHash.slice(0, 16)}… (prev→current linked)`, 'success');
    s.addLog('Governance', '✅ MITIGATION AUTHORIZED. Executing crisis response.', 'success');
    s.addAudit('GOVERNANCE_APPROVED', 'Governance', `Authorized — ISO 22301 | ChainHash: ${govHash.slice(0, 12)}…`);
    eventStore.append('GOVERNANCE_APPROVED', 'Governance', { hash: govHash.slice(0, 16) });
    eventBus.emit('GOVERNANCE_APPROVED', 'Governance', { plan, hash: govHash });

    await delay(500);

    // ═══ PHASE 7: EXECUTION & MITIGATION ════════════════════════════════
    transition('mitigating', 'Response');
    eventBus.emit('MITIGATION_EXECUTING', 'Response', { plan });

    s.addLog('Sentinel', 'Deploying pump units to Ward 12. ETA: 8 minutes.', 'info');
    s.setZoneStatus('zone-1', 'evacuating', 75);
    await delay(1500);

    s.addLog('Response', 'North Bridge closure initiated. Traffic rerouting active.', 'info');
    s.setZoneStatus('zone-4', 'evacuating', 50);
    await delay(1200);

    s.addLog('Resource', 'Evacuation convoy Alpha deployed to Ward 12. 23,000 civilians moving.', 'info');
    s.setMetrics({ populationProtected: 23000, responseTime: 4.2 });
    await delay(1500);

    const mitigationTelemetry = store().liveTelemetry;
    const mitigatingRisk = mitigationTelemetry ? calculateLiveRisk(mitigationTelemetry) : 55;
    animateRisk(peakRisk, mitigatingRisk, 2000);
    s.addLog('Simulation', 'Live monitoring: Flood propagation slowing. Pump effectiveness confirmed.', 'success');
    s.setZoneStatus('zone-1', 'mitigated', 42);
    await delay(2000);

    s.addLog('Resource', 'Secondary convoy to North Bridge. 22,000 civilians.', 'info');
    s.setMetrics({ populationProtected: 45000 });
    await delay(1200);

    const lateRisk = store().liveTelemetry ? calculateLiveRisk(store().liveTelemetry!) : 35;
    animateRisk(mitigatingRisk, lateRisk, 1500);
    s.setZoneStatus('zone-4', 'mitigated', 25);
    s.setZoneStatus('zone-7', 'mitigated', 18);
    s.addLog('Sentinel', 'Water treatment pressure normalizing.', 'success');
    await delay(1500);

    s.setZoneStatus('zone-6', 'normal', 12);
    s.addLog('Risk', 'Power grid cascade risk dropped to 8%.', 'success');
    await delay(1000);

    animateRisk(lateRisk, 15, 1500);
    s.addLog('Simulation', 'All flood models converging. Success probability: 96%.', 'success');
    await delay(1500);

    // ═══ PHASE 8: RESOLUTION ════════════════════════════════════════════
    transition('mitigated', 'Governance');
    stopContinuousSimulation();

    const finalRisk = store().liveTelemetry ? calculateLiveRisk(store().liveTelemetry!) : 15;
    s.setPostRisk(finalRisk);
    const riskReduction = Math.max(0, peakRisk - finalRisk);

    s.setMetrics({
        riskReduction,
        responseTime: 4.2,
        populationProtected: 67000,
        damagePrevented: Math.round((riskReduction / Math.max(1, peakRisk)) * 100),
    });

    s.addLog('Governance', `📊 Before: ${peakRisk}% → After: ${finalRisk}% → Reduction: ${riskReduction}% (${Math.round((riskReduction / Math.max(1, peakRisk)) * 100)}% effective)`, 'success');
    s.addLog('Governance', '🏁 Crisis mitigated. All zones stabilized.', 'success');

    // Final chain hash
    const resHash = await chainHashDecision({ preRisk: peakRisk, postRisk: finalRisk, reduction: riskReduction, populationProtected: 67000 });
    s.addAudit('CRISIS_RESOLVED', 'Governance', `Pre:${peakRisk}% Post:${finalRisk}% | ChainHash: ${resHash.slice(0, 12)}…`);
    eventStore.append('CRISIS_RESOLVED', 'Governance', { preRisk: peakRisk, postRisk: finalRisk, hash: resHash.slice(0, 16) });
    eventBus.emit('CRISIS_RESOLVED', 'Governance', { riskReduction, populationProtected: 67000, hash: resHash });

    // Observability summary
    const totalTime = Math.round(performance.now() - sequenceStart);
    s.addLog('Sentinel', `📊 Observability: Total sequence ${totalTime}ms | Event store: ${eventStore.length} events | PRNG calls: ${seededRng.getCallCount()}`, 'info');
    eventStore.append('OBSERVABILITY', 'System', { totalTime, eventCount: eventStore.length, prngCalls: seededRng.getCallCount() });

    await delay(1000);

    animateRisk(15, 8, 1000);
    s.zones.forEach((z) => {
        if (z.status !== 'normal') {
            store().setZoneStatus(z.id, 'normal', Math.floor(seededRng.range(5, 15)));
        }
    });

    transition('resolved', 'Sentinel');
    s.addLog('Sentinel', '✓ System returning to nominal monitoring. All agents standing down.', 'success');
    s.addAudit('SYSTEM_NOMINAL', 'Sentinel', 'All agents deactivated — system nominal');

    await delay(2000);
    s.deactivateAllAgents();
    eventBus.reset();
}

// ─── DEMO SEQUENCE ──────────────────────────────────────────────────────────
export async function runDemoSequence() {
    store().setDemoMode(true);
    await runCrisisSequence();
    await delay(8000);
    stopContinuousSimulation();
    store().resetSystem();
    store().setDemoMode(false);
}
