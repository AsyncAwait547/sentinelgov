// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Crisis Engine V3 — Deep Upgrade: 10-Point Agentic Architecture
// ─────────────────────────────────────────────────────────────────────────────
//
// V3 Upgrades:
//   1. ✅ Event Bus — Pub/Sub decoupled agents (already in eventBus.ts)
//   2. ✅ Monte Carlo — Quantitative distribution + 95% CI + worst-case
//   3. ✅ Sensitivity Analysis — Explainable risk factor breakdown
//   4. ✅ Utility-Based Negotiation — Zone priority by risk × population
//   5. ✅ Governance Hashing — SHA-256 immutable decision audit
//   6. ✅ Agent Resilience — safeExecute wrapper with fallback
//   7. ✅ Before vs After — Quantified mitigation impact
//   8. ✅ State Machine — Explicit transitions logged
//   9. ✅ Granular Events — Fine-grained event bus emissions
//  10. ✅ Visual Hooks — State timeline, glow triggers, etc.
//
// ─────────────────────────────────────────────────────────────────────────────

import { useSystemStore } from '../store/useSystemStore';
import type { MitigationPlan, CrisisStatus, SensitivityBreakdown, MonteCarloResult } from '../store/useSystemStore';
import { eventBus } from './eventBus';
import { runDynamicNegotiation, type ResourceInventory, type EvacuationDemand } from './negotiationEngine';
import { startContinuousSimulation, stopContinuousSimulation } from './continuousSimulation';

// ─── HELPERS ────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const store = () => useSystemStore.getState();

// ─── SHA-256 DECISION HASHING (#5) ──────────────────────────────────────────
async function hashDecision(decision: object): Promise<string> {
    const data = JSON.stringify(decision);
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── STATE MACHINE TRANSITION (#8) ──────────────────────────────────────────
function transition(to: CrisisStatus, agent: 'Sentinel' | 'Risk' | 'Simulation' | 'Response' | 'Resource' | 'Governance') {
    const s = store();
    const from = s.crisisStatus;
    s.addStateTransition(from, to, agent);
    s.setCrisisStatus(to);
    eventBus.emit('TELEMETRY_UPDATE', 'System', { stateChange: { from, to, agent } });
}

// ─── AGENT RESILIENCE — safeExecute WRAPPER (#6) ────────────────────────────
async function safeExecute<T>(
    agentName: string,
    agentFn: () => Promise<T>,
    fallback: T
): Promise<T> {
    try {
        return await agentFn();
    } catch (err) {
        const s = store();
        s.addLog(agentName as any, `⚠ AGENT FAILURE: ${(err as Error).message}. Engaging fallback.`, 'critical');
        s.addAudit('AGENT_FAILURE', agentName as any, `${agentName} failed: ${(err as Error).message} — fallback activated`);
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

// ─── SENSITIVITY ANALYSIS (#3) ──────────────────────────────────────────────
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

    // Return as percentages of total contribution
    return {
        rainfallImpact: total > 0 ? Math.round((raw.rainfallImpact / total) * 100) : 0,
        drainageImpact: total > 0 ? Math.round((raw.drainageImpact / total) * 100) : 0,
        populationImpact: total > 0 ? Math.round((raw.populationImpact / total) * 100) : 0,
        socialImpact: total > 0 ? Math.round((raw.socialImpact / total) * 100) : 0,
    };
}

// ─── MONTE CARLO SIMULATION (#2) ────────────────────────────────────────────
function randomNormal(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function runMonteCarlo(baseTelemetry: TelemetryPacket, iterations = 2000): MonteCarloResult {
    const results: number[] = [];
    const zones = [
        { zone: 'Ward 12 - River Delta', baseRisk: 0 },
        { zone: 'North Bridge Corridor', baseRisk: 0 },
        { zone: 'West Water Treatment', baseRisk: 0 },
    ];

    for (let i = 0; i < iterations; i++) {
        const variedTelemetry: TelemetryPacket = {
            rainfall: Math.max(0, randomNormal(baseTelemetry.rainfall, baseTelemetry.rainfall * 0.15)),
            drainageCapacity: Math.max(0, Math.min(1, randomNormal(baseTelemetry.drainageCapacity, 0.08))),
            populationDensity: Math.max(0, Math.min(1, randomNormal(baseTelemetry.populationDensity, 0.05))),
            socialSpike: Math.max(0, Math.min(1, randomNormal(baseTelemetry.socialSpike, 0.1))),
        };
        const risk = calculateLiveRisk(variedTelemetry) / 100;
        results.push(risk);

        // Accumulate per-zone risks
        zones[0].baseRisk += risk * 1.1;   // Ward 12 is most exposed
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
//  AUTONOMOUS AGENTS — wrapped in safeExecute for resilience (#6)
// ═══════════════════════════════════════════════════════════════════════════

// ─── SENTINEL AGENT ─────────────────────────────────────────────────────────
async function runSentinelAgent(): Promise<void> {
    const s = store();

    s.activateAgent('Sentinel');
    s.addLog('Sentinel', 'Environmental sensor array activated. Scanning all zones.', 'info');
    s.addAudit('CRISIS_DETECTED', 'Sentinel', 'Rainfall anomaly exceeds safety threshold');
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

    // ─── Broadcast CRITICAL_THREAT via Event Bus ────────────────────────
    const telemetry = s.liveTelemetry;
    const risk = telemetry ? calculateLiveRisk(telemetry) : 65;

    s.addLog('Sentinel', `⚡ Broadcasting CRITICAL_THREAT event [risk=${risk}%] to all agents via Event Bus.`, 'critical');
    s.addAgentComm('Sentinel', 'Risk', 'CRITICAL_THREAT event published');
    s.addAgentComm('Sentinel', 'Simulation', 'CRITICAL_THREAT event published');
    s.addAgentComm('Sentinel', 'Resource', 'CRITICAL_THREAT event published');

    eventBus.emit('CRITICAL_THREAT', 'Sentinel', {
        zones: ['zone-1', 'zone-4', 'zone-7'],
        riskLevel: risk,
        telemetry,
    });
}

// ─── RISK AGENT ─────────────────────────────────────────────────────────────
async function runRiskAgent(): Promise<number> {
    const s = store();

    s.activateAgent('Risk');
    s.addLog('Risk', '📡 CRITICAL_THREAT received. Initiating multi-variable risk assessment.', 'info');
    s.addAgentComm('Risk', 'Simulation', 'Risk vectors compiled');
    await delay(1400);

    const telemetry = s.liveTelemetry;
    const liveRisk = telemetry ? calculateLiveRisk(telemetry) : 65;

    // (#3) Sensitivity Analysis
    if (telemetry) {
        const sensitivity = computeSensitivity(telemetry);
        s.setSensitivityBreakdown(sensitivity);
        s.addLog('Risk', `Sensitivity: Rainfall ${sensitivity.rainfallImpact}% | Drainage ${sensitivity.drainageImpact}% | Population ${sensitivity.populationImpact}% | Social ${sensitivity.socialImpact}%`, 'info');
        eventBus.emit('RISK_ASSESSED', 'Risk', { riskLevel: liveRisk, sensitivity });
    }

    animateRisk(12, liveRisk, 2000);
    s.addLog('Risk', `Flood probability in Ward 12: ${liveRisk}%. Category ${liveRisk > 70 ? '3' : '2'} infrastructure threat.`, 'critical');
    s.addAudit('RISK_ASSESSED', 'Risk', `Flood probability ${liveRisk}% — Category ${liveRisk > 70 ? '3' : '2'} threat`);
    await delay(1000);

    s.addLog('Risk', 'Bridge structural failure probability: 61%. Recommending closure.', 'critical');
    s.setZoneStatus('zone-4', 'critical', 61);
    await delay(800);

    s.addLog('Risk', 'Cascading failure risk to power grid: 44%. Alert level elevated.', 'warning');
    s.setZoneStatus('zone-6', 'warning', 44);
    s.setAffectedZones(['zone-1', 'zone-4', 'zone-7', 'zone-6']);

    return liveRisk;
}

// ─── SIMULATION AGENT (initial burst) ───────────────────────────────────────
async function runSimulationAgentBurst(): Promise<MonteCarloResult | null> {
    const s = store();

    s.activateAgent('Simulation');
    s.addLog('Simulation', '📡 CRITICAL_THREAT received. Loading digital twin + cellular automata grid.', 'info');
    s.addAgentComm('Simulation', 'Response', 'Simulation models running');
    await delay(1500);

    const telemetry = s.liveTelemetry;

    // (#2) Monte Carlo Simulation — run 2000 iterations
    s.addLog('Simulation', 'Running Monte Carlo flood propagation (2,000 iterations)...', 'info');

    const baseTelemetry: TelemetryPacket = telemetry ?? {
        rainfall: 110, drainageCapacity: 0.2, populationDensity: 0.7, socialSpike: 0.85,
    };

    const mcResult = runMonteCarlo(baseTelemetry, 2000);
    s.setMonteCarloResult(mcResult);
    await delay(1200);

    s.addLog('Simulation', `MONTE CARLO: Mean=${mcResult.mean}% | 95% CI=[${mcResult.ci95[0]}–${mcResult.ci95[1]}%] | Worst-case=${mcResult.worstCase}%`, 'critical');
    s.addLog('Simulation', `Zone breakdown: ${mcResult.zoneBreakdown.map(z => `${z.zone.split(' - ')[0]}=${z.risk}%`).join(', ')}`, 'info');

    s.setZoneStatus('zone-1', 'critical', mcResult.mean);
    await delay(800);

    s.addLog('Simulation', 'Optimal mitigation window: 45 minutes. Beyond that, cascading failure probable.', 'warning');
    s.addLog('Simulation', 'Recommended actions: pump deployment, bridge closure, partial evacuation.', 'info');
    s.addAudit('SIMULATION_COMPLETE', 'Simulation', `${mcResult.scenariosRun} Monte Carlo iterations — mean=${mcResult.mean}% 95%CI=[${mcResult.ci95[0]}-${mcResult.ci95[1]}%]`);

    // Start continuous evaluation loop
    s.addLog('Simulation', '🔄 Transitioning to continuous evaluation mode...', 'info');
    startContinuousSimulation();

    eventBus.emit('SIMULATION_COMPLETE', 'Simulation', { mcResult });

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

    return inventory;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN CRISIS SEQUENCE — V3 Full Agentic Architecture
// ═══════════════════════════════════════════════════════════════════════════

export async function runCrisisSequence() {
    const s = store();

    // Reset
    eventBus.reset();
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

    // ═══ PHASE 1: SENTINEL DETECTION (#8 State Machine) ═════════════════
    transition('detected', 'Sentinel');
    await safeExecute('Sentinel', runSentinelAgent, undefined);

    // ═══ PHASE 2+3: PARALLEL AGENT WAKE-UP (#1 Event Bus + #6 safeExecute)
    transition('simulating', 'Sentinel');
    s.addLog('Sentinel', '⚡ CRITICAL_THREAT event dispatched. Risk, Simulation, Resource agents waking autonomously.', 'info');
    s.addAudit('EVENT_BUS_DISPATCH', 'Sentinel', 'CRITICAL_THREAT → Risk + Simulation + Resource agents activated via Pub/Sub');

    // All three agents subscribe and fire in parallel — wrapped in safeExecute
    const [liveRisk, mcResult, inventory] = await Promise.all([
        safeExecute('Risk', runRiskAgent, 65),
        safeExecute('Simulation', runSimulationAgentBurst, null),
        safeExecute('Resource', runResourceAgent, {
            pumpUnits: 2, evacuationVehicles: 30, maxSimultaneousZones: 1, shelterCapacity: 15000, medicalTeams: 4,
        }),
    ]);

    // (#7) Record PRE-MITIGATION risk
    const telemetry = s.liveTelemetry;
    const peakRisk = telemetry ? calculateLiveRisk(telemetry) : liveRisk;
    s.setPreRisk(peakRisk);
    animateRisk(liveRisk, peakRisk, 1500);

    s.addLog('Sentinel', `✓ All agents converged via Event Bus. Composite risk: ${peakRisk}%.`, 'success');

    // (#5) Hash the convergence decision
    const convergenceDecision = { riskLevel: peakRisk, inventory, mcResult, timestamp: Date.now() };
    const convergenceHash = await hashDecision(convergenceDecision);
    s.addAudit('AGENTS_CONVERGED', 'Sentinel', `Risk=${peakRisk}%, Pumps=${inventory.pumpUnits}, Vehicles=${inventory.evacuationVehicles} | Hash: ${convergenceHash.slice(0, 12)}…`);

    eventBus.emit('AGENTS_CONVERGED', 'Sentinel', { riskLevel: peakRisk, inventory });

    await delay(600);

    // ═══ PHASE 4: RESPONSE PLANNING ═════════════════════════════════════
    s.activateAgent('Response');
    s.addLog('Response', 'Generating mitigation strategy from converged agent outputs.', 'info');
    s.addAgentComm('Response', 'Resource', 'Resource allocation request');
    await delay(1200);

    s.addLog('Response', `Proposed: Deploy ${inventory.pumpUnits} pumps to Ward 12.`, 'info');
    await delay(600);
    s.addLog('Response', 'Proposed: Close North Bridge — divert traffic via South Corridor.', 'info');
    await delay(600);
    s.addLog('Response', 'Proposed: Evacuate Ward 12 and North Bridge zones (67,000 civilians).', 'warning');
    await delay(600);

    const confidence = mcResult
        ? Math.min(95, 100 - mcResult.stdDev)
        : Math.min(95, peakRisk > 70 ? 87 : 92);

    const plan: MitigationPlan = {
        action: 'Multi-zone flood mitigation with partial evacuation',
        zones: ['Ward 12 - River Delta', 'North Bridge Corridor', 'West Water Treatment'],
        resources: [`${inventory.pumpUnits}x Industrial Pumps`, 'Bridge Closure Team', `Evacuation Fleet (${inventory.evacuationVehicles} vehicles)`],
        estimatedTime: '38 minutes',
        confidence,
    };
    s.setMitigationPlan(plan);
    s.addAudit('MITIGATION_PROPOSED', 'Response', `Multi-zone strategy — confidence ${plan.confidence}%`);

    eventBus.emit('RESPONSE_PLAN_READY', 'Response', { plan });

    await delay(500);

    // ═══ PHASE 5: DYNAMIC NEGOTIATION (#4 Utility-Based) ════════════════
    transition('negotiating', 'Resource');

    const evacuationDemand: EvacuationDemand = {
        zones: ['Ward 12 - River Delta', 'North Bridge Corridor'],
        totalPopulation: 67000,
        priority: 'immediate',
        pumpsRequested: 5, // Intentionally over-request to trigger negotiation
    };

    const negotiationResult = await runDynamicNegotiation(evacuationDemand, inventory);

    s.addLog(
        'Resource',
        `Negotiation complete in ${negotiationResult.rounds} round(s). Final: ${negotiationResult.finalDemand.priority} evac, ${negotiationResult.finalDemand.pumpsRequested} pumps.`,
        'success'
    );

    // ═══ PHASE 6: GOVERNANCE APPROVAL (#5 Hashing) ══════════════════════
    s.activateAgent('Governance');
    s.addLog('Governance', 'Reviewing mitigation plan for regulatory compliance.', 'info');
    s.addAgentComm('Governance', 'Sentinel', 'Audit confirmation request');
    await delay(1200);

    s.addLog('Governance', 'Compliance check: ISO 22301 emergency protocol — PASSED.', 'success');
    await delay(600);
    s.addLog('Governance', 'Authorization chain verified.', 'success');
    await delay(600);

    if (s.humanInLoop) {
        s.addLog('Governance', '⏸ MANUAL APPROVAL REQUIRED. Halting execution until Human Supervisor signs off.', 'warning');
        s.setAwaitingHumanApproval(true);
        s.addAudit('HUMAN_APPROVAL_WAIT', 'Governance', 'Awaiting human mitigation authorization');

        await eventBus.waitFor('HUMAN_APPROVAL_GIVEN', 'System', 86400000);

        s.setAwaitingHumanApproval(false);
        s.addLog('Governance', '✅ HUMAN APPROVAL RECEIVED. Digital signature applied by Supervisor.', 'success');
        s.addAudit('HUMAN_APPROVAL_GRANTED', 'Governance', 'Manual authorization applied by Human Supervisor');
        await delay(500);
    } else {
        s.addLog('Governance', 'Digital signature applied automatically (Autonomous Mode).', 'success');
        await delay(600);
    }

    // (#5) Hash the governance decision
    const govDecision = { plan, negotiation: negotiationResult, humanApproval: s.humanInLoop, timestamp: Date.now() };
    const govHash = await hashDecision(govDecision);
    s.addLog('Governance', `🔒 Decision hash: ${govHash.slice(0, 16)}… (SHA-256 immutable)`, 'success');
    s.addLog('Governance', '✅ MITIGATION AUTHORIZED. Executing crisis response protocol.', 'success');

    const auditDetail = `Mitigation authorized — ISO 22301 compliant | Hash: ${govHash.slice(0, 12)}…`;
    // We add audit with hash and confidence
    store().addAudit('GOVERNANCE_APPROVED', 'Governance', auditDetail);

    eventBus.emit('GOVERNANCE_APPROVED', 'Governance', { plan, hash: govHash });

    await delay(500);

    // ═══ PHASE 7: EXECUTION & MITIGATION (#7 Before vs After) ═══════════
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

    // Dynamic risk from live telemetry
    const mitigationTelemetry = store().liveTelemetry;
    const mitigatingRisk = mitigationTelemetry ? calculateLiveRisk(mitigationTelemetry) : 55;
    animateRisk(peakRisk, mitigatingRisk, 2000);
    s.addLog('Simulation', 'Live monitoring: Flood propagation slowing. Pump effectiveness confirmed.', 'success');
    s.setZoneStatus('zone-1', 'mitigated', 42);
    await delay(2000);

    s.addLog('Resource', 'Secondary evacuation convoy deployed to North Bridge. 22,000 civilians.', 'info');
    s.setMetrics({ populationProtected: 45000 });
    await delay(1200);

    const lateRisk = store().liveTelemetry ? calculateLiveRisk(store().liveTelemetry!) : 35;
    animateRisk(mitigatingRisk, lateRisk, 1500);
    s.setZoneStatus('zone-4', 'mitigated', 25);
    s.setZoneStatus('zone-7', 'mitigated', 18);
    s.addLog('Sentinel', 'Water treatment pressure normalizing. Threat vector reducing.', 'success');
    await delay(1500);

    s.setZoneStatus('zone-6', 'normal', 12);
    s.addLog('Risk', 'Power grid cascade risk dropped to 8%. All-clear for East sector.', 'success');
    await delay(1000);

    animateRisk(lateRisk, 15, 1500);
    s.addLog('Simulation', 'All flood models converging to containment. Success probability: 96%.', 'success');
    await delay(1500);

    // ═══ PHASE 8: RESOLUTION (#7 Before vs After) ═══════════════════════
    transition('mitigated', 'Governance');

    // Stop continuous simulation loop
    stopContinuousSimulation();

    // (#7) Record POST-MITIGATION risk
    const finalRisk = store().liveTelemetry ? calculateLiveRisk(store().liveTelemetry!) : 15;
    s.setPostRisk(finalRisk);

    const riskReduction = Math.max(0, peakRisk - finalRisk);

    s.setMetrics({
        riskReduction,
        responseTime: 4.2,
        populationProtected: 67000,
        damagePrevented: Math.round((riskReduction / peakRisk) * 100),
    });

    s.addLog('Governance', `📊 Before: ${peakRisk}% → After: ${finalRisk}% → Reduction: ${riskReduction}% (${Math.round((riskReduction / peakRisk) * 100)}% effective)`, 'success');
    s.addLog('Governance', '🏁 Crisis mitigated. All zones stabilized. Filing compliance report.', 'success');

    // (#5) Final resolution hash
    const resolutionDecision = { preRisk: peakRisk, postRisk: finalRisk, reduction: riskReduction, populationProtected: 67000, timestamp: Date.now() };
    const resHash = await hashDecision(resolutionDecision);
    s.addAudit('CRISIS_RESOLVED', 'Governance', `All zones stabilized — Pre:${peakRisk}% Post:${finalRisk}% | Hash: ${resHash.slice(0, 12)}…`);

    eventBus.emit('CRISIS_RESOLVED', 'Governance', {
        riskReduction,
        populationProtected: 67000,
        hash: resHash,
    });

    await delay(1000);

    animateRisk(15, 8, 1000);
    s.zones.forEach((z) => {
        if (z.status !== 'normal') {
            store().setZoneStatus(z.id, 'normal', Math.floor(Math.random() * 10) + 5);
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
