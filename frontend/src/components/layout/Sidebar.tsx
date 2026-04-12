import { useState } from 'react';
import ManualPointForm from '@/components/forms/ManualPointForm';
import ProcessChainPanel from '@/components/forms/ProcessChainPanel';
import FileUploadForm from '@/components/forms/FileUploadForm';
import DesignZoneModal from '@/components/chart/DesignZoneModal';
import DisplaySettingsForm from '@/components/forms/DisplaySettingsForm';
import { useChartDataStore } from '@/stores/chartDataStore';
import { calculateProcess, calculateDesignZone } from '@/lib/api';
import { altitudeToPressure } from '@/lib/psychrometrics';
import type { ChartProcess } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Crosshair, ArrowRightLeft, BoxSelect, FileUp, SlidersHorizontal, ChevronDown, Download, Mountain } from 'lucide-react';
import { exportPng, exportPdf } from '@/lib/chartExport';
import { toast } from 'sonner';

const STORAGE_KEY = 'psychro-sidebar-open';

function loadOpenState(): [boolean, boolean, boolean, boolean, boolean] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate from old 4-tuple if needed
      if (parsed.length === 4) return [false, ...parsed] as [boolean, boolean, boolean, boolean, boolean];
      if (parsed.length === 5) return parsed;
    }
  } catch {}
  return [false, true, false, false, false];
}

// ── Altitude preset definitions ────────────────────────────────────────

const ALTITUDE_PRESETS = [
  { label: 'Sea Level', value: 0 },
  { label: '500 m', value: 500 },
  { label: '1000 m', value: 1000 },
  { label: '1609 m (Denver)', value: 1609 },
  { label: '2250 m (Mexico City)', value: 2250 },
  { label: '3640 m (La Paz)', value: 3640 },
] as const;

// ── Process chain recalculation ────────────────────────────────────────

async function recalcProcessChain(
  processes: ChartProcess[],
  pressurePa: number,
): Promise<ChartProcess[]> {
  const out: ChartProcess[] = [];
  for (let i = 0; i < processes.length; i++) {
    const proc = processes[i];
    const prevEnd = i > 0 ? out[i - 1].result.end_point : null;

    // For chained processes, update start state to match the previous recalculated end
    let inputs = proc.inputs;
    if (prevEnd) {
      if (inputs.process_type === 'mixing') {
        inputs = { ...inputs, temperature_1: prevEnd.temperature, humidity_1: prevEnd.relative_humidity };
      } else {
        inputs = { ...inputs, temperature: prevEnd.temperature, humidity: prevEnd.relative_humidity };
      }
    }

    const result = await calculateProcess({ ...inputs, pressure_pa: pressurePa });
    out.push({ ...proc, inputs, result });
  }
  return out;
}

// ── Altitude selector form ─────────────────────────────────────────────

function AltitudeSelectorForm() {
  const altitudeM = useChartDataStore((s) => s.altitudeM);
  const pressurePa = useChartDataStore((s) => s.pressurePa);
  const processes = useChartDataStore((s) => s.processes);
  const designZone = useChartDataStore((s) => s.designZone);
  const isRecalculating = useChartDataStore((s) => s.isRecalculating);
  const setAltitude = useChartDataStore((s) => s.setAltitude);
  const setProcesses = useChartDataStore((s) => s.setProcesses);
  const setDesignZone = useChartDataStore((s) => s.setDesignZone);
  const setRecalculating = useChartDataStore((s) => s.setRecalculating);

  const [localAltitude, setLocalAltitude] = useState(String(altitudeM));

  // Pressure preview based on whatever is currently in the input
  const previewPressure = (() => {
    const v = parseFloat(localAltitude);
    if (!isNaN(v) && v >= -500 && v <= 5000) return altitudeToPressure(v);
    return null;
  })();

  const parsedLocal = parseFloat(localAltitude);
  const isValid = !isNaN(parsedLocal) && parsedLocal >= -500 && parsedLocal <= 5000;
  const isDirty = isValid && parsedLocal !== altitudeM;

  async function applyAltitude(newAltitudeM: number) {
    const newPressurePa = altitudeToPressure(newAltitudeM);
    setAltitude(newAltitudeM);                // chart re-fetches via PsychrometricChart useEffect
    setLocalAltitude(String(newAltitudeM));

    const hasProcesses = processes.length > 0;
    const hasZone = designZone?.enabled && designZone.polygon != null;

    if (!hasProcesses && !hasZone) return;

    setRecalculating(true);
    try {
      if (hasProcesses) {
        const recalculated = await recalcProcessChain(processes, newPressurePa);
        setProcesses(recalculated);
      }

      if (hasZone && designZone) {
        const zoneResult = await calculateDesignZone({
          min_temp: designZone.minTemp,
          max_temp: designZone.maxTemp,
          min_rh: designZone.minRH,
          max_rh: designZone.maxRH,
          pressure_pa: newPressurePa,
        });
        setDesignZone({ ...designZone, polygon: zoneResult.polygon });
      }
    } catch {
      toast.error('Some items could not be recalculated at the new altitude.');
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="space-y-3 p-3">
      {/* Altitude input */}
      <div className="space-y-1">
        <Label htmlFor="altitude-input">
          Altitude <span className="font-mono text-muted-foreground">(m)</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="altitude-input"
            type="number"
            step="1"
            min={-500}
            max={5000}
            value={localAltitude}
            onChange={(e) => setLocalAltitude(e.target.value)}
            className="font-mono"
            placeholder="0"
            disabled={isRecalculating}
          />
          <Button
            size="sm"
            className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!isDirty || isRecalculating}
            onClick={() => { if (isValid) applyAltitude(parsedLocal); }}
          >
            {isRecalculating ? 'Recalc…' : 'Apply'}
          </Button>
        </div>
        {/* Live pressure preview */}
        <p className="font-mono text-[10px] text-muted-foreground">
          {previewPressure != null
            ? `≈ ${(previewPressure / 1000).toFixed(3)} kPa${previewPressure !== pressurePa ? ' (pending)' : ''}`
            : 'Enter altitude between −500 and 5000 m'}
        </p>
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {ALTITUDE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            disabled={isRecalculating}
            onClick={() => applyAltitude(preset.value)}
            className={[
              'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
              altitudeM === preset.value
                ? 'border-section-altitude bg-section-altitude/10 text-section-altitude'
                : 'border-foreground/20 text-muted-foreground hover:border-section-altitude/50 hover:text-foreground',
              isRecalculating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            ].join(' ')}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Recalculation note */}
      {(processes.length > 0 || designZone?.enabled) && (
        <p className="text-[10px] text-muted-foreground">
          Changing altitude recalculates all plotted processes{designZone?.enabled ? ' and design zone' : ''}.
        </p>
      )}
    </div>
  );
}

// ── Sidebar shell components ───────────────────────────────────────────

function SidebarCard({
  children,
  borderColor,
  className = '',
  open,
  onToggle,
  header,
}: {
  children: React.ReactNode;
  borderColor: string;
  className?: string;
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border-l-[3px] bg-card ring-1 ring-foreground/[0.06] ${borderColor} ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-expanded={open}
      >
        {header}
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  children,
  icon: Icon,
  colorVar,
  open,
  className = '',
  badge,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  colorVar: string;
  open: boolean;
  className?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className={`border-b border-foreground/[0.06] px-3 py-2 ${open ? '' : 'border-b-0'} ${className}`}
      style={{ backgroundColor: `color-mix(in oklch, var(${colorVar}) 12%, transparent)` }}
    >
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" style={{ color: `var(${colorVar})` }} />}
        <span className="flex-1">{children}</span>
        {badge}
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </h2>
    </div>
  );
}

function ExportDropdown() {
  const [open, setOpen] = useState(false);

  async function handleExport(format: 'png' | 'pdf') {
    setOpen(false);
    if (format === 'png') {
      await exportPng();
    } else {
      await exportPdf();
    }
  }

  return (
    <div className="relative w-full">
      <Button
        variant="outline"
        className="w-full gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown
          className="ml-auto h-3.5 w-3.5 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-lg border border-border bg-background shadow-md ring-1 ring-foreground/[0.06]">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
              onClick={() => handleExport('png')}
            >
              PNG Image
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
              onClick={() => handleExport('pdf')}
            >
              PDF Document
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────

export default function Sidebar() {
  const altitudeM = useChartDataStore((s) => s.altitudeM);
  const pressurePa = useChartDataStore((s) => s.pressurePa);
  const [openPanels, setOpenPanels] = useState<[boolean, boolean, boolean, boolean, boolean]>(loadOpenState);

  function toggle(index: 0 | 1 | 2 | 3 | 4) {
    setOpenPanels((prev) => {
      const next: [boolean, boolean, boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean, boolean, boolean];
      next[index] = !next[index];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Altitude badge: show pressure when non-sea-level
  const altitudeBadge = altitudeM !== 0 ? (
    <span className="font-mono text-[9px] normal-case tracking-normal"
      style={{ color: 'var(--section-altitude)' }}>
      {altitudeM} m · {(pressurePa / 1000).toFixed(1)} kPa
    </span>
  ) : undefined;

  return (
    <aside className="w-80 shrink-0 overflow-y-auto bg-sidebar p-5 shadow-[inset_-1px_0_0_0_var(--color-border)]">
      <div className="space-y-4">
        <SidebarCard
          borderColor="border-section-altitude"
          className="animate-slide-in-left"
          open={openPanels[0]}
          onToggle={() => toggle(0)}
          header={
            <SectionHeader
              icon={Mountain}
              colorVar="--section-altitude"
              open={openPanels[0]}
              badge={altitudeBadge}
            >
              Altitude
            </SectionHeader>
          }
        >
          <AltitudeSelectorForm />
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-plot"
          className="animate-slide-in-left delay-75"
          open={openPanels[1]}
          onToggle={() => toggle(1)}
          header={<SectionHeader icon={Crosshair} colorVar="--section-plot" open={openPanels[1]}>Plot Point</SectionHeader>}
        >
          <div className="p-3">
            <ManualPointForm />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-process"
          className="animate-slide-in-left delay-100"
          open={openPanels[2]}
          onToggle={() => toggle(2)}
          header={<SectionHeader icon={ArrowRightLeft} colorVar="--section-process" open={openPanels[2]}>Process</SectionHeader>}
        >
          <div className="p-3">
            <ProcessChainPanel />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-zone"
          className="animate-slide-in-left delay-200"
          open={openPanels[3]}
          onToggle={() => toggle(3)}
          header={<SectionHeader icon={BoxSelect} colorVar="--section-zone" open={openPanels[3]}>Design Zone</SectionHeader>}
        >
          <div className="p-3">
            <DesignZoneModal />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-upload"
          className="animate-slide-in-left delay-300"
          open={openPanels[4]}
          onToggle={() => toggle(4)}
          header={<SectionHeader icon={FileUp} colorVar="--section-upload" open={openPanels[4]}>Upload Data</SectionHeader>}
        >
          <div className="p-3">
            <FileUploadForm />
          </div>
        </SidebarCard>

        <div className="animate-slide-in-left delay-[400ms] pt-1">
          <ExportDropdown />
        </div>

        <div className="animate-slide-in-left delay-[450ms] pt-1">
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full gap-1.5 border-section-display text-muted-foreground hover:text-foreground"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: 'var(--section-display)' }} />
                  Display
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Display Settings</DialogTitle>
              </DialogHeader>
              <DisplaySettingsForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </aside>
  );
}
