import { create } from 'zustand';

export type AgentName = 'Sentinel' | 'Risk' | 'Simulation' | 'Response' | 'Resource' | 'Governance';
export type CrisisStatus = 'idle' | 'detected' | 'simulating' | 'negotiating' | 'mitigating' | 'mitigated' | 'resolved';

export interface LogEntry {
    id: string;
    timestamp: string;
    agent: AgentName;
    message: string;
    severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface Zone {
    id: string;
    name: string;
    riskLevel: number;
    population: number;
    status: 'normal' | 'warning' | 'critical' | 'evacuating' | 'mitigated';
    cx: number;
    cy: number;
}

export interface MitigationPlan {
    action: string;
    zones: string[];
    resources: string[];
    estimatedTime: string;
    confidence: number;
}

export interface NegotiationEntry {
    agent: AgentName;
    position: string;
    timestamp: string;
}

export interface MetricsData {
    riskReduction: number;
    responseTime: number;
    populationProtected: number;
    damagePrevented: number;
}

export interface AuditEntry {
    timestamp: string;
    action: string;
    agent: AgentName;
    detail: string;
}

export interface SystemState {
    // System
    systemStatus: 'online' | 'offline' | 'degraded';
    humanInLoop: boolean;
    demoMode: boolean;
    wsConnected: boolean;

    // Crisis
    crisisStatus: CrisisStatus;
    riskLevel: number;
    targetRiskLevel: number;

    // Agents
    activeAgents: AgentName[];
    agentCommunications: { from: AgentName; to: AgentName; message: string }[];

    // Zones
    zones: Zone[];
    affectedZones: string[];

    // Logs
    logs: LogEntry[];

    // Plans
    mitigationPlan: MitigationPlan | null;
    negotiationState: NegotiationEntry[];

    // Metrics
    metrics: MetricsData;

    // Governance
    auditTrail: AuditEntry[];

    // Actions
    setSystemStatus: (s: 'online' | 'offline' | 'degraded') => void;
    setCrisisStatus: (s: CrisisStatus) => void;
    setRiskLevel: (n: number) => void;
    setTargetRiskLevel: (n: number) => void;
    activateAgent: (a: AgentName) => void;
    deactivateAllAgents: () => void;
    addAgentComm: (from: AgentName, to: AgentName, message: string) => void;
    clearAgentComms: () => void;
    addLog: (agent: AgentName, message: string, severity: LogEntry['severity']) => void;
    clearLogs: () => void;
    setZoneStatus: (zoneId: string, status: Zone['status'], riskLevel?: number) => void;
    setAffectedZones: (zones: string[]) => void;
    setMitigationPlan: (plan: MitigationPlan | null) => void;
    addNegotiation: (agent: AgentName, position: string) => void;
    clearNegotiation: () => void;
    setMetrics: (m: Partial<MetricsData>) => void;
    addAudit: (action: string, agent: AgentName, detail: string) => void;
    setHumanInLoop: (v: boolean) => void;
    setDemoMode: (v: boolean) => void;
    setWsConnected: (v: boolean) => void;
    resetSystem: () => void;
}

const defaultZones: Zone[] = [
    { id: 'zone-1', name: 'Ward 12 - River Delta', riskLevel: 12, population: 45000, status: 'normal', cx: 320, cy: 180 },
    { id: 'zone-2', name: 'Ward 7 - Industrial Hub', riskLevel: 8, population: 32000, status: 'normal', cx: 480, cy: 120 },
    { id: 'zone-3', name: 'Central Business District', riskLevel: 5, population: 78000, status: 'normal', cx: 400, cy: 280 },
    { id: 'zone-4', name: 'North Bridge Corridor', riskLevel: 15, population: 22000, status: 'normal', cx: 280, cy: 100 },
    { id: 'zone-5', name: 'South Residential Block', riskLevel: 6, population: 55000, status: 'normal', cx: 350, cy: 380 },
    { id: 'zone-6', name: 'East Power Grid Station', riskLevel: 10, population: 18000, status: 'normal', cx: 550, cy: 220 },
    { id: 'zone-7', name: 'West Water Treatment', riskLevel: 20, population: 12000, status: 'normal', cx: 180, cy: 250 },
    { id: 'zone-8', name: 'Harbor District', riskLevel: 18, population: 28000, status: 'normal', cx: 520, cy: 360 },
];

const initialMetrics: MetricsData = {
    riskReduction: 0,
    responseTime: 0,
    populationProtected: 0,
    damagePrevented: 0,
};

const now = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const useSystemStore = create<SystemState>((set, get) => ({
    systemStatus: 'online',
    humanInLoop: true,
    demoMode: false,
    wsConnected: false,

    crisisStatus: 'idle',
    riskLevel: 12,
    targetRiskLevel: 12,

    activeAgents: [],
    agentCommunications: [],

    zones: [...defaultZones],
    affectedZones: [],

    logs: [],

    mitigationPlan: null,
    negotiationState: [],

    metrics: { ...initialMetrics },

    auditTrail: [],

    setSystemStatus: (s) => set({ systemStatus: s }),
    setCrisisStatus: (s) => set({ crisisStatus: s }),
    setRiskLevel: (n) => set({ riskLevel: Math.round(Math.max(0, Math.min(100, n))) }),
    setTargetRiskLevel: (n) => set({ targetRiskLevel: n }),

    activateAgent: (a) =>
        set((s) => ({
            activeAgents: s.activeAgents.includes(a) ? s.activeAgents : [...s.activeAgents, a],
        })),
    deactivateAllAgents: () => set({ activeAgents: [] }),

    addAgentComm: (from, to, message) =>
        set((s) => ({
            agentCommunications: [...s.agentCommunications.slice(-20), { from, to, message }],
        })),
    clearAgentComms: () => set({ agentCommunications: [] }),

    addLog: (agent, message, severity) =>
        set((s) => ({
            logs: [
                ...s.logs.slice(-199),
                { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: now(), agent, message, severity },
            ],
        })),
    clearLogs: () => set({ logs: [] }),

    setZoneStatus: (zoneId, status, riskLevel) =>
        set((s) => ({
            zones: s.zones.map((z) =>
                z.id === zoneId ? { ...z, status, riskLevel: riskLevel ?? z.riskLevel } : z
            ),
        })),
    setAffectedZones: (zones) => set({ affectedZones: zones }),

    setMitigationPlan: (plan) => set({ mitigationPlan: plan }),

    addNegotiation: (agent, position) =>
        set((s) => ({
            negotiationState: [...s.negotiationState, { agent, position, timestamp: now() }],
        })),
    clearNegotiation: () => set({ negotiationState: [] }),

    setMetrics: (m) =>
        set((s) => ({
            metrics: { ...s.metrics, ...m },
        })),

    addAudit: (action, agent, detail) =>
        set((s) => ({
            auditTrail: [
                ...s.auditTrail,
                { timestamp: now(), action, agent, detail },
            ],
        })),

    setHumanInLoop: (v) => set({ humanInLoop: v }),
    setDemoMode: (v) => set({ demoMode: v }),
    setWsConnected: (v) => set({ wsConnected: v }),

    resetSystem: () =>
        set({
            crisisStatus: 'idle',
            riskLevel: 12,
            targetRiskLevel: 12,
            activeAgents: [],
            agentCommunications: [],
            zones: [...defaultZones],
            affectedZones: [],
            logs: [],
            mitigationPlan: null,
            negotiationState: [],
            metrics: { ...initialMetrics },
            auditTrail: [],
        }),
}));
