import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useChartDataStore } from '@/stores/chartDataStore';
import { calculateDesignZone } from '@/lib/api';
import { DEFAULT_DESIGN_ZONE } from '@/lib/constants';
import { toast } from 'sonner';

export default function DesignZoneModal() {
  const designZone = useChartDataStore((s) => s.designZone);
  const setDesignZone = useChartDataStore((s) => s.setDesignZone);

  const [open, setOpen] = useState(false);
  const [minTemp, setMinTemp] = useState(String(designZone?.minTemp ?? DEFAULT_DESIGN_ZONE.minTemp));
  const [maxTemp, setMaxTemp] = useState(String(designZone?.maxTemp ?? DEFAULT_DESIGN_ZONE.maxTemp));
  const [minRH, setMinRH] = useState(String(designZone?.minRH ?? DEFAULT_DESIGN_ZONE.minRH));
  const [maxRH, setMaxRH] = useState(String(designZone?.maxRH ?? DEFAULT_DESIGN_ZONE.maxRH));
  const [isApplying, setIsApplying] = useState(false);

  const enabled = designZone?.enabled ?? false;

  async function handleApply() {
    const config = {
      min_temp: parseFloat(minTemp),
      max_temp: parseFloat(maxTemp),
      min_rh: parseFloat(minRH),
      max_rh: parseFloat(maxRH),
    };

    if (isNaN(config.min_temp) || isNaN(config.max_temp) || isNaN(config.min_rh) || isNaN(config.max_rh)) {
      toast.error('All fields must be valid numbers');
      return;
    }
    if (config.min_temp >= config.max_temp) {
      toast.error('Min temperature must be less than max temperature');
      return;
    }
    if (config.min_rh >= config.max_rh) {
      toast.error('Min RH must be less than max RH');
      return;
    }

    setIsApplying(true);
    try {
      const result = await calculateDesignZone(config);
      setDesignZone({
        enabled: true,
        minTemp: config.min_temp,
        maxTemp: config.max_temp,
        minRH: config.min_rh,
        maxRH: config.max_rh,
        polygon: result.polygon,
      });
      toast.success('Design zone applied');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate design zone');
    } finally {
      setIsApplying(false);
    }
  }

  function handleToggle(checked: boolean) {
    if (designZone) {
      setDesignZone({ ...designZone, enabled: checked });
    } else if (checked) {
      setOpen(true);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="design-zone-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
          <Label htmlFor="design-zone-toggle">Show</Label>
        </div>
        <DialogTrigger render={
          <Button variant="outline" size="sm" />
        }>
          Configure
        </DialogTrigger>
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Design Zone Configuration</DialogTitle>
          <DialogDescription>
            Set temperature and humidity bounds for the design zone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="min-temp">Min Temp <span className="font-mono text-muted-foreground">(°C)</span></Label>
            <Input id="min-temp" type="number" step="any" value={minTemp} onChange={(e) => setMinTemp(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-temp">Max Temp <span className="font-mono text-muted-foreground">(°C)</span></Label>
            <Input id="max-temp" type="number" step="any" value={maxTemp} onChange={(e) => setMaxTemp(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min-rh">Min RH <span className="font-mono text-muted-foreground">(%)</span></Label>
            <Input id="min-rh" type="number" step="any" value={minRH} onChange={(e) => setMinRH(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-rh">Max RH <span className="font-mono text-muted-foreground">(%)</span></Label>
            <Input id="max-rh" type="number" step="any" value={maxRH} onChange={(e) => setMaxRH(e.target.value)} className="font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={isApplying}>
            {isApplying ? 'Applying…' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
