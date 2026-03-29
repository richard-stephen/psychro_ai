import ManualPointForm from '@/components/forms/ManualPointForm';
import ProcessForm from '@/components/forms/ProcessForm';
import FileUploadForm from '@/components/forms/FileUploadForm';
import DesignZoneModal from '@/components/chart/DesignZoneModal';
import DisplaySettingsForm from '@/components/forms/DisplaySettingsForm';
import { useChartDataStore } from '@/stores/chartDataStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Crosshair, ArrowRightLeft, BoxSelect, FileUp, SlidersHorizontal } from 'lucide-react';

function SidebarCard({
  children,
  borderColor,
  className = '',
}: {
  children: React.ReactNode;
  borderColor: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border-l-[3px] bg-card ring-1 ring-foreground/[0.06] ${borderColor} ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  children,
  icon: Icon,
  colorVar,
  className = '',
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  colorVar: string;
  className?: string;
}) {
  return (
    <div
      className={`border-b border-foreground/[0.06] px-3 py-2 ${className}`}
      style={{ backgroundColor: `color-mix(in oklch, var(${colorVar}) 12%, transparent)` }}
    >
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" style={{ color: `var(${colorVar})` }} />}
        {children}
      </h2>
    </div>
  );
}

export default function Sidebar() {
  const clearData = useChartDataStore((s) => s.clearData);

  return (
    <aside className="w-80 shrink-0 overflow-y-auto bg-sidebar p-5 shadow-[inset_-1px_0_0_0_var(--color-border)]">
      <div className="space-y-4">
        <SidebarCard
          borderColor="border-section-plot"
          className="animate-slide-in-left"
        >
          <SectionHeader icon={Crosshair} colorVar="--section-plot">Plot Point</SectionHeader>
          <div className="p-3">
            <ManualPointForm />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-process"
          className="animate-slide-in-left delay-75"
        >
          <SectionHeader icon={ArrowRightLeft} colorVar="--section-process">Process</SectionHeader>
          <div className="p-3">
            <ProcessForm />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-zone"
          className="animate-slide-in-left delay-100"
        >
          <SectionHeader icon={BoxSelect} colorVar="--section-zone">Design Zone</SectionHeader>
          <div className="p-3">
            <DesignZoneModal />
          </div>
        </SidebarCard>

        <SidebarCard
          borderColor="border-section-upload"
          className="animate-slide-in-left delay-200"
        >
          <SectionHeader icon={FileUp} colorVar="--section-upload">Upload Data</SectionHeader>
          <div className="p-3">
            <FileUploadForm />
          </div>
        </SidebarCard>

        <div className="animate-slide-in-left delay-300 pt-1 flex gap-2">
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
