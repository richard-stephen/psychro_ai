import { useState } from 'react';
import ManualPointForm from '@/components/forms/ManualPointForm';
import ProcessChainPanel from '@/components/forms/ProcessChainPanel';
import FileUploadForm from '@/components/forms/FileUploadForm';
import DesignZoneModal from '@/components/chart/DesignZoneModal';
import DisplaySettingsForm from '@/components/forms/DisplaySettingsForm';
import { useChartDataStore } from '@/stores/chartDataStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Crosshair, ArrowRightLeft, BoxSelect, FileUp, SlidersHorizontal, ChevronDown, Download } from 'lucide-react';
import { exportPng, exportPdf } from '@/lib/chartExport';

const STORAGE_KEY = 'psychro-sidebar-open';

function loadOpenState(): [boolean, boolean, boolean, boolean] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [true, false, false, false];
}

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
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  colorVar: string;
  open: boolean;
  className?: string;
}) {
  return (
    <div
      className={`border-b border-foreground/[0.06] px-3 py-2 ${open ? '' : 'border-b-0'} ${className}`}
      style={{ backgroundColor: `color-mix(in oklch, var(${colorVar}) 12%, transparent)` }}
    >
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" style={{ color: `var(${colorVar})` }} />}
        <span className="flex-1">{children}</span>
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

export default function Sidebar() {
  const clearData = useChartDataStore((s) => s.clearData);
  const [openPanels, setOpenPanels] = useState<[boolean, boolean, boolean, boolean]>(loadOpenState);

  function toggle(index: 0 | 1 | 2 | 3) {
    setOpenPanels((prev) => {
      const next: [boolean, boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean, boolean];
      next[index] = !next[index];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <aside className="w-80 shrink-0 overflow-y-auto bg-sidebar p-5 shadow-[inset_-1px_0_0_0_var(--color-border)]">
      <div className="space-y-4">
        <SidebarCard
          borderColor="border-section-plot"
          className="animate-slide-in-left"
          open={openPanels[0]}
          onToggle={() => toggle(0)}
          header={<SectionHeader icon={Crosshair} colorVar="--section-plot" open={openPanels[0]}>Plot Point</SectionHeader>}
        >
          <div className="p-3">
            <ManualPointForm />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-process"
          className="animate-slide-in-left delay-75"
          open={openPanels[1]}
          onToggle={() => toggle(1)}
          header={<SectionHeader icon={ArrowRightLeft} colorVar="--section-process" open={openPanels[1]}>Process</SectionHeader>}
        >
          <div className="p-3">
            <ProcessChainPanel />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-zone"
          className="animate-slide-in-left delay-100"
          open={openPanels[2]}
          onToggle={() => toggle(2)}
          header={<SectionHeader icon={BoxSelect} colorVar="--section-zone" open={openPanels[2]}>Design Zone</SectionHeader>}
        >
          <div className="p-3">
            <DesignZoneModal />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-upload"
          className="animate-slide-in-left delay-200"
          open={openPanels[3]}
          onToggle={() => toggle(3)}
          header={<SectionHeader icon={FileUp} colorVar="--section-upload" open={openPanels[3]}>Upload Data</SectionHeader>}
        >
          <div className="p-3">
            <FileUploadForm />
          </div>
        </SidebarCard>

        <div className="animate-slide-in-left delay-300 pt-1">
          <ExportDropdown />
        </div>

        <div className="animate-slide-in-left delay-[350ms] pt-1 flex gap-2">
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 border-section-display text-muted-foreground hover:text-foreground"
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

          <Button
            variant="ghost"
            className="animate-subtle-shake flex-1 border-l-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={clearData}
          >
            Clear Data
          </Button>
        </div>
      </div>
    </aside>
  );
}
