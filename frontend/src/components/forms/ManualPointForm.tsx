import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChartDataStore } from '@/stores/chartDataStore';
import { calculatePoint } from '@/lib/api';
import { toast } from 'sonner';

export default function ManualPointForm() {
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addPoint = useChartDataStore((s) => s.addPoint);
  const clearPoints = useChartDataStore((s) => s.clearPoints);
  const hasPoints = useChartDataStore((s) => s.dataPoints.length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const temp = parseFloat(temperature);
    const rh = parseFloat(humidity);

    if (isNaN(temp) || temp < -10 || temp > 50) {
      toast.error('Temperature must be between -10°C and 50°C');
      return;
    }
    if (isNaN(rh) || rh < 0 || rh > 100) {
      toast.error('Humidity must be between 0% and 100%');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await calculatePoint(temp, rh);
      addPoint({
        id: crypto.randomUUID(),
        temperature: result.temperature,
        humidity: result.relative_humidity,
        humidity_ratio: result.humidity_ratio,
        enthalpy: result.enthalpy,
      });
      toast.success(`Point plotted: ${temp}°C, ${rh}% RH`);
      setTemperature('');
      setHumidity('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate point');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="temperature">Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
        <Input
          id="temperature"
          type="number"
          step="any"
          min={-10}
          max={50}
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="humidity">Relative Humidity <span className="font-mono text-muted-foreground">(%)</span></Label>
        <Input
          id="humidity"
          type="number"
          step="any"
          min={0}
          max={100}
          value={humidity}
          onChange={(e) => setHumidity(e.target.value)}
          className="font-mono"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
          {isSubmitting ? 'Plotting…' : 'Plot Point'}
        </Button>
        {hasPoints && (
          <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={clearPoints}>
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
