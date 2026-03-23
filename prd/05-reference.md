# Psychro AI — Extensibility Guide & Code to Preserve

> **Agent Rules**
> - Only use the provided context. If something is unclear or missing, ask for clarification instead of assuming.
> - Do not invent APIs, fields, or behaviors not specified in these documents.
> - Refer to CLAUDE.md for code style, run commands, and architecture constraints.
> - Complete each phase fully and verify before moving to the next.
> - When a file references another PRD file, read it before proceeding.

**Prerequisite**: Read `prd/00-overview.md` first.

---

## 9. Extensibility Guide

The architecture is designed so future features slot in without restructuring. Here are the extension patterns:

### Adding a New Chart Overlay (e.g., ASHRAE 55 Comfort Zone, Process Lines)

1. **If it needs calculation**: Add a new endpoint in `backend/app/routers/calculations.py`:
   ```python
   @router.post("/calculate/comfort-zone")
   async def calculate_comfort_zone(request: ComfortZoneRequest):
       polygon = psychrometrics.compute_comfort_zone(request.standard, request.clo, request.met)
       return {"polygon": polygon}
   ```

2. **Add request/response schemas** in `backend/app/schemas/`

3. **Add trace builder** in `frontend/src/lib/chartBuilder.ts`:
   ```typescript
   export function buildComfortZoneTrace(polygon: Polygon): PlotlyTrace {
     return { x: polygon.x, y: polygon.y, fill: 'toself', ... };
   }
   ```

4. **Add UI toggle** in `Sidebar.tsx` (checkbox + optional config modal)

5. **Add state** to `chartDataStore` for the new overlay

6. **If it should be saveable**: Add a JSON column or related table in Supabase

### Adding a New Calculation (e.g., Wet Bulb Temperature, Specific Volume)

1. **Add function** in `backend/app/services/psychrometrics.py`:
   ```python
   def calc_wet_bulb(T_db, RH_percent):
       return psy.GetTWetBulbFromRelHum(T_db, RH_percent / 100, ATMOSPHERIC_PRESSURE_PA)
   ```

2. **Add to existing point response** or create new endpoint

3. **Update types** in `frontend/src/lib/types.ts`

4. **Display in UI** (e.g., in hover tooltip, in sidebar info panel)

### Adding a New Sidebar Panel (e.g., Process Plotter, Property Calculator)

1. **Create component** in `frontend/src/components/forms/ProcessPlotter.tsx`

2. **Add to `Sidebar.tsx`** as a new collapsible section

3. **Add state** to `chartDataStore` if it affects the chart

4. **Add API endpoint** in backend if calculation is needed

### Adding a New Data Type to Supabase

1. **Create table** via SQL in Supabase dashboard:
   ```sql
   create table public.processes (
     id uuid default uuid_generate_v4() primary key,
     chart_id uuid references public.charts(id) on delete cascade not null,
     name text not null,
     steps jsonb not null, -- array of {temperature, humidity} state points
     created_at timestamptz default now() not null
   );
   alter table public.processes enable row level security;
   -- Add RLS policies (same pattern as data_points)
   ```

2. **Add TypeScript type** in `frontend/src/lib/types.ts`

3. **Add Supabase queries** where needed (inline or in a helper file)

---

## 10. Code to Preserve from Prototype

These pieces of logic are correct and battle-tested. They must be carried over exactly.

### Psychrometric Calculations (`simple_enthalpy.py`)

The following functions must be preserved with identical math:

- `calc_humidity_ratio(T_db, RH_percent, P=101325)` — scalar humidity ratio (g/kg)
- `calc_humidity_ratios_vectorized(T_db_arr, RH_percent_arr, P=101325)` — numpy vectorized version with ASHRAE coefficients
- `calc_enthalpy(T_db, W, P=101325)` — enthalpy (kJ/kg) via psychrolib

### Chart Constants (`main.py`)

These values define the chart geometry:
```python
T_DB_MIN, T_DB_MAX = -10, 50
W_MIN, W_MAX = 0, 30
t_axis = range(-10, 46, 5)           # vertical line positions
RH_LEVELS = [10, 20, 30, 40, 50, 60, 70, 80, 90]
```

### Pre-computation Pattern (`main.py` lines 49-54)

Compute once at startup:
```python
T_DB_RANGE = np.linspace(T_DB_MIN, T_DB_MAX, 100)  # 100 points for smooth curves
W_SAT_LIST = [calc_humidity_ratio(t, 100.0) for t in T_DB_RANGE]
_SAT_AT_T = {t: calc_humidity_ratio(t, 100.0) for t in t_axis}
RH_CURVES = {rh: [calc_humidity_ratio(t, float(rh)) for t in T_DB_RANGE] for rh in RH_LEVELS}
```

### Enthalpy Line Formula (`main.py` lines 108-110)

```python
T_start = h / 1.006
T_points = np.linspace(T_intersect, T_start, 50)
W_points = [((h - 1.006 * T) * 1000) / (2501 + 1.86 * T) for T in T_points]
```

### Enthalpy Label Position (`main.py` lines 117-118)

```python
T_label = T_intersect - 0.8
W_label = ((h - 1.006 * T_label) * 1000) / (2501 + 1.86 * T_label)
```

### RH Curve Annotation Position (`main.py` lines 92-94)

```python
index_position = int(len(T_DB_RANGE) * 0.75)
while index_position > 0 and W_rh_list[index_position] > W_MAX:
    index_position -= 1
```

### Design Zone Polygon (`main.py` lines 169-188)

Bottom edge follows min_rh curve, top edge follows max_rh curve (reversed), closed polygon.

### Chart Styling Colors

```python
COLOR_PRIMARY    = 'rgba(38,70,83,1)'
COLOR_PRIMARY_80 = 'rgba(38,70,83,0.8)'
COLOR_PRIMARY_50 = 'rgba(38,70,83,0.5)'
```

### Plotly Trace Styles

| Trace | Color | Width | Dash | Opacity |
|-------|-------|-------|------|---------|
| Saturation line | PRIMARY_80 | 2 | solid | 1.0 |
| Vertical lines | PRIMARY_50 | 1 | solid | 0.3 |
| Horizontal HR lines | PRIMARY_50 | 1 | solid | 0.3 |
| RH curves | PRIMARY_50 | 1 | dash | 1.0 |
| Enthalpy lines | PRIMARY | 1 | dot | 1.0 |
| Design zone border | green | 2 | dash | 1.0 |
| Design zone fill | rgba(0,255,0,0.1) | — | — | — |
| Data points | red/green | — | — | — |
| Manual point | red, size 10, circle | — | — | — |
| Uploaded data | size 2, x symbol | — | — | — |

### 8760-Row Split Logic (`main.py` lines 252-259)

If uploaded data has more than 8760 rows (one year of hourly data):
- First 8760 rows → "Dataset 1" (red)
- Remaining rows → "Dataset 2" (green)
Otherwise: single "Uploaded Data" (red)

### CSV Data Files

- `dewpoint_data.csv` — 6 rows mapping humidity ratio (g/kg) to dew point temperature (°C)
- `enthalpy_intersections.csv` — 13 rows with enthalpy line endpoints at the saturation curve

Both files must be included in the backend's `data/` directory.

---

**End of PRD**. All implementation details are in files `prd/00` through `prd/05`. Refer to `CLAUDE.md` for ongoing code style and architecture rules.
