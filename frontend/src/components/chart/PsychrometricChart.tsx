import { useEffect, useMemo } from 'react';
import _Plot from 'react-plotly.js';
import { useShallow } from 'zustand/react/shallow';

// react-plotly.js CJS default export workaround for ESM
const Plot = typeof (_Plot as any).default === 'function' ? (_Plot as any).default : _Plot;
import { useChartDataStore } from '@/stores/chartDataStore';
import { fetchBaseChartData } from '@/lib/api';
import {
  buildAllTraces,
  buildAllAnnotations,
  buildDataPointTrace,
  buildUploadedDataTraces,
  buildDesignZoneTrace,
  buildChartLayout,
  PLOT_CONFIG,
} from '@/lib/chartBuilder';

export default function PsychrometricChart() {
  const { baseData, dataPoints, uploadedDatasets, designZone, isLoading } =
    useChartDataStore(
      useShallow((s) => ({
        baseData: s.baseData,
        dataPoints: s.dataPoints,
        uploadedDatasets: s.uploadedDatasets,
        designZone: s.designZone,
        isLoading: s.isLoading,
      }))
    );

  const setBaseData = useChartDataStore((s) => s.setBaseData);
  const setLoading = useChartDataStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchBaseChartData();
        if (!cancelled) setBaseData(data);
      } catch (err) {
        console.error('Failed to fetch base chart data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [setBaseData, setLoading]);

  const { traces, layout } = useMemo(() => {
    if (!baseData) return { traces: [], layout: {} };

    const baseTraces = buildAllTraces(baseData);
    const annotations = buildAllAnnotations(baseData);
    const userTraces = [];

    if (dataPoints.length > 0) {
      userTraces.push(buildDataPointTrace(dataPoints));
    }

    if (uploadedDatasets.length > 0) {
      userTraces.push(...buildUploadedDataTraces(uploadedDatasets));
    }

    if (designZone?.enabled && designZone?.polygon) {
      userTraces.push(buildDesignZoneTrace(designZone.polygon));
    }

    return {
      traces: [...baseTraces, ...userTraces],
      layout: buildChartLayout(annotations),
    };
  }, [baseData, dataPoints, uploadedDatasets, designZone]);

  if (isLoading && !baseData) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading chart</p>
      </div>
    );
  }

  return (
    <Plot
      data={traces}
      layout={layout}
      config={PLOT_CONFIG}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
    />
  );
}
