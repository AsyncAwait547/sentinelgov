// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Continuous Simulation Agent — Real-Time Evaluation Loop
// ─────────────────────────────────────────────────────────────────────────────
// Unlike the V1 one-shot simulation, this agent runs CONTINUOUSLY during a
// crisis. It monitors telemetry every tick and can:
//
// 1. Detect if mitigation is failing (rainfall spike during mitigation)
// 2. Interrupt the current flow and escalate to Governance
// 3. Run the cellular automata grid forward to predict flooding
// 4. Broadcast iteration results via the Event Bus
// ─────────────────────────────────────────────────────────────────────────────

import { useSystemStore } from '../store/useSystemStore';
import { eventBus } from './eventBus';
import { calculateLiveRisk } from './crisisEngine';
import {
    createFloodGrid,
    stepFloodGrid,
    predictFuture,
    getZoneFloodRisks,
    type FloodGrid,
    type PredictionResult,
} from './floodGrid';

const store = () => useSystemStore.getState();

// ─── STATE ──────────────────────────────────────────────────────────────────
let simulationRunning = false;
let tickInterval: ReturnType<typeof setInterval> | null = null;
let grid: FloodGrid | null = null;
let iterationCount = 0;
let lastRisk = 0;
let mitigationInterruptFired = false;

// ─── THRESHOLDS ─────────────────────────────────────────────────────────────
const RISK_ESCALATION_THRESHOLD = 15;  // If risk jumps by 15+ during mitigation
const PREDICTION_STEPS = 50;           // How many ticks ahead to predict
const TICK_INTERVAL_MS = 2000;         // Match telemetry interval

// ─── START CONTINUOUS SIMULATION ────────────────────────────────────────────
export function startContinuousSimulation(): void {
    if (simulationRunning) return;

    simulationRunning = true;
    iterationCount = 0;
    mitigationInterruptFired = false;
    grid = createFloodGrid();
    lastRisk = store().riskLevel;

    const s = store();
    s.activateAgent('Simulation');
    s.addLog('Simulation', '🔄 Continuous evaluation loop started. Monitoring in real-time.', 'info');
    s.addAudit('SIM_CONTINUOUS_START', 'Simulation', 'Real-time evaluation loop active');

    // Store the grid for the map visualization
    s.setFloodGrid(grid);

    tickInterval = setInterval(() => {
        runSimulationTick();
    }, TICK_INTERVAL_MS);
}

// ─── STOP CONTINUOUS SIMULATION ─────────────────────────────────────────────
export function stopContinuousSimulation(): void {
    simulationRunning = false;
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }

    const s = store();
    s.addLog('Simulation', '⏹ Continuous evaluation loop stopped.', 'info');
    s.addAudit('SIM_CONTINUOUS_STOP', 'Simulation', `Completed ${iterationCount} iterations`);
}

// ─── SINGLE SIMULATION TICK ─────────────────────────────────────────────────
function runSimulationTick(): void {
    if (!simulationRunning || !grid) return;

    const s = store();
    const telemetry = s.liveTelemetry;
    if (!telemetry) return;

    iterationCount++;

    // ─── 1. Step the cellular automata grid ─────────────────────────────
    grid = stepFloodGrid(grid, {
        rainfall: telemetry.rainfall,
        drainageCapacity: telemetry.drainageCapacity,
    });

    // Update the store so CityMap can render it
    s.setFloodGrid(grid);

    // ─── 2. Extract zone-level risks from the grid ──────────────────────
    const zoneRisks = getZoneFloodRisks(grid);
    for (const [zoneId, risk] of zoneRisks) {
        const existingZone = s.zones.find((z) => z.id === zoneId);
        if (existingZone) {
            // Only update zone risk if simulation finds something meaningful
            const newRisk = Math.max(existingZone.riskLevel, risk);
            if (Math.abs(newRisk - existingZone.riskLevel) > 3) {
                s.setZoneStatus(zoneId, existingZone.status, newRisk);
            }
        }
    }

    // ─── 3. Compute current risk ────────────────────────────────────────
    const currentRisk = calculateLiveRisk(telemetry);

    // ─── 4. Run fast-forward prediction ─────────────────────────────────
    let prediction: PredictionResult | null = null;
    if (iterationCount % 3 === 0) {  // Every 3rd tick, run prediction
        prediction = predictFuture(grid, {
            rainfall: telemetry.rainfall,
            drainageCapacity: telemetry.drainageCapacity,
        }, PREDICTION_STEPS);

        // Log prediction results periodically
        if (prediction.floodedZones.length > 0 && iterationCount % 6 === 0) {
            s.addLog(
                'Simulation',
                `[ITERATION ${iterationCount}] Prediction: ${prediction.floodedCellCount} cells flooded in ${PREDICTION_STEPS} ticks. Zones at risk: ${prediction.floodedZones.join(', ')}`,
                prediction.floodedZones.length > 2 ? 'critical' : 'warning'
            );
        }
    }

    // ─── 5. Emit iteration event via Event Bus ──────────────────────────
    eventBus.emit('SIMULATION_ITERATION', 'Simulation', {
        iteration: iterationCount,
        currentRisk,
        prediction,
        zoneRisks: Object.fromEntries(zoneRisks),
    });

    // ─── 6. MITIGATION FAILURE DETECTION ────────────────────────────────
    // If we're in mitigation phase and risk suddenly spikes, interrupt!
    const crisisStatus = s.crisisStatus;
    if (
        crisisStatus === 'mitigating' &&
        !mitigationInterruptFired &&
        currentRisk - lastRisk > RISK_ESCALATION_THRESHOLD
    ) {
        mitigationInterruptFired = true;

        s.addLog('Simulation', `⚠ MITIGATION FAILURE DETECTED! Risk spiked from ${lastRisk}% to ${currentRisk}% during active mitigation.`, 'critical');
        s.addLog('Simulation', '⚡ Interrupting current flow — forcing Governance re-authorization.', 'critical');
        s.addAudit('MITIGATION_INTERRUPT', 'Simulation', `Risk spike: ${lastRisk}% → ${currentRisk}%`);

        eventBus.emit('MITIGATION_INTERRUPT', 'Simulation', {
            previousRisk: lastRisk,
            currentRisk,
            prediction,
            reason: `Unexpected rainfall spike. Risk elevated from ${lastRisk}% to ${currentRisk}% despite active mitigation.`,
        });

        // Force secondary governance approval
        s.activateAgent('Governance');
        s.addLog('Governance', '🔴 EMERGENCY: Secondary authorization required due to mitigation failure.', 'critical');
        s.addNegotiation('Simulation', `Emergency escalation: risk ${currentRisk}% during mitigation — requesting secondary plan.`);
        s.addNegotiation('Governance', 'EMERGENCY PROTOCOL: Secondary mitigation plan authorized under ISO 22301 §7.3.');
        s.addAudit('EMERGENCY_REAUTH', 'Governance', 'Secondary mitigation authorized due to simulation interrupt');
    }

    lastRisk = currentRisk;

    // Periodic summary log
    if (iterationCount % 10 === 0) {
        s.addLog(
            'Simulation',
            `[TICK ${iterationCount}] Risk: ${currentRisk}% | Grid active: ${grid ? 'YES' : 'NO'} | Monitoring...`,
            currentRisk > 60 ? 'warning' : 'info'
        );
    }
}

// ─── GETTERS ────────────────────────────────────────────────────────────────
export function isSimulationRunning(): boolean {
    return simulationRunning;
}

export function getIterationCount(): number {
    return iterationCount;
}

export function getCurrentGrid(): FloodGrid | null {
    return grid;
}
