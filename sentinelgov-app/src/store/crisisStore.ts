import { create } from 'zustand';

interface CrisisState {
    isCrisisActive: boolean;
    isMitigating: boolean;
    riskLevel: number;
    triggerCrisis: () => void;
    resolveCrisis: () => void;
}

export const useCrisisStore = create<CrisisState>((set) => ({
    isCrisisActive: false,
    isMitigating: false,
    riskLevel: 27, // baseline
    triggerCrisis: () => set({ isCrisisActive: true, isMitigating: false, riskLevel: 82 }),
    resolveCrisis: () => {
        set({ isMitigating: true });
        // Simulate mitigation delay dropping risk back to normal
        setTimeout(() => {
            set({ isCrisisActive: false, isMitigating: false, riskLevel: 27 });
        }, 4000);
    }
}));
