import { useShallow } from 'zustand/react/shallow';
import { useChartDataStore } from '@/stores/chartDataStore';
import type { ChartThemeName } from '@/lib/constants';

const THEMES: { id: ChartThemeName; label: string; description: string }[] = [
  { id: 'default',    label: 'Default',    description: 'Teal & brown'        },
  { id: 'monochrome', label: 'Monochrome', description: 'Greyscale / print'   },
  { id: 'blueprint',  label: 'Blueprint',  description: 'Navy background'     },
  { id: 'vivid',      label: 'Vivid',      description: 'High contrast'       },
];

export default function DisplaySettingsForm() {
  const { displaySettings, setDisplaySettings } = useChartDataStore(
    useShallow((s) => ({ displaySettings: s.displaySettings, setDisplaySettings: s.setDisplaySettings }))
  );

  return (
    <div className="space-y-4">
      {/* Line toggles */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Overlay Lines</p>
        {[
          { key: 'showRhLines'       as const, label: 'Relative Humidity Lines' },
          { key: 'showEnthalpyLines' as const, label: 'Enthalpy Lines'          },
        ].map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={displaySettings[key]}
              onChange={(e) => setDisplaySettings({ [key]: e.target.checked })}
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--section-display)]"
            />
            <span className="text-sm text-foreground">{label}</span>
          </label>
        ))}
      </div>

      {/* Theme selector */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Chart Theme</p>
        <div className="grid grid-cols-2 gap-1.5">
          {THEMES.map(({ id, label, description }) => {
            const isActive = displaySettings.chartTheme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDisplaySettings({ chartTheme: id })}
                className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                  isActive
                    ? 'border-[var(--section-display)] bg-[color-mix(in_oklch,var(--section-display)_12%,transparent)]'
                    : 'border-border bg-muted/40 hover:bg-muted'
                }`}
              >
                <p className={`text-xs font-semibold ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>{label}</p>
                <p className="text-[10px] text-muted-foreground">{description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
