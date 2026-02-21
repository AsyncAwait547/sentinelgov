import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrisisStore } from '../store/crisisStore';
import { cn } from '../lib/utils';
import { Shield, Brain, Activity, TerminalSquare, Server } from 'lucide-react';

interface AgentLog {
    id: string;
    agent: string;
    type: 'sentinel' | 'risk' | 'simulation' | 'response' | 'orchestrator';
    message: string;
    color: string;
    icon: React.ElementType;
}

const baselineLogs: Omit<AgentLog, 'id'>[] = [
    { agent: 'Sentinel', type: 'sentinel', message: 'System monitors active. Grid integrity 99.8%.', color: 'text-cyan-400', icon: Shield },
    { agent: 'Risk Agent', type: 'risk', message: 'No anomalies detected in Sector 7.', color: 'text-emerald-400', icon: Activity },
    { agent: 'Simulation', type: 'simulation', message: 'Background forecasting complete.', color: 'text-blue-400', icon: Brain },
];

export function LiveAgentActivityConsole() {
    const { isCrisisActive, isMitigating } = useCrisisStore();
    const [logs, setLogs] = useState<AgentLog[]>([]);

    useEffect(() => {
        // Inject initial baseline logs once
        setLogs(baselineLogs.map((l, i) => ({ ...l, id: `base-${i}` })));
    }, []);

    useEffect(() => {
        if (!isCrisisActive) {
            if (!isMitigating) {
                // We are back to normal
                const timer = setTimeout(() => {
                    setLogs((prev) => [
                        { id: Date.now().toString(), agent: 'Sentinel', type: 'sentinel' as const, message: 'Grid stabilized. All systems nominal.', color: 'text-emerald-400', icon: Shield },
                        ...prev
                    ].slice(0, 8));
                }, 1000);
                return () => clearTimeout(timer);
            }
            return;
        }

        const crisisLogs: Omit<AgentLog, 'id'>[] = [
            { agent: 'Sentinel', type: 'sentinel', message: 'Rainfall anomaly detected. River levels surging.', color: 'text-red-500', icon: Shield },
            { agent: 'Risk Agent', type: 'risk', message: 'Flood probability: 82%. Imminent failure at Delta Bridge.', color: 'text-orange-500', icon: Activity },
            { agent: 'Simulation', type: 'simulation', message: 'Running 2,450 scenarios...', color: 'text-cyan-400', icon: Brain },
            { agent: 'Response', type: 'response', message: 'Proposing emergency flood barrier & pump deployment.', color: 'text-yellow-400', icon: Server },
            { agent: 'Orchestrator', type: 'orchestrator', message: 'Mitigation approved. Executing protocol.', color: 'text-emerald-400', icon: TerminalSquare },
        ];

        let step = 0;
        const interval = setInterval(() => {
            if (step < crisisLogs.length) {
                const newLog = { ...crisisLogs[step], id: Date.now().toString() };
                setLogs((prev) => [newLog, ...prev].slice(0, 8)); // keep last 8
                step++;
            } else {
                clearInterval(interval);
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [isCrisisActive, isMitigating]);

    return (
        <div className="glass-panel p-5 rounded-xl h-[400px] flex flex-col justify-start relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4 border-b border-primary/20 pb-2">
                <h3 className="font-display font-bold text-sm tracking-widest text-slate-300 uppercase flex items-center gap-2">
                    <TerminalSquare className="w-4 h-4 text-primary animate-pulse" />
                    Live Agent Console
                </h3>
                <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border", isCrisisActive ? "bg-red-500/20 text-red-500 border-red-500/30 animate-pulse" : "bg-primary/20 text-primary border-primary/30")}>
                    {isCrisisActive ? 'CRISIS MODE' : 'STANDBY'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 flex flex-col">
                <AnimatePresence>
                    {logs.map((log) => {
                        const Icon = log.icon;
                        return (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: -20, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                className={cn(
                                    "p-3 rounded border border-white/5 bg-slate-800/40 relative group-hover:bg-slate-800/60 transition-colors",
                                    log.color.includes('red') && "border-red-500/30 bg-red-950/20"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className={cn("w-3 h-3", log.color)} />
                                    <span className={cn("font-bold text-[11px] uppercase tracking-wider", log.color)}>{log.agent}</span>
                                    <span className="ml-auto text-slate-500 text-[9px] font-mono">LIVE</span>
                                </div>

                                {/* Typing Effect for actual message */}
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-xs text-slate-300 font-mono tracking-tight"
                                >
                                    <TypewriterText text={log.message} />
                                </motion.p>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}

function TypewriterText({ text }: { text: string }) {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayed(text.slice(0, i + 1));
                i++;
            } else {
                clearInterval(interval);
            }
        }, 20); // typing speed
        return () => clearInterval(interval);
    }, [text]);

    return <span>{displayed}<span className="animate-pulse">_</span></span>;
}
