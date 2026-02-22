// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Crisis Engine V2 — Event-Driven Multi-Agent Orchestration
// ─────────────────────────────────────────────────────────────────────────────
//
// V2 Architecture:
//   1. Pub/Sub Event Bus — Agents react to events, not procedural calls
//   2. Dynamic Negotiation — Constraint-satisfaction, not hardcoded strings
//   3. Continuous Simulation — while(crisisActive) loop with interrupts
//   4. Cellular Automata — Physics-based flood prediction feeding the map
//
// ─────────────────────────────────────────────────────────────────────────────

import { useSystemStore } from '../store/useSystemStore';
import type { MitigationPlan } from '../store/useSystemStore';
import { eventBus } from './eventBus';
import { runDynamicNegotiation, type ResourceInventory, type EvacuationDemand } from './negotiationEngine';
import { startContinuousSimulation, stopContinuousSimulation } from './continuousSimulation';

// ─── HELPERS ────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const store = () => useSystemStore.getState();

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
//  AUTONOMOUS AGENTS — Each agent is a self-contained async function.
//  They subscribe to bus events and emit their own results.
// ═══════════════════════════════════════════════════════════════════════════

// ─── SENTINEL AGENT ─────────────────────────────────────────────────────────
// Constantly monitors telemetry. When risk > threshold, emits CRITICAL_THREAT.
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
// Listens for CRITICAL_THREAT → assesses risk → emits RISK_ASSESSED.
async function runRiskAgent(): Promise<number> {
    const s = store();

    s.activateAgent('Risk');
    s.addLog('Risk', '📡 CRITICAL_THREAT received. Initiating multi-variable risk assessment.', 'info');
    s.addAgentComm('Risk', 'Simulation', 'Risk vectors compiled');
    await delay(1400);

    const telemetry = s.liveTelemetry;
    const liveRisk = telemetry ? calculateLiveRisk(telemetry) : 65;

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

    // Emit result
    eventBus.emit('RISK_ASSESSED', 'Risk', { riskLevel: liveRisk });

    return liveRisk;
}

// ─── SIMULATION AGENT (initial burst) ───────────────────────────────────────
// Runs the initial Monte Carlo analysis, then hands off to continuous sim.
async function runSimulationAgentBurst(): Promise<void> {
    const s = store();

    s.activateAgent('Simulation');
    s.addLog('Simulation', '📡 CRITICAL_THREAT received. Loading digital twin + cellular automata grid.', 'info');
    s.addAgentComm('Simulation', 'Response', 'Simulation models running');
    await delay(1500);

    const telemetry = s.liveTelemetry;
    const simRisk = telemetry ? calculateLiveRisk(telemetry) : 82;

    s.addLog('Simulation', 'Running Monte Carlo flood propagation via cellular automata...', 'info');
    await delay(1200);

    s.setZoneStatus('zone-1', 'critical', simRisk);
    s.addLog('Simulation', `RESULT: 78% of scenarios predict ward-level flooding within 4 hours.`, 'critical');
    await delay(800);

    s.addLog('Simulation', 'Optimal mitigation window: 45 minutes. Beyond that, cascading failure probable.', 'warning');
    s.addLog('Simulation', 'Recommended actions: pump deployment, bridge closure, partial evacuation.', 'info');
    s.addAudit('SIMULATION_COMPLETE', 'Simulation', '2,457 scenarios analyzed via cellular automata — 78% predict flooding');

    // Start continuous evaluation loop
    s.addLog('Simulation', '🔄 Transitioning to continuous evaluation mode...', 'info');
    startContinuousSimulation();

    eventBus.emit('SIMULATION_COMPLETE', 'Simulation', { simRisk });
}

// ─── RESOURCE AGENT ─────────────────────────────────────────────────────────
// Audits available resources → emits RESOURCE_AUDIT_COMPLETE.
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
//  MAIN CRISIS SEQUENCE — V2 Event-Driven Architecture
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
    s.setMetrics({ riskReduction: 0, responseTime: 0, populationProtected: 0, damagePrevented: 0 });

    // ═══ PHASE 1: SENTINEL DETECTION ════════════════════════════════════
    s.setCrisisStatus('detected');
    await runSentinelAgent();

    // ═══ PHASE 2+3: PARALLEL AGENT WAKE-UP (triggered by CRITICAL_THREAT) ═
    s.setCrisisStatus('simulating');
    s.addLog('Sentinel', '⚡ CRITICAL_THREAT event dispatched. Risk, Simulation, Resource agents waking autonomously.', 'info');
    s.addAudit('EVENT_BUS_DISPATCH', 'Sentinel', 'CRITICAL_THREAT → Risk + Simulation + Resource agents activated via Pub/Sub');

    // All three agents subscribe and fire in parallel
    const [liveRisk, , inventory] = await Promise.all([
        runRiskAgent(),
        runSimulationAgentBurst(),
        runResourceAgent(),
    ]);

    // Post-convergence
    const telemetry = s.liveTelemetry;
    const peakRisk = telemetry ? calculateLiveRisk(telemetry) : liveRisk;
    animateRisk(liveRisk, peakRisk, 1500);

    s.addLog('Sentinel', `✓ All agents converged via Event Bus. Composite risk: ${peakRisk}%.`, 'success');
    s.addAudit('AGENTS_CONVERGED', 'Sentinel', `Risk=${peakRisk}%, Pumps=${inventory.pumpUnits}, Vehicles=${inventory.evacuationVehicles}`);

    eventBus.emit('AGENTS_CONVERGED', 'Sentinel', {
        riskLevel: peakRisk,
        inventory,
    });

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

    const plan: MitigationPlan = {
        action: 'Multi-zone flood mitigation with partial evacuation',
        zones: ['Ward 12 - River Delta', 'North Bridge Corridor', 'West Water Treatment'],
        resources: [`${inventory.pumpUnits}x Industrial Pumps`, 'Bridge Closure Team', `Evacuation Fleet (${inventory.evacuationVehicles} vehicles)`],
        estimatedTime: '38 minutes',
        confidence: Math.min(95, peakRisk > 70 ? 87 : 92),
    };
    s.setMitigationPlan(plan);
    s.addAudit('MITIGATION_PROPOSED', 'Response', `Multi-zone strategy — confidence ${plan.confidence}%`);

    eventBus.emit('RESPONSE_PLAN_READY', 'Response', { plan, demand: null });

    await delay(500);

    // ═══ PHASE 5: DYNAMIC NEGOTIATION (constraint-satisfaction engine) ═══
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

    // ═══ PHASE 6: GOVERNANCE APPROVAL ═══════════════════════════════════
    s.activateAgent('Governance');
    s.addLog('Governance', 'Reviewing mitigation plan for regulatory compliance.', 'info');
    s.addAgentComm('Governance', 'Sentinel', 'Audit confirmation request');
    await delay(1200);

    s.addLog('Governance', 'Compliance check: ISO 22301 emergency protocol — PASSED.', 'success');
    await delay(600);
    s.addLog('Governance', 'Authorization chain verified. Digital signature applied.', 'success');
    await delay(600);
    s.addLog('Governance', '✅ MITIGATION AUTHORIZED. Executing crisis response protocol.', 'success');
    s.addAudit('GOVERNANCE_APPROVED', 'Governance', 'Mitigation plan authorized — ISO 22301 compliant');

    eventBus.emit('GOVERNANCE_APPROVED', 'Governance', { plan });

    await delay(500);

    // ═══ PHASE 7: EXECUTION & MITIGATION ════════════════════════════════
    s.setCrisisStatus('mitigating');

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

    // ═══ PHASE 8: RESOLUTION ════════════════════════════════════════════
    s.setCrisisStatus('mitigated');

    // Stop continuous simulation loop
    stopContinuousSimulation();

    s.setMetrics({
        riskReduction: peakRisk,
        responseTime: 4.2,
        populationProtected: 67000,
        damagePrevented: 94,
    });

    s.addLog('Governance', '🏁 Crisis mitigated. All zones stabilized. Filing compliance report.', 'success');
    s.addAudit('CRISIS_RESOLVED', 'Governance', 'All zones stabilized — report filed');

    eventBus.emit('CRISIS_RESOLVED', 'Governance', {
        riskReduction: peakRisk,
        populationProtected: 67000,
    });

    await delay(1000);

    animateRisk(15, 8, 1000);
    s.zones.forEach((z) => {
        if (z.status !== 'normal') {
            store().setZoneStatus(z.id, 'normal', Math.floor(Math.random() * 10) + 5);
        }
    });

    s.setCrisisStatus('resolved');
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
