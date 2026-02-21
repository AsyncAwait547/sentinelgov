import { useSystemStore } from '../store/useSystemStore';
import type { AgentName, MitigationPlan } from '../store/useSystemStore';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const store = () => useSystemStore.getState();

async function animateRisk(from: number, to: number, durationMs: number) {
    const steps = 30;
    const stepMs = durationMs / steps;
    const diff = to - from;
    for (let i = 1; i <= steps; i++) {
        await delay(stepMs);
        store().setRiskLevel(from + (diff * i) / steps);
    }
}

export async function runCrisisSequence() {
    const s = store();
    s.clearLogs();
    s.clearNegotiation();
    s.clearAgentComms();
    s.deactivateAllAgents();
    s.setMitigationPlan(null);
    s.setMetrics({ riskReduction: 0, responseTime: 0, populationProtected: 0, damagePrevented: 0 });

    // ─── PHASE 1: DETECTION ───
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

    // ─── PHASE 2: RISK EVALUATION ───
    s.activateAgent('Risk');
    s.addLog('Risk', 'Initiating multi-variable risk assessment across affected zones.', 'info');
    s.addAgentComm('Risk', 'Simulation', 'Risk vectors compiled');
    await delay(1400);

    animateRisk(12, 65, 2000);
    s.addLog('Risk', 'Flood probability in Ward 12: 82%. Category 3 infrastructure threat.', 'critical');
    s.addAudit('RISK_ASSESSED', 'Risk', 'Flood probability 82% — Category 3 threat');
    await delay(1000);

    s.addLog('Risk', 'Bridge structural failure probability: 61%. Recommending closure.', 'critical');
    s.setZoneStatus('zone-4', 'critical', 61);
    await delay(800);

    s.addLog('Risk', 'Cascading failure risk to power grid: 44%. Alert level elevated.', 'warning');
    s.setZoneStatus('zone-6', 'warning', 44);
    s.setAffectedZones(['zone-1', 'zone-4', 'zone-7', 'zone-6']);
    await delay(600);

    // ─── PHASE 3: SIMULATION ───
    s.setCrisisStatus('simulating');
    s.activateAgent('Simulation');
    s.addLog('Simulation', 'Loading digital twin model. Initializing 2,457 predictive scenarios.', 'info');
    s.addAgentComm('Simulation', 'Response', 'Simulation models running');
    await delay(1500);

    animateRisk(65, 82, 1500);
    s.addLog('Simulation', 'Running Monte Carlo flood propagation analysis...', 'info');
    await delay(1200);

    s.setZoneStatus('zone-1', 'critical', 82);
    s.addLog('Simulation', 'RESULT: 78% of scenarios predict ward-level flooding within 4 hours.', 'critical');
    await delay(800);

    s.addLog('Simulation', 'Optimal mitigation window: 45 minutes. Beyond that, cascading failure probable.', 'warning');
    s.addLog('Simulation', 'Recommended actions: pump deployment, bridge closure, partial evacuation.', 'info');
    s.addAudit('SIMULATION_COMPLETE', 'Simulation', '2,457 scenarios analyzed — 78% predict flooding');
    await delay(600);

    // ─── PHASE 4: RESPONSE PLANNING ───
    s.activateAgent('Response');
    s.addLog('Response', 'Generating mitigation strategy based on simulation output.', 'info');
    s.addAgentComm('Response', 'Resource', 'Resource allocation request');
    await delay(1200);

    s.addLog('Response', 'Proposed Action 1: Deploy 3 high-capacity water pumps to Ward 12.', 'info');
    await delay(600);
    s.addLog('Response', 'Proposed Action 2: Close North Bridge — divert traffic via South Corridor.', 'info');
    await delay(600);
    s.addLog('Response', 'Proposed Action 3: Evacuate Ward 12 and North Bridge zones (67,000 civilians).', 'warning');
    await delay(600);

    const plan: MitigationPlan = {
        action: 'Multi-zone flood mitigation with partial evacuation',
        zones: ['Ward 12 - River Delta', 'North Bridge Corridor', 'West Water Treatment'],
        resources: ['3x Industrial Pumps', 'Bridge Closure Team', 'Evacuation Units A-D'],
        estimatedTime: '38 minutes',
        confidence: 87,
    };
    s.setMitigationPlan(plan);
    s.addAudit('MITIGATION_PROPOSED', 'Response', 'Multi-zone strategy — confidence 87%');
    await delay(500);

    // ─── PHASE 5: NEGOTIATION ───
    s.setCrisisStatus('negotiating');
    s.activateAgent('Resource');
    s.addLog('Resource', 'Analyzing resource availability against mitigation requirements.', 'info');
    await delay(1000);

    s.addNegotiation('Response', 'Full evacuation recommended for zones Ward 12 and North Bridge. 67,000 civilians.');
    s.addLog('Response', '[NEGOTIATION] Full evacuation of 2 zones recommended — 67,000 civilians.', 'warning');
    s.addAgentComm('Response', 'Resource', 'Full evacuation demand');
    await delay(1200);

    s.addNegotiation('Resource', 'Evacuation capacity limited to 1 zone simultaneously. Fleet constraint: 42 vehicles.');
    s.addLog('Resource', '[NEGOTIATION] Capacity conflict: Only 1 zone can evacuate simultaneously. 42 vehicles available.', 'warning');
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

    // ─── PHASE 6: GOVERNANCE APPROVAL ───
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

    // ─── PHASE 7: EXECUTION & MITIGATION ───
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

    animateRisk(82, 55, 2000);
    s.addLog('Simulation', 'Live monitoring: Flood propagation slowing. Pump effectiveness confirmed.', 'success');
    s.setZoneStatus('zone-1', 'mitigated', 42);
    await delay(2000);

    s.addLog('Resource', 'Secondary evacuation convoy deployed to North Bridge. 22,000 civilians.', 'info');
    s.setMetrics({ populationProtected: 45000 });
    await delay(1200);

    animateRisk(55, 35, 1500);
    s.setZoneStatus('zone-4', 'mitigated', 25);
    s.setZoneStatus('zone-7', 'mitigated', 18);
    s.addLog('Sentinel', 'Water treatment pressure normalizing. Threat vector reducing.', 'success');
    await delay(1500);

    s.setZoneStatus('zone-6', 'normal', 12);
    s.addLog('Risk', 'Power grid cascade risk dropped to 8%. All-clear for East sector.', 'success');
    await delay(1000);

    animateRisk(35, 15, 1500);
    s.addLog('Simulation', 'All flood models converging to containment. Success probability: 96%.', 'success');
    await delay(1500);

    // ─── PHASE 8: RESOLUTION ───
    s.setCrisisStatus('mitigated');
    s.setMetrics({
        riskReduction: 82,
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

export async function runDemoSequence() {
    store().setDemoMode(true);
    await runCrisisSequence();
    await delay(8000);
    store().resetSystem();
    store().setDemoMode(false);
}
