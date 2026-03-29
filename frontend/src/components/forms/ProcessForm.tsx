import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChartDataStore } from '@/stores/chartDataStore';
import { calculateProcess } from '@/lib/api';
import { toast } from 'sonner';
import type { ProcessType } from '@/lib/types';

const PROCESS_OPTIONS: { value: ProcessType; label: string; disabled?: boolean }[] = [
  { value: 'sensible_heating_cooling', label: 'Sensible Heating / Cooling' },
  { value: 'cooling_dehumidification', label: 'Cooling & Dehumidification' },
  { value: 'evaporative_cooling', label: 'Evaporative Cooling' },
  { value: 'mixing', label: 'Mixing of Two Airstreams' },
];

export default function ProcessForm() {
  const [processType, setProcessType] = useState<ProcessType>('sensible_heating_cooling');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [targetTemperature, setTargetTemperature] = useState('');
  const [adpTemperature, setAdpTemperature] = useState('');
  const [bypassFactor, setBypassFactor] = useState('');
  const [targetRh, setTargetRh] = useState('');
  const [temperature2, setTemperature2] = useState('');
  const [humidity2, setHumidity2] = useState('');
  const [ratio, setRatio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPlottedProcess, setHasPlottedProcess] = useState(false);
  const addProcess = useChartDataStore((s) => s.addProcess);
  const clearProcesses = useChartDataStore((s) => s.clearProcesses);

  function resetInputs() {
    setTemperature('');
    setHumidity('');
    setTargetTemperature('');
    setAdpTemperature('');
    setBypassFactor('');
    setTargetRh('');
    setTemperature2('');
    setHumidity2('');
    setRatio('');
  }

  function handleProcessTypeChange(value: string) {
    setProcessType(value as ProcessType);
    resetInputs();
    setHasPlottedProcess(false);
    clearProcesses();
  }

  function handleClear() {
    resetInputs();
    setHasPlottedProcess(false);
    clearProcesses();
  }

  function validateStartState(): { temp: number; rh: number } | null {
    const temp = parseFloat(temperature);
    const rh = parseFloat(humidity);
    if (isNaN(temp) || temp < -10 || temp > 50) {
      toast.error('Temperature must be between -10°C and 50°C');
      return null;
    }
    if (isNaN(rh) || rh < 0 || rh > 100) {
      toast.error('Humidity must be between 0% and 100%');
      return null;
    }
    return { temp, rh };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (processType === 'sensible_heating_cooling') {
      await submitSensibleHeatingCooling();
    } else if (processType === 'cooling_dehumidification') {
      await submitCoolingDehumidification();
    } else if (processType === 'evaporative_cooling') {
      await submitEvaporativeCooling();
    } else if (processType === 'mixing') {
      await submitMixing();
    }
  }

  async function submitSensibleHeatingCooling() {
    const start = validateStartState();
    if (!start) return;
    const targetTemp = parseFloat(targetTemperature);
    if (isNaN(targetTemp) || targetTemp < -10 || targetTemp > 50) {
      toast.error('Target temperature must be between -10°C and 50°C');
      return;
    }
    if (targetTemp === start.temp) {
      toast.error('Target temperature must differ from start temperature');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await calculateProcess({
        process_type: 'sensible_heating_cooling',
        temperature: start.temp,
        humidity: start.rh,
        target_temperature: targetTemp,
      });
      addProcess({ id: crypto.randomUUID(), result });
      setHasPlottedProcess(true);
      const direction = targetTemp > start.temp ? 'Heating' : 'Cooling';
      toast.success(`Sensible ${direction}: ${start.temp}°C → ${targetTemp}°C`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate process');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCoolingDehumidification() {
    const start = validateStartState();
    if (!start) return;
    const adpTemp = parseFloat(adpTemperature);
    const bf = parseFloat(bypassFactor);
    if (isNaN(adpTemp) || adpTemp < -10 || adpTemp > 50) {
      toast.error('ADP temperature must be between -10°C and 50°C');
      return;
    }
    if (isNaN(bf) || bf <= 0 || bf >= 1) {
      toast.error('Bypass factor must be between 0 and 1 (exclusive)');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await calculateProcess({
        process_type: 'cooling_dehumidification',
        temperature: start.temp,
        humidity: start.rh,
        adp_temperature: adpTemp,
        bypass_factor: bf,
      });
      addProcess({ id: crypto.randomUUID(), result });
      setHasPlottedProcess(true);
      toast.success(`Cooling & Dehumidification: ${start.temp}°C → ${result.end_point.temperature.toFixed(1)}°C`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate process');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitEvaporativeCooling() {
    const start = validateStartState();
    if (!start) return;
    const tRh = parseFloat(targetRh);
    if (isNaN(tRh) || tRh <= 0 || tRh > 100) {
      toast.error('Target RH must be between 0% and 100%');
      return;
    }
    if (tRh <= start.rh) {
      toast.error('Target RH must be higher than start RH');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await calculateProcess({
        process_type: 'evaporative_cooling',
        temperature: start.temp,
        humidity: start.rh,
        target_rh: tRh,
      });
      addProcess({ id: crypto.randomUUID(), result });
      setHasPlottedProcess(true);
      toast.success(`Evaporative Cooling: ${start.temp}°C/${start.rh}% → ${result.end_point.temperature.toFixed(1)}°C/${tRh}%`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate process');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMixing() {
    const t1 = parseFloat(temperature);
    const rh1 = parseFloat(humidity);
    const t2 = parseFloat(temperature2);
    const rh2 = parseFloat(humidity2);
    const r = parseFloat(ratio);

    if (isNaN(t1) || t1 < -10 || t1 > 50) {
      toast.error('Stream 1 temperature must be between -10°C and 50°C');
      return;
    }
    if (isNaN(rh1) || rh1 < 0 || rh1 > 100) {
      toast.error('Stream 1 RH must be between 0% and 100%');
      return;
    }
    if (isNaN(t2) || t2 < -10 || t2 > 50) {
      toast.error('Stream 2 temperature must be between -10°C and 50°C');
      return;
    }
    if (isNaN(rh2) || rh2 < 0 || rh2 > 100) {
      toast.error('Stream 2 RH must be between 0% and 100%');
      return;
    }
    if (isNaN(r) || r <= 0 || r >= 1) {
      toast.error('Mass ratio must be between 0 and 1 (exclusive)');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await calculateProcess({
        process_type: 'mixing',
        temperature_1: t1,
        humidity_1: rh1,
        temperature_2: t2,
        humidity_2: rh2,
        ratio: r,
      });
      addProcess({ id: crypto.randomUUID(), result });
      setHasPlottedProcess(true);
      const mixT = result.mix_point?.temperature.toFixed(1) ?? '?';
      toast.success(`Mixing: T_mix = ${mixT}°C (ratio ${r})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate process');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="proc-type">Process Type</Label>
        <select
          id="proc-type"
          value={processType}
          onChange={(e) => handleProcessTypeChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {PROCESS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}{opt.disabled ? ' (coming soon)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Common start state inputs for all non-mixing processes */}
      {processType !== 'mixing' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="proc-temp">Start Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
            <Input
              id="proc-temp"
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
            <Label htmlFor="proc-rh">Start RH <span className="font-mono text-muted-foreground">(%)</span></Label>
            <Input
              id="proc-rh"
              type="number"
              step="any"
              min={0}
              max={100}
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              className="font-mono"
            />
          </div>
        </>
      )}

      {/* Sensible Heating/Cooling: target temperature */}
      {processType === 'sensible_heating_cooling' && (
        <div className="space-y-1.5">
          <Label htmlFor="proc-target-temp">Target Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
          <Input
            id="proc-target-temp"
            type="number"
            step="any"
            min={-10}
            max={50}
                       value={targetTemperature}
            onChange={(e) => setTargetTemperature(e.target.value)}
            className="font-mono"
          />
        </div>
      )}

      {/* Cooling & Dehumidification: ADP temperature + bypass factor */}
      {processType === 'cooling_dehumidification' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="proc-adp-temp">ADP Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
            <Input
              id="proc-adp-temp"
              type="number"
              step="any"
              min={-10}
              max={50}
                           value={adpTemperature}
              onChange={(e) => setAdpTemperature(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proc-bf">Bypass Factor <span className="font-mono text-muted-foreground">(0–1)</span></Label>
            <Input
              id="proc-bf"
              type="number"
              step="0.01"
              min={0.01}
              max={0.99}
                           value={bypassFactor}
              onChange={(e) => setBypassFactor(e.target.value)}
              className="font-mono"
            />
          </div>
        </>
      )}

      {/* Evaporative Cooling: target RH */}
      {processType === 'evaporative_cooling' && (
        <div className="space-y-1.5">
          <Label htmlFor="proc-target-rh">Target RH <span className="font-mono text-muted-foreground">(%)</span></Label>
          <Input
            id="proc-target-rh"
            type="number"
            step="any"
            min={1}
            max={100}
                       value={targetRh}
            onChange={(e) => setTargetRh(e.target.value)}
            className="font-mono"
          />
        </div>
      )}

      {/* Mixing: two streams + ratio */}
      {processType === 'mixing' && (
        <>
          <p className="text-xs font-medium text-muted-foreground">Stream 1</p>
          <div className="space-y-1.5">
            <Label htmlFor="proc-t1">Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
            <Input id="proc-t1" type="number" step="any" min={-10} max={50} placeholder="-10 to 50" value={temperature} onChange={(e) => setTemperature(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proc-rh1">RH <span className="font-mono text-muted-foreground">(%)</span></Label>
            <Input id="proc-rh1" type="number" step="any" min={0} max={100} value={humidity} onChange={(e) => setHumidity(e.target.value)} className="font-mono" />
          </div>
          <p className="text-xs font-medium text-muted-foreground pt-1">Stream 2</p>
          <div className="space-y-1.5">
            <Label htmlFor="proc-t2">Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
            <Input id="proc-t2" type="number" step="any" min={-10} max={50} placeholder="-10 to 50" value={temperature2} onChange={(e) => setTemperature2(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proc-rh2">RH <span className="font-mono text-muted-foreground">(%)</span></Label>
            <Input id="proc-rh2" type="number" step="any" min={0} max={100} value={humidity2} onChange={(e) => setHumidity2(e.target.value)} className="font-mono" />
          </div>
          <p className="text-xs font-medium text-muted-foreground pt-1">Mix Ratio</p>
          <div className="space-y-1.5">
            <Label htmlFor="proc-ratio">m₁ / (m₁ + m₂) <span className="font-mono text-muted-foreground">(0–1)</span></Label>
            <Input id="proc-ratio" type="number" step="0.01" min={0.01} max={0.99} value={ratio} onChange={(e) => setRatio(e.target.value)} className="font-mono" />
          </div>
        </>
      )}

      <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
        {isSubmitting ? 'Calculating…' : 'Plot Process'}
      </Button>
      {hasPlottedProcess && (
        <Button
          type="button"
          variant="ghost"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClear}
        >
          Clear Process
        </Button>
      )}
    </form>
  );
}
