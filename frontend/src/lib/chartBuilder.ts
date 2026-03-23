import type { Data, Layout, Annotations, Config } from 'plotly.js';
import { CHART_COLORS } from './constants';
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
} from './types';

// ── Base chart traces ───────────────────────────────────────────────

export function buildSaturationTrace(data: SaturationCurve): Data {
  return {
    x: data.temperatures,
    y: data.humidity_ratios,
    mode: 'lines',
    type: 'scatter',
    showlegend: false,
    line: { color: CHART_COLORS.PRIMARY_80, width: 2 },
    hoverinfo: 'skip',
  };
}

export function buildVerticalLineTraces(data: VerticalLine[]): Data[] {
  return data.map((line) => ({
    x: [line.temperature, line.temperature],
    y: [0, line.max_humidity_ratio],
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: { color: CHART_COLORS.PRIMARY_50, width: 1 },
    opacity: 0.3,
    hoverinfo: 'skip' as const,
    showlegend: false,
  }));
}

export function buildDewpointTraces(data: DewpointLine[]): Data[] {
  return data.map((line) => ({
    x: [line.dewpoint_temp, line.max_temp],
    y: [line.humidity_ratio, line.humidity_ratio],
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: { color: CHART_COLORS.PRIMARY_50, width: 1 },
    opacity: 0.3,
    hoverinfo: 'skip' as const,
    showlegend: false,
  }));
}

export function buildRhCurveTraces(data: Record<string, RhCurve>): Data[] {
  return Object.values(data).map((curve) => ({
    x: curve.temperatures,
    y: curve.humidity_ratios,
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: { color: CHART_COLORS.PRIMARY_50, width: 1, dash: 'dash' as const },
    opacity: 1.0,
    hoverinfo: 'skip' as const,
    showlegend: false,
  }));
}

export function buildEnthalpyTraces(data: EnthalpyLine[]): Data[] {
  return data.map((line) => ({
    x: line.temperatures,
    y: line.humidity_ratios,
    mode: 'lines' as const,
    type: 'scatter' as const,
    line: { color: CHART_COLORS.PRIMARY, width: 1, dash: 'dot' as const },
    hoverinfo: 'skip' as const,
    showlegend: false,
  }));
}

// ── Annotations ─────────────────────────────────────────────────────

export function buildRhAnnotations(data: RhAnnotation[]): Partial<Annotations>[] {
  return data.filter((a) => a.y !== null).map((a) => ({
    x: a.x,
    y: a.y as number,
    text: `${a.rh_value}%`,
    showarrow: false,
    font: { size: 10, color: CHART_COLORS.PRIMARY },
    xanchor: 'center' as const,
    yanchor: 'middle' as const,
  }));
}

export function buildEnthalpyAnnotations(data: EnthalpyLine[]): Partial<Annotations>[] {
  const labels: Partial<Annotations>[] = data.map((line) => ({
    x: line.label_position.x,
    y: line.label_position.y,
    text: `${Math.round(line.enthalpy_value)}`,
    showarrow: false,
    font: { size: 9, color: CHART_COLORS.PRIMARY },
    xanchor: 'center' as const,
    yanchor: 'middle' as const,
  }));

  // Static "Enthalpy kJ/kg" label
  labels.push({
    x: 12,
    y: 16,
    text: 'Enthalpy kJ/kg',
    showarrow: false,
    font: { family: '"DM Sans Variable", sans-serif', size: 14, color: CHART_COLORS.PRIMARY },
    xanchor: 'left' as const,
    yanchor: 'middle' as const,
  });

  return labels;
}

// ── User data traces ────────────────────────────────────────────────

export function buildDataPointTrace(points: ChartDataPoint[]): Data {
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
    marker: { color: CHART_COLORS.MANUAL_POINT, size: 10, symbol: 'circle' },
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
    marker: { color: dataset.color, size: 2, symbol: 'x' as const },
    hovertemplate: `Temp: %{x:.1f}°C<br>Humidity Ratio: %{y:.2f} g/kg<extra>${dataset.name}</extra>`,
  }));
}

export function buildDesignZoneTrace(polygon: Polygon): Data {
  return {
    x: polygon.x,
    y: polygon.y,
    mode: 'lines',
    type: 'scatter',
    name: 'Design Zone',
    line: { color: CHART_COLORS.DESIGN_ZONE_LINE, dash: 'dash', width: 2 },
    fill: 'toself',
    fillcolor: CHART_COLORS.DESIGN_ZONE_FILL,
    hovertemplate: 'Design Zone<extra></extra>',
  };
}

// ── Layout + Config ─────────────────────────────────────────────────

export function buildChartLayout(annotations: Partial<Annotations>[] = []): Partial<Layout> {
  return {
    template: { layout: { plot_bgcolor: 'white', paper_bgcolor: 'white' } } as Layout['template'],
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    title: {
      text: '<b>Psychrometric Chart</b>',
      font: { family: '"DM Sans Variable", sans-serif', size: 28, color: '#1a2c32' },
      x: 0.5,
    },
    xaxis: {
      title: { text: 'Dry-Bulb Temperature (°C)' },
      range: [-10, 50],
      showline: true,
      linewidth: 1,
      linecolor: 'black',
      mirror: true,
      dtick: 5,
      showgrid: false,
      zeroline: false,
    },
    yaxis: {
      title: { text: 'Humidity Ratio (g water / kg dry air)' },
      range: [0, 30],
      side: 'right',
      showline: true,
      linewidth: 1,
      linecolor: 'black',
      mirror: true,
      showgrid: false,
      zeroline: false,
    },
    margin: { l: 40, r: 60, t: 60, b: 40 },
    legend: {
      yanchor: 'top',
      y: 0.99,
      xanchor: 'left',
      x: 0.01,
      bgcolor: 'rgba(255,255,255,0.7)',
    },
    hovermode: 'closest',
    annotations,
  };
}

export function buildAllTraces(baseData: BaseChartData): Data[] {
  return [
    buildSaturationTrace(baseData.saturation_curve),
    ...buildVerticalLineTraces(baseData.vertical_lines),
    ...buildDewpointTraces(baseData.dewpoint_lines),
    ...buildRhCurveTraces(baseData.rh_curves),
    ...buildEnthalpyTraces(baseData.enthalpy_lines),
  ];
}

export function buildAllAnnotations(baseData: BaseChartData): Partial<Annotations>[] {
  return [
    ...buildRhAnnotations(baseData.rh_annotations),
    ...buildEnthalpyAnnotations(baseData.enthalpy_lines),
  ];
}

export const PLOT_CONFIG: Partial<Config> = {
  displaylogo: false,
  modeBarButtonsToRemove: [
    'zoom2d', 'pan2d', 'select2d', 'lasso2d',
    'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
  ],
  toImageButtonOptions: {
    format: 'png',
    scale: 3,
    filename: 'psychrometric-chart',
  },
};
