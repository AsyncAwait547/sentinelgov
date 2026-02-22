import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import type { AgentName } from '../store/useSystemStore';
import { Shield, Activity, Brain, Server, Scale, Cpu, Terminal } from 'lucide-react';

const agentConfig: Record<AgentName, { color: string; icon: typeof Shield }> = {
    Sentinel: { color: 'text-cyan-400', icon: Shield },
    Risk: { color: 'text-orange-400', icon: Activity },
    Simulation: { color: 'text-blue-400', icon: Brain },
    Response: { color: 'text-yellow-400', icon: Server },
    Resource: { color: 'text-purple-400', icon: Cpu },
    Governance: { color: 'text-emerald-400', icon: Scale },
};

const severityBg: Record<string, string> = {
    info: 'border-slate-700/50',
    warning: 'border-yellow-500/30 bg-yellow-950/10',
    critical: 'border-red-500/30 bg-red-950/15',
    success: 'border-emerald-500/30 bg-emerald-950/10',
};

function TypewriterText({ text }: { text: string }) {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        let i = 0;
        setDisplayed('');
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayed(text.slice(0, i + 1));
                i++;
            } else {
                clearInterval(interval);
            }
        }, 15);
        return () => clearInterval(interval);
    }, [text]);

    return (
        <span>
            {displayed}
            {displayed.length < text.length && <span className="animate-pulse text-primary">▊</span>}
        </span>
    );
}

export function AgentLogConsole() {
    const logs = useSystemStore((s) => s.logs);
    const crisisStatus = useSystemStore((s) => s.crisisStatus);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="glass-panel rounded-xl flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                <h3 className="font-display font-bold text-xs tracking-[0.2em] text-slate-300 uppercase flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    Agent Activity Log
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-500">{logs.length} entries</span>
                    <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border ${crisisStatus !== 'idle'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                                : 'bg-primary/10 text-primary border-primary/30'
                            }`}
                    >
                        {crisisStatus === 'idle' ? 'STANDBY' : crisisStatus.toUpperCase()}
                    </span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
                {logs.length === 0 && (
                    <div className="flex items-center justify-center h-full text-slate-600 text-xs font-mono">
                        Awaiting agent activity...
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {logs.map((log) => {
                        const cfg = agentConfig[log.agent];
                        const Icon = cfg.icon;
                        return (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className={`p-2.5 rounded border ${severityBg[log.severity]} bg-slate-900/40 group relative`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className={`w-3 h-3 ${cfg.color}`} />
                                    <span className={`font-bold text-[10px] uppercase tracking-widest ${cfg.color}`}>
                                        {log.agent}
                                    </span>
                                    <span className="ml-auto text-slate-600 text-[9px] font-mono">{log.timestamp}</span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
                                    <TypewriterText text={log.message} />
                                </p>
                                {/* Glow bar */}
                                <motion.div
                                    initial={{ opacity: 0.8, scaleX: 1 }}
                                    animate={{ opacity: 0, scaleX: 0 }}
                                    transition={{ duration: 2, ease: 'easeOut' }}
                                    className={`absolute top-0 left-0 h-full w-1 rounded-l origin-top ${log.severity === 'critical'
                                            ? 'bg-red-500'
                                            : log.severity === 'success'
                                                ? 'bg-emerald-500'
                                                : log.severity === 'warning'
                                                    ? 'bg-yellow-500'
                                                    : 'bg-primary'
                                        }`}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
