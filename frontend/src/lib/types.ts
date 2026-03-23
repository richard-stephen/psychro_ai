// ── API response types (match backend schemas exactly) ──────────────

export interface BaseChartData {
  saturation_curve: SaturationCurve;
  rh_curves: Record<string, RhCurve>;
  rh_annotations: RhAnnotation[];
  enthalpy_lines: EnthalpyLine[];
  dewpoint_lines: DewpointLine[];
  vertical_lines: VerticalLine[];
  axis_config: AxisConfig;
}

export interface SaturationCurve {
  temperatures: number[];
  humidity_ratios: (number | null)[];
}

export interface RhCurve {
  temperatures: number[];
  humidity_ratios: (number | null)[];
}

export interface RhAnnotation {
  rh_value: number;
  x: number;
  y: number | null;
}

export interface EnthalpyLine {
  enthalpy_value: number;
  temperatures: number[];
  humidity_ratios: number[];
  label_position: { x: number; y: number };
}

export interface DewpointLine {
  humidity_ratio: number;
  dewpoint_temp: number;
  max_temp: number;
}

export interface VerticalLine {
  temperature: number;
  max_humidity_ratio: number | null;
}

export interface AxisConfig {
  x_min: number;
  x_max: number;
  x_dtick: number;
  y_min: number;
  y_max: number;
}

export interface PointResult {
  temperature: number;
  relative_humidity: number;
  humidity_ratio: number;
  enthalpy: number;
}

export interface DatasetPointResult {
  temperature: number;
  humidity_ratio: number;
}

export interface DatasetResult {
  points: DatasetPointResult[];
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
}

export interface Polygon {
  x: number[];
  y: number[];
}

export interface DesignZoneResult {
  polygon: Polygon;
}

export interface DesignZoneRequest {
  min_temp: number;
  max_temp: number;
  min_rh: number;
  max_rh: number;
}

// ── UI state types ──────────────────────────────────────────────────

export interface ChartDataPoint {
  id: string;
  temperature: number;
  humidity: number;
  humidity_ratio: number;
  enthalpy: number;
}

export interface UploadedDataset {
  name: string;
  color: string;
  points: DatasetPointResult[];
}

export interface DesignZoneConfig {
  enabled: boolean;
  minTemp: number;
  maxTemp: number;
  minRH: number;
  maxRH: number;
  polygon?: Polygon;
}
