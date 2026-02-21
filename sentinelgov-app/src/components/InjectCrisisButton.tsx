import { motion } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { runCrisisSequence, runDemoSequence } from '../orchestrator/crisisEngine';
import { AlertOctagon, RefreshCcw, RotateCcw, Play } from 'lucide-react';

export function InjectCrisisButton() {
    const crisisStatus = useSystemStore((s) => s.crisisStatus);
    const demoMode = useSystemStore((s) => s.demoMode);

    const isRunning = crisisStatus !== 'idle' && crisisStatus !== 'resolved';

    return (
        <div className="flex flex-col gap-2 w-full">
            {/* Main CTA */}
            {isRunning ? (
                <div className="w-full h-14 glass-panel border-2 border-red-500/30 text-red-400 font-bold tracking-widest text-xs rounded-lg flex items-center justify-center gap-3 uppercase animate-pulse">
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    {crisisStatus === 'detected' && 'Threat Detected...'}
                    {crisisStatus === 'simulating' && 'Running Simulation...'}
                    {crisisStatus === 'negotiating' && 'Agent Negotiation...'}
                    {crisisStatus === 'mitigating' && 'Executing Mitigation...'}
                    {crisisStatus === 'mitigated' && 'Stabilizing...'}
                </div>
            ) : crisisStatus === 'resolved' ? (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => useSystemStore.getState().resetSystem()}
                    className="w-full h-14 bg-emerald-600/20 border-2 border-emerald-500/40 text-emerald-400 font-bold tracking-widest text-xs rounded-lg flex items-center justify-center gap-3 uppercase cursor-pointer hover:bg-emerald-600/30 transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    System Resolved — Reset
                </motion.button>
            ) : (
                <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(255, 0, 60, 0.35)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => runCrisisSequence()}
                    className="w-full h-14 bg-transparent border-2 border-[#ff003c]/40 text-[#ff003c] font-black tracking-[0.15em] text-xs rounded-lg flex items-center justify-center gap-3 uppercase cursor-pointer shadow-[0_0_15px_rgba(255,0,60,0.15)] hover:bg-[#ff003c]/5 transition-all"
                >
                    <AlertOctagon className="w-5 h-5 animate-pulse" />
                    Inject Crisis Scenario
                </motion.button>
            )}

            {/* Secondary controls */}
            <div className="flex gap-2">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => runDemoSequence()}
                    disabled={isRunning || demoMode}
                    className="flex-1 h-9 glass-panel border border-primary/30 text-primary text-[10px] font-bold tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Play className="w-3 h-3" />
                    Demo Mode
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => useSystemStore.getState().resetSystem()}
                    disabled={isRunning}
                    className="flex-1 h-9 glass-panel border border-slate-600/50 text-slate-400 text-[10px] font-bold tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-600/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                </motion.button>
            </div>
        </div>
    );
}
