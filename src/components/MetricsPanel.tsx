import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { TrendingDown, Clock, Users, ShieldCheck, BarChart3 } from 'lucide-react';

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
        </div>
    );
}
