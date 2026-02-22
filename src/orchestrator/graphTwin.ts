// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Graph Twin — Weighted Directed Graph + Dijkstra Routing
// ─────────────────────────────────────────────────────────────────────────────
// Zones = nodes, Roads = edges, Bridges = capacity-weighted edges.
// When flooding closes a route, Dijkstra recalculates evacuation paths.
// ─────────────────────────────────────────────────────────────────────────────

export interface GraphNode {
    id: string;
    name: string;
    waterLevel: number;       // 0–1 flood severity
    population: number;
    isFlooded: boolean;
    elevation: number;        // meters above sea level
}

export interface GraphEdge {
    from: string;
    to: string;
    weight: number;           // travel cost (time in minutes)
    capacity: number;         // vehicles per hour
    type: 'road' | 'bridge' | 'highway';
    blocked: boolean;
    permeability: number;     // 0–1 how easily water flows through
}

export interface EvacuationRoute {
    path: string[];
    totalCost: number;
    bottleneck: string;
    capacity: number;
}

// ─── CITY INFRASTRUCTURE GRAPH ──────────────────────────────────────────────
const defaultNodes: GraphNode[] = [
    { id: 'zone-1', name: 'Ward 12 - River Delta', waterLevel: 0, population: 45000, isFlooded: false, elevation: 12 },
    { id: 'zone-2', name: 'Ward 7 - Industrial Hub', waterLevel: 0, population: 32000, isFlooded: false, elevation: 28 },
    { id: 'zone-3', name: 'Central Business District', waterLevel: 0, population: 78000, isFlooded: false, elevation: 35 },
    { id: 'zone-4', name: 'North Bridge Corridor', waterLevel: 0, population: 22000, isFlooded: false, elevation: 18 },
    { id: 'zone-5', name: 'South Residential Block', waterLevel: 0, population: 55000, isFlooded: false, elevation: 42 },
    { id: 'zone-6', name: 'East Power Grid Station', waterLevel: 0, population: 18000, isFlooded: false, elevation: 30 },
    { id: 'zone-7', name: 'West Water Treatment', waterLevel: 0, population: 12000, isFlooded: false, elevation: 15 },
    { id: 'zone-8', name: 'Harbor District', waterLevel: 0, population: 28000, isFlooded: false, elevation: 8 },
    { id: 'shelter-A', name: 'Central Shelter A', waterLevel: 0, population: 0, isFlooded: false, elevation: 50 },
    { id: 'shelter-B', name: 'South Shelter B', waterLevel: 0, population: 0, isFlooded: false, elevation: 55 },
];

const defaultEdges: GraphEdge[] = [
    // Main roads
    { from: 'zone-1', to: 'zone-4', weight: 8, capacity: 2000, type: 'road', blocked: false, permeability: 0.7 },
    { from: 'zone-4', to: 'zone-3', weight: 5, capacity: 3000, type: 'bridge', blocked: false, permeability: 0.3 },
    { from: 'zone-1', to: 'zone-7', weight: 12, capacity: 1500, type: 'road', blocked: false, permeability: 0.8 },
    { from: 'zone-3', to: 'zone-6', weight: 6, capacity: 2500, type: 'road', blocked: false, permeability: 0.5 },
    { from: 'zone-3', to: 'zone-5', weight: 7, capacity: 3000, type: 'highway', blocked: false, permeability: 0.4 },
    { from: 'zone-2', to: 'zone-3', weight: 4, capacity: 2000, type: 'road', blocked: false, permeability: 0.5 },
    { from: 'zone-6', to: 'zone-8', weight: 9, capacity: 1800, type: 'road', blocked: false, permeability: 0.6 },
    { from: 'zone-7', to: 'zone-8', weight: 15, capacity: 1000, type: 'road', blocked: false, permeability: 0.9 },
    { from: 'zone-5', to: 'zone-8', weight: 10, capacity: 2200, type: 'road', blocked: false, permeability: 0.5 },
    // Evacuation routes to shelters
    { from: 'zone-3', to: 'shelter-A', weight: 3, capacity: 4000, type: 'highway', blocked: false, permeability: 0.2 },
    { from: 'zone-5', to: 'shelter-B', weight: 4, capacity: 3500, type: 'highway', blocked: false, permeability: 0.2 },
    { from: 'zone-6', to: 'shelter-A', weight: 7, capacity: 2000, type: 'road', blocked: false, permeability: 0.3 },
    { from: 'zone-1', to: 'zone-3', weight: 10, capacity: 1800, type: 'road', blocked: false, permeability: 0.6 },
    { from: 'zone-4', to: 'shelter-A', weight: 12, capacity: 1500, type: 'road', blocked: false, permeability: 0.4 },
    // Bidirectional for navigation
    { from: 'zone-4', to: 'zone-1', weight: 8, capacity: 2000, type: 'road', blocked: false, permeability: 0.7 },
    { from: 'zone-3', to: 'zone-4', weight: 5, capacity: 3000, type: 'bridge', blocked: false, permeability: 0.3 },
    { from: 'zone-3', to: 'zone-2', weight: 4, capacity: 2000, type: 'road', blocked: false, permeability: 0.5 },
    { from: 'zone-3', to: 'zone-1', weight: 10, capacity: 1800, type: 'road', blocked: false, permeability: 0.6 },
];

export class InfrastructureGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];

    constructor() {
        this.nodes = defaultNodes.map(n => ({ ...n }));
        this.edges = defaultEdges.map(e => ({ ...e }));
    }

    // ─── FLOOD SIMULATION — propagate water through graph ───────────────
    simulateFloodStep(rainfall: number): void {
        const rainfallFactor = Math.min(rainfall / 150, 1);

        for (const node of this.nodes) {
            // Low elevation + high rainfall = more flooding
            const elevationFactor = 1 - (node.elevation / 60);
            const waterIncrease = rainfallFactor * elevationFactor * 0.05;
            node.waterLevel = Math.min(1, Math.max(0, node.waterLevel + waterIncrease));
            node.isFlooded = node.waterLevel > 0.4;

            // Propagate water to neighbors via edges
            const outEdges = this.edges.filter(e => e.from === node.id && !e.blocked);
            for (const edge of outEdges) {
                const target = this.nodes.find(n => n.id === edge.to);
                if (target) {
                    const flow = node.waterLevel * edge.permeability * 0.02;
                    target.waterLevel = Math.min(1, target.waterLevel + flow);
                }
            }
        }

        // Block edges where water level is too high
        for (const edge of this.edges) {
            const fromNode = this.nodes.find(n => n.id === edge.from);
            const toNode = this.nodes.find(n => n.id === edge.to);
            if (fromNode && toNode) {
                if (edge.type === 'bridge' && (fromNode.waterLevel > 0.5 || toNode.waterLevel > 0.5)) {
                    edge.blocked = true;
                } else if (fromNode.waterLevel > 0.7 || toNode.waterLevel > 0.7) {
                    edge.blocked = true;
                }
            }
        }
    }

    // ─── DIJKSTRA — find shortest evacuation path ───────────────────────
    dijkstra(startId: string, endId: string): EvacuationRoute | null {
        const distances: Record<string, number> = {};
        const previous: Record<string, string | null> = {};
        const visited = new Set<string>();
        const queue: Array<{ id: string; dist: number }> = [];

        for (const node of this.nodes) {
            distances[node.id] = Infinity;
            previous[node.id] = null;
        }
        distances[startId] = 0;
        queue.push({ id: startId, dist: 0 });

        while (queue.length > 0) {
            queue.sort((a, b) => a.dist - b.dist);
            const current = queue.shift()!;

            if (visited.has(current.id)) continue;
            visited.add(current.id);

            if (current.id === endId) break;

            const outEdges = this.edges.filter(e => e.from === current.id && !e.blocked);
            for (const edge of outEdges) {
                const targetNode = this.nodes.find(n => n.id === edge.to);
                if (!targetNode || targetNode.isFlooded) continue;

                // Weight increases with water level
                const floodPenalty = targetNode.waterLevel * 20;
                const newDist = distances[current.id] + edge.weight + floodPenalty;

                if (newDist < distances[edge.to]) {
                    distances[edge.to] = newDist;
                    previous[edge.to] = current.id;
                    queue.push({ id: edge.to, dist: newDist });
                }
            }
        }

        if (distances[endId] === Infinity) return null;

        // Reconstruct path
        const path: string[] = [];
        let current: string | null = endId;
        while (current) {
            path.unshift(current);
            current = previous[current];
        }

        // Find bottleneck (edge with minimum capacity)
        let minCapacity = Infinity;
        let bottleneck = '';
        for (let i = 0; i < path.length - 1; i++) {
            const edge = this.edges.find(e => e.from === path[i] && e.to === path[i + 1]);
            if (edge && edge.capacity < minCapacity) {
                minCapacity = edge.capacity;
                bottleneck = `${path[i]}→${path[i + 1]}`;
            }
        }

        return {
            path,
            totalCost: Math.round(distances[endId] * 10) / 10,
            bottleneck,
            capacity: minCapacity,
        };
    }

    // ─── FIND ALL EVACUATION ROUTES to nearest shelter ──────────────────
    findEvacuationRoutes(zoneIds: string[]): Record<string, EvacuationRoute | null> {
        const shelters = this.nodes.filter(n => n.id.startsWith('shelter'));
        const routes: Record<string, EvacuationRoute | null> = {};

        for (const zoneId of zoneIds) {
            let bestRoute: EvacuationRoute | null = null;
            for (const shelter of shelters) {
                const route = this.dijkstra(zoneId, shelter.id);
                if (route && (!bestRoute || route.totalCost < bestRoute.totalCost)) {
                    bestRoute = route;
                }
            }
            routes[zoneId] = bestRoute;
        }

        return routes;
    }

    // ─── GET BLOCKED ROUTES ─────────────────────────────────────────────
    getBlockedRoutes(): GraphEdge[] {
        return this.edges.filter(e => e.blocked);
    }

    // ─── GET FLOODED ZONES ──────────────────────────────────────────────
    getFloodedZones(): GraphNode[] {
        return this.nodes.filter(n => n.isFlooded);
    }

    // ─── RESET ──────────────────────────────────────────────────────────
    reset(): void {
        this.nodes = defaultNodes.map(n => ({ ...n }));
        this.edges = defaultEdges.map(e => ({ ...e }));
    }

    // ─── SERIALIZABLE SNAPSHOT ──────────────────────────────────────────
    snapshot() {
        return {
            nodes: this.nodes.map(n => ({ ...n })),
            edges: this.edges.filter(e => e.blocked).map(e => ({ from: e.from, to: e.to, type: e.type })),
            floodedZones: this.getFloodedZones().map(z => z.id),
        };
    }
}

export const infrastructureGraph = new InfrastructureGraph();
