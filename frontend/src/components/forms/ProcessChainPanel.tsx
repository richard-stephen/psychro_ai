import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChartDataStore } from '@/stores/chartDataStore';
import { calculateProcess } from '@/lib/api';
import { toast } from 'sonner';
import type { ProcessType, ProcessPoint, ChartProcess, ProcessInputSnapshot } from '@/lib/types';
import { PROCESS_CHAIN_COLORS } from '@/lib/constants';
import ProcessCard from './ProcessCard';

const PROCESS_OPTIONS: { value: ProcessType; label: string }[] = [
  { value: 'sensible_heating_cooling', label: 'Sensible Heating / Cooling' },
  { value: 'cooling_dehumidification', label: 'Cooling & Dehumidification' },
  { value: 'evaporative_cooling', label: 'Evaporative Cooling' },
  { value: 'mixing', label: 'Mixing of Two Airstreams' },
];

// ── SingleProcessForm ────────────────────────────────────────────────

interface SingleProcessFormProps {
  lockedStartPoint: ProcessPoint | null;
  slotIndex: number;
  onPlotted: (process: ChartProcess) => void;
}

function SingleProcessForm({ lockedStartPoint, slotIndex, onPlotted }: SingleProcessFormProps) {
  const pressurePa = useChartDataStore((s) => s.pressurePa);
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
  const [flowRate, setFlowRate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentColor, setCurrentColor] = useState(PROCESS_CHAIN_COLORS[slotIndex]);

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
    setFlowRate('');
  }

  function handleProcessTypeChange(value: string) {
    setProcessType(value as ProcessType);
    resetInputs();
  }

  // Returns start temp/rh — either from locked point or form inputs
  function getStartState(): { temp: number; rh: number } | null {
    if (lockedStartPoint) {
      return { temp: lockedStartPoint.temperature, rh: lockedStartPoint.relative_humidity };
    }
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

  function buildId() {
    return typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function getParsedFlowRate(): number | undefined {
    const v = parseFloat(flowRate);
    return isNaN(v) || v <= 0 ? undefined : v;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (processType === 'sensible_heating_cooling') {
      await submitSensible();
    } else if (processType === 'cooling_dehumidification') {
      await submitCoolingDehumid();
    } else if (processType === 'evaporative_cooling') {
      await submitEvaporative();
    } else if (processType === 'mixing') {
      await submitMixing();
    }
  }

  async function submitSensible() {
    const start = getStartState();
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
        pressure_pa: pressurePa,
      });
      const inputs: ProcessInputSnapshot = {
        process_type: 'sensible_heating_cooling',
        temperature: start.temp,
        humidity: start.rh,
        target_temperature: targetTemp,
      };
      onPlotted({ id: buildId(), color: currentColor, flowRate: getParsedFlowRate(), inputs, result });
      const direction = targetTemp > start.temp ? 'Heating' : 'Cooling';
      toast.success(`Sensible ${direction}: ${start.temp}°C → ${targetTemp}°C`);
      resetInputs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate process');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCoolingDehumid() {
    const start = getStartState();
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
        pressure_pa: pressurePa,
      });
      const inputs: ProcessInputSnapshot = {
        process_type: 'cooling_dehumidification',
        temperature: start.temp,
        humidity: start.rh,
        adp_temperature: adpTemp,
        bypass_factor: bf,
      };
      onPlotted({ id: buildId(), color: currentColor, flowRate: getParsedFlowRate(), inputs, result });
      toast.success(`Cooling & Dehumidification: ${start.temp}°C → ${result.end_point.temperature.toFixed(1)}°C`);
      resetInputs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate process');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitEvaporative() {
    const start = getStartState();
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
        pressure_pa: pressurePa,
      });
      const inputs: ProcessInputSnapshot = {
        process_type: 'evaporative_cooling',
        temperature: start.temp,
        humidity: start.rh,
        target_rh: tRh,
      };
      onPlotted({ id: buildId(), color: currentColor, flowRate: getParsedFlowRate(), inputs, result });
      toast.success(`Evaporative Cooling: ${start.temp}°C/${start.rh}% → ${result.end_point.temperature.toFixed(1)}°C/${tRh}%`);
      resetInputs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate process');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMixing() {
    // Stream 1 always comes from lockedStartPoint if chained
    const t1 = lockedStartPoint ? lockedStartPoint.temperature : parseFloat(temperature);
    const rh1 = lockedStartPoint ? lockedStartPoint.relative_humidity : parseFloat(humidity);
    const t2 = parseFloat(temperature2);
    const rh2 = parseFloat(humidity2);
    const r = parseFloat(ratio);

    if (!lockedStartPoint) {
      if (isNaN(t1) || t1 < -10 || t1 > 50) {
        toast.error('Stream 1 temperature must be between -10°C and 50°C');
        return;
      }
      if (isNaN(rh1) || rh1 < 0 || rh1 > 100) {
        toast.error('Stream 1 RH must be between 0% and 100%');
        return;
      }
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
        pressure_pa: pressurePa,
      });
      const inputs: ProcessInputSnapshot = {
        process_type: 'mixing',
        temperature_1: t1,
        humidity_1: rh1,
        temperature_2: t2,
        humidity_2: rh2,
        ratio: r,
      };
      onPlotted({ id: buildId(), color: currentColor, flowRate: getParsedFlowRate(), inputs, result });
      const mixT = result.mix_point?.temperature.toFixed(1) ?? '?';
      toast.success(`Mixing: T_mix = ${mixT}°C (ratio ${r})`);
      resetInputs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate process');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isChained = lockedStartPoint !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Color swatch */}
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: currentColor }} />
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            title="Process color"
          />
        </div>
        <Label className="text-xs text-muted-foreground">Process color</Label>
      </div>

      {/* Process type selector */}
      <div className="space-y-1">
        <Label htmlFor={`proc-type-${slotIndex}`}>Process Type</Label>
        <select
          id={`proc-type-${slotIndex}`}
          value={processType}
          onChange={(e) => handleProcessTypeChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {PROCESS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Locked start display or free start inputs */}
      {isChained && processType !== 'mixing' && (
        <div className="rounded bg-muted/50 px-2 py-1.5 font-mono text-xs text-muted-foreground">
          Start (locked): {lockedStartPoint.temperature.toFixed(1)}°C / {lockedStartPoint.relative_humidity.toFixed(1)}% RH
        </div>
      )}

      {!isChained && processType !== 'mixing' && (
        <>
          <div className="space-y-1">
            <Label htmlFor={`proc-temp-${slotIndex}`}>Start Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
            <Input id={`proc-temp-${slotIndex}`} type="number" step="any" min={-10} max={50}
              value={temperature} onChange={(e) => setTemperature(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`proc-rh-${slotIndex}`}>Start RH <span className="font-mono text-muted-foreground">(%)</span></Label>
            <Input id={`proc-rh-${slotIndex}`} type="number" step="any" min={0} max={100}
              value={humidity} onChange={(e) => setHumidity(e.target.value)} className="font-mono" />
          </div>
        </>
      )}

      {/* Sensible Heating/Cooling */}
      {processType === 'sensible_heating_cooling' && (
        <div className="space-y-1">
          <Label htmlFor={`proc-target-temp-${slotIndex}`}>Target Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
          <Input id={`proc-target-temp-${slotIndex}`} type="number" step="any" min={-10} max={50}
            value={targetTemperature} onChange={(e) => setTargetTemperature(e.target.value)} className="font-mono" />
        </div>
      )}

      {/* Cooling & Dehumidification */}
      {processType === 'cooling_dehumidification' && (
        <>
          <div className="space-y-1">
            <Label htmlFor={`proc-adp-${slotIndex}`}>ADP Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
            <Input id={`proc-adp-${slotIndex}`} type="number" step="any" min={-10} max={50}
              value={adpTemperature} onChange={(e) => setAdpTemperature(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`proc-bf-${slotIndex}`}>Bypass Factor <span className="font-mono text-muted-foreground">(0–1)</span></Label>
            <Input id={`proc-bf-${slotIndex}`} type="number" step="0.01" min={0.01} max={0.99}
              value={bypassFactor} onChange={(e) => setBypassFactor(e.target.value)} className="font-mono" />
          </div>
        </>
      )}

      {/* Evaporative Cooling */}
      {processType === 'evaporative_cooling' && (
        <div className="space-y-1">
          <Label htmlFor={`proc-target-rh-${slotIndex}`}>Target RH <span className="font-mono text-muted-foreground">(%)</span></Label>
          <Input id={`proc-target-rh-${slotIndex}`} type="number" step="any" min={1} max={100}
            value={targetRh} onChange={(e) => setTargetRh(e.target.value)} className="font-mono" />
        </div>
      )}

      {/* Mixing */}
      {processType === 'mixing' && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Stream 1</p>
            {isChained ? (
              <div className="rounded bg-muted/50 px-2 py-1.5 font-mono text-xs text-muted-foreground">
                Locked: {lockedStartPoint.temperature.toFixed(1)}°C / {lockedStartPoint.relative_humidity.toFixed(1)}% RH
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor={`proc-t1-${slotIndex}`}>Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
                  <Input id={`proc-t1-${slotIndex}`} type="number" step="any" min={-10} max={50}
                    value={temperature} onChange={(e) => setTemperature(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`proc-rh1-${slotIndex}`}>RH <span className="font-mono text-muted-foreground">(%)</span></Label>
                  <Input id={`proc-rh1-${slotIndex}`} type="number" step="any" min={0} max={100}
                    value={humidity} onChange={(e) => setHumidity(e.target.value)} className="font-mono" />
                </div>
              </>
            )}
          </div>
          <div className="space-y-2 border-t border-foreground/[0.06] pt-3">
            <p className="text-xs font-medium text-muted-foreground">Stream 2</p>
            <div className="space-y-1">
              <Label htmlFor={`proc-t2-${slotIndex}`}>Temperature <span className="font-mono text-muted-foreground">(°C)</span></Label>
              <Input id={`proc-t2-${slotIndex}`} type="number" step="any" min={-10} max={50}
                value={temperature2} onChange={(e) => setTemperature2(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`proc-rh2-${slotIndex}`}>RH <span className="font-mono text-muted-foreground">(%)</span></Label>
              <Input id={`proc-rh2-${slotIndex}`} type="number" step="any" min={0} max={100}
                value={humidity2} onChange={(e) => setHumidity2(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="space-y-2 border-t border-foreground/[0.06] pt-3">
            <p className="text-xs font-medium text-muted-foreground">Mix Ratio</p>
            <div className="space-y-1">
              <Label htmlFor={`proc-ratio-${slotIndex}`}>m₁ / (m₁ + m₂) <span className="font-mono text-muted-foreground">(0–1)</span></Label>
              <Input id={`proc-ratio-${slotIndex}`} type="number" step="0.01" min={0.01} max={0.99}
                value={ratio} onChange={(e) => setRatio(e.target.value)} className="font-mono" />
            </div>
          </div>
        </>
      )}

      <div className="space-y-1 border-t border-foreground/[0.06] pt-3">
        <Label htmlFor={`proc-flow-${slotIndex}`}>
          Flow Rate <span className="font-mono text-muted-foreground">(L/s, optional)</span>
        </Label>
        <Input
          id={`proc-flow-${slotIndex}`}
          type="number"
          step="any"
          min={0}
          value={flowRate}
          onChange={(e) => setFlowRate(e.target.value)}
          className="font-mono"
          placeholder="e.g. 500"
        />
        <p className="text-[10px] text-muted-foreground">
          Volumetric flow at the entering state of this process.
        </p>
      </div>

      <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
        {isSubmitting ? 'Calculating…' : slotIndex === 0 ? 'Plot Process' : 'Continue Process'}
      </Button>
    </form>
  );
}

// ── ProcessChainPanel ────────────────────────────────────────────────

export default function ProcessChainPanel() {
  const processes = useChartDataStore((s) => s.processes);
  const addProcess = useChartDataStore((s) => s.addProcess);
  const removeProcess = useChartDataStore((s) => s.removeProcess);
  const clearProcesses = useChartDataStore((s) => s.clearProcesses);
  const updateProcessColor = useChartDataStore((s) => s.updateProcessColor);

  const [openCards, setOpenCards] = useState<boolean[]>([]);

  function toggleCard(i: number) {
    setOpenCards((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  function handlePlotted(proc: ChartProcess) {
    addProcess(proc);
    setOpenCards((prev) => prev.map(() => false));
  }

  function handleDelete(id: string) {
    removeProcess(id);
    setOpenCards((c) => c.slice(0, -1));
  }

  function handleClearAll() {
    clearProcesses();
    setOpenCards([]);
  }

  const lockedStartPoint = processes.length > 0 ? processes[processes.length - 1].result.end_point : null;

  return (
    <div className="space-y-2">
      {processes.map((proc, i) => (
        <ProcessCard
          key={proc.id}
          process={proc}
          index={i}
          isLast={i === processes.length - 1}
          open={openCards[i] ?? false}
          onToggle={() => toggleCard(i)}
          onDelete={() => handleDelete(proc.id)}
          onColorChange={(color) => updateProcessColor(proc.id, color)}
        />
      ))}

      {processes.length < 5 && (
        <div className="rounded-lg border border-dashed border-foreground/20 p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {processes.length === 0 ? 'Process 1' : `Continue: Process ${processes.length + 1}`}
          </p>
          <SingleProcessForm
            key={processes.length}
            lockedStartPoint={lockedStartPoint}
            slotIndex={processes.length}
            onPlotted={handlePlotted}
          />
        </div>
      )}

      {processes.length === 5 && (
        <p className="text-center text-xs text-muted-foreground">Chain complete (5/5)</p>
      )}

      {processes.length > 0 && (
        <Button
          variant="ghost"
          className="w-full text-destructive/70 hover:text-destructive"
          onClick={handleClearAll}
        >
          Clear All Processes
        </Button>
      )}
    </div>
  );
}
