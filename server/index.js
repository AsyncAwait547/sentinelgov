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

// System telemetry state
let systemTick = 0;
let crisisActive = false;

function generateTelemetry() {
    systemTick++;
    const baseRisk = crisisActive ? 45 + Math.random() * 30 : 5 + Math.random() * 10;
    return {
        tick: systemTick,
        timestamp: new Date().toISOString(),
        networkLatency: Math.floor(12 + Math.random() * 8),
        cpuUsage: Math.floor(15 + Math.random() * 25),
        memoryUsage: Math.floor(30 + Math.random() * 20),
        activeConnections: Math.floor(120 + Math.random() * 40),
        threatVectors: crisisActive ? Math.floor(3 + Math.random() * 5) : Math.floor(Math.random() * 2),
        sensorReadings: {
            rainfall: crisisActive ? 85 + Math.random() * 30 : 12 + Math.random() * 8,
            riverLevel: crisisActive ? 6.2 + Math.random() * 2.5 : 1.8 + Math.random() * 0.5,
            windSpeed: 8 + Math.random() * 12,
            temperature: 22 + Math.random() * 5,
        },
        metrics: {
            riskLevel: Math.floor(baseRisk),
            riskReduction: crisisActive ? Math.floor(20 + Math.random() * 60) : 0,
            responseTime: crisisActive ? Math.floor(2 + Math.random() * 4) : 0,
            populationProtected: crisisActive ? Math.floor(15000 + Math.random() * 50000) : 0,
            damagePrevented: crisisActive ? Math.floor(40 + Math.random() * 50) : 0,
        }
    };
}

io.on('connection', (socket) => {
    console.log(`[SentinelGov Server] Client connected: ${socket.id}`);

    // Send initial handshake
    socket.emit('system:handshake', {
        serverId: 'SENTINEL-CORE-001',
        version: '3.2.1',
        status: 'online',
        timestamp: new Date().toISOString(),
    });

    // Stream telemetry every 2 seconds
    const telemetryInterval = setInterval(() => {
        socket.emit('telemetry:update', generateTelemetry());
    }, 2000);

    // Listen for crisis injection from client
    socket.on('crisis:inject', () => {
        if (crisisActive) return;

        console.log('[SentinelGov Server] Crisis injection received');
        crisisActive = true;
        socket.emit('crisis:acknowledged', { status: 'processing', timestamp: new Date().toISOString() });
        socket.broadcast.emit('crisis:acknowledged');

        let crisisPhase = 0;

        // Let the backend push random agent logs dynamically
        const agentLogGenerator = setInterval(() => {
            if (!crisisActive) {
                clearInterval(agentLogGenerator);
                return;
            }
            const agents = ['Sentinel', 'Risk', 'Simulation', 'Response', 'Resource', 'Governance'];
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            const msgs = [
                `Structural anomaly detected in sector ${Math.floor(Math.random() * 9)}`,
                `Water pressure rising at node Delta-${Math.floor(Math.random() * 99)}`,
                `Evacuation protocol ${Math.floor(Math.random() * 5)} recommended.`,
                `Power flux resolved at substation Gamma`,
                `Recalculating mitigation probability...`,
                `Deploying emergency swarm D-${Math.floor(Math.random() * 10)}`,
            ];
            const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];

            socket.emit('crisis:serverLog', { agent: randomAgent, message: randomMsg, severity: Math.random() > 0.6 ? 'critical' : 'warning' });
            socket.broadcast.emit('crisis:serverLog', { agent: randomAgent, message: randomMsg, severity: Math.random() > 0.6 ? 'critical' : 'warning' });
        }, 3500);

        // Advance crisis phases
        const phaseAdvances = [
            { t: 3000, fn: () => emitPhaseChange('detected', 'zone-1') },
            { t: 8000, fn: () => emitPhaseChange('simulating', 'zone-4') },
            { t: 15000, fn: () => emitPhaseChange('negotiating', 'zone-6') },
            {
                t: 22000, fn: () => {
                    emitPhaseChange('mitigating', 'zone-1');
                    socket.emit('crisis:serverMitigationPlan', {
                        action: 'Dynamic backend-generated mitigation plan',
                        zones: ['Sector 7', 'Node Alpha'],
                        resources: ['Emergency pumps', 'Evac drones'],
                        estimatedTime: '22 mins',
                        confidence: Math.floor(80 + Math.random() * 18)
                    });
                    socket.broadcast.emit('crisis:serverMitigationPlan', {
                        action: 'Dynamic backend-generated mitigation plan',
                        zones: ['Sector 7', 'Node Alpha'],
                        resources: ['Emergency pumps', 'Evac drones'],
                        estimatedTime: '22 mins',
                        confidence: Math.floor(80 + Math.random() * 18)
                    });
                }
            },
            { t: 30000, fn: () => emitPhaseChange('mitigated', 'zone-4') },
        ];

        function emitPhaseChange(status, newZone) {
            if (!crisisActive) return;
            socket.emit('crisis:serverPhase', { status, affectedZone: newZone });
            socket.broadcast.emit('crisis:serverPhase', { status, affectedZone: newZone });
        }

        phaseAdvances.forEach(p => setTimeout(p.fn, p.t));
    });

    socket.on('crisis:resolve', () => {
        console.log('[SentinelGov Server] Crisis resolution received');
        crisisActive = false;
        socket.emit('crisis:resolved', { timestamp: new Date().toISOString() });
        socket.broadcast.emit('crisis:resolved');
        socket.emit('crisis:serverPhase', { status: 'resolved', affectedZone: null });
        socket.broadcast.emit('crisis:serverPhase', { status: 'resolved', affectedZone: null });
    });

    socket.on('disconnect', () => {
        console.log(`[SentinelGov Server] Client disconnected: ${socket.id}`);
        clearInterval(telemetryInterval);
    });
});

app.get('/api/health', (_req, res) => {
    res.json({ status: 'online', uptime: process.uptime(), crisisActive });
});

app.get('/api/report', (_req, res) => {
    res.json({
        generated: new Date().toISOString(),
        systemId: 'SENTINEL-CORE-001',
        crisisActive,
        ticks: systemTick,
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
