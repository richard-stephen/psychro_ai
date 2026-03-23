import ManualPointForm from '@/components/forms/ManualPointForm';
import FileUploadForm from '@/components/forms/FileUploadForm';
import DesignZoneModal from '@/components/chart/DesignZoneModal';
import { useChartDataStore } from '@/stores/chartDataStore';
import { Button } from '@/components/ui/button';

function SectionHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`mb-3 border-l-2 border-accent pl-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground ${className}`}>
      {children}
    </h2>
  );
}

export default function Sidebar() {
  const clearData = useChartDataStore((s) => s.clearData);

  return (
    <aside className="w-72 shrink-0 overflow-y-auto bg-sidebar p-5 shadow-[inset_-1px_0_0_0_var(--color-border)]">
      <div className="animate-slide-in-left">
        <SectionHeader>Plot Point</SectionHeader>
        <ManualPointForm />
      </div>
      <hr className="divider-gradient my-4" />
      <div className="animate-slide-in-left delay-100">
        <SectionHeader>Design Zone</SectionHeader>
        <DesignZoneModal />
      </div>
      <hr className="divider-gradient my-4" />
      <div className="animate-slide-in-left delay-200">
        <SectionHeader>Upload Data</SectionHeader>
        <FileUploadForm />
      </div>
      <hr className="divider-gradient my-4" />
      <div className="animate-slide-in-left delay-300">
        <Button
          variant="ghost"
          className="animate-subtle-shake w-full border-l-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={clearData}
        >
          Clear Data
        </Button>
      </div>
    </aside>
  );
}
