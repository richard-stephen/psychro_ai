import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChartDataStore } from '@/stores/chartDataStore';
import { calculateDataset } from '@/lib/api';
import { YEAR_HOURS } from '@/lib/constants';
import { toast } from 'sonner';
import type { MarkerSymbol, DatasetResult } from '@/lib/types';

const PALETTE: string[] = [
  'rgba(233,196,106,0.85)',
  'rgba(42,157,143,0.85)',
  'rgba(231,111,81,0.85)',
  'rgba(100,80,180,0.85)',
  'rgba(59,130,246,0.85)',
  'rgba(34,197,94,0.85)',
  'rgba(236,72,153,0.85)',
  'rgba(239,68,68,0.85)',
];

export default function FileUploadForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [markerSymbol, setMarkerSymbol] = useState<MarkerSymbol>('circle');
  const [markerSize, setMarkerSize] = useState('6');
  const [lastResult, setLastResult] = useState<DatasetResult | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  // Column mapping state — only set when backend signals a mismatch
  const [availableColumns, setAvailableColumns] = useState<string[] | null>(null);
  const [tempCol, setTempCol] = useState('');
  const [humidCol, setHumidCol] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const setUploadedData = useChartDataStore((s) => s.setUploadedData);

  const applyResult = useCallback(
    (result: DatasetResult, c: string, symbol: MarkerSymbol, size: string) => {
      const markerSizeNum = Number(size);
      const colorIdx = PALETTE.indexOf(c);
      const color2 = PALETTE[(colorIdx + 1) % PALETTE.length];

      if (result.points.length > YEAR_HOURS) {
        setUploadedData([
          { name: 'Dataset 1', color: c, points: result.points.slice(0, YEAR_HOURS), markerSize: markerSizeNum, markerSymbol: symbol },
          { name: 'Dataset 2', color: color2, points: result.points.slice(YEAR_HOURS), markerSize: markerSizeNum, markerSymbol: symbol },
        ]);
      } else {
        setUploadedData([
          { name: 'Uploaded Data', color: c, points: result.points, markerSize: markerSizeNum, markerSymbol: symbol },
        ]);
      }
    },
    [setUploadedData],
  );

  // Re-apply appearance when settings change (no API call)
  useEffect(() => {
    if (lastResult) applyResult(lastResult, color, markerSymbol, markerSize);
  }, [color, markerSymbol, markerSize, lastResult, applyResult]);

  async function runUpload(file: File, tCol?: string, hCol?: string) {
    setIsUploading(true);
    try {
      const result = await calculateDataset(file, tCol, hCol);

      if (result.points.length === 0) {
        toast.error('No valid data points found in file');
        return;
      }

      setLastResult(result);
      setAvailableColumns(null);
      setTempCol('');
      setHumidCol('');
      applyResult(result, color, markerSymbol, markerSize);

      toast.success(
        `Plotted ${result.valid_rows} of ${result.total_rows} rows` +
          (result.invalid_rows > 0 ? ` (${result.invalid_rows} invalid)` : ''),
      );
    } catch (err) {
      const body = (err as any)?.body;
      if (body?.detail?.code === 'column_mapping_required') {
        setAvailableColumns(body.detail.columns);
        setTempCol('');
        setHumidCol('');
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to process file');
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLastFile(file);
    setAvailableColumns(null);
    runUpload(file);
  }

  // Auto-retry when both columns are mapped
  useEffect(() => {
    if (lastFile && availableColumns && tempCol && humidCol) {
      if (tempCol === humidCol) return; // guard: same column selected for both
      runUpload(lastFile, tempCol, humidCol);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempCol, humidCol]);

  function handleClear() {
    setUploadedData([]);
    setLastResult(null);
    setLastFile(null);
    setFileName('');
    setAvailableColumns(null);
    setTempCol('');
    setHumidCol('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const sameColumnWarning = availableColumns && tempCol && humidCol && tempCol === humidCol;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="file-upload">
          Upload Dataset{' '}
          <span className="font-mono text-muted-foreground">(.xlsx, .csv)</span>
        </Label>
        <Input
          id="file-upload"
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          disabled={isUploading}
          className="border-dashed bg-muted/50"
          onChange={handleFileChange}
        />
        {fileName && (
          <p className="text-xs text-muted-foreground truncate font-mono">{fileName}</p>
        )}
      </div>

      {/* Column mapping — shown only when backend couldn't detect standard names */}
      {availableColumns && (
        <div className="space-y-2 rounded border border-amber-400/50 bg-amber-50/50 p-2.5 dark:bg-amber-950/20">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Column names not recognised. Select which column contains each value:
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Temperature (°C)</Label>
            <select
              value={tempCol}
              onChange={(e) => setTempCol(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">— select column —</option>
              {availableColumns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Humidity (%)</Label>
            <select
              value={humidCol}
              onChange={(e) => setHumidCol(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">— select column —</option>
              {availableColumns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {sameColumnWarning && (
            <p className="text-xs text-destructive">Temperature and Humidity must be different columns.</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Colour</Label>
        <div className="flex gap-1.5 flex-wrap">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-5 w-5 rounded-full border-2 transition-all ${
                color === c ? 'border-foreground scale-110' : 'border-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Marker</Label>
          <select
            value={markerSymbol}
            onChange={(e) => setMarkerSymbol(e.target.value as MarkerSymbol)}
            className="w-full rounded border border-border bg-muted/50 px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="circle">Circle</option>
            <option value="diamond">Diamond</option>
            <option value="x">Cross</option>
          </select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Size</Label>
          <select
            value={markerSize}
            onChange={(e) => setMarkerSize(e.target.value)}
            className="w-full rounded border border-border bg-muted/50 px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="3">Small</option>
            <option value="6">Medium</option>
            <option value="9">Large</option>
          </select>
        </div>
      </div>

      {lastResult && (
        <Button
          type="button"
          variant="ghost"
          className="w-full border-l-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClear}
        >
          Clear Data
        </Button>
      )}
    </div>
  );
}
