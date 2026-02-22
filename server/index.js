import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// ─── INIT REDIS PUB/SUB ────────────────────────────────────────────────
let redisPublisher = null;
if (process.env.REDIS_URL) {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisPublisher = redisClient.duplicate();
    redisClient.on('error', err => console.error('Redis Error', err));
    redisClient.connect().then(() => {
        redisPublisher.connect();
        console.log('✅ Connected to Redis Message Broker');
    });
}

// ─── SYSTEM STATE ───────────────────────────────────────────────────────────
let systemTick = 0;
let crisisActive = false;
let crisisStartTick = 0;

let telemetryState = { rainfall: 15, drainageCapacity: 0.85, populationDensity: 0.35, socialSpike: 0.05 };
const BASELINE = { rainfall: 15, drainageCapacity: 0.85, populationDensity: 0.35, socialSpike: 0.05 };

// ─── ML INFERENCE SERVICE HOOK ──────────────────────────────────────────────
async function getInferenceRisk(telemetry) {
    if (process.env.ML_SERVICE_URL) {
        try {
            const res = await fetch(`${process.env.ML_SERVICE_URL}/predict-risk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(telemetry)
            });
            if (res.ok) {
                const inference = await res.json();
                return inference.predictedRisk;
            }
        } catch (err) {
            console.error("ML Inference failed, returning deterministic fallback:", err.message);
        }
    }
    const drainageInverse = 1 - telemetry.drainageCapacity;
    const risk = clamp(telemetry.rainfall / 150, 0, 1) * 0.4 * 100 + drainageInverse * 0.2 * 100 + telemetry.populationDensity * 0.2 * 100 + telemetry.socialSpike * 0.2 * 100;
    return Math.round(risk);
}

// ─── OPENWEATHERMAP API HOOK ────────────────────────────────────────────────
async function fetchRealWeather() {
    if (process.env.OPENWEATHERMAP_API_KEY) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${process.env.OPENWEATHERMAP_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.rain && data.rain['1h']) {
                return data.rain['1h'] * 4; // Arbitrary multiplier to simulate crisis severity
            }
            return BASELINE.rainfall;
        } catch (e) { /* ignore */ }
    }
    return null;
}

// Math helpers
function lerp(a, b, t) { return a + (b - a) * t; }
function decay(c, t, s) { return c + (t - c) * s; }
function jitter(a) { return (Math.random() - 0.5) * 2 * a; }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function round2(v) { return Math.round(v * 100) / 100; }

// ─── TELEMETRY GENERATOR ────────────────────────────────────────────────────
async function generateTelemetry() {
    systemTick++;
    if (crisisActive) {
        const elapsed = systemTick - crisisStartTick;
        const rampFactor = Math.min(elapsed / 30, 1);

        const realRain = await fetchRealWeather();
        telemetryState.rainfall = realRain ? realRain : lerp(BASELINE.rainfall, 120 + jitter(15), rampFactor);
        telemetryState.drainageCapacity = lerp(BASELINE.drainageCapacity, 0.15 + jitter(0.05), rampFactor);
        telemetryState.populationDensity = lerp(BASELINE.populationDensity, 0.75 + jitter(0.05), rampFactor);
        telemetryState.socialSpike = lerp(BASELINE.socialSpike, 0.90 + jitter(0.08), rampFactor);
    } else {
        telemetryState.rainfall = decay(telemetryState.rainfall, BASELINE.rainfall, 0.15);
        telemetryState.drainageCapacity = decay(telemetryState.drainageCapacity, BASELINE.drainageCapacity, 0.10);
        telemetryState.populationDensity = decay(telemetryState.populationDensity, BASELINE.populationDensity, 0.10);
        telemetryState.socialSpike = decay(telemetryState.socialSpike, BASELINE.socialSpike, 0.20);
    }

    const riskLevel = await getInferenceRisk(telemetryState);

    // KAFKA/REDIS EVENT STREAMING
    if (redisPublisher && riskLevel > 60) {
        redisPublisher.publish('sys.telemetry.critical', JSON.stringify({
            event: 'ANOMALY_DETECTED', riskTarget: riskLevel, telemetry: telemetryState
        }));
    }

    return {
        tick: systemTick, timestamp: new Date().toISOString(),
        networkLatency: Math.floor(12 + Math.random() * 8),
        cpuUsage: Math.floor(15 + Math.random() * 25),
        memoryUsage: Math.floor(30 + Math.random() * 20),
        activeConnections: Math.floor(120 + Math.random() * 40),
        threatVectors: crisisActive ? Math.floor(3 + Math.random() * 5) : Math.floor(Math.random() * 2),
        rainfall: round2(telemetryState.rainfall),
        drainageCapacity: round2(telemetryState.drainageCapacity),
        populationDensity: round2(telemetryState.populationDensity),
        socialSpike: round2(telemetryState.socialSpike),
        sensorReadings: { rainfall: round2(telemetryState.rainfall), riverLevel: crisisActive ? 6.2 + Math.random() * 2.5 : 1.8 + Math.random() * 0.5, windSpeed: 8 + Math.random() * 12, temperature: 22 + Math.random() * 5 },
        metrics: {
            riskLevel, riskReduction: crisisActive ? Math.floor(20 + Math.random() * 60) : 0,
            responseTime: crisisActive ? Math.floor(2 + Math.random() * 4) : 0,
            populationProtected: crisisActive ? Math.floor(15000 + Math.random() * 50000) : 0,
            damagePrevented: crisisActive ? Math.floor(40 + Math.random() * 50) : 0
        }
    };
}

io.on('connection', (socket) => {
    socket.emit('system:handshake', { serverId: 'SENTINEL-CORE-001', version: '4.0.0', status: 'online', timestamp: new Date().toISOString() });

    // Telemetry stream
    setInterval(async () => {
        const payload = await generateTelemetry();
        socket.emit('telemetry:update', payload);
    }, 2000);

    socket.on('crisis:inject', () => {
        if (crisisActive) return;
        crisisActive = true;
        crisisStartTick = systemTick;
        socket.emit('crisis:ack', { message: 'Crisis sequence initiated. Models ramping.' });

        const crisisInterval = setInterval(() => {
            if (!crisisActive) return clearInterval(crisisInterval);
            const agents = ['Sentinel', 'Risk', 'Simulation', 'Resource', 'Governance'];
            const events = ['anomaly flagged', 'processing matrices', 'diverting traffic', 'capacity constraint hit', 'signature verified'];
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            const randomMsg = `${events[Math.floor(Math.random() * events.length)]} [hash: ${Math.random().toString(36).substring(2, 8)}]`;

            socket.emit('crisis:serverLog', { agent: randomAgent, message: randomMsg, severity: 'warning' });

            // Granular events
            const riskLevel = clamp(telemetryState.rainfall / 150, 0, 1) * 0.4 * 100 + (1 - telemetryState.drainageCapacity) * 0.2 * 100 + telemetryState.populationDensity * 0.2 * 100 + telemetryState.socialSpike * 0.2 * 100;
            const ge = [
                { event: 'crisis:riskUpdated', data: { riskLevel, timestamp: Date.now() } },
                { event: 'crisis:simulationProgress', data: { iteration: systemTick - crisisStartTick, rainfall: round2(telemetryState.rainfall), drainage: round2(telemetryState.drainageCapacity) } }
            ][Math.floor(Math.random() * 2)];

            socket.emit(ge.event, ge.data);
            if (redisPublisher) redisPublisher.publish('sys.granular.events', JSON.stringify(ge));
        }, 3500);

        setTimeout(() => {
            if (!crisisActive) return;
            crisisActive = false;
            socket.emit('crisis:resolved', { finalRisk: 14, damageMitigated: true });
        }, 60000);
    });

    socket.on('crisis:abort', () => { crisisActive = false; });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '4.0.0', broker: process.env.REDIS_URL ? 'Redis' : 'InMemory', activeCrisis: crisisActive }));
app.get('/api/report', (req, res) => res.json({ id: 'SG-RPT-8293', generatedAt: new Date().toISOString(), status: 'secured' }));

httpServer.listen(3001, () => {
    console.log('⚡ SentinelGov Server (Enterprise) running on port 3001');
    if (process.env.ML_SERVICE_URL) console.log(`🧠 ML Service Linked: ${process.env.ML_SERVICE_URL}`);
    else console.log(`🧠 ML Service not detected. Using Local Deterministic Math.`);
});
