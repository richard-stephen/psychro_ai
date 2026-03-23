import { create } from 'zustand';

interface ChartInteractionState {
  hoveredPoint: { x: number; y: number } | null;
  dragState: { pointId: string; x: number; y: number } | null;
  selectedPointId: string | null;
  cursorPosition: { x: number; y: number } | null;

  setHoveredPoint: (point: { x: number; y: number } | null) => void;
  startDrag: (pointId: string, x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;
  setSelectedPoint: (id: string | null) => void;
}

export const useChartInteractionStore = create<ChartInteractionState>((set) => ({
  hoveredPoint: null,
  dragState: null,
  selectedPointId: null,
  cursorPosition: null,

  setHoveredPoint: (point) => set({ hoveredPoint: point }),
  startDrag: (pointId, x, y) => set({ dragState: { pointId, x, y } }),
  updateDrag: (x, y) => set((s) => s.dragState ? { dragState: { ...s.dragState, x, y } } : {}),
  endDrag: () => set({ dragState: null }),
  setSelectedPoint: (id) => set({ selectedPointId: id }),
}));
