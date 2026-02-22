import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { TrendingDown, Clock, Users, ShieldCheck, BarChart3, Activity } from 'lucide-react';

function AnimatedNumber({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        const steps = 40;
        const stepTime = 600 / steps;
        const diff = value - display;
        if (Math.abs(diff) < 0.5) { setDisplay(value); return; }
        let step = 0;
        const interval = setInterval(() => {
            step++;
            const progress = step / steps;
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round((display + diff * eased) * 10) / 10);
            if (step >= steps) { setDisplay(value); clearInterval(interval); }
        }, stepTime);
        return () => clearInterval(interval);
    }, [value]);

    return <span>{prefix}{typeof display === 'number' && display % 1 !== 0 ? display.toFixed(1) : display}{suffix}</span>;
}

const kpis = [
    { key: 'riskReduction' as const, label: 'Risk Reduction', icon: TrendingDown, suffix: '%', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
    { key: 'responseTime' as const, label: 'Response Time', icon: Clock, suffix: ' min', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20' },
    { key: 'populationProtected' as const, label: 'People Protected', icon: Users, suffix: '', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
    { key: 'damagePrevented' as const, label: 'Damage Prevented', icon: ShieldCheck, suffix: '%', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
];

export function MetricsPanel() {
    const metrics = useSystemStore((s) => s.metrics);
    const mcResult = useSystemStore((s) => s.monteCarloResult);
    const sensitivity = useSystemStore((s) => s.sensitivityBreakdown);

    return (
        <div className="glass-panel p-4 rounded-xl">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2 mb-3">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                Live KPIs
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    const val = metrics[kpi.key];
                    return (
                        <motion.div
                            key={kpi.key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`p-3 rounded-lg border ${kpi.bgColor} flex flex-col gap-1`}
                        >
                            <div className="flex items-center gap-1.5">
                                <Icon className={`w-3 h-3 ${kpi.color}`} />
                                <span className="text-[8px] uppercase font-bold tracking-wider text-slate-500">{kpi.label}</span>
                            </div>
                            <span className={`text-xl font-display font-bold tabular-nums ${kpi.color}`}>
                                <AnimatedNumber
                                    value={kpi.key === 'populationProtected' ? Math.round(val / 1000) : val}
                                    suffix={kpi.key === 'populationProtected' ? 'K' : kpi.suffix}
                                />
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Monte Carlo Results (#2) */}
            {mcResult && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5"
                >
                    <div className="flex items-center gap-1.5 mb-2">
                        <Activity className="w-3 h-3 text-blue-400" />
                        <span className="text-[8px] uppercase font-bold tracking-wider text-blue-400">Monte Carlo ({mcResult.scenariosRun} runs)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-mono">
                        <div className="text-slate-500">Risk Range:</div>
                        <div className="text-blue-300 font-bold">{mcResult.ci95[0]}–{mcResult.ci95[1]}%</div>
                        <div className="text-slate-500">95% CI:</div>
                        <div className="text-cyan-300">{mcResult.ci95[0]}–{mcResult.ci95[1]}%</div>
                        <div className="text-slate-500">Worst Case:</div>
                        <div className="text-red-400 font-bold">{mcResult.worstCase}%</div>
                        <div className="text-slate-500">Std Dev:</div>
                        <div className="text-slate-300">±{mcResult.stdDev}%</div>
                    </div>
                    {/* Zone breakdown */}
                    <div className="mt-2 space-y-1">
                        {mcResult.zoneBreakdown.map((z) => (
                            <div key={z.zone} className="flex items-center gap-2">
                                <span className="text-[8px] text-slate-500 w-16 truncate">{z.zone.split(' - ')[0]}</span>
                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${z.risk}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="h-full rounded-full"
                                        style={{
                                            background: z.risk > 70 ? '#ef4444' : z.risk > 40 ? '#f59e0b' : '#22c55e',
                                        }}
                                    />
                                </div>
                                <span className="text-[8px] font-mono text-slate-400 w-8 text-right">{z.risk}%</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Sensitivity Analysis (#3) */}
            {sensitivity && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5"
                >
                    <span className="text-[8px] uppercase font-bold tracking-wider text-orange-400 mb-2 block">Sensitivity Breakdown</span>
                    {([
                        { label: 'Rainfall', value: sensitivity.rainfallImpact, color: '#3b82f6' },
                        { label: 'Drainage', value: sensitivity.drainageImpact, color: '#06b6d4' },
                        { label: 'Population', value: sensitivity.populationImpact, color: '#a855f7' },
                        { label: 'Social', value: sensitivity.socialImpact, color: '#f97316' },
                    ] as const).map((factor) => (
                        <div key={factor.label} className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] text-slate-500 w-16">{factor.label}</span>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${factor.value}%` }}
                                    transition={{ duration: 0.8 }}
                                    className="h-full rounded-full"
                                    style={{ background: factor.color }}
                                />
                            </div>
                            <span className="text-[8px] font-mono text-slate-400 w-8 text-right">{factor.value}%</span>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
