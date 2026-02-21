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
        console.log('[SentinelGov Server] Crisis injection received');
        crisisActive = true;
        socket.emit('crisis:acknowledged', { status: 'processing', timestamp: new Date().toISOString() });

        // Simulate server-side crisis processing
        setTimeout(() => {
            socket.emit('crisis:serverLog', {
                agent: 'Server',
                message: 'Backend crisis processor activated. Allocating compute resources.',
                severity: 'info',
            });
        }, 500);

        setTimeout(() => {
            socket.emit('crisis:serverLog', {
                agent: 'Server',
                message: 'Real-time data pipeline connected to sensor network.',
                severity: 'info',
            });
        }, 1500);
    });

    socket.on('crisis:resolve', () => {
        console.log('[SentinelGov Server] Crisis resolution received');
        crisisActive = false;
        socket.emit('crisis:resolved', { timestamp: new Date().toISOString() });
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
