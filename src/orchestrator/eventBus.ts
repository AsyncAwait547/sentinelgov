// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Event Bus — Pub/Sub Agent Communication Layer
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the procedural "puppet master" orchestrator with a decentralized
// event-driven architecture. Each agent subscribes to relevant event types
// and reacts autonomously — just like Kafka consumers or Redis Pub/Sub.
// ─────────────────────────────────────────────────────────────────────────────

export type EventType =
    | 'TELEMETRY_UPDATE'
    | 'CRITICAL_THREAT'
    | 'RISK_ASSESSED'
    | 'SIMULATION_COMPLETE'
    | 'RESOURCE_AUDIT_COMPLETE'
    | 'AGENTS_CONVERGED'
    | 'RESPONSE_PLAN_READY'
    | 'NEGOTIATION_REQUIRED'
    | 'NEGOTIATION_RESOLVED'
    | 'GOVERNANCE_APPROVED'
    | 'MITIGATION_EXECUTING'
    | 'MITIGATION_FAILED'
    | 'MITIGATION_INTERRUPT'
    | 'CRISIS_RESOLVED'
    | 'SIMULATION_ITERATION'
    | 'FLOOD_GRID_UPDATE';

export interface BusEvent<T = unknown> {
    type: EventType;
    source: string;          // Agent name or 'System'
    timestamp: number;
    payload: T;
}

export type EventHandler<T = unknown> = (event: BusEvent<T>) => void | Promise<void>;

interface Subscription {
    id: string;
    type: EventType;
    handler: EventHandler;
    agent: string;
    once: boolean;
}

let subIdCounter = 0;

class AgentEventBus {
    private subscriptions: Map<EventType, Subscription[]> = new Map();
    private eventLog: BusEvent[] = [];
    private maxLogSize = 500;

    /**
     * Subscribe an agent to a specific event type.
     * Returns an unsubscribe function.
     */
    on<T = unknown>(type: EventType, agent: string, handler: EventHandler<T>): () => void {
        const sub: Subscription = {
            id: `sub-${++subIdCounter}`,
            type,
            handler: handler as EventHandler,
            agent,
            once: false,
        };
        this.addSub(type, sub);
        return () => this.removeSub(type, sub.id);
    }

    /**
     * Subscribe to an event type, but only fire once.
     */
    once<T = unknown>(type: EventType, agent: string, handler: EventHandler<T>): () => void {
        const sub: Subscription = {
            id: `sub-${++subIdCounter}`,
            type,
            handler: handler as EventHandler,
            agent,
            once: true,
        };
        this.addSub(type, sub);
        return () => this.removeSub(type, sub.id);
    }

    /**
     * Emit an event to all subscribed agents (fire-and-forget).
     * Handlers are invoked asynchronously.
     */
    emit<T = unknown>(type: EventType, source: string, payload: T): void {
        const event: BusEvent<T> = {
            type,
            source,
            timestamp: Date.now(),
            payload,
        };

        this.eventLog.push(event as BusEvent);
        if (this.eventLog.length > this.maxLogSize) {
            this.eventLog = this.eventLog.slice(-this.maxLogSize);
        }

        const subs = this.subscriptions.get(type);
        if (!subs || subs.length === 0) return;

        const toRemove: string[] = [];
        for (const sub of subs) {
            try {
                sub.handler(event as BusEvent);
            } catch (err) {
                console.error(`[EventBus] Error in handler ${sub.agent}/${sub.type}:`, err);
            }
            if (sub.once) toRemove.push(sub.id);
        }

        // Clean up one-shot subscriptions
        if (toRemove.length > 0) {
            this.subscriptions.set(
                type,
                subs.filter((s) => !toRemove.includes(s.id))
            );
        }
    }

    /**
     * Wait for a specific event type (promise-based).
     * Useful for agents that need to "await" another agent's output.
     */
    waitFor<T = unknown>(type: EventType, agent: string, timeoutMs = 30000): Promise<BusEvent<T>> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                unsub();
                reject(new Error(`[EventBus] Timeout waiting for ${type} (agent: ${agent})`));
            }, timeoutMs);

            const unsub = this.once<T>(type, agent, (event) => {
                clearTimeout(timer);
                resolve(event);
            });
        });
    }

    /**
     * Get agent subscription count by event type.
     */
    getSubscriberCount(type: EventType): number {
        return this.subscriptions.get(type)?.length ?? 0;
    }

    /**
     * Get the full event log (for audit/debug).
     */
    getEventLog(): BusEvent[] {
        return [...this.eventLog];
    }

    /**
     * Clear all subscriptions and logs.
     */
    reset(): void {
        this.subscriptions.clear();
        this.eventLog = [];
    }

    private addSub(type: EventType, sub: Subscription) {
        if (!this.subscriptions.has(type)) {
            this.subscriptions.set(type, []);
        }
        this.subscriptions.get(type)!.push(sub);
    }

    private removeSub(type: EventType, id: string) {
        const subs = this.subscriptions.get(type);
        if (subs) {
            this.subscriptions.set(
                type,
                subs.filter((s) => s.id !== id)
            );
        }
    }
}

// ─── SINGLETON ──────────────────────────────────────────────────────────────
// Every agent in the system imports this same instance.
export const eventBus = new AgentEventBus();
