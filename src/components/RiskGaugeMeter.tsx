import { motion } from 'framer-motion';
import { useCrisisStore } from '../store/crisisStore';
import { cn } from '../lib/utils';
import { ShieldAlert, Info } from 'lucide-react';

export function RiskGaugeMeter() {
    const { riskLevel } = useCrisisStore();

    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    // Arc displays half circle: 180 degrees
    const offset = circumference - (riskLevel / 100) * (circumference / 2);

    // Rotation of the needle (-90 to +90 degrees)
    const rotation = (riskLevel / 100) * 180 - 90;

    return (
        <div className="glass-panel p-6 flex flex-col items-center justify-center rounded-xl relative overflow-hidden group">
            <div className="absolute top-4 left-4">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-widest flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                    Threat Index
                </h3>
            </div>
            <div className="absolute top-4 right-4">
                <Info className="w-4 h-4 text-slate-500 hover:text-white cursor-pointer" />
            </div>

            <div className="mt-8 relative flex items-center justify-center w-[260px] h-[140px] overflow-hidden">
                {/* SVG Arc Gauge */}
                <svg
                    width="260"
                    height="260"
                    className="transform rotate-180 absolute top-0"
                >
                    {/* Background Arc */}
                    <circle
                        cx="130"
                        cy="130"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="12"
                        strokeDasharray={`${circumference / 2} ${circumference / 2}`}
                    />
                    {/* Animated Value Arc */}
                    <motion.circle
                        cx="130"
                        cy="130"
                        r={radius}
                        fill="transparent"
                        stroke={riskLevel > 50 ? "#ff003c" : "#00f0ff"}
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset + circumference / 2 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={cn("drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]", riskLevel > 50 && "drop-shadow-[0_0_15px_rgba(255,0,60,0.8)]")}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Needle */}
                <motion.div
                    className="absolute bottom-0 w-2 h-[100px] origin-bottom"
                    initial={{ rotate: -90 }}
                    animate={{ rotate: rotation }}
                    transition={{ duration: 1.2, type: "spring", stiffness: 60, damping: 15 }}
                >
                    {/* Arrow shape */}
                    <div className="w-full h-full bg-gradient-to-t from-transparent to-white rounded-t-full relative shadow-[0_0_15px_#fff]">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
                    </div>
                </motion.div>

                {/* Center Hub */}
                <div className="absolute bottom-[-10px] w-8 h-8 rounded-full bg-slate-900 border-2 border-primary z-10 shadow-[0_0_20px_rgba(0,240,255,0.5)] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
            </div>

            {/* Percentage Number */}
            <div className="mt-2 text-center flex flex-col items-center">
                <motion.span
                    key={riskLevel}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn("text-5xl font-display font-bold tabular-nums tracking-tighter", riskLevel > 50 ? "text-accent" : "text-white")}
                >
                    {riskLevel}%
                </motion.span>
                <span className={cn("text-[10px] uppercase font-bold tracking-[0.2em] mt-1 animate-pulse", riskLevel > 50 ? "text-accent" : "text-primary")}>
                    {riskLevel > 50 ? "CRITICAL RISK" : "NOMINAL"}
                </span>
            </div>

        </div>
    );
}
