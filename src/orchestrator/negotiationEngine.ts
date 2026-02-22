// ─────────────────────────────────────────────────────────────────────────────
// SentinelGov Dynamic Negotiation Engine — Rules-Based Agent Negotiation
// ─────────────────────────────────────────────────────────────────────────────
// Replaces hardcoded dialog strings with a constraint-satisfaction engine.
// The Response Agent makes demands, the Resource Agent checks real inventory,
// and they iterate proposals/counter-proposals until consensus.
// ─────────────────────────────────────────────────────────────────────────────

import { useSystemStore } from '../store/useSystemStore';
import { eventBus } from './eventBus';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const store = () => useSystemStore.getState();

// ─── RESOURCE INVENTORY ─────────────────────────────────────────────────────
export interface ResourceInventory {
    pumpUnits: number;
    evacuationVehicles: number;
    maxSimultaneousZones: number;
    shelterCapacity: number;
    medicalTeams: number;
}

export interface EvacuationDemand {
    zones: string[];
    totalPopulation: number;
    priority: 'immediate' | 'staggered';
    pumpsRequested: number;
}

export interface NegotiationProposal {
    round: number;
    from: 'Response' | 'Resource';
    action: string;
    demand: EvacuationDemand;
    feasible: boolean;
    reason?: string;
}

// ─── CONSTRAINT CHECKER ─────────────────────────────────────────────────────
function checkFeasibility(
    demand: EvacuationDemand,
    inventory: ResourceInventory
): { feasible: boolean; reason: string; suggestedFix?: Partial<EvacuationDemand> } {
    const issues: string[] = [];
    let suggestedFix: Partial<EvacuationDemand> = {};

    // Check simultaneous zone capacity
    if (demand.zones.length > inventory.maxSimultaneousZones) {
        issues.push(
            `Zone overflow: ${demand.zones.length} zones requested, max simultaneous is ${inventory.maxSimultaneousZones}`
        );
        suggestedFix.priority = 'staggered';
    }

    // Check pump availability
    if (demand.pumpsRequested > inventory.pumpUnits) {
        issues.push(
            `Pump deficit: ${demand.pumpsRequested} requested, only ${inventory.pumpUnits} available`
        );
        suggestedFix.pumpsRequested = inventory.pumpUnits;
    }

    // Check vehicle capacity (rough: 55 people per vehicle)
    const vehicleCapacity = inventory.evacuationVehicles * 55;
    if (demand.totalPopulation > vehicleCapacity && demand.priority === 'immediate') {
        issues.push(
            `Fleet constraint: ${inventory.evacuationVehicles} vehicles can move ~${vehicleCapacity.toLocaleString()} people simultaneously, but ${demand.totalPopulation.toLocaleString()} need evac`
        );
        suggestedFix.priority = 'staggered';
    }

    // Check shelter capacity
    if (demand.totalPopulation > inventory.shelterCapacity) {
        issues.push(
            `Shelter overflow: capacity ${inventory.shelterCapacity.toLocaleString()}, need ${demand.totalPopulation.toLocaleString()} — requires shelter-in-place for overflow`
        );
    }

    if (issues.length === 0) {
        return { feasible: true, reason: 'All constraints satisfied.' };
    }

    return {
        feasible: false,
        reason: issues.join(' | '),
        suggestedFix,
    };
}

// ─── NEGOTIATION LOOP ───────────────────────────────────────────────────────
// Returns the final agreed-upon demand after iterative negotiation.
export async function runDynamicNegotiation(
    initialDemand: EvacuationDemand,
    inventory: ResourceInventory,
    maxRounds = 5
): Promise<{ finalDemand: EvacuationDemand; proposals: NegotiationProposal[]; rounds: number }> {
    const s = store();
    const proposals: NegotiationProposal[] = [];
    let currentDemand = { ...initialDemand };
    let round = 0;

    s.setCrisisStatus('negotiating');
    s.addLog('Resource', 'Analyzing resource availability against mitigation requirements.', 'info');
    await delay(800);

    while (round < maxRounds) {
        round++;

        // ─── RESPONSE AGENT: issues demand ─────────────────────────────
        const responseProposal: NegotiationProposal = {
            round,
            from: 'Response',
            action: round === 1
                ? `Full evacuation of ${currentDemand.zones.length} zones — ${currentDemand.totalPopulation.toLocaleString()} civilians`
                : `Counter-proposal (round ${round}): ${currentDemand.priority} evacuation, ${currentDemand.pumpsRequested} pumps`,
            demand: { ...currentDemand },
            feasible: true,
        };
        proposals.push(responseProposal);

        s.addNegotiation('Response', responseProposal.action);
        s.addLog('Response', `[NEGOTIATION R${round}] ${responseProposal.action}`, round === 1 ? 'warning' : 'info');
        s.addAgentComm('Response', 'Resource', `Demand packet R${round}`);
        await delay(1000);

        // ─── RESOURCE AGENT: checks constraints ────────────────────────
        const check = checkFeasibility(currentDemand, inventory);

        const resourceProposal: NegotiationProposal = {
            round,
            from: 'Resource',
            action: check.feasible
                ? `Accepted. All constraints satisfied for ${currentDemand.priority} plan.`
                : `Rejected: ${check.reason}`,
            demand: { ...currentDemand },
            feasible: check.feasible,
            reason: check.reason,
        };
        proposals.push(resourceProposal);

        s.addNegotiation('Resource', resourceProposal.action);
        s.addLog(
            'Resource',
            `[NEGOTIATION R${round}] ${resourceProposal.action}`,
            check.feasible ? 'success' : 'warning'
        );
        s.addAgentComm('Resource', 'Response', check.feasible ? 'Constraints satisfied' : 'Constraint violation');

        eventBus.emit('NEGOTIATION_REQUIRED', 'Resource', {
            round,
            feasible: check.feasible,
            proposal: resourceProposal,
        });

        await delay(1000);

        if (check.feasible) {
            // ─── CONSENSUS REACHED ─────────────────────────────────────
            s.addAudit(
                'NEGOTIATION_RESOLVED',
                'Resource',
                `Consensus in ${round} round(s): ${currentDemand.priority} evacuation, ${currentDemand.pumpsRequested} pumps`
            );
            s.addLog('Resource', `✓ Negotiation resolved in ${round} round(s). Forwarding to Governance.`, 'success');
            s.addAgentComm('Resource', 'Governance', 'Negotiation resolution forwarded');

            eventBus.emit('NEGOTIATION_RESOLVED', 'Resource', {
                finalDemand: currentDemand,
                rounds: round,
                proposals,
            });

            await delay(600);
            return { finalDemand: currentDemand, proposals, rounds: round };
        }

        // ─── RESPONSE AGENT: adapts demand based on Resource's constraints
        if (check.suggestedFix) {
            if (check.suggestedFix.priority) {
                currentDemand.priority = check.suggestedFix.priority;
                s.addLog('Response', `[NEGOTIATION R${round}] Adapting: switching to ${check.suggestedFix.priority} evacuation.`, 'info');
            }
            if (check.suggestedFix.pumpsRequested !== undefined) {
                currentDemand.pumpsRequested = check.suggestedFix.pumpsRequested;
                s.addLog('Response', `[NEGOTIATION R${round}] Adapting: reducing pump request to ${check.suggestedFix.pumpsRequested}.`, 'info');
            }
        }

        await delay(800);
    }

    // ─── FALLBACK: max rounds exceeded (force accept last proposal) ─────
    s.addAudit('NEGOTIATION_TIMEOUT', 'Resource', `Max rounds (${maxRounds}) reached — accepting last proposal`);
    s.addLog('Resource', `⚠ Max negotiation rounds reached. Accepting last feasible proposal.`, 'warning');

    eventBus.emit('NEGOTIATION_RESOLVED', 'Resource', {
        finalDemand: currentDemand,
        rounds: round,
        proposals,
        timedOut: true,
    });

    return { finalDemand: currentDemand, proposals, rounds: round };
}
