import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import type { Zone } from '../store/useSystemStore';
import { MapPin } from 'lucide-react';

const statusColors: Record<string, string> = {
    normal: '#00f0ff',
    warning: '#f59e0b',
    critical: '#ff003c',
    evacuating: '#a855f7',
    mitigated: '#22c55e',
};

const roadPaths = [
    'M280,100 L320,180', 'M320,180 L400,280', 'M400,280 L350,380',
    'M320,180 L480,120', 'M480,120 L550,220', 'M550,220 L520,360',
    'M400,280 L550,220', 'M280,100 L180,250', 'M180,250 L350,380',
    'M400,280 L520,360', 'M180,250 L320,180',
];

const bridgePaths = [
    { d: 'M280,100 L320,180', label: 'North Bridge' },
    { d: 'M480,120 L550,220', label: 'East Overpass' },
];

function ZoneNode({ zone, onClick }: { zone: Zone; onClick: (z: Zone) => void }) {
    const color = statusColors[zone.status];
    const isCritical = zone.status === 'critical' || zone.status === 'evacuating';

    return (
        <g onClick={() => onClick(zone)} className="cursor-pointer" role="button">
            {/* Ripple effect for critical/warning */}
            {(zone.status === 'critical' || zone.status === 'warning') && (
                <>
                    <motion.circle
                        cx={zone.cx} cy={zone.cy} r={8}
                        fill="none" stroke={color} strokeWidth="1"
                        initial={{ r: 8, opacity: 0.8 }}
                        animate={{ r: 35, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.circle
                        cx={zone.cx} cy={zone.cy} r={8}
                        fill="none" stroke={color} strokeWidth="0.5"
                        initial={{ r: 12, opacity: 0.5 }}
                        animate={{ r: 50, opacity: 0 }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                    />
                </>
            )}

            {/* Zone area */}
            <motion.circle
                cx={zone.cx} cy={zone.cy}
                initial={{ r: 20 }}
                animate={{
                    r: isCritical ? [20, 25, 20] : 20,
                    fill: `${color}15`,
                }}
                transition={isCritical ? { duration: 1.5, repeat: Infinity } : { duration: 0.5 }}
                stroke={color} strokeWidth="1.5" strokeDasharray={zone.status === 'evacuating' ? '4 3' : 'none'}
                style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
            />

            {/* Center dot */}
            <circle cx={zone.cx} cy={zone.cy} r="4" fill={color}
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />

            {/* Label */}
            <text x={zone.cx} y={zone.cy + 32} textAnchor="middle" fill="white" fontSize="7" fontWeight="600" opacity="0.7"
                fontFamily="'Rajdhani', sans-serif" letterSpacing="0.5">
                {zone.name.split(' - ')[0]}
            </text>

            {/* Risk label */}
            <text x={zone.cx} y={zone.cy - 28} textAnchor="middle" fill={color} fontSize="8" fontWeight="700"
                fontFamily="'Rajdhani', sans-serif">
                {zone.riskLevel}%
            </text>
        </g>
    );
}

export function CityMap() {
    const zones = useSystemStore((s) => s.zones);
    const crisisStatus = useSystemStore((s) => s.crisisStatus);
    const affectedZones = useSystemStore((s) => s.affectedZones);
    const [tooltip, setTooltip] = useState<Zone | null>(null);

    return (
        <div className="glass-panel rounded-xl overflow-hidden relative h-full group">
            <div className="absolute top-3 left-4 z-10">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Digital Twin — City Grid
                </h3>
            </div>

            <svg viewBox="80 30 570 420" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Background grid */}
                <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0,240,255,0.04)" strokeWidth="0.5" />
                    </pattern>
                    <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(0,240,255,0.08)" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                    {/* Water fill animation */}
                    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(0,120,255,0.15)">
                            <animate attributeName="stopColor" values="rgba(0,120,255,0.1);rgba(0,120,255,0.25);rgba(0,120,255,0.1)" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="rgba(0,60,255,0.05)" />
                    </linearGradient>
                </defs>

                <rect x="80" y="30" width="570" height="420" fill="url(#grid)" />
                <rect x="80" y="30" width="570" height="420" fill="url(#mapGlow)" />

                {/* River */}
                <path d="M100,120 Q200,130 250,180 Q300,230 350,250 Q430,280 500,300 Q560,310 650,340"
                    fill="none" stroke="rgba(0,120,255,0.3)" strokeWidth="12" strokeLinecap="round" />
                <path d="M100,120 Q200,130 250,180 Q300,230 350,250 Q430,280 500,300 Q560,310 650,340"
                    fill="none" stroke="url(#waterGrad)" strokeWidth="8" strokeLinecap="round" />

                {/* Roads */}
                {roadPaths.map((d, i) => (
                    <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round" />
                ))}

                {/* Bridges */}
                {bridgePaths.map((b, i) => {
                    const isAffected = crisisStatus !== 'idle' && affectedZones.includes('zone-4');
                    return (
                        <g key={i}>
                            <motion.path
                                d={b.d} fill="none"
                                stroke={isAffected ? '#ff003c' : '#f59e0b'}
                                strokeWidth="4" strokeLinecap="round"
                                strokeDasharray="8 4"
                                animate={isAffected ? { opacity: [1, 0.3, 1] } : { opacity: 0.5 }}
                                transition={isAffected ? { duration: 0.8, repeat: Infinity } : {}}
                            />
                        </g>
                    );
                })}

                {/* Traffic reroute animation */}
                {crisisStatus !== 'idle' && affectedZones.includes('zone-4') && (
                    <motion.path
                        d="M180,250 C250,200 350,320 520,360"
                        fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="6 4"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.6 }}
                        transition={{ duration: 3, ease: 'easeInOut' }}
                    />
                )}

                {/* Zone nodes */}
                {zones.map((z) => (
                    <ZoneNode key={z.id} zone={z} onClick={setTooltip} />
                ))}
            </svg>

            {/* Tooltip */}
            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-4 left-4 glass-panel p-3 rounded-lg border border-primary/30 z-20 max-w-[220px]"
                        onClick={() => setTooltip(null)}
                    >
                        <p className="text-primary font-bold text-xs tracking-wider">{tooltip.name}</p>
                        <div className="mt-1 space-y-0.5 text-[10px] text-slate-400 font-mono">
                            <p>Risk: <span style={{ color: statusColors[tooltip.status] }}>{tooltip.riskLevel}%</span></p>
                            <p>Population: {tooltip.population.toLocaleString()}</p>
                            <p>Status: <span className="uppercase font-bold" style={{ color: statusColors[tooltip.status] }}>{tooltip.status}</span></p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
