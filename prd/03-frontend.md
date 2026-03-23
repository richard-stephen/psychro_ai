# Psychro AI — Frontend Structure

> **Agent Rules**
> - Only use the provided context. If something is unclear or missing, ask for clarification instead of assuming.
> - Do not invent APIs, fields, or behaviors not specified in these documents.
> - Refer to CLAUDE.md for code style, run commands, and architecture constraints.
> - Complete each phase fully and verify before moving to the next.
> - When a file references another PRD file, read it before proceeding.

**Prerequisite**: Read `prd/00-overview.md` first.

---

## 6. Frontend Structure

### 6.1 Project Layout

```
frontend/
  public/
    favicon.ico
  src/
    components/
      chart/
        PsychrometricChart.tsx     # Main Plotly chart component
        ChartToolbar.tsx           # Export, zoom controls
        DesignZoneModal.tsx        # Design zone config dialog
      forms/
        ManualPointForm.tsx        # Temperature + humidity inputs
        FileUploadForm.tsx         # .xlsx upload with drag-and-drop
      layout/
        AppLayout.tsx              # Header + sidebar + main content
        Header.tsx                 # Logo, nav, auth buttons
        Sidebar.tsx                # Left panel with all controls
      auth/
        LoginForm.tsx              # Email + password login
        RegisterForm.tsx           # Email + password registration
        ProtectedRoute.tsx         # Route guard for auth-required pages
      chat/
        ChatButton.tsx             # Floating chat icon (placeholder)
        ChatPanel.tsx              # "Coming Soon" panel
      ui/                          # shadcn/ui components (auto-generated)
        button.tsx
        input.tsx
        dialog.tsx
        label.tsx
        checkbox.tsx
        toast.tsx (sonner)
        dropdown-menu.tsx
        card.tsx
        avatar.tsx
    contexts/
      AuthContext.tsx               # Supabase auth state via React Context
    stores/
      chartDataStore.ts            # Zustand — chart data (base data, points, datasets, zone)
      chartInteractionStore.ts     # Zustand — interaction state (drag, hover, selection)
    lib/
      supabase.ts                  # Supabase client initialization
      api.ts                       # FastAPI fetch helpers
      chartBuilder.ts              # Converts API data → Plotly figure
      types.ts                     # TypeScript interfaces
      constants.ts                 # Chart colors, axis ranges, defaults
    pages/
      ChartPage.tsx                # Main chart page (home page)
      LoginPage.tsx                # Login form page
      RegisterPage.tsx             # Registration form page
      DashboardPage.tsx            # Saved projects/charts list
    App.tsx                        # Routes + providers
    main.tsx                       # React entry point
  index.html
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  components.json                  # shadcn/ui config
  package.json
  .env.local                       # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
```

### 6.2 Component Specifications

#### `PsychrometricChart.tsx`
The core component. Fetches base chart data once, constructs Plotly traces, renders via `<Plot>` from react-plotly.js.

**Props**: None (reads from Zustand stores)

**Behavior**:
1. On mount, fetch `GET /api/v1/chart/base-data` and store in chartDataStore
2. Build Plotly traces from base data (saturation curve, RH curves, enthalpy lines, etc.)
3. Overlay user data traces (manual points, uploaded datasets, design zone) from chartDataStore
4. Pass complete `data` and `layout` to `<Plot>`

**Plotly config** (preserve from prototype):
```typescript
const config = {
  displaylogo: false,
  modeBarButtonsToRemove: [
    'zoom2d', 'pan2d', 'select2d', 'lasso2d',
    'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'
  ],
  toImageButtonOptions: {
    format: 'png',
    scale: 3,
    filename: 'psychrometric-chart'
  }
};
```

**Layout** (preserve from prototype):
```typescript
const layout = {
  template: 'plotly_white' as const,
  plot_bgcolor: 'white',
  paper_bgcolor: 'white',
  title: {
    text: '<b>Psychrometric Chart</b>',
    font: { family: '"Segoe UI", sans-serif', size: 28, color: '#111111' }
  },
  xaxis: {
    title: 'Dry-Bulb Temperature (°C)',
    range: [-10, 50],
    showline: true, linewidth: 1, linecolor: 'black', mirror: true,
    dtick: 5, showgrid: false, zeroline: false
  },
  yaxis: {
    title: 'Humidity Ratio (g water / kg dry air)',
    range: [0, 30], side: 'right',
    showline: true, linewidth: 1, linecolor: 'black', mirror: true,
    showgrid: false, zeroline: false
  },
  margin: { l: 40, r: 60, t: 60, b: 40 },
  legend: { yanchor: 'top', y: 0.99, xanchor: 'left', x: 0.01, bgcolor: 'rgba(255,255,255,0.7)' },
  hovermode: 'closest' as const
};
```

#### `chartBuilder.ts`
Pure functions that convert API data into Plotly trace objects.

**Functions**:
```typescript
buildSaturationTrace(data: SaturationCurve): PlotlyTrace
buildRhCurveTraces(data: Record<string, RhCurve>): PlotlyTrace[]
buildEnthalpyTraces(data: EnthalpyLine[]): PlotlyTrace[]
buildDewpointTraces(data: DewpointLine[]): PlotlyTrace[]
buildVerticalLineTraces(data: VerticalLine[]): PlotlyTrace[]
buildDataPointTrace(points: DataPoint[], name: string, color: string): PlotlyTrace
buildDesignZoneTrace(polygon: Polygon): PlotlyTrace
buildRhAnnotations(data: Record<string, RhCurve>): PlotlyAnnotation[]
buildEnthalpyAnnotations(data: EnthalpyLine[]): PlotlyAnnotation[]
```

**Chart colors** (preserve from prototype):
```typescript
export const CHART_COLORS = {
  PRIMARY: 'rgba(38,70,83,1)',
  PRIMARY_80: 'rgba(38,70,83,0.8)',
  PRIMARY_50: 'rgba(38,70,83,0.5)',
  DESIGN_ZONE_LINE: 'green',
  DESIGN_ZONE_FILL: 'rgba(0,255,0,0.1)',
  DATASET_1: 'red',
  DATASET_2: 'green',
  MANUAL_POINT: 'red',
};
```

#### Zustand Stores

Two stores, split by update frequency for performance.

**`stores/chartDataStore.ts`** — rarely-changing chart data:

```typescript
import { create } from 'zustand';

interface ChartDataState {
  baseData: BaseChartData | null;
  dataPoints: DataPoint[];
  uploadedDatasets: UploadedDataset[];
  designZone: DesignZoneConfig | null;
  isLoading: boolean;
  // Actions
  setBaseData: (data: BaseChartData) => void;
  addPoint: (point: DataPoint) => void;
  removePoint: (id: string) => void;
  setUploadedData: (datasets: UploadedDataset[]) => void;
  setDesignZone: (zone: DesignZoneConfig | null) => void;
  clearData: () => void;
}

// Components select only what they need:
// const baseData = useChartDataStore(s => s.baseData);
// const addPoint = useChartDataStore(s => s.addPoint);
```

**`stores/chartInteractionStore.ts`** — frequently-changing interaction state:

```typescript
interface ChartInteractionState {
  hoveredPoint: { x: number; y: number } | null;
  dragState: { pointId: string; x: number; y: number } | null;
  selectedPointId: string | null;
  cursorPosition: { x: number; y: number } | null;
  // Actions
  setHoveredPoint: (point: { x: number; y: number } | null) => void;
  startDrag: (pointId: string, x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;
  setSelectedPoint: (id: string | null) => void;
}
```

#### `AuthContext.tsx`
Wraps Supabase auth state.

```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

#### `ManualPointForm.tsx`
Two number inputs (temperature, humidity) + "Plot Point" button.
On submit: call `POST /api/v1/calculate/point`, add result to chartDataStore.

Validation (client-side before API call):
- Temperature: number, -10 to 50
- Humidity: number, 0 to 100

#### `FileUploadForm.tsx`
File input (accept `.xlsx`) + "Upload" button.
On submit: call `POST /api/v1/calculate/dataset`, add results to chartDataStore.

Split logic (preserve from prototype): If response has >8760 points, split into "Dataset 1" (red, first 8760) and "Dataset 2" (green, remainder). Otherwise, single "Uploaded Data" (red) trace.

#### `DesignZoneModal.tsx`
Uses shadcn/ui `<Dialog>`. Four number inputs: minTemp, maxTemp, minRH, maxRH.
On apply: call `POST /api/v1/calculate/design-zone`, store polygon in chartDataStore.

Defaults: minTemp=20, maxTemp=24, minRH=40, maxRH=60

#### `Header.tsx`
- Left: App name/logo "Psychro AI"
- Right: If not logged in → "Log In" and "Sign Up" buttons. If logged in → user avatar/email dropdown with "Dashboard" and "Log Out"

#### `Sidebar.tsx`
Contains (in order):
1. `ManualPointForm`
2. `FileUploadForm`
3. Design zone checkbox + configure button → opens `DesignZoneModal`
4. "Clear Data" button

#### `ChatButton.tsx` (placeholder)
A floating action button (bottom-right corner) with a chat/message icon. On click, opens `ChatPanel`.

#### `ChatPanel.tsx` (placeholder)
A slide-out panel (or modal) that displays:
- "AI Assistant — Coming Soon"
- Brief description: "Ask questions about psychrometric properties, get help analyzing your data, and more."
- A disabled text input with placeholder "Type a message..."

### 6.3 Routing

```typescript
<Routes>
  <Route element={<AppLayout />}>
    <Route path="/" element={<ChartPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
  </Route>
</Routes>
```

Home page (`/`) is the chart tool — accessible without login.

### 6.4 Types (`lib/types.ts`)

```typescript
// API response types
interface BaseChartData {
  saturation_curve: { temperatures: number[]; humidity_ratios: number[] };
  rh_curves: Record<string, { temperatures: number[]; humidity_ratios: number[] }>;
  enthalpy_lines: Array<{
    enthalpy_value: number;
    temperatures: number[];
    humidity_ratios: number[];
    label_position: { x: number; y: number };
  }>;
  dewpoint_lines: Array<{ humidity_ratio: number; dewpoint_temp: number; max_temp: number }>;
  vertical_lines: Array<{ temperature: number; max_humidity_ratio: number }>;
  axis_config: { x_min: number; x_max: number; x_dtick: number; y_min: number; y_max: number };
}

interface PointResult {
  temperature: number;
  relative_humidity: number;
  humidity_ratio: number;
  enthalpy: number;
}

interface DatasetResult {
  points: Array<{ temperature: number; humidity_ratio: number }>;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
}

interface DesignZoneResult {
  polygon: { x: number[]; y: number[] };
}

interface DesignZoneConfig {
  enabled: boolean;
  minTemp: number;
  maxTemp: number;
  minRH: number;
  maxRH: number;
}

// Supabase row types
interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Chart {
  id: string;
  project_id: string;
  name: string;
  design_zone_config: DesignZoneConfig | null;
  created_at: string;
  updated_at: string;
}

interface Dataset {
  id: string;
  chart_id: string;
  name: string;
  storage_path: string;
  row_count: number;
  uploaded_at: string;
}

interface DataPoint {
  id: string;
  chart_id: string;
  temperature: number;
  humidity: number;
  label: string;
  created_at: string;
}
```

---

**Next**: Read `prd/04-phases.md` for the step-by-step implementation plan.
