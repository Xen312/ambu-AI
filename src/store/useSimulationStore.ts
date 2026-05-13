import { create } from 'zustand';

export interface SimulationStateData {
  isActive: boolean;
  ambulance: {
    id: string;
    location: [number, number];
    speed: number;
    progress: number;
    etaSeconds: number;
    etaDisplay: string;
  };
  route: [number, number][];
  obstruction: {
    active: boolean;
    location: [number, number] | null;
    severity: "low" | "medium" | "high" | "critical";
    durationSecs: number;
    riskLevel: string;
    vehiclePlate?: string;
  } | null;
  aiResult: {
    decision: string;
    action?: string;
    recommendedAction?: string;
    confidence: number;
    corridorRequired: boolean;
    escalationRequired: boolean;
    summary?: string;
    flaggedPlate?: string;
    intentionalBlockage?: boolean;
  } | null;
}

interface StoreState {
  state: SimulationStateData | null;
  updateState: (newState: SimulationStateData) => void;
  isConnected: boolean;
  setConnected: (status: boolean) => void;
}

export const useSimulationStore = create<StoreState>((set) => ({
  state: null,
  updateState: (newState) => set({ state: newState }),
  isConnected: false,
  setConnected: (status) => set({ isConnected: status }),
}));

