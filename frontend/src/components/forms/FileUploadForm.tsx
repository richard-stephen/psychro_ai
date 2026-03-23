import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChartDataStore } from '@/stores/chartDataStore';
import { calculateDataset } from '@/lib/api';
import { CHART_COLORS, YEAR_HOURS } from '@/lib/constants';
import { toast } from 'sonner';

export default function FileUploadForm() {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const setUploadedData = useChartDataStore((s) => s.setUploadedData);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select an .xlsx file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await calculateDataset(file);

      if (result.points.length === 0) {
        toast.error('No valid data points found in file');
        return;
      }

      if (result.points.length > YEAR_HOURS) {
        setUploadedData([
          {
            name: 'Dataset 1',
            color: CHART_COLORS.DATASET_1,
            points: result.points.slice(0, YEAR_HOURS),
          },
          {
            name: 'Dataset 2',
            color: CHART_COLORS.DATASET_2,
            points: result.points.slice(YEAR_HOURS),
          },
        ]);
      } else {
        setUploadedData([
          {
            name: 'Uploaded Data',
            color: CHART_COLORS.DATASET_1,
            points: result.points,
          },
        ]);
      }

      toast.success(
        `Plotted ${result.valid_rows} of ${result.total_rows} rows` +
          (result.invalid_rows > 0 ? ` (${result.invalid_rows} invalid)` : '')
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="file-upload">Upload Dataset <span className="font-mono text-muted-foreground">(.xlsx)</span></Label>
        <Input
          id="file-upload"
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="border-dashed bg-muted/50"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
        />
        {fileName && (
          <p className="text-xs text-muted-foreground truncate font-mono">{fileName}</p>
        )}
      </div>
      <Button type="submit" variant="outline" className="w-full hover:border-accent hover:text-accent" disabled={isUploading}>
        {isUploading ? 'Uploading…' : 'Upload'}
      </Button>
    </form>
  );
}
