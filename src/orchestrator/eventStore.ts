// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Event Store — Append-Only Event-Sourced Architecture
// ─────────────────────────────────────────────────────────────────────────────
// Instead of mutating global state, we append immutable events.
// System state can be rebuilt from the event log at any time.
// Provides: Determinism, Replayability, Debug Traceability
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemEvent {
    id: string;
    type: string;
    source: string;
    payload: unknown;
    timestamp: number;
    sequence: number;
}

export interface EventStoreSnapshot {
    events: SystemEvent[];
    stateVersion: number;
    checksum: string;
}

class EventStore {
    private events: SystemEvent[] = [];
    private sequence = 0;
    private listeners: Array<(event: SystemEvent) => void> = [];

    // ─── APPEND (immutable — never modify past events) ──────────────────
    append(type: string, source: string, payload: unknown): SystemEvent {
        const event: SystemEvent = {
            id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type,
            source,
            payload,
            timestamp: Date.now(),
            sequence: this.sequence++,
        };
        Object.freeze(event); // Immutable
        this.events.push(event);

        // Notify subscribers
        for (const listener of this.listeners) {
            try { listener(event); } catch (_) { /* isolation */ }
        }

        return event;
    }

    // ─── QUERY — filter events by type, source, or time range ───────────
    query(filter: {
        type?: string;
        source?: string;
        after?: number;
        before?: number;
    }): SystemEvent[] {
        return this.events.filter((e) => {
            if (filter.type && e.type !== filter.type) return false;
            if (filter.source && e.source !== filter.source) return false;
            if (filter.after && e.timestamp < filter.after) return false;
            if (filter.before && e.timestamp > filter.before) return false;
            return true;
        });
    }

    // ─── REPLAY — rebuild state by replaying events through a reducer ───
    replay<T>(reducer: (state: T, event: SystemEvent) => T, initial: T): T {
        return this.events.reduce((state, event) => reducer(state, event), initial);
    }

    // ─── SUBSCRIBE — listen to new events in real-time ──────────────────
    subscribe(listener: (event: SystemEvent) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    // ─── SNAPSHOT — export current state for persistence/debug ───────────
    snapshot(): EventStoreSnapshot {
        const data = JSON.stringify(this.events.map(e => e.id));
        // Simple checksum
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
        }
        return {
            events: [...this.events],
            stateVersion: this.sequence,
            checksum: Math.abs(hash).toString(16),
        };
    }

    // ─── STATS ──────────────────────────────────────────────────────────
    get length(): number { return this.events.length; }
    get all(): ReadonlyArray<SystemEvent> { return this.events; }
    get lastEvent(): SystemEvent | null { return this.events[this.events.length - 1] ?? null; }

    // ─── RESET ──────────────────────────────────────────────────────────
    reset(): void {
        this.events = [];
        this.sequence = 0;
        this.listeners = [];
    }
}

export const eventStore = new EventStore();
