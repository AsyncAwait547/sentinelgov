import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { useSystemStore } from '../store/useSystemStore';
import { AgentLogConsole } from '../components/AgentLogConsole';
import { RiskGauge } from '../components/RiskGauge';
import { CityMap } from '../components/CityMap';
import { AgentGraph } from '../components/AgentGraph';
import { MetricsPanel } from '../components/MetricsPanel';
import { GovernancePanel } from '../components/GovernancePanel';
import { InjectCrisisButton } from '../components/InjectCrisisButton';
import {
    Shield, Bell, Settings, Wifi, WifiOff, ChevronDown, ExternalLink, ChevronLeft
} from 'lucide-react';

const pageLinks = [
    { label: 'Landing Page', href: '/', desc: 'Cinematic hero landing' },
    { label: 'Control Dashboard', href: '/sentinelgov_control_center_dashboard/code.html', desc: 'Original dashboard view' },
    { label: 'Execution Command', href: '/sentinelgov_execution_command_view/code.html', desc: 'Command deployment view' },
    { label: 'Agent Decision Logic', href: '/sentinelgov_agent_decision_logic_view/code.html', desc: 'Decision tree analysis' },
    { label: 'Authorization Portal', href: '/sentinelgov_critical_authorization_portal/code.html', desc: 'Crisis override portal' },
    { label: 'Reasoning Modal', href: '/sentinelgov_agent_reasoning_modal/code.html', desc: 'Neural consensus view' },
];

export function ControlCenter() {
    const crisisStatus = useSystemStore((s) => s.crisisStatus);
    const humanInLoop = useSystemStore((s) => s.humanInLoop);
    const wsConnected = useSystemStore((s) => s.wsConnected);
    const [telemetry, setTelemetry] = useState<any>(null);
    const [showNav, setShowNav] = useState(false);

    useEffect(() => {
        let socket: Socket | null = null;

        try {
            socket = io('http://localhost:3001', {
                reconnectionAttempts: 3,
                timeout: 3000,
            });

            socket.on('connect', () => {
                useSystemStore.getState().setWsConnected(true);
                useSystemStore.getState().setSystemStatus('online');
            });

            socket.on('disconnect', () => {
                useSystemStore.getState().setWsConnected(false);
                useSystemStore.getState().setSystemStatus('degraded');
            });

            socket.on('connect_error', () => {
                useSystemStore.getState().setWsConnected(false);
                useSystemStore.getState().setSystemStatus('degraded');
            });

            useSystemStore.getState().setSocketInstance(socket);

            socket.on('telemetry:update', (data: any) => {
                setTelemetry(data);
                if (data.metrics) {
                    useSystemStore.getState().setMetrics(data.metrics);
                    if (data.metrics.riskLevel !== undefined) {
                        useSystemStore.getState().setRiskLevel(data.metrics.riskLevel);
                    }
                }
            });

            socket.on('crisis:serverLog', (data: any) => {
                useSystemStore.getState().addLog(data.agent, data.message, data.severity);
            });

            socket.on('crisis:acknowledged', () => {
                useSystemStore.getState().setCrisisStatus('detected');
            });

            socket.on('crisis:serverPhase', (data: any) => {
                const s = useSystemStore.getState();
                s.setCrisisStatus(data.status);
                if (data.affectedZone) {
                    s.setZoneStatus(data.affectedZone, data.status === 'resolved' ? 'normal' : 'critical', Math.floor(60 + Math.random() * 30));
                    s.setAffectedZones([data.affectedZone]);
                } else if (data.status === 'resolved') {
                    s.zones.forEach((z) => {
                        s.setZoneStatus(z.id, 'normal', Math.floor(5 + Math.random() * 10));
                    });
                }
            });

            socket.on('crisis:serverMitigationPlan', (data: any) => {
                useSystemStore.getState().setMitigationPlan(data);
            });
        } catch {
            useSystemStore.getState().setWsConnected(false);
            useSystemStore.getState().setSystemStatus('degraded');
        }

        return () => {
            socket?.disconnect();
        };
    }, []);

    const isCrisisActive = crisisStatus !== 'idle' && crisisStatus !== 'resolved';

    return (
        <div className="h-screen w-full flex flex-col bg-[#050b14] font-sans relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0,240,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            {/* Crisis overlay */}
            <AnimatePresence>
                {isCrisisActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 pointer-events-none bg-red-950/10 z-0"
                    />
                )}
            </AnimatePresence>

            {/* ─── NAVBAR ─── */}
            <nav className={`h-14 w-full glass-panel border-b flex items-center justify-between px-5 z-50 shrink-0 transition-colors duration-500 ${isCrisisActive ? 'border-red-500/30' : 'border-primary/10'
                }`}>
                <div className="flex items-center gap-3">
                    <a href="/" className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors pr-3 border-r border-slate-700/50">
                        <ChevronLeft className="w-3 h-3" /> Home
                    </a>
                    <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Shield className={`w-7 h-7 ${isCrisisActive ? 'text-red-500 animate-pulse' : 'text-primary'}`} />
                        <h1 className="font-display font-bold text-xl tracking-[0.15em] text-white">
                            SENTINEL<span className={isCrisisActive ? 'text-red-500' : 'text-primary'}>GOV</span>
                        </h1>
                    </a>
                    <div className="h-5 w-px bg-slate-700 mx-1" />
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Control Center v3.2</span>

                    {/* Views dropdown */}
                    <div className="relative ml-2">
                        <button
                            onClick={() => setShowNav(!showNav)}
                            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary px-2 py-1 rounded border border-slate-700/50 hover:border-primary/30 transition-colors cursor-pointer"
                        >
                            Views <ChevronDown className="w-3 h-3" />
                        </button>
                        <AnimatePresence>
                            {showNav && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute top-8 left-0 w-64 glass-panel rounded-lg border border-primary/20 p-2 z-[100] shadow-2xl"
                                >
                                    {pageLinks.map((link) => (
                                        <a
                                            key={link.href}
                                            href={link.href}
                                            className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-primary/10 transition-colors group"
                                        >
                                            <div>
                                                <div className="text-[10px] font-bold text-white uppercase tracking-wider group-hover:text-primary transition-colors">{link.label}</div>
                                                <div className="text-[8px] text-slate-500 font-mono">{link.desc}</div>
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-primary transition-colors" />
                                        </a>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {isCrisisActive && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 ml-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider">
                                    {crisisStatus.toUpperCase()}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-5">
                    {/* Telemetry readouts */}
                    {telemetry && (
                        <div className="hidden lg:flex items-center gap-4 text-[9px] font-mono text-slate-500">
                            <span>LATENCY: <span className="text-primary">{telemetry.networkLatency}ms</span></span>
                            <span>CPU: <span className="text-primary">{telemetry.cpuUsage}%</span></span>
                            <span>CONN: <span className="text-primary">{telemetry.activeConnections}</span></span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Human-in-Loop</span>
                        <button
                            onClick={() => useSystemStore.getState().setHumanInLoop(!humanInLoop)}
                            className={`w-9 h-5 rounded-full border relative transition-colors cursor-pointer ${humanInLoop ? 'bg-primary/20 border-primary/40' : 'bg-slate-700 border-slate-600'
                                }`}
                        >
                            <motion.div
                                animate={{ x: humanInLoop ? 16 : 2 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className={`absolute top-0.5 w-3.5 h-3.5 rounded-full ${humanInLoop ? 'bg-primary shadow-neon' : 'bg-slate-400'}`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 border-l border-slate-700/50 pl-4">
                        <div className="flex items-center gap-1">
                            {wsConnected ? (
                                <Wifi className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <WifiOff className="w-4 h-4 text-yellow-500" />
                            )}
                            <span className={`text-[8px] font-mono ${wsConnected ? 'text-emerald-400' : 'text-yellow-500'}`}>
                                {wsConnected ? 'LIVE' : 'LOCAL'}
                            </span>
                        </div>
                        <Bell className="w-4 h-4 text-slate-500 cursor-pointer hover:text-white transition" />
                        <Settings className="w-4 h-4 text-slate-500 cursor-pointer hover:text-white transition" />
                    </div>
                </div>
            </nav>

            {/* ─── MAIN CONTENT ─── */}
            <main className="flex-1 flex overflow-hidden p-4 gap-4 relative z-10">

                {/* LEFT COLUMN: Logs */}
                <section className="w-[320px] shrink-0 flex flex-col gap-4 h-full">
                    <div className="flex-1 min-h-0">
                        <AgentLogConsole />
                    </div>
                </section>

                {/* CENTER COLUMN: Map + Graph */}
                <section className="flex-1 flex flex-col gap-4 min-w-0 h-full">
                    {/* Top: Agent Graph */}
                    <div className="h-[380px] shrink-0">
                        <AgentGraph />
                    </div>

                    {/* Bottom: City Map */}
                    <div className="flex-1 min-h-0">
                        <CityMap />
                    </div>
                </section>

                {/* RIGHT COLUMN: Controls + Metrics + Governance */}
                <section className="w-[280px] shrink-0 flex flex-col gap-4 h-full">
                    <InjectCrisisButton />
                    <RiskGauge />
                    <MetricsPanel />
                    <div className="flex-1 min-h-0">
                        <GovernancePanel />
                    </div>
                </section>

            </main>
        </div>
    );
}
