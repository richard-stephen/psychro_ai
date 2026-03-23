export const CHART_COLORS = {
  PRIMARY: 'rgba(38,70,83,1)',
  PRIMARY_80: 'rgba(38,70,83,0.8)',
  PRIMARY_50: 'rgba(38,70,83,0.5)',
  DESIGN_ZONE_LINE: 'rgba(42,157,143,1)',
  DESIGN_ZONE_FILL: 'rgba(42,157,143,0.08)',
  DATASET_1: 'rgba(233,196,106,0.7)',
  DATASET_2: 'rgba(42,157,143,0.7)',
  MANUAL_POINT: 'rgba(231,111,81,1)',
} as const;

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
