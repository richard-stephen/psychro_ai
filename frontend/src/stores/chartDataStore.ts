import { create } from 'zustand';
import type { BaseChartData, ChartDataPoint, UploadedDataset, DesignZoneConfig, ChartProcess, DisplaySettings } from '@/lib/types';
import { DEFAULT_DISPLAY_SETTINGS } from '@/lib/types';
import { altitudeToPressure } from '@/lib/psychrometrics';

interface ChartDataState {
  baseData: BaseChartData | null;
  dataPoints: ChartDataPoint[];
  uploadedDatasets: UploadedDataset[];
  designZone: DesignZoneConfig | null;
  processes: ChartProcess[];
  isLoading: boolean;
  isRecalculating: boolean;
  displaySettings: DisplaySettings;
  altitudeM: number;
  pressurePa: number;

  setBaseData: (data: BaseChartData) => void;
  addPoint: (point: ChartDataPoint) => void;
  removePoint: (id: string) => void;
  clearPoints: () => void;
  setUploadedData: (datasets: UploadedDataset[]) => void;
  setDesignZone: (zone: DesignZoneConfig | null) => void;
  addProcess: (process: ChartProcess) => void;
  removeProcess: (id: string) => void;
  clearProcesses: () => void;
  updateProcessColor: (id: string, color: string) => void;
  setProcesses: (processes: ChartProcess[]) => void;
  setLoading: (loading: boolean) => void;
  setRecalculating: (recalculating: boolean) => void;
  clearData: () => void;
  setDisplaySettings: (patch: Partial<DisplaySettings>) => void;
  setAltitude: (altitudeM: number) => void;
}

export const useChartDataStore = create<ChartDataState>((set) => ({
  baseData: null,
  dataPoints: [],
  uploadedDatasets: [],
  designZone: null,
  processes: [],
  isLoading: false,
  isRecalculating: false,
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
  altitudeM: 0,
  pressurePa: 101325,

  setBaseData: (data) => set({ baseData: data }),
  addPoint: (point) => set((s) => ({ dataPoints: [...s.dataPoints, point] })),
  removePoint: (id) => set((s) => ({ dataPoints: s.dataPoints.filter((p) => p.id !== id) })),
  clearPoints: () => set({ dataPoints: [] }),
  setUploadedData: (datasets) => set({ uploadedDatasets: datasets }),
  setDesignZone: (zone) => set({ designZone: zone }),
  addProcess: (process) => set((s) => s.processes.length >= 5 ? s : { processes: [...s.processes, process] }),
  removeProcess: (id) => set((s) => ({ processes: s.processes.filter((p) => p.id !== id) })),
  clearProcesses: () => set({ processes: [] }),
  updateProcessColor: (id, color) => set((s) => ({ processes: s.processes.map((p) => p.id === id ? { ...p, color } : p) })),
  setProcesses: (processes) => set({ processes }),
  setLoading: (loading) => set({ isLoading: loading }),
  setRecalculating: (recalculating) => set({ isRecalculating: recalculating }),
  clearData: () => set({ dataPoints: [], uploadedDatasets: [], designZone: null, processes: [] }),
  setDisplaySettings: (patch) => set((s) => ({ displaySettings: { ...s.displaySettings, ...patch } })),
  setAltitude: (altitudeM) => set({ altitudeM, pressurePa: altitudeToPressure(altitudeM) }),
}));
