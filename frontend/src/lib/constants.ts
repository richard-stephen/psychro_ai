export const CHART_COLORS = {
  // Base palette (kept for compatibility)
  PRIMARY: 'rgba(38,70,83,1)',
  PRIMARY_80: 'rgba(38,70,83,0.8)',
  PRIMARY_50: 'rgba(38,70,83,0.5)',

  // Refined structural colors
  SATURATION: 'rgba(38,70,83,1)',
  RH_CURVE: 'rgba(55,95,120,0.65)',
  RH_ANNOTATION: 'rgba(55,95,120,0.8)',
  GRID: 'rgba(38,70,83,0.3)',
  ENTHALPY: 'rgba(120,90,60,0.7)',
  ENTHALPY_LABEL: 'rgba(120,90,60,0.7)',

  // Axis & text
  AXIS_LINE: '#cbd5e1',
  AXIS_TEXT: '#475569',
  TITLE_TEXT: '#1e293b',

  // User data colors (unchanged)
  DESIGN_ZONE_LINE: 'rgba(42,157,143,1)',
  DESIGN_ZONE_FILL: 'rgba(42,157,143,0.08)',
  DATASET_1: 'rgba(233,196,106,0.7)',
  DATASET_2: 'rgba(42,157,143,0.7)',
  MANUAL_POINT: 'rgba(231,111,81,1)',
  PROCESS_LINE: 'rgba(100,80,180,1)',
} as const;

export type ChartThemeName = 'default' | 'monochrome' | 'blueprint' | 'vivid';

export interface ChartThemeColors {
  // Structural
  background: string;
  saturation: string;
  rh_curve: string;
  rh_annotation: string;
  grid: string;
  enthalpy: string;
  enthalpy_label: string;
  axis_line: string;
  axis_text: string;
  title_text: string;
  // User traces
  manual_point: string;
  process_line: string;
  design_zone_line: string;
  design_zone_fill: string;
  dataset_1: string;
  dataset_2: string;
}

export const CHART_THEMES: Record<ChartThemeName, ChartThemeColors> = {
  default: {
    background: '#ffffff',
    saturation: 'rgba(38,70,83,1)',
    rh_curve: 'rgba(55,95,120,0.65)',
    rh_annotation: 'rgba(55,95,120,0.8)',
    grid: 'rgba(38,70,83,0.3)',
    enthalpy: 'rgba(120,90,60,0.7)',
    enthalpy_label: 'rgba(120,90,60,0.7)',
    axis_line: '#cbd5e1',
    axis_text: '#475569',
    title_text: '#1e293b',
    manual_point: 'rgba(231,111,81,1)',
    process_line: 'rgba(100,80,180,1)',
    design_zone_line: 'rgba(42,157,143,1)',
    design_zone_fill: 'rgba(42,157,143,0.08)',
    dataset_1: 'rgba(233,196,106,0.7)',
    dataset_2: 'rgba(42,157,143,0.7)',
  },
  monochrome: {
    background: '#ffffff',
    saturation: 'rgba(30,30,30,1)',
    rh_curve: 'rgba(80,80,80,0.65)',
    rh_annotation: 'rgba(80,80,80,0.85)',
    grid: 'rgba(60,60,60,0.25)',
    enthalpy: 'rgba(130,130,130,0.8)',
    enthalpy_label: 'rgba(130,130,130,0.9)',
    axis_line: '#b0b0b0',
    axis_text: '#404040',
    title_text: '#1a1a1a',
    manual_point: 'rgba(60,60,60,1)',
    process_line: 'rgba(80,80,80,1)',
    design_zone_line: 'rgba(50,50,50,0.9)',
    design_zone_fill: 'rgba(50,50,50,0.06)',
    dataset_1: 'rgba(160,160,160,0.7)',
    dataset_2: 'rgba(90,90,90,0.7)',
  },
  blueprint: {
    background: '#1a2744',
    saturation: 'rgba(200,225,255,1)',
    rh_curve: 'rgba(140,185,240,0.7)',
    rh_annotation: 'rgba(160,200,255,0.9)',
    grid: 'rgba(100,145,210,0.35)',
    enthalpy: 'rgba(255,210,100,0.75)',
    enthalpy_label: 'rgba(255,210,100,0.9)',
    axis_line: 'rgba(100,140,200,0.5)',
    axis_text: 'rgba(180,210,255,0.85)',
    title_text: 'rgba(220,235,255,1)',
    manual_point: 'rgba(255,120,90,1)',
    process_line: 'rgba(160,130,255,1)',
    design_zone_line: 'rgba(80,220,200,1)',
    design_zone_fill: 'rgba(80,220,200,0.1)',
    dataset_1: 'rgba(255,210,80,0.8)',
    dataset_2: 'rgba(80,220,200,0.8)',
  },
  vivid: {
    background: '#ffffff',
    saturation: 'rgba(0,100,160,1)',
    rh_curve: 'rgba(0,150,200,0.75)',
    rh_annotation: 'rgba(0,130,180,0.9)',
    grid: 'rgba(0,100,160,0.2)',
    enthalpy: 'rgba(200,70,0,0.8)',
    enthalpy_label: 'rgba(200,70,0,0.9)',
    axis_line: '#94a3b8',
    axis_text: '#334155',
    title_text: '#0f172a',
    manual_point: 'rgba(220,50,50,1)',
    process_line: 'rgba(120,40,200,1)',
    design_zone_line: 'rgba(0,180,130,1)',
    design_zone_fill: 'rgba(0,180,130,0.08)',
    dataset_1: 'rgba(220,160,0,0.85)',
    dataset_2: 'rgba(0,180,130,0.85)',
  },
};

export const AXIS_CONFIG = {
  X_MIN: -10,
  X_MAX: 50,
  X_DTICK: 5,
  Y_MIN: 0,
  Y_MAX: 30,
} as const;

export const DEFAULT_DESIGN_ZONE = {
  minTemp: 20,
  maxTemp: 24,
  minRH: 40,
  maxRH: 60,
} as const;

export const YEAR_HOURS = 8760;

export const PROCESS_CHAIN_COLORS: readonly string[] = [
  '#6450b4',  // P1 — purple
  '#e76f51',  // P2 — orange
  '#2a9d8f',  // P3 — teal
  '#e9c46a',  // P4 — amber
  '#c83c78',  // P5 — rose
] as const;
