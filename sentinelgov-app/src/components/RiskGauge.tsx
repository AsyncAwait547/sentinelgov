import { motion } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { ShieldAlert } from 'lucide-react';

export function RiskGauge() {
    const riskLevel = useSystemStore((s) => s.riskLevel);
    const crisisStatus = useSystemStore((s) => s.crisisStatus);

    const radius = 80;
    const circumference = Math.PI * radius; // half circle
    const progress = (riskLevel / 100) * circumference;
    const rotation = (riskLevel / 100) * 180 - 90;

    const isCritical = riskLevel > 50;
    const arcColor = isCritical ? '#ff003c' : '#00f0ff';

    return (
        <div className="glass-panel p-5 rounded-xl flex flex-col items-center relative overflow-hidden">
            <div className="flex items-center justify-between w-full mb-4">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                    Threat Index
                </h3>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${crisisStatus !== 'idle' ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-primary border-primary/30 bg-primary/10'
                    }`}>
                    {crisisStatus === 'idle' ? 'MONITORING' : crisisStatus.toUpperCase()}
                </span>
            </div>

            <div className="relative w-[220px] h-[120px] flex items-end justify-center">
                <svg width="220" height="120" className="absolute top-0 left-0">
                    {/* Tick marks */}
                    {Array.from({ length: 11 }).map((_, i) => {
                        const angle = (i / 10) * Math.PI;
                        const x1 = 110 + Math.cos(Math.PI - angle) * 70;
                        const y1 = 110 + Math.sin(Math.PI - angle) * -70;
                        const x2 = 110 + Math.cos(Math.PI - angle) * 80;
                        const y2 = 110 + Math.sin(Math.PI - angle) * -80;
                        return (
                            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        );
                    })}
                    {/* Background arc */}
                    <circle
                        cx="110" cy="110" r={radius}
                        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"
                        strokeDasharray={`${circumference} ${circumference}`}
                        transform="rotate(180 110 110)"
                    />
                    {/* Value arc */}
                    <motion.circle
                        cx="110" cy="110" r={radius}
                        fill="none" stroke={arcColor} strokeWidth="10"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: circumference - progress }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        transform="rotate(180 110 110)"
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 8px ${arcColor}80)` }}
                    />
                </svg>

                {/* Needle */}
                <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-[75px] origin-bottom"
                    animate={{ rotate: rotation }}
                    transition={{ duration: 0.8, type: 'spring', stiffness: 80, damping: 18 }}
                >
                    <div className="w-full h-full bg-gradient-to-t from-transparent via-white to-white rounded-t-full" style={{ filter: 'drop-shadow(0 0 6px white)' }} />
                </motion.div>

                {/* Center hub */}
                <div className="absolute bottom-[-6px] w-5 h-5 rounded-full bg-slate-900 border-2 border-primary z-10 shadow-neon flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
            </div>

            <motion.div
                key={riskLevel}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="mt-3 text-center"
            >
                <span className={`text-4xl font-display font-bold tabular-nums ${isCritical ? 'text-[#ff003c]' : 'text-white'}`}>
                    {riskLevel}%
                </span>
                <p className={`text-[9px] uppercase font-bold tracking-[0.2em] mt-1 ${isCritical ? 'text-[#ff003c] animate-pulse' : 'text-primary'}`}>
                    {riskLevel > 70 ? 'CRITICAL' : riskLevel > 40 ? 'ELEVATED' : 'NOMINAL'}
                </p>
            </motion.div>
        </div>
    );
}
