import { useEffect, useState } from 'react';
import ReactFlow, { Background, Position, Handle } from 'reactflow';
import type { Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { useSystemStore } from '../store/useSystemStore';
import type { AgentName } from '../store/useSystemStore';
import { Shield, Activity, Brain, Server, Cpu, Scale, GitMerge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const icons: Record<AgentName, typeof Shield> = {
    Sentinel: Shield, Risk: Activity, Simulation: Brain,
    Response: Server, Resource: Cpu, Governance: Scale,
};

const colors: Record<AgentName, string> = {
    Sentinel: '#06b6d4', Risk: '#f97316', Simulation: '#3b82f6',
    Response: '#eab308', Resource: '#a855f7', Governance: '#22c55e',
};

const initialNodes: Node[] = [
    { id: 'Sentinel', position: { x: 250, y: 20 }, data: { label: 'Sentinel' }, type: 'agentNode' },
    { id: 'Risk', position: { x: 100, y: 130 }, data: { label: 'Risk' }, type: 'agentNode' },
    { id: 'Simulation', position: { x: 400, y: 130 }, data: { label: 'Simulation' }, type: 'agentNode' },
    { id: 'Response', position: { x: 80, y: 250 }, data: { label: 'Response' }, type: 'agentNode' },
    { id: 'Resource', position: { x: 280, y: 280 }, data: { label: 'Resource' }, type: 'agentNode' },
    { id: 'Governance', position: { x: 430, y: 250 }, data: { label: 'Governance' }, type: 'agentNode' },
];

const baseEdges: Edge[] = [
    { id: 'e1', source: 'Sentinel', target: 'Risk' },
    { id: 'e2', source: 'Sentinel', target: 'Simulation' },
    { id: 'e3', source: 'Risk', target: 'Response' },
    { id: 'e4', source: 'Simulation', target: 'Governance' },
    { id: 'e5', source: 'Response', target: 'Resource' },
    { id: 'e6', source: 'Resource', target: 'Governance' },
    { id: 'e7', source: 'Governance', target: 'Sentinel' },
];

function AgentNode({ data }: any) {
    const name = data.label as AgentName;
    const Icon = icons[name];
    const color = colors[name];
    const activeAgents = useSystemStore((s) => s.activeAgents);
    const comms = useSystemStore((s) => s.agentCommunications);
    const isActive = activeAgents.includes(name);
    const lastComm = comms.filter((c) => c.from === name || c.to === name).slice(-1)[0];

    return (
        <div className="relative">
            <Handle type="target" position={Position.Top} className="!opacity-0 !w-8 !h-8 !-top-3" />
            <motion.div
                animate={isActive ? {
                    boxShadow: [`0 0 0px ${color}00`, `0 0 25px ${color}80`, `0 0 0px ${color}00`],
                } : { boxShadow: `0 0 0px ${color}00` }}
                transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
                className="glass-panel px-4 py-3 rounded-xl border-2 bg-[#0a192f]/90 flex flex-col items-center min-w-[110px] gap-1.5 transition-all duration-300"
                style={{ borderColor: isActive ? color : `${color}30` }}
            >
                <motion.div
                    animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={isActive ? { duration: 1, repeat: Infinity } : {}}
                    className="p-2 rounded-full"
                    style={{ backgroundColor: `${color}20` }}
                >
                    <Icon className="w-5 h-5" style={{ color }} />
                </motion.div>
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-200">{name}</div>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-[7px] text-slate-400 font-mono text-center max-w-[100px] truncate"
                    >
                        ACTIVE
                    </motion.div>
                )}
            </motion.div>

            {/* Tooltip for last comm */}
            <AnimatePresence>
                {isActive && lastComm && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-primary/30 rounded px-2 py-0.5 text-[7px] text-primary font-mono whitespace-nowrap z-50 shadow-lg"
                    >
                        {lastComm.message}
                    </motion.div>
                )}
            </AnimatePresence>
            <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-8 !h-8 !-bottom-3" />
        </div>
    );
}

const nodeTypes = { agentNode: AgentNode };

export function AgentGraph() {
    const activeAgents = useSystemStore((s) => s.activeAgents);
    const crisisStatus = useSystemStore((s) => s.crisisStatus);
    const [edges, setEdges] = useState<Edge[]>(baseEdges);

    useEffect(() => {
        const isActive = crisisStatus !== 'idle';
        setEdges(baseEdges.map((e) => {
            const srcActive = activeAgents.includes(e.source as AgentName);
            const tgtActive = activeAgents.includes(e.target as AgentName);
            const hot = isActive && (srcActive || tgtActive);
            return {
                ...e,
                animated: hot,
                style: {
                    stroke: hot ? '#ff003c' : 'rgba(0,240,255,0.25)',
                    strokeWidth: hot ? 3 : 1.5,
                },
            };
        }));
    }, [activeAgents, crisisStatus]);

    return (
        <div className="glass-panel rounded-xl overflow-hidden h-full relative">
            <div className="absolute top-3 left-4 z-10 pointer-events-none">
                <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] flex items-center gap-2">
                    <GitMerge className="w-3.5 h-3.5 text-primary" />
                    Neural Orchestration
                </h3>
            </div>
            <ReactFlow
                nodes={initialNodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                panOnDrag={false}
                zoomOnScroll={false}
                className="bg-transparent"
                proOptions={{ hideAttribution: true }}
            >
                <Background color={crisisStatus !== 'idle' ? 'rgba(255,0,60,0.06)' : 'rgba(0,240,255,0.06)'} gap={20} size={1.5} />
            </ReactFlow>
        </div>
    );
}
