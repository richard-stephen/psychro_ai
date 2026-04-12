import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { ChartProcess, ProcessInputSnapshot } from '@/lib/types';
import { calcSpecificVolume, formatHeatDuty } from '@/lib/psychrometrics';
import { useChartDataStore } from '@/stores/chartDataStore';

const PROCESS_TYPE_LABELS: Record<string, string> = {
  sensible_heating_cooling: 'Sensible Heating / Cooling',
  cooling_dehumidification: 'Cooling & Dehumidification',
  evaporative_cooling: 'Evaporative Cooling',
  mixing: 'Mixing of Two Airstreams',
};

function InputsSummary({ inputs, index }: { inputs: ProcessInputSnapshot; index: number }) {
  if (inputs.process_type === 'sensible_heating_cooling') {
    const startLabel = index > 0
      ? `Start (from P${index}): ${inputs.temperature.toFixed(1)}°C / ${inputs.humidity.toFixed(1)}% RH`
      : `Start: ${inputs.temperature.toFixed(1)}°C / ${inputs.humidity.toFixed(1)}% RH`;
    return (
      <div className="space-y-0.5 font-mono text-xs text-muted-foreground">
        <div>{startLabel}</div>
        <div>Target T: {inputs.target_temperature.toFixed(1)}°C</div>
      </div>
    );
  }

  if (inputs.process_type === 'cooling_dehumidification') {
    const startLabel = index > 0
      ? `Start (from P${index}): ${inputs.temperature.toFixed(1)}°C / ${inputs.humidity.toFixed(1)}% RH`
      : `Start: ${inputs.temperature.toFixed(1)}°C / ${inputs.humidity.toFixed(1)}% RH`;
    return (
      <div className="space-y-0.5 font-mono text-xs text-muted-foreground">
        <div>{startLabel}</div>
        <div>ADP: {inputs.adp_temperature.toFixed(1)}°C  BF: {inputs.bypass_factor.toFixed(2)}</div>
      </div>
    );
  }

  if (inputs.process_type === 'evaporative_cooling') {
    const startLabel = index > 0
      ? `Start (from P${index}): ${inputs.temperature.toFixed(1)}°C / ${inputs.humidity.toFixed(1)}% RH`
      : `Start: ${inputs.temperature.toFixed(1)}°C / ${inputs.humidity.toFixed(1)}% RH`;
    return (
      <div className="space-y-0.5 font-mono text-xs text-muted-foreground">
        <div>{startLabel}</div>
        <div>Target RH: {inputs.target_rh.toFixed(1)}%</div>
      </div>
    );
  }

  // mixing
  return (
    <div className="space-y-0.5 font-mono text-xs text-muted-foreground">
      <div>Stream 1: {inputs.temperature_1.toFixed(1)}°C / {inputs.humidity_1.toFixed(1)}% RH</div>
      <div>Stream 2: {inputs.temperature_2.toFixed(1)}°C / {inputs.humidity_2.toFixed(1)}% RH</div>
      <div>Ratio (S1): {(inputs.ratio * 100).toFixed(0)}%</div>
    </div>
  );
}

interface ProcessCardProps {
  process: ChartProcess;
  index: number;
  isLast: boolean;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
}

export default function ProcessCard({
  process,
  index,
  isLast,
  open,
  onToggle,
  onDelete,
  onColorChange,
}: ProcessCardProps) {
  const pressurePa = useChartDataStore((s) => s.pressurePa);
  const { result, color, inputs } = process;
  const label = PROCESS_TYPE_LABELS[result.process_type];
  const end = result.end_point;

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2"
        onClick={onToggle}
      >
        {/* Color dot / picker */}
        <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            title="Change process color"
          />
        </div>

        <span className="text-xs font-semibold text-muted-foreground">P{index + 1}</span>
        <span className="flex-1 truncate text-xs font-medium">{label}</span>

        {isLast && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex-shrink-0 text-muted-foreground/50 hover:text-destructive"
            title="Remove process"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        {open ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-border px-3 py-2 space-y-2">
          <InputsSummary inputs={inputs} index={index} />

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-xs">
            <span className="text-muted-foreground">End T</span>
            <span>{end.temperature.toFixed(1)}°C</span>
            <span className="text-muted-foreground">End RH</span>
            <span>{end.relative_humidity.toFixed(1)}%</span>
            <span className="text-muted-foreground">W</span>
            <span>{(end.humidity_ratio * 1000).toFixed(1)} g/kg</span>
            <span className="text-muted-foreground">h</span>
            <span>{end.enthalpy.toFixed(1)} kJ/kg</span>
            <span className="text-muted-foreground">Δh</span>
            <span>{result.delta_enthalpy.toFixed(1)} kJ/kg</span>
            {process.flowRate != null && result.process_type !== 'mixing' && (() => {
              const v = calcSpecificVolume(result.start_point.temperature, result.start_point.humidity_ratio, pressurePa);
              const mDa = (process.flowRate / 1000) / v;
              const qDot = result.delta_enthalpy * mDa;
              return (
                <>
                  <span className="text-muted-foreground">V̇</span>
                  <span>{process.flowRate.toFixed(0)} L/s</span>
                  <span className="text-muted-foreground">ρ dry air</span>
                  <span>{(1 / v).toFixed(2)} kg/m³</span>
                  <span className="text-muted-foreground">Q̇</span>
                  <span>{formatHeatDuty(qDot)} kW</span>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
