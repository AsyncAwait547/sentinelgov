import { motion } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { FileText, Download, Shield, Scale } from 'lucide-react';

export function GovernancePanel() {
    const auditTrail = useSystemStore((s) => s.auditTrail);
    const negotiationState = useSystemStore((s) => s.negotiationState);
    const mitigationPlan = useSystemStore((s) => s.mitigationPlan);

    const exportReport = () => {
        const report = {
            generated: new Date().toISOString(),
            system: 'SentinelGov Crisis Simulation v3.2',
            auditTrail,
            negotiationState,
            mitigationPlan,
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sentinelgov-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="glass-panel rounded-xl p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    Governance & Audit
                </h3>
                <button
                    onClick={exportReport}
                    className="flex items-center gap-1 text-[9px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-bold uppercase tracking-wider cursor-pointer"
                >
                    <Download className="w-3 h-3" />
                    Export
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {auditTrail.length === 0 && (
                    <div className="text-slate-600 text-[10px] font-mono text-center py-4">No audit entries yet.</div>
                )}
                {auditTrail.map((entry, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-2 rounded border border-white/5 bg-slate-900/30 group"
                    >
                        <div className="flex items-center gap-2 mb-0.5">
                            <FileText className="w-2.5 h-2.5 text-primary/60" />
                            <span className="text-[8px] font-bold text-primary uppercase tracking-widest">{entry.action}</span>
                            <span className="ml-auto text-[8px] text-slate-600 font-mono">{entry.timestamp}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono">{entry.detail}</p>
                        <span className="text-[7px] text-slate-600 uppercase">{entry.agent}</span>
                    </motion.div>
                ))}
            </div>

            {/* Negotiation log */}
            {negotiationState.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <h4 className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Negotiation Transcript
                    </h4>
                    <div className="space-y-1 max-h-[100px] overflow-y-auto">
                        {negotiationState.map((n, i) => (
                            <div key={i} className="text-[9px] font-mono text-slate-400 p-1.5 rounded bg-slate-900/20 border border-white/3">
                                <span className="text-primary/80 font-bold">[{n.agent}]</span> {n.position}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
