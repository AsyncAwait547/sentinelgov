import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── SYSTEM STATE ───────────────────────────────────────────────────────────
let systemTick = 0;
let crisisActive = false;
let crisisStartTick = 0;

// ─── LIVE TELEMETRY STATE (the "single source of truth" for the risk model) ─
// These four values feed directly into the deterministic risk formula on the client.
let telemetryState = {
    rainfall: 15,    // mm — baseline light rain
    drainageCapacity: 0.85,  // 0-1 — how well drains are coping (1 = perfect)
    populationDensity: 0.35,  // 0-1 — normalized density of affected area
    socialSpike: 0.05,  // 0-1 — social-media panic indicator
};

// Baseline (idle) values for decay after crisis resolves
const BASELINE = {
    rainfall: 15,
    drainageCapacity: 0.85,
    populationDensity: 0.35,
    socialSpike: 0.05,
};

// ─── TELEMETRY GENERATOR ────────────────────────────────────────────────────
function generateTelemetry() {
    systemTick++;

    // During a crisis the values ramp up over ~30 ticks (~60 seconds at 2 s interval)
    if (crisisActive) {
        const elapsed = systemTick - crisisStartTick;
        const rampFactor = Math.min(elapsed / 30, 1);   // 0 → 1 over 60 s

        // Rainfall surges from baseline → 120+ mm
        telemetryState.rainfall = lerp(BASELINE.rainfall, 120 + jitter(15), rampFactor);

        // Drainage capacity degrades as rainfall overwhelms the system
        telemetryState.drainageCapacity = lerp(BASELINE.drainageCapacity, 0.15 + jitter(0.05), rampFactor);

        // Population density stays roughly constant but ticks up as people cluster
        telemetryState.populationDensity = lerp(BASELINE.populationDensity, 0.75 + jitter(0.05), rampFactor);

        // Social-media spike ramps sharply
        telemetryState.socialSpike = lerp(BASELINE.socialSpike, 0.90 + jitter(0.08), rampFactor);
    } else {
        // Decay back toward baseline
        telemetryState.rainfall = decay(telemetryState.rainfall, BASELINE.rainfall, 0.15);
        telemetryState.drainageCapacity = decay(telemetryState.drainageCapacity, BASELINE.drainageCapacity, 0.10);
        telemetryState.populationDensity = decay(telemetryState.populationDensity, BASELINE.populationDensity, 0.10);
        telemetryState.socialSpike = decay(telemetryState.socialSpike, BASELINE.socialSpike, 0.20);
    }

    // Compute a server-side risk score using the SAME deterministic formula as the client
    const drainageInverse = 1 - telemetryState.drainageCapacity;
    const riskLevel = Math.round(
        clamp(telemetryState.rainfall / 150, 0, 1) * 0.4 * 100 +
        drainageInverse * 0.2 * 100 +
        telemetryState.populationDensity * 0.2 * 100 +
        telemetryState.socialSpike * 0.2 * 100
    );

    return {
        tick: systemTick,
        timestamp: new Date().toISOString(),

        // Infrastructure telemetry (for the navbar readouts)
        networkLatency: Math.floor(12 + Math.random() * 8),
        cpuUsage: Math.floor(15 + Math.random() * 25),
        memoryUsage: Math.floor(30 + Math.random() * 20),
        activeConnections: Math.floor(120 + Math.random() * 40),
        threatVectors: crisisActive ? Math.floor(3 + Math.random() * 5) : Math.floor(Math.random() * 2),

        // The four deterministic telemetry signals (new!)
        rainfall: round2(telemetryState.rainfall),
        drainageCapacity: round2(telemetryState.drainageCapacity),
        populationDensity: round2(telemetryState.populationDensity),
        socialSpike: round2(telemetryState.socialSpike),

        // Legacy sensor readings (kept for backwards compat with static pages)
        sensorReadings: {
            rainfall: round2(telemetryState.rainfall),
            riverLevel: crisisActive ? 6.2 + Math.random() * 2.5 : 1.8 + Math.random() * 0.5,
            windSpeed: 8 + Math.random() * 12,
            temperature: 22 + Math.random() * 5,
        },

        // Server-side calculated metrics
        metrics: {
            riskLevel,
            riskReduction: crisisActive ? Math.floor(20 + Math.random() * 60) : 0,
            responseTime: crisisActive ? Math.floor(2 + Math.random() * 4) : 0,
            populationProtected: crisisActive ? Math.floor(15000 + Math.random() * 50000) : 0,
            damagePrevented: crisisActive ? Math.floor(40 + Math.random() * 50) : 0,
        },
    };
}

// ─── MATH HELPERS ───────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function decay(current, target, speed) { return current + (target - current) * speed; }
function jitter(amplitude) { return (Math.random() - 0.5) * 2 * amplitude; }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function round2(v) { return Math.round(v * 100) / 100; }

// ─── SOCKET.IO CONNECTIONS ──────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[SentinelGov Server] Client connected: ${socket.id}`);

    // Initial handshake
    socket.emit('system:handshake', {
        serverId: 'SENTINEL-CORE-001',
        version: '3.2.1',
        status: 'online',
        timestamp: new Date().toISOString(),
    });

    // ─── Telemetry stream — every 2 seconds ───
    const telemetryInterval = setInterval(() => {
        socket.emit('telemetry:update', generateTelemetry());
    }, 2000);

    // ─── CRISIS INJECTION ───
    socket.on('crisis:inject', () => {
        if (crisisActive) return;

        console.log('[SentinelGov Server] ⚡ Crisis injection received — ramping telemetry');
        crisisActive = true;
        crisisStartTick = systemTick;

        // Acknowledge immediately
        socket.emit('crisis:acknowledged', {
            status: 'processing',
            timestamp: new Date().toISOString(),
        });
        socket.broadcast.emit('crisis:acknowledged', {
            status: 'processing',
            timestamp: new Date().toISOString(),
        });

        // Server-side agent log generator (for ambient realism)
        const agentLogGenerator = setInterval(() => {
            if (!crisisActive) { clearInterval(agentLogGenerator); return; }

            const agents = ['Sentinel', 'Risk', 'Simulation', 'Response', 'Resource', 'Governance'];
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            const msgs = [
                `Structural anomaly detected in sector ${Math.floor(Math.random() * 9)}`,
                `Water pressure rising at node Delta-${Math.floor(Math.random() * 99)}`,
                `Evacuation protocol ${Math.floor(Math.random() * 5)} recommended.`,
                `Power flux resolved at substation Gamma`,
                `Recalculating mitigation probability...`,
                `Deploying emergency swarm D-${Math.floor(Math.random() * 10)}`,
                `Rainfall data: ${round2(telemetryState.rainfall)} mm — drainage at ${round2(telemetryState.drainageCapacity * 100)}%`,
                `Social media spike: ${round2(telemetryState.socialSpike * 100)}% — escalation detected`,
            ];
            const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
            const severity = Math.random() > 0.6 ? 'critical' : 'warning';

            socket.emit('crisis:serverLog', { agent: randomAgent, message: randomMsg, severity });
            socket.broadcast.emit('crisis:serverLog', { agent: randomAgent, message: randomMsg, severity });
        }, 3500);

        // Phase progression (server-driven timeline)
        const phaseAdvances = [
            { t: 3000, fn: () => emitPhaseChange('detected', 'zone-1') },
            { t: 8000, fn: () => emitPhaseChange('simulating', 'zone-4') },
            { t: 15000, fn: () => emitPhaseChange('negotiating', 'zone-6') },
            {
                t: 22000, fn: () => {
                    emitPhaseChange('mitigating', 'zone-1');
                    const plan = {
                        action: 'Dynamic backend-generated mitigation plan',
                        zones: ['Sector 7', 'Node Alpha'],
                        resources: ['Emergency pumps', 'Evac drones'],
                        estimatedTime: '22 mins',
                        confidence: Math.floor(80 + Math.random() * 18),
                    };
                    socket.emit('crisis:serverMitigationPlan', plan);
                    socket.broadcast.emit('crisis:serverMitigationPlan', plan);
                },
            },
            { t: 30000, fn: () => emitPhaseChange('mitigated', 'zone-4') },
        ];

        function emitPhaseChange(status, newZone) {
            if (!crisisActive) return;
            socket.emit('crisis:serverPhase', { status, affectedZone: newZone });
            socket.broadcast.emit('crisis:serverPhase', { status, affectedZone: newZone });
        }

        phaseAdvances.forEach((p) => setTimeout(p.fn, p.t));
    });

    // ─── CRISIS RESOLUTION ───
    socket.on('crisis:resolve', () => {
        console.log('[SentinelGov Server] Crisis resolution received — decaying telemetry');
        crisisActive = false;
        socket.emit('crisis:resolved', { timestamp: new Date().toISOString() });
        socket.broadcast.emit('crisis:resolved');
        socket.emit('crisis:serverPhase', { status: 'resolved', affectedZone: null });
        socket.broadcast.emit('crisis:serverPhase', { status: 'resolved', affectedZone: null });
    });

    // ─── DISCONNECT ───
    socket.on('disconnect', () => {
        console.log(`[SentinelGov Server] Client disconnected: ${socket.id}`);
        clearInterval(telemetryInterval);
    });
});

// ─── REST ENDPOINTS ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'online', uptime: process.uptime(), crisisActive });
});

app.get('/api/report', (_req, res) => {
    res.json({
        generated: new Date().toISOString(),
        systemId: 'SENTINEL-CORE-001',
        crisisActive,
        ticks: systemTick,
        telemetry: { ...telemetryState },
        message: 'Export report endpoint — connect to frontend audit trail for full report.',
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`\n  ⚡ SentinelGov Simulation Server`);
    console.log(`  ➜  WebSocket:  ws://localhost:${PORT}`);
    console.log(`  ➜  Health:     http://localhost:${PORT}/api/health`);
    console.log(`  ➜  Report:     http://localhost:${PORT}/api/report\n`);
});
