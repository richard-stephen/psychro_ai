import type { Data, Layout, Annotations, Config } from 'plotly.js';
import { CHART_COLORS, CHART_THEMES } from './constants';
import type { ChartThemeColors } from './constants';
import type {
  BaseChartData,
  SaturationCurve,
  RhCurve,
  RhAnnotation,
  EnthalpyLine,
  DewpointLine,
  VerticalLine,
  ChartDataPoint,
  UploadedDataset,
  Polygon,
  ChartProcess,
  ProcessType,
  DisplaySettings,
} from './types';
import { DEFAULT_DISPLAY_SETTINGS } from './types';

// ── Base chart traces ───────────────────────────────────────────────

export function buildSaturationTrace(data: SaturationCurve, colors: ChartThemeColors): Data {
  return {
    x: data.temperatures,
    y: data.humidity_ratios,
    mode: 'lines',
    type: 'scatter',
    showlegend: false,
    line: { color: colors.saturation, width: 2.5 },
    hoverinfo: 'skip',
  };
}

export function buildVerticalLineTraces(data: VerticalLine[], colors: ChartThemeColors): Data[] {
  return data.map((line) => ({
    x: [line.temperature, line.temperature],
    y: [0, line.max_humidity_ratio],
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: { color: colors.grid, width: 1 },
    hoverinfo: 'skip' as const,
    showlegend: false,
  }));
}

export function buildDewpointTraces(data: DewpointLine[], colors: ChartThemeColors): Data[] {
  return data.map((line) => ({
    x: [line.dewpoint_temp, line.max_temp],
    y: [line.humidity_ratio, line.humidity_ratio],
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: { color: colors.grid, width: 1 },
    hoverinfo: 'skip' as const,
    showlegend: false,
  }));
}

export function buildRhCurveTraces(data: Record<string, RhCurve>, colors: ChartThemeColors): Data[] {
  return Object.values(data).map((curve) => ({
    x: curve.temperatures,
    y: curve.humidity_ratios,
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: { color: colors.rh_curve, width: 1 },
    opacity: 1.0,
    hoverinfo: 'skip' as const,
    showlegend: false,
  }));
}

export function buildEnthalpyTraces(data: EnthalpyLine[], colors: ChartThemeColors): Data[] {
  return data.map((line) => ({
    x: line.temperatures,
    y: line.humidity_ratios,
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: { color: colors.enthalpy, width: 1, dash: 'dot' as const },
    hoverinfo: 'skip' as const,
    showlegend: false,
  }));
}

// ── Annotations ─────────────────────────────────────────────────────

export function buildRhAnnotations(data: RhAnnotation[], colors: ChartThemeColors): Partial<Annotations>[] {
  return data.filter((a) => a.y !== null).map((a) => ({
    x: a.x,
    y: a.y as number,
    text: `${a.rh_value}%`,
    showarrow: false,
    font: { family: '"DM Sans Variable", sans-serif', size: 11, color: colors.rh_annotation },
    xanchor: 'center' as const,
    yanchor: 'middle' as const,
  }));
}

export function buildEnthalpyAnnotations(data: EnthalpyLine[], colors: ChartThemeColors): Partial<Annotations>[] {
  const labels: Partial<Annotations>[] = data.map((line) => ({
    x: line.label_position.x,
    y: line.label_position.y,
    text: `${Math.round(line.enthalpy_value)}`,
    showarrow: false,
    font: { family: '"DM Sans Variable", sans-serif', size: 10, color: colors.enthalpy_label },
    xanchor: 'center' as const,
    yanchor: 'middle' as const,
  }));

  // Static "Enthalpy kJ/kg" label
  labels.push({
    x: 12,
    y: 16,
    text: 'Enthalpy kJ/kg',
    showarrow: false,
    font: { family: '"DM Sans Variable", sans-serif', size: 13, color: colors.enthalpy_label },
    xanchor: 'left' as const,
    yanchor: 'middle' as const,
  });

  return labels;
}

// ── User data traces ────────────────────────────────────────────────

export function buildDataPointTrace(points: ChartDataPoint[], colors: ChartThemeColors): Data {
  const point = points[points.length - 1]; // legend shows last point's properties
  const enthalpyStr = point ? `${point.enthalpy.toFixed(1)} kJ/kg` : '';

  return {
    x: points.map((p) => p.temperature),
    y: points.map((p) => p.humidity_ratio),
    mode: 'markers',
    type: 'scatter',
    name: point
      ? `Point<br>T: ${point.temperature.toFixed(1)}°C<br>`
        + `Relative Humidity: ${point.humidity.toFixed(1)}%<br>`
        + `Humidity Ratio: ${point.humidity_ratio.toFixed(2)} g/kg<br>`
        + `Enthalpy: ${enthalpyStr}`
      : 'Point',
    marker: { color: colors.manual_point, size: 10, symbol: 'circle' },
    hovertemplate: points.map((p) => {
      const eStr = `${p.enthalpy.toFixed(1)} kJ/kg`;
      return (
        '<b>Point Properties:</b><br>'
        + `Temp: %{x:.1f}°C<br>`
        + `RH: ${p.humidity.toFixed(1)}%<br>`
        + `Humidity Ratio: %{y:.2f} g/kg<br>`
        + `Enthalpy: ${eStr}<br>`
        + '<extra></extra>'
      );
    }),
  };
}

export function buildUploadedDataTraces(datasets: UploadedDataset[]): Data[] {
  return datasets.map((dataset) => ({
    x: dataset.points.map((p) => p.temperature),
    y: dataset.points.map((p) => p.humidity_ratio),
    mode: 'markers' as const,
    type: 'scatter' as const,
    name: dataset.name,
    marker: { color: dataset.color, size: dataset.markerSize, symbol: dataset.markerSymbol as const },
    hovertemplate: `Temp: %{x:.1f}°C<br>Humidity Ratio: %{y:.2f} g/kg<extra>${dataset.name}</extra>`,
  }));
}

export function buildDesignZoneTrace(polygon: Polygon, colors: ChartThemeColors): Data {
  return {
    x: polygon.x,
    y: polygon.y,
    mode: 'lines',
    type: 'scatter',
    name: 'Design Zone',
    line: { color: colors.design_zone_line, dash: 'dash', width: 2 },
    fill: 'toself',
    fillcolor: colors.design_zone_fill,
    hovertemplate: 'Design Zone<extra></extra>',
  };
}

// ── Process traces ──────────────────────────────────────────────────

const PROCESS_LABELS: Record<ProcessType, string> = {
  sensible_heating_cooling: 'Sensible Heating/Cooling',
  cooling_dehumidification: 'Cooling & Dehumidification',
  evaporative_cooling: 'Evaporative Cooling',
  mixing: 'Mixing',
};

export function buildProcessTraces(processes: ChartProcess[], colors: ChartThemeColors): Data[] {
  return processes.map((proc) => {
    const { result } = proc;
    const n = result.line_temperatures.length;
    const label = PROCESS_LABELS[result.process_type];
    const deltaH = result.delta_enthalpy.toFixed(1);

    const isMixing = result.process_type === 'mixing';

    return {
      x: result.line_temperatures,
      y: result.line_humidity_ratios,
      mode: 'lines+markers' as const,
      type: 'scatter' as const,
      name: `${label}<br>Δh: ${deltaH} kJ/kg`,
      line: { color: proc.color, width: 2.5 },
      marker: {
        color: proc.color,
        size: result.line_temperatures.map((_, i) =>
          i === 0 || i === n - 1 ? 10 : (isMixing && i === 1) ? 12 : 0
        ),
        symbol: result.line_temperatures.map((_, i) =>
          (isMixing && i === 1) ? 'diamond' : 'circle'
        ),
      },
      hovertemplate:
        `<b>${label}</b><br>` +
        'T: %{x:.1f}°C<br>' +
        'W: %{y:.2f} g/kg<br>' +
        '<extra></extra>',
    };
  });
}

export function buildProcessAnnotations(
  processes: ChartProcess[],
  colors: ChartThemeColors,
): Partial<Annotations>[] {
  const annotations: Partial<Annotations>[] = [];

  for (const proc of processes) {
    const xs = proc.result.line_temperatures;
    const ys = proc.result.line_humidity_ratios;
    const n = xs.length;
    if (n < 2) continue;

    const isMixing = proc.result.process_type === 'mixing';

    const makeArrow = (tailIdx: number, headIdx: number): Partial<Annotations> => ({
      x: xs[headIdx],
      y: ys[headIdx],
      ax: xs[tailIdx],
      ay: ys[tailIdx],
      xref: 'x' as const,
      yref: 'y' as const,
      axref: 'x' as const,
      ayref: 'y' as const,
      showarrow: true,
      arrowhead: 2,
      arrowsize: 1.5,
      arrowwidth: 2,
      arrowcolor: proc.color,
      text: '',
    });

    if (!isMixing) {
      const tailIdx = Math.max(0, Math.floor((n - 1) * 0.3));
      const headIdx = Math.min(n - 1, Math.ceil((n - 1) * 0.7));
      if (tailIdx !== headIdx) {
        annotations.push(makeArrow(tailIdx, headIdx));
      }
    } else {
      annotations.push(makeArrow(0, 1));
      if (n > 2) {
        annotations.push(makeArrow(n - 1, n - 2));
      }
    }
  }

  return annotations;
}

// ── Layout + Config ─────────────────────────────────────────────────

export function buildChartLayout(
  annotations: Partial<Annotations>[] = [],
  colors: ChartThemeColors = CHART_THEMES.default,
): Partial<Layout> {
  return {
    template: { layout: { plot_bgcolor: colors.background, paper_bgcolor: colors.background } } as Layout['template'],
    plot_bgcolor: colors.background,
    paper_bgcolor: colors.background,
    font: { family: '"DM Sans Variable", sans-serif', color: colors.axis_text },
    xaxis: {
      title: { text: 'Dry-Bulb Temperature (°C)', font: { family: '"DM Sans Variable", sans-serif', size: 12, color: colors.axis_text } },
      range: [-10, 50],
      showline: true,
      linewidth: 1,
      linecolor: colors.axis_text,
      tickcolor: colors.axis_line,
      tickfont: { family: '"DM Sans Variable", sans-serif', size: 11, color: colors.axis_text },
      mirror: true,
      dtick: 5,
      showgrid: false,
      zeroline: false,
    },
    yaxis: {
      title: { text: 'Humidity Ratio (g water / kg dry air)', font: { family: '"DM Sans Variable", sans-serif', size: 12, color: colors.axis_text } },
      range: [0, 30],
      side: 'right',
      showline: true,
      linewidth: 1,
      linecolor: colors.axis_text,
      tickcolor: colors.axis_line,
      tickfont: { family: '"DM Sans Variable", sans-serif', size: 11, color: colors.axis_text },
      mirror: true,
      showgrid: false,
      zeroline: false,
    },
    margin: { l: 40, r: 60, t: 20, b: 40 },
    legend: {
      yanchor: 'top',
      y: 0.99,
      xanchor: 'left',
      x: 0.01,
      bgcolor: colors.background === '#1a2744' ? 'rgba(26,39,68,0.85)' : 'rgba(255,255,255,0.85)',
      bordercolor: colors.axis_line,
      borderwidth: 1,
      font: { family: '"DM Sans Variable", sans-serif', size: 15, color: colors.axis_text },
    },
    hoverlabel: {
      bgcolor: colors.background,
      bordercolor: colors.axis_line,
      font: { family: '"DM Sans Variable", sans-serif', size: 12, color: colors.title_text },
    },
    hovermode: 'closest',
    annotations,
  };
}

export function buildAllTraces(
  baseData: BaseChartData,
  settings: DisplaySettings = DEFAULT_DISPLAY_SETTINGS,
  colors: ChartThemeColors = CHART_THEMES.default,
): Data[] {
  const traces: Data[] = [
    buildSaturationTrace(baseData.saturation_curve, colors),
    ...buildVerticalLineTraces(baseData.vertical_lines, colors),
    ...buildDewpointTraces(baseData.dewpoint_lines, colors),
  ];

  if (settings.showRhLines) {
    traces.push(...buildRhCurveTraces(baseData.rh_curves, colors));
  }

  if (settings.showEnthalpyLines) {
    traces.push(...buildEnthalpyTraces(baseData.enthalpy_lines, colors));
  }

  return traces;
}

export function buildAllAnnotations(
  baseData: BaseChartData,
  settings: DisplaySettings = DEFAULT_DISPLAY_SETTINGS,
  colors: ChartThemeColors = CHART_THEMES.default,
): Partial<Annotations>[] {
  const annotations: Partial<Annotations>[] = [];

  if (settings.showRhLines) {
    annotations.push(...buildRhAnnotations(baseData.rh_annotations, colors));
  }

  if (settings.showEnthalpyLines) {
    annotations.push(...buildEnthalpyAnnotations(baseData.enthalpy_lines, colors));
  }

  return annotations;
}

export const PLOT_CONFIG: Partial<Config> = {
  displaylogo: false,
  modeBarButtonsToRemove: [
    'zoom2d', 'pan2d', 'select2d', 'lasso2d',
    'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
    'toImage',
  ],
};
