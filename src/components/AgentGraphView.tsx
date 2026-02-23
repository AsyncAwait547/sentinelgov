import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Position, Handle } from 'reactflow';
import type { Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { useCrisisStore } from '../store/crisisStore';
import { cn } from '../lib/utils';
import { Shield, Activity, Brain, Server, Scale, GitMerge } from 'lucide-react';

const initialNodes: Node[] = [
    { id: 'sentinel', position: { x: 250, y: 50 }, data: { label: 'Sentinel', icon: Shield }, type: 'customNode' },
    { id: 'risk', position: { x: 100, y: 150 }, data: { label: 'Risk Eval', icon: Activity }, type: 'customNode' },
    { id: 'simulation', position: { x: 400, y: 150 }, data: { label: 'Simulation', icon: Brain }, type: 'customNode' },
    { id: 'response', position: { x: 100, y: 250 }, data: { label: 'Response', icon: Server }, type: 'customNode' },
    { id: 'governance', position: { x: 400, y: 250 }, data: { label: 'Orchestrator', icon: Scale }, type: 'customNode' },
];

const initialEdges: Edge[] = [
    { id: 'e1', source: 'sentinel', target: 'risk', animated: false, style: { stroke: '#00f0ff' } },
    { id: 'e2', source: 'sentinel', target: 'simulation', animated: false, style: { stroke: '#00f0ff' } },
    { id: 'e3', source: 'risk', target: 'response', animated: false, style: { stroke: '#00f0ff' } },
    { id: 'e4', source: 'simulation', target: 'governance', animated: false, style: { stroke: '#00f0ff' } },
    { id: 'e5', source: 'response', target: 'governance', animated: false, style: { stroke: '#00f0ff' } },
];

function CustomNode({ data }: any) {
    const Icon = data.icon;
    const isCrisisActive = useCrisisStore((state) => state.isCrisisActive);
    return (
        <div className={cn(
            "glass-panel px-4 py-3 rounded-xl shadow-lg border-2 bg-[#0a192f]/90 flex flex-col items-center justify-center min-w-[120px] gap-2 transition-all duration-300 relative",
            isCrisisActive ? "border-red-500 shadow-[0_0_20px_rgba(255,0,60,0.5)] bg-red-950/40" : "border-primary/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
        )}>
            <Handle type="target" position={Position.Top} className="opacity-0 w-full h-full absolute inset-0 rounded-xl" />
            <div className={cn("p-2 rounded-full mb-1", isCrisisActive ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary")}>
                <Icon className={cn("w-6 h-6", isCrisisActive && "animate-pulse")} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-200">{data.label}</div>
            <Handle type="source" position={Position.Bottom} className="opacity-0 w-full h-full absolute inset-0 rounded-xl" />
        </div>
    );
}

// Removed global definitions of nodeTypes to prevent warning


export function AgentGraphView() {
    const { isCrisisActive } = useCrisisStore();
    const [nodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);

    // Memoize nodeTypes as required by React Flow
    const nodeTypes = React.useMemo(() => ({ customNode: CustomNode }), []);

    useEffect(() => {
        // When crisis is active, make lines animate and turn red
        setEdges((eds) =>
            eds.map((edge) => ({
                ...edge,
                animated: isCrisisActive,
                style: { stroke: isCrisisActive ? '#ff003c' : '#00f0ff', strokeWidth: 3 },
            }))
        );
    }, [isCrisisActive]);

    return (
        <div className="glass-panel rounded-xl overflow-hidden h-[400px] w-full relative">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-widest flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-primary" />
                    Neural Orchestration
                </h3>
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                className="bg-transparent"
                proOptions={{ hideAttribution: true }}
            >
                <Background color={isCrisisActive ? 'rgba(255,0,60,0.1)' : 'rgba(0,240,255,0.1)'} gap={20} size={2} />
            </ReactFlow>
        </div>
    );
}
