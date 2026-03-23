import { create } from 'zustand';
import type { BaseChartData, ChartDataPoint, UploadedDataset, DesignZoneConfig } from '@/lib/types';

interface ChartDataState {
  baseData: BaseChartData | null;
  dataPoints: ChartDataPoint[];
  uploadedDatasets: UploadedDataset[];
  designZone: DesignZoneConfig | null;
  isLoading: boolean;

  setBaseData: (data: BaseChartData) => void;
  addPoint: (point: ChartDataPoint) => void;
  removePoint: (id: string) => void;
  setUploadedData: (datasets: UploadedDataset[]) => void;
  setDesignZone: (zone: DesignZoneConfig | null) => void;
  setLoading: (loading: boolean) => void;
  clearData: () => void;
}

export const useChartDataStore = create<ChartDataState>((set) => ({
  baseData: null,
  dataPoints: [],
  uploadedDatasets: [],
  designZone: null,
  isLoading: false,

  setBaseData: (data) => set({ baseData: data }),
  addPoint: (point) => set((s) => ({ dataPoints: [...s.dataPoints, point] })),
  removePoint: (id) => set((s) => ({ dataPoints: s.dataPoints.filter((p) => p.id !== id) })),
  setUploadedData: (datasets) => set({ uploadedDatasets: datasets }),
  setDesignZone: (zone) => set({ designZone: zone }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearData: () => set({ dataPoints: [], uploadedDatasets: [], designZone: null }),
}));
