import { useSystemStore } from '../store/useSystemStore';
import type { MitigationPlan } from '../store/useSystemStore';

// ─── HELPERS ────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const store = () => useSystemStore.getState();

// ─── DETERMINISTIC RISK MODEL ───────────────────────────────────────────────
// This is the EXACT formula from the SentinelGov documentation.
// It maps four live telemetry signals into a single 0-100 risk score.
//
// Weights:
//   rainfall (normalized to 0-1) × 0.4
//   drainage_inverse             × 0.2
//   population_density           × 0.2
//   social_spike                 × 0.2
// ─────────────────────────────────────────────────────────────────────────────

export interface TelemetryPacket {
    rainfall: number;          // mm (raw value, normalized inside the function)
    drainageCapacity: number;  // 0-1 (1 = fully functional)
    populationDensity: number; // 0-1
    socialSpike: number;       // 0-1
}

/**
 * Deterministic risk calculation.
 * Returns a value between 0 and 100.
 */
export function calculateLiveRisk(telemetry: TelemetryPacket): number {
    // Normalize rainfall: 0mm → 0, 150mm+ → 1
    const normalizedRainfall = Math.min(telemetry.rainfall / 150, 1);

    // Drainage is inverted: low capacity = high risk
    const drainageInverse = 1 - telemetry.drainageCapacity;

    const risk =
        normalizedRainfall * 0.4 +
        drainageInverse * 0.2 +
        telemetry.populationDensity * 0.2 +
        telemetry.socialSpike * 0.2;

    // Scale to 0-100 and clamp
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

// ─── PARALLEL AGENT SIMULATION TASKS ────────────────────────────────────────
// Each agent is a self-contained async function that can run concurrently.

async function runRiskAgent(): Promise<number> {
    const s = store();

    s.activateAgent('Risk');
    s.addLog('Risk', 'Initiating multi-variable risk assessment across affected zones.', 'info');
    s.addAgentComm('Risk', 'Simulation', 'Risk vectors compiled');
    await delay(1400);

    // Pull live telemetry from the store and compute risk deterministically
    const telemetry = s.liveTelemetry;
    const liveRisk = telemetry
        ? calculateLiveRisk(telemetry)
        : 65; // fallback if telemetry not yet available

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

async function runSimulationAgent(): Promise<void> {
    const s = store();

    s.activateAgent('Simulation');
    s.addLog('Simulation', 'Loading digital twin model. Initializing 2,457 predictive scenarios.', 'info');
    s.addAgentComm('Simulation', 'Response', 'Simulation models running');
    await delay(1500);

    // Re-read telemetry for latest values (may have changed during parallel exec)
    const telemetry = s.liveTelemetry;
    const simRisk = telemetry ? calculateLiveRisk(telemetry) : 82;

    s.addLog('Simulation', 'Running Monte Carlo flood propagation analysis...', 'info');
    await delay(1200);

    s.setZoneStatus('zone-1', 'critical', simRisk);
    s.addLog('Simulation', `RESULT: 78% of scenarios predict ward-level flooding within 4 hours.`, 'critical');
    await delay(800);

    s.addLog('Simulation', 'Optimal mitigation window: 45 minutes. Beyond that, cascading failure probable.', 'warning');
    s.addLog('Simulation', 'Recommended actions: pump deployment, bridge closure, partial evacuation.', 'info');
    s.addAudit('SIMULATION_COMPLETE', 'Simulation', '2,457 scenarios analyzed — 78% predict flooding');
}

async function runResourceAgent(): Promise<{ pumpsAvailable: number; evacVehicles: number }> {
    const s = store();

    s.activateAgent('Resource');
    s.addLog('Resource', 'Scanning resource availability: pumps, vehicles, shelters...', 'info');
    s.addAgentComm('Resource', 'Response', 'Resource audit initiated');
    await delay(1300);

    const pumpsAvailable = 3;
    const evacVehicles = 42;

    s.addLog('Resource', `Inventory check: ${pumpsAvailable} high-capacity pumps online, ${evacVehicles} evacuation vehicles available.`, 'info');
    await delay(700);

    s.addLog('Resource', 'Emergency shelters: 4 open (capacity 18,000). Medical teams: 6 on standby.', 'info');
    s.addAudit('RESOURCE_AUDIT', 'Resource', `${pumpsAvailable} pumps, ${evacVehicles} vehicles, 4 shelters ready`);

    return { pumpsAvailable, evacVehicles };
}

// ─── MAIN CRISIS SEQUENCE ───────────────────────────────────────────────────
export async function runCrisisSequence() {
    const s = store();
    s.clearLogs();
    s.clearNegotiation();
    s.clearAgentComms();
    s.deactivateAllAgents();
    s.setMitigationPlan(null);
    s.setMetrics({ riskReduction: 0, responseTime: 0, populationProtected: 0, damagePrevented: 0 });

    // ─── PHASE 1: DETECTION (Sentinel fires first — sequential) ─────────────
    s.setCrisisStatus('detected');
    s.addAudit('CRISIS_DETECTED', 'Sentinel', 'Rainfall anomaly exceeds safety threshold');

    s.activateAgent('Sentinel');
    s.addLog('Sentinel', 'Environmental sensor array activated. Scanning all zones.', 'info');
    await delay(1200);

    s.addLog('Sentinel', 'ALERT: Rainfall anomaly detected in Ward 12 — River Delta sector.', 'critical');
    s.addAgentComm('Sentinel', 'Risk', 'Anomaly data packet forwarded');
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

    // ─── PHASE 2 + 3: PARALLEL AGENT EXECUTION ─────────────────────────────
    // Risk, Simulation, and Resource agents fire SIMULTANEOUSLY via Promise.all()
    s.setCrisisStatus('simulating');
    s.addLog('Sentinel', '⚡ Dispatching Risk, Simulation, and Resource agents in parallel.', 'info');
    s.addAudit('PARALLEL_DISPATCH', 'Sentinel', 'Risk + Simulation + Resource agents launched concurrently');

    const [liveRisk, , resources] = await Promise.all([
        runRiskAgent(),
        runSimulationAgent(),
        runResourceAgent(),
    ]);

    // Animate risk to the live-computed value after parallel agents complete
    const telemetry = s.liveTelemetry;
    const peakRisk = telemetry ? calculateLiveRisk(telemetry) : liveRisk;
    animateRisk(liveRisk, peakRisk, 1500);

    s.addLog('Sentinel', `✓ All parallel agents reported. Composite risk: ${peakRisk}%. Proceeding to Response.`, 'success');
    s.addAudit('AGENTS_CONVERGED', 'Sentinel', `Risk=${peakRisk}%, Pumps=${resources.pumpsAvailable}, Vehicles=${resources.evacVehicles}`);
    await delay(600);

    // ─── PHASE 4: RESPONSE PLANNING ─────────────────────────────────────────
    s.activateAgent('Response');
    s.addLog('Response', 'Generating mitigation strategy based on simulation output.', 'info');
    s.addAgentComm('Response', 'Resource', 'Resource allocation request');
    await delay(1200);

    s.addLog('Response', `Proposed Action 1: Deploy ${resources.pumpsAvailable} high-capacity water pumps to Ward 12.`, 'info');
    await delay(600);
    s.addLog('Response', 'Proposed Action 2: Close North Bridge — divert traffic via South Corridor.', 'info');
    await delay(600);
    s.addLog('Response', 'Proposed Action 3: Evacuate Ward 12 and North Bridge zones (67,000 civilians).', 'warning');
    await delay(600);

    const plan: MitigationPlan = {
        action: 'Multi-zone flood mitigation with partial evacuation',
        zones: ['Ward 12 - River Delta', 'North Bridge Corridor', 'West Water Treatment'],
        resources: [`${resources.pumpsAvailable}x Industrial Pumps`, 'Bridge Closure Team', `Evacuation Units (${resources.evacVehicles} vehicles)`],
        estimatedTime: '38 minutes',
        confidence: Math.min(95, peakRisk > 70 ? 87 : 92),
    };
    s.setMitigationPlan(plan);
    s.addAudit('MITIGATION_PROPOSED', 'Response', `Multi-zone strategy — confidence ${plan.confidence}%`);
    await delay(500);

    // ─── PHASE 5: NEGOTIATION ───────────────────────────────────────────────
    s.setCrisisStatus('negotiating');
    s.addLog('Resource', 'Analyzing resource availability against mitigation requirements.', 'info');
    await delay(1000);

    s.addNegotiation('Response', 'Full evacuation recommended for zones Ward 12 and North Bridge. 67,000 civilians.');
    s.addLog('Response', '[NEGOTIATION] Full evacuation of 2 zones recommended — 67,000 civilians.', 'warning');
    s.addAgentComm('Response', 'Resource', 'Full evacuation demand');
    await delay(1200);

    s.addNegotiation('Resource', `Evacuation capacity limited to 1 zone simultaneously. Fleet constraint: ${resources.evacVehicles} vehicles.`);
    s.addLog('Resource', `[NEGOTIATION] Capacity conflict: Only 1 zone can evacuate simultaneously. ${resources.evacVehicles} vehicles available.`, 'warning');
    s.addAgentComm('Resource', 'Response', 'Capacity constraint flagged');
    await delay(1200);

    s.addNegotiation('Response', 'Counter-proposal: Stagger evacuation. Priority zone first, then secondary.');
    s.addLog('Response', '[NEGOTIATION] Counter-proposal: Staggered evacuation — priority zone first.', 'info');
    s.addAgentComm('Response', 'Resource', 'Staggered plan proposed');
    await delay(1000);

    s.addNegotiation('Resource', 'Accepted. Ward 12 priority. North Bridge secondary with shelter-in-place interim.');
    s.addLog('Resource', '[NEGOTIATION] Accepted staggered plan. Ward 12 priority, shelter-in-place for Bridge.', 'success');
    s.addAgentComm('Resource', 'Governance', 'Negotiation resolution forwarded');
    await delay(800);

    s.addAudit('NEGOTIATION_RESOLVED', 'Resource', 'Staggered evacuation consensus reached');

    // ─── PHASE 6: GOVERNANCE APPROVAL ───────────────────────────────────────
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
    await delay(500);

    // ─── PHASE 7: EXECUTION & MITIGATION ────────────────────────────────────
    s.setCrisisStatus('mitigating');
    s.addLog('Sentinel', 'Deploying pump units to Ward 12. ETA: 8 minutes.', 'info');
    s.setZoneStatus('zone-1', 'evacuating', 75);
    await delay(1500);

    s.addLog('Response', 'North Bridge closure initiated. Traffic rerouting active.', 'info');
    s.setZoneStatus('zone-4', 'evacuating', 50);
    await delay(1200);

    s.addLog('Resource', 'Evacuation convoy Alpha deployed to Ward 12. 23,000 civilians moving.', 'info');
    s.setMetrics({ populationProtected: 23000, responseTime: 4.2 });
    await delay(1500);

    // Read latest telemetry for dynamic risk during mitigation
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

    // ─── PHASE 8: RESOLUTION ────────────────────────────────────────────────
    s.setCrisisStatus('mitigated');
    s.setMetrics({
        riskReduction: peakRisk,
        responseTime: 4.2,
        populationProtected: 67000,
        damagePrevented: 94,
    });

    s.addLog('Governance', '🏁 Crisis mitigated. All zones stabilized. Filing compliance report.', 'success');
    s.addAudit('CRISIS_RESOLVED', 'Governance', 'All zones stabilized — report filed');
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
}

// ─── DEMO SEQUENCE ──────────────────────────────────────────────────────────
export async function runDemoSequence() {
    store().setDemoMode(true);
    await runCrisisSequence();
    await delay(8000);
    store().resetSystem();
    store().setDemoMode(false);
}
