import { useEffect, useMemo } from 'react';
import _Plot from 'react-plotly.js';
import { useShallow } from 'zustand/react/shallow';

// react-plotly.js CJS default export workaround for ESM
const Plot = typeof (_Plot as any).default === 'function' ? (_Plot as any).default : _Plot;
import { CHART_THEMES } from '@/lib/constants';
import { useChartDataStore } from '@/stores/chartDataStore';
import { fetchBaseChartData } from '@/lib/api';
import {
  buildAllTraces,
  buildAllAnnotations,
  buildDataPointTrace,
  buildUploadedDataTraces,
  buildDesignZoneTrace,
  buildProcessTraces,
  buildProcessAnnotations,
  buildChartLayout,
  PLOT_CONFIG,
} from '@/lib/chartBuilder';
import { registerGraphDiv } from '@/lib/chartExport';

export default function PsychrometricChart() {
  const { baseData, dataPoints, uploadedDatasets, designZone, processes, isLoading, displaySettings, pressurePa } =
    useChartDataStore(
      useShallow((s) => ({
        baseData: s.baseData,
        dataPoints: s.dataPoints,
        uploadedDatasets: s.uploadedDatasets,
        designZone: s.designZone,
        processes: s.processes,
        isLoading: s.isLoading,
        displaySettings: s.displaySettings,
        pressurePa: s.pressurePa,
      }))
    );

  const setBaseData = useChartDataStore((s) => s.setBaseData);
  const setLoading = useChartDataStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchBaseChartData(pressurePa);
        if (!cancelled) setBaseData(data);
      } catch (err) {
        console.error('Failed to fetch base chart data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [pressurePa, setBaseData, setLoading]);

  const { traces, layout } = useMemo(() => {
    if (!baseData) return { traces: [], layout: {} };

    const colors = CHART_THEMES[displaySettings.chartTheme];
    const baseTraces = buildAllTraces(baseData, displaySettings, colors);
    const annotations = buildAllAnnotations(baseData, displaySettings, colors);
    const userTraces = [];

    if (dataPoints.length > 0) {
      userTraces.push(buildDataPointTrace(dataPoints, colors));
    }

    if (uploadedDatasets.length > 0) {
      userTraces.push(...buildUploadedDataTraces(uploadedDatasets));
    }

    if (designZone?.enabled && designZone?.polygon) {
      userTraces.push(buildDesignZoneTrace(designZone.polygon, colors));
    }

    const processAnnotations = processes.length > 0
      ? buildProcessAnnotations(processes, colors)
      : [];

    if (processes.length > 0) {
      userTraces.push(...buildProcessTraces(processes, colors, pressurePa));
    }

    return {
      traces: [...baseTraces, ...userTraces],
      layout: buildChartLayout([...annotations, ...processAnnotations], colors),
    };
  }, [baseData, dataPoints, uploadedDatasets, designZone, processes, displaySettings, pressurePa]);

  if (isLoading && !baseData) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading chart</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col p-2">
      <div className="flex items-baseline gap-2 px-1 pb-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Psychrometric Chart
        </h2>
        <p className="text-[10px] text-muted-foreground">
          {(pressurePa / 1000).toFixed(3)} kPa
        </p>
      </div>
      <div className="flex-1 min-h-0 rounded-xl bg-card shadow-sm ring-1 ring-border/50">
        <Plot
          data={traces}
          layout={layout}
          config={PLOT_CONFIG}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          onInitialized={(_figure, graphDiv) => registerGraphDiv(graphDiv as HTMLElement)}
        />
      </div>
    </div>
  );
}
