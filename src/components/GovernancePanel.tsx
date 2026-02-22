import { motion } from 'framer-motion';
import { useSystemStore } from '../store/useSystemStore';
import { FileText, Download, Shield, Scale, AlertTriangle } from 'lucide-react';
import { eventBus } from '../orchestrator/eventBus';

export function GovernancePanel() {
    const auditTrail = useSystemStore((s) => s.auditTrail);
    const negotiationState = useSystemStore((s) => s.negotiationState);
    const mitigationPlan = useSystemStore((s) => s.mitigationPlan);
    const awaitingHumanApproval = useSystemStore((s) => s.awaitingHumanApproval);

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

            {/* Human-in-the-Loop Manual Approval Block */}
            {awaitingHumanApproval && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-3 p-3 rounded bg-[#ff003c]/20 border border-[#ff003c]/50 relative overflow-hidden"
                >
                    <motion.div
                        className="absolute inset-0 bg-red-500/10 pointer-events-none"
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <div className="flex items-start gap-2 relative z-10">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Manual Approval Required</h4>
                            <p className="text-[9px] text-red-200/80 leading-relaxed mb-3">
                                Simulation indicates critical infrastructure threat. Commander override required to authorize mitigation deployment.
                            </p>
                            <button
                                onClick={() => eventBus.emit('HUMAN_APPROVAL_GIVEN', 'UI', null)}
                                className="w-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest py-2 rounded transition-colors shadow-[0_0_10px_rgba(255,0,60,0.5)] cursor-pointer"
                            >
                                Authorize Deployment
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

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
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                        {negotiationState.map((n, i) => {
                            const isConflict = n.position.toLowerCase().includes('reject') || n.position.toLowerCase().includes('conflict') || n.position.toLowerCase().includes('overflow');
                            const isAccept = n.position.toLowerCase().includes('accept') || n.position.toLowerCase().includes('consensus');

                            let bgClass = "bg-slate-900/40 border-slate-700/30";
                            let textClass = "text-slate-400";
                            let agentClass = "text-primary/80";

                            if (isConflict) {
                                bgClass = "bg-red-500/10 border-red-500/30";
                                textClass = "text-red-300";
                                agentClass = "text-red-400";
                            } else if (isAccept) {
                                bgClass = "bg-green-500/10 border-green-500/30";
                                textClass = "text-green-300";
                                agentClass = "text-green-400";
                            }

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`text-[9px] font-mono p-2 rounded border ${bgClass} transition-colors`}
                                >
                                    <span className={`font-bold mr-1 ${agentClass}`}>[{n.agent}]</span>
                                    <span className={textClass}>{n.position}</span>
                                    {isConflict && <span className="float-right text-[8px] text-red-500 uppercase font-bold animate-pulse">Conflict</span>}
                                    {isAccept && <span className="float-right text-[8px] text-green-500 uppercase font-bold">Resolved</span>}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
