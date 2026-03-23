# Psychro AI — Product Requirements Document

## 1. Project Overview

**Product**: Psychro AI — a professional web-based psychrometric chart tool for HVAC engineers.

**Domain**: `psychro.ai` (registered on Cloudflare)

**Current state**: A working prototype with a FastAPI backend generating server-side Plotly chart figures and a vanilla JS/HTML/CSS frontend. No authentication, no database, no tests.

**Target state**: A production-ready application with a React frontend, restructured FastAPI backend (calculations only), Supabase for auth/database/storage, and a foundation for future AI features.

**Users**: HVAC engineers, building scientists, mechanical engineers who need to visualize and analyze psychrometric data.

---

## 2. Tech Stack

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool and dev server |
| react-plotly.js | 2.x | Plotly chart wrapper for React |
| plotly.js | 3.x | Charting library (peer dep of react-plotly.js) |
| react-router | 7.x | Client-side routing |
| @supabase/supabase-js | 2.x | Supabase client (auth, DB, storage) |
| tailwindcss | 4.x | Utility-first CSS |
| shadcn/ui | latest | Accessible UI components (Radix + Tailwind) |

**State management**: `useState` + React Context. No external state library.
**Data fetching**: Standard `fetch` with async/await. No query library.
**Forms**: Native controlled inputs. No form library.

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.115.x | Web framework |
| uvicorn | 0.34.x | ASGI server |
| psychrolib | 2.5.0 | ASHRAE psychrometric calculations |
| numpy | 2.x | Vectorized calculations |
| pandas | 2.x | Excel file parsing |
| openpyxl | 3.x | Excel engine |
| python-multipart | 0.x | File upload support |
| pytest | 8.x | Testing |
| httpx | 0.28.x | Async test client |

**Note**: `plotly`, `scipy`, and `copy` are no longer needed in the backend. Chart construction moves entirely to the frontend.

### Infrastructure
| Service | Purpose |
|---------|---------|
| Supabase | Auth (email/password), PostgreSQL database, file storage (buckets) |
| Cloudflare Pages | Frontend hosting at psychro.ai |
| Render | FastAPI backend hosting |

---

## 3. Architecture

### Two Separate Data Flows

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│                 (Cloudflare Pages)                        │
│                                                          │
│  ┌──────────────┐              ┌──────────────────────┐  │
│  │ Chart Engine  │              │ User Features        │  │
│  │              │              │                      │  │
│  │ - Base chart  │              │ - Auth (login/signup)│  │
│  │ - Data points │              │ - Save/load projects │  │
│  │ - Design zone │              │ - File storage       │  │
│  │ - Overlays    │              │ - User settings      │  │
│  └──────┬───────┘              └──────────┬───────────┘  │
│         │                                  │              │
└─────────┼──────────────────────────────────┼──────────────┘
          │                                  │
          │ REST API                         │ Supabase JS SDK
          │ (public, no auth)                │ (authenticated)
          │                                  │
          ▼                                  ▼
┌──────────────────┐              ┌──────────────────────┐
│  FastAPI Backend  │              │     Supabase         │
│   (Render)        │              │                      │
│                   │              │  - Auth service       │
│ - /calculate/*    │              │  - PostgreSQL DB      │
│ - /chart/base-data│              │  - Storage buckets    │
│ - /upload/process │              │  - Row-Level Security │
│                   │              │                      │
│ psychrolib + numpy│              │                      │
└──────────────────┘              └──────────────────────┘
```

**Key principle**: FastAPI does math. Supabase does user data. They never talk to each other.

### What Changes from the Prototype

| Aspect | Prototype | Professional |
|--------|-----------|-------------|
| Chart rendering | Server builds full Plotly figure JSON | Frontend constructs Plotly figure from data |
| API response | `{ figure: "<plotly json>" }` | `{ humidity_ratio: 12.5, enthalpy: 50.3 }` |
| Base chart | Regenerated on every request | Fetched once, cached on frontend |
| Auth | None | Supabase email/password |
| Data persistence | None (session only) | Supabase PostgreSQL |
| File storage | Read-and-discard | Supabase Storage buckets |
| Frontend | Vanilla JS | React + TypeScript |

---

## 4. Supabase Setup (from scratch)

### 4.1 Create Project
1. Go to https://supabase.com and create account
2. Create new project: name `psychro-ai`, choose closest region, set strong database password
3. Note down from Project Settings → API:
   - `SUPABASE_URL` (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` (public, safe for frontend)

### 4.2 Auth Configuration
1. Go to Authentication → Providers
2. Ensure Email provider is enabled (it is by default)
3. Disable "Confirm email" for development (re-enable for production)
4. Set site URL to `http://localhost:5173` (dev) — update to `https://psychro.ai` for production
5. Add redirect URLs: `http://localhost:5173/**`, `https://psychro.ai/**`

### 4.3 Database Schema

Run this SQL in the Supabase SQL Editor (in this exact order):

```sql
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Projects table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Charts table
create table public.charts (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  design_zone_config jsonb default null,
  -- design_zone_config shape: { "enabled": true, "minTemp": 20, "maxTemp": 24, "minRH": 40, "maxRH": 60 }
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Datasets table (metadata for uploaded files)
create table public.datasets (
  id uuid default uuid_generate_v4() primary key,
  chart_id uuid references public.charts(id) on delete cascade not null,
  name text not null,
  storage_path text not null, -- path in Supabase Storage bucket
  row_count integer default 0,
  uploaded_at timestamptz default now() not null
);

-- Data points table (manually plotted points)
create table public.data_points (
  id uuid default uuid_generate_v4() primary key,
  chart_id uuid references public.charts(id) on delete cascade not null,
  temperature float not null,
  humidity float not null,
  label text default '',
  created_at timestamptz default now() not null
);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.charts
  for each row execute function public.handle_updated_at();

-- Indexes
create index idx_projects_user_id on public.projects(user_id);
create index idx_charts_project_id on public.charts(project_id);
create index idx_datasets_chart_id on public.datasets(chart_id);
create index idx_data_points_chart_id on public.data_points(chart_id);
```

### 4.4 Row-Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
alter table public.projects enable row level security;
alter table public.charts enable row level security;
alter table public.datasets enable row level security;
alter table public.data_points enable row level security;

-- Projects: users can only CRUD their own projects
create policy "Users can view own projects"
  on public.projects for select using (auth.uid() = user_id);

create policy "Users can create own projects"
  on public.projects for insert with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete using (auth.uid() = user_id);

-- Charts: users can CRUD charts in their own projects
create policy "Users can view own charts"
  on public.charts for select using (
    project_id in (select id from public.projects where user_id = auth.uid())
  );

create policy "Users can create charts in own projects"
  on public.charts for insert with check (
    project_id in (select id from public.projects where user_id = auth.uid())
  );

create policy "Users can update own charts"
  on public.charts for update using (
    project_id in (select id from public.projects where user_id = auth.uid())
  );

create policy "Users can delete own charts"
  on public.charts for delete using (
    project_id in (select id from public.projects where user_id = auth.uid())
  );

-- Datasets: users can CRUD datasets in their own charts
create policy "Users can view own datasets"
  on public.datasets for select using (
    chart_id in (
      select c.id from public.charts c
      join public.projects p on c.project_id = p.id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can create datasets in own charts"
  on public.datasets for insert with check (
    chart_id in (
      select c.id from public.charts c
      join public.projects p on c.project_id = p.id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can delete own datasets"
  on public.datasets for delete using (
    chart_id in (
      select c.id from public.charts c
      join public.projects p on c.project_id = p.id
      where p.user_id = auth.uid()
    )
  );

-- Data points: users can CRUD points in their own charts
create policy "Users can view own data points"
  on public.data_points for select using (
    chart_id in (
      select c.id from public.charts c
      join public.projects p on c.project_id = p.id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can create data points in own charts"
  on public.data_points for insert with check (
    chart_id in (
      select c.id from public.charts c
      join public.projects p on c.project_id = p.id
      where p.user_id = auth.uid()
    )
  );

create policy "Users can delete own data points"
  on public.data_points for delete using (
    chart_id in (
      select c.id from public.charts c
      join public.projects p on c.project_id = p.id
      where p.user_id = auth.uid()
    )
  );
```

### 4.5 Storage Bucket

1. Go to Storage in Supabase dashboard
2. Create new bucket: `datasets` (private, not public)
3. Add RLS policy for the bucket:

```sql
-- Users can upload to their own folder (user_id as folder name)
create policy "Users can upload own files"
  on storage.objects for insert
  with check (
    bucket_id = 'datasets' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files
create policy "Users can read own files"
  on storage.objects for select
  using (
    bucket_id = 'datasets' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
create policy "Users can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'datasets' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

File path convention: `{user_id}/{dataset_id}.xlsx`

---

## 5. FastAPI Backend API Specification

The backend is a pure calculation service. No auth, no database, no file storage.

**Base URL**: `https://api.psychro.ai` (or Render URL)

### 5.1 Endpoints

#### `GET /api/v1/chart/base-data`

Returns all static chart geometry data. Frontend fetches this once and caches it.

**Auth**: None (public)

**Response** (`200 OK`):
```json
{
  "saturation_curve": {
    "temperatures": [-10.0, -9.39, ...],
    "humidity_ratios": [1.6, 1.72, ...]
  },
  "rh_curves": {
    "10": { "temperatures": [...], "humidity_ratios": [...] },
    "20": { "temperatures": [...], "humidity_ratios": [...] },
    ...
    "90": { "temperatures": [...], "humidity_ratios": [...] }
  },
  "enthalpy_lines": [
    {
      "enthalpy_value": -10,
      "temperatures": [...],
      "humidity_ratios": [...],
      "label_position": { "x": -13.75, "y": 5.2 }
    },
    ...
  ],
  "dewpoint_lines": [
    { "humidity_ratio": 5, "dewpoint_temp": 3.905, "max_temp": 50 },
    ...
  ],
  "vertical_lines": [
    { "temperature": -10, "max_humidity_ratio": 1.6 },
    ...
  ],
  "axis_config": {
    "x_min": -10, "x_max": 50, "x_dtick": 5,
    "y_min": 0, "y_max": 30
  }
}
```

#### `POST /api/v1/calculate/point`

Calculates psychrometric properties for a single point.

**Auth**: None (public)

**Request body** (`application/json`):
```json
{
  "temperature": 25.0,
  "humidity": 50.0
}
```

**Validation**: temperature in [-10, 50], humidity in [0, 100]

**Response** (`200 OK`):
```json
{
  "temperature": 25.0,
  "relative_humidity": 50.0,
  "humidity_ratio": 9.95,
  "enthalpy": 50.4
}
```

**Error response** (`400`):
```json
{
  "detail": "Temperature must be between -10°C and 50°C."
}
```

#### `POST /api/v1/calculate/dataset`

Processes an uploaded .xlsx file and returns computed humidity ratios.

**Auth**: None (public)

**Request**: `multipart/form-data` with field `file` (`.xlsx`)

**Validation**:
- File must be `.xlsx`
- Must contain `Temperature` and `Humidity` columns
- Values must be numeric

**Response** (`200 OK`):
```json
{
  "points": [
    { "temperature": 25.0, "humidity_ratio": 9.95 },
    { "temperature": 30.0, "humidity_ratio": 15.2 },
    ...
  ],
  "total_rows": 8760,
  "valid_rows": 8742,
  "invalid_rows": 18
}
```

**Error response** (`400`):
```json
{
  "detail": "Excel file must contain 'Temperature' (°C) and 'Humidity' (%) columns"
}
```

#### `POST /api/v1/calculate/design-zone`

Computes the design zone polygon boundary.

**Auth**: None (public)

**Request body** (`application/json`):
```json
{
  "min_temp": 20.0,
  "max_temp": 24.0,
  "min_rh": 40.0,
  "max_rh": 60.0
}
```

**Validation**: min_temp < max_temp, min_rh < max_rh, temps in [-10, 50], RH in [0, 100]

**Response** (`200 OK`):
```json
{
  "polygon": {
    "x": [20.0, 20.6, ..., 20.0],
    "y": [5.8, 5.9, ..., 5.8]
  }
}
```

#### `GET /health`

Health check for monitoring.

**Response** (`200 OK`):
```json
{ "status": "ok" }
```

### 5.2 CORS Configuration

```python
allow_origins = [
    "http://localhost:5173",      # Vite dev server
    "https://psychro.ai",         # Production frontend
    "https://www.psychro.ai",     # www variant
]
```

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
      ChartContext.tsx              # Chart state (data points, design zone, base data)
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

**Props**: None (reads from ChartContext)

**Behavior**:
1. On mount, fetch `GET /api/v1/chart/base-data` and store in ChartContext
2. Build Plotly traces from base data (saturation curve, RH curves, enthalpy lines, etc.)
3. Overlay user data traces (manual points, uploaded datasets, design zone) from ChartContext
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

#### `ChartContext.tsx`
Holds all chart-related state.

```typescript
interface ChartState {
  baseData: BaseChartData | null;         // from /api/v1/chart/base-data
  dataPoints: DataPoint[];                 // manually plotted points
  uploadedDatasets: UploadedDataset[];     // processed file data
  designZone: DesignZoneConfig | null;     // zone polygon + config
  isLoading: boolean;
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
On submit: call `POST /api/v1/calculate/point`, add result to ChartContext.

Validation (client-side before API call):
- Temperature: number, -10 to 50
- Humidity: number, 0 to 100

#### `FileUploadForm.tsx`
File input (accept `.xlsx`) + "Upload" button.
On submit: call `POST /api/v1/calculate/dataset`, add results to ChartContext.

Split logic (preserve from prototype): If response has >8760 points, split into "Dataset 1" (red, first 8760) and "Dataset 2" (green, remainder). Otherwise, single "Uploaded Data" (red) trace.

#### `DesignZoneModal.tsx`
Uses shadcn/ui `<Dialog>`. Four number inputs: minTemp, maxTemp, minRH, maxRH.
On apply: call `POST /api/v1/calculate/design-zone`, store polygon in ChartContext.

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

## 7. Backend Structure

```
backend/
  app/
    __init__.py
    main.py                    # FastAPI app creation, CORS, lifespan
    config.py                  # Settings (CORS origins, etc.)
    routers/
      __init__.py
      calculations.py          # /calculate/point, /calculate/dataset, /calculate/design-zone
      chart_data.py            # /chart/base-data
    services/
      __init__.py
      psychrometrics.py        # All calculation logic (from simple_enthalpy.py + main.py)
    schemas/
      __init__.py
      requests.py              # Pydantic request models
      responses.py             # Pydantic response models
  data/
    dewpoint_data.csv
    enthalpy_intersections.csv
  tests/
    __init__.py
    test_psychrometrics.py     # Unit tests for calculation service
    test_api.py                # Integration tests for endpoints
  requirements.txt
  Dockerfile
  .env.example
```

### 7.1 Key Files

#### `app/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import calculations, chart_data

app = FastAPI(title="Psychro AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chart_data.router, prefix="/api/v1")
app.include_router(calculations.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

#### `app/services/psychrometrics.py`

This is the heart of the backend. Preserve all math from the prototype's `simple_enthalpy.py` and `main.py`.

Must include these functions (carried over from prototype):
- `calc_humidity_ratio(T_db, RH_percent)` → `float | None` (g/kg)
- `calc_humidity_ratios_vectorized(T_db_arr, RH_percent_arr)` → `(ndarray, mask)`
- `calc_enthalpy(T_db, W)` → `float | None` (kJ/kg)
- `get_base_chart_data()` → `BaseChartData` dict (new — computes all chart geometry)
- `compute_design_zone_polygon(min_temp, max_temp, min_rh, max_rh)` → polygon dict (extracted from `add_design_zone_trace`)

The enthalpy line formula (preserve exactly):
```python
T_start = h / 1.006
T_points = np.linspace(T_intersect, T_start, 50)
W_points = [((h - 1.006 * T) * 1000) / (2501 + 1.86 * T) for T in T_points]
```

#### `app/schemas/requests.py`
```python
from pydantic import BaseModel, Field, model_validator

class PointRequest(BaseModel):
    temperature: float = Field(ge=-10, le=50)
    humidity: float = Field(ge=0, le=100)

class DesignZoneRequest(BaseModel):
    min_temp: float = Field(ge=-10, le=50)
    max_temp: float = Field(ge=-10, le=50)
    min_rh: float = Field(ge=0, le=100)
    max_rh: float = Field(ge=0, le=100)

    @model_validator(mode='after')
    def validate_ranges(self):
        if self.min_temp >= self.max_temp:
            raise ValueError('min_temp must be less than max_temp')
        if self.min_rh >= self.max_rh:
            raise ValueError('min_rh must be less than max_rh')
        return self
```

---

## 8. Implementation Phases

### Phase 1: Backend Restructuring

**Goal**: Restructure the monolithic `main.py` into a proper package with new data-only endpoints.

**Steps**:

1. **Create directory structure**:
   ```
   mkdir -p backend/app/routers backend/app/services backend/app/schemas backend/data backend/tests
   ```

2. **Create `backend/app/config.py`**:
   - Define `Settings` class with `cors_origins` list
   - Load from environment variables

3. **Create `backend/app/services/psychrometrics.py`**:
   - Copy `calc_humidity_ratio`, `calc_humidity_ratios_vectorized`, `calc_enthalpy` from `simple_enthalpy.py`
   - Copy pre-computation logic from `main.py` (lines 49-54): `T_DB_RANGE`, `W_SAT_LIST`, `_SAT_AT_T`, `RH_CURVES`
   - Copy `DEWPOINT_DATA` and `ENTHALPY_DATA` CSV loading
   - Add new function `get_base_chart_data()` that returns all chart geometry as a dict (instead of building Plotly traces)
   - Add `compute_design_zone_polygon()` extracted from `add_design_zone_trace` in `main.py` (lines 168-188)

4. **Create `backend/app/schemas/requests.py`** and **`responses.py`**:
   - Pydantic models for all request/response shapes (see Section 5)

5. **Create `backend/app/routers/chart_data.py`**:
   - `GET /chart/base-data` endpoint

6. **Create `backend/app/routers/calculations.py`**:
   - `POST /calculate/point` endpoint
   - `POST /calculate/dataset` endpoint (file upload)
   - `POST /calculate/design-zone` endpoint

7. **Create `backend/app/main.py`**:
   - FastAPI app with CORS middleware
   - Include routers
   - Health check endpoint

8. **Copy CSV data files** to `backend/data/`

9. **Create `backend/requirements.txt`**:
   ```
   fastapi>=0.115.0
   uvicorn>=0.34.0
   numpy>=2.0.0
   pandas>=2.0.0
   psychrolib==2.5.0
   python-multipart>=0.0.6
   openpyxl>=3.1.0
   pytest>=8.0.0
   httpx>=0.28.0
   ```

10. **Create `backend/tests/test_psychrometrics.py`**:
    - Test `calc_humidity_ratio(25, 50)` returns ~9.95 g/kg
    - Test `calc_humidity_ratio(0, 100)` returns saturation value
    - Test `calc_enthalpy(25, 9.95)` returns ~50.4 kJ/kg
    - Test edge cases: T=-10, T=50, RH=0, RH=100
    - Test vectorized version matches scalar version

11. **Create `backend/tests/test_api.py`**:
    - Test `GET /api/v1/chart/base-data` returns expected structure
    - Test `POST /api/v1/calculate/point` with valid input
    - Test `POST /api/v1/calculate/point` with invalid input (400)
    - Test `POST /api/v1/calculate/design-zone` with valid/invalid input
    - Test `GET /health` returns 200

12. **Create `backend/Dockerfile`**:
    ```dockerfile
    FROM python:3.11-slim
    WORKDIR /app
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt
    COPY . .
    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    ```

**Acceptance criteria**:
- `cd backend && python -m pytest tests/` passes all tests
- `cd backend && uvicorn app.main:app --reload` starts and serves all endpoints
- `GET /api/v1/chart/base-data` returns valid JSON with all chart geometry
- `POST /api/v1/calculate/point` with `{"temperature": 25, "humidity": 50}` returns correct values

---

### Phase 2: React Frontend — Scaffold + Chart

**Goal**: Create the React project and achieve feature parity with the current chart (no auth/persistence yet).

**Steps**:

1. **Scaffold the project**:
   ```bash
   cd frontend
   npm create vite@latest . -- --template react-ts
   npm install
   ```

2. **Install dependencies**:
   ```bash
   npm install react-plotly.js plotly.js react-router
   npm install -D tailwindcss @tailwindcss/vite
   ```

3. **Set up Tailwind CSS**:
   - Add `@tailwindcss/vite` plugin to `vite.config.ts`
   - Add `@import "tailwindcss"` to `src/index.css`

4. **Set up shadcn/ui**:
   ```bash
   npx shadcn@latest init
   ```
   Choose: TypeScript, Default style, CSS variables, `src/components/ui`
   ```bash
   npx shadcn@latest add button input label dialog checkbox card avatar dropdown-menu sonner
   ```

5. **Create `src/lib/constants.ts`**:
   - Chart colors (CHART_COLORS object from Section 6.2)
   - Axis ranges, default design zone values

6. **Create `src/lib/types.ts`**:
   - All TypeScript interfaces (from Section 6.4)

7. **Create `src/lib/api.ts`**:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

   export async function fetchBaseChartData(): Promise<BaseChartData> { ... }
   export async function calculatePoint(temp: number, humidity: number): Promise<PointResult> { ... }
   export async function calculateDataset(file: File): Promise<DatasetResult> { ... }
   export async function calculateDesignZone(config: DesignZoneRequest): Promise<DesignZoneResult> { ... }
   ```

8. **Create `src/lib/chartBuilder.ts`**:
   - All trace builder functions (from Section 6.2)
   - Each function returns a Plotly trace object
   - Preserve all styling: colors, dash patterns, line widths, annotation positions

9. **Create `src/contexts/ChartContext.tsx`**:
   - State: `baseData`, `dataPoints`, `uploadedDatasets`, `designZone`, `isLoading`
   - Actions: `addPoint`, `setUploadedData`, `setDesignZone`, `clearData`

10. **Create `src/components/chart/PsychrometricChart.tsx`**:
    - Fetch base data on mount
    - Build traces using `chartBuilder.ts`
    - Render `<Plot>` with config and layout from prototype

11. **Create `src/components/forms/ManualPointForm.tsx`**:
    - Temperature and humidity inputs
    - "Plot Point" button
    - Client-side validation + API call + update ChartContext

12. **Create `src/components/forms/FileUploadForm.tsx`**:
    - File input (accept .xlsx)
    - "Upload" button
    - 8760-row split logic for two datasets

13. **Create `src/components/chart/DesignZoneModal.tsx`**:
    - shadcn/ui Dialog with 4 inputs
    - Apply/Cancel buttons
    - Checkbox in sidebar to toggle

14. **Create `src/components/layout/Header.tsx`**:
    - App name on left
    - Placeholder auth buttons on right (wire up in Phase 3)

15. **Create `src/components/layout/Sidebar.tsx`**:
    - Contains ManualPointForm, FileUploadForm, design zone controls, Clear Data button

16. **Create `src/components/layout/AppLayout.tsx`**:
    - Header at top
    - Sidebar (left, 25% width) + Chart (right, flex-grow)
    - Responsive: stack vertically below 768px

17. **Create `src/pages/ChartPage.tsx`**:
    - Renders `<Sidebar>` and `<PsychrometricChart>`

18. **Create `src/App.tsx`**:
    - ChartContext provider
    - React Router with `ChartPage` at `/`

19. **Create `src/main.tsx`**:
    - Standard React entry point

20. **Create `.env.local`**:
    ```
    VITE_API_URL=http://localhost:8000
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

21. **Create `vite.config.ts`** with proxy for dev:
    ```typescript
    export default defineConfig({
      plugins: [react(), tailwindcss()],
      server: {
        proxy: {
          '/api': 'http://localhost:8000'
        }
      }
    });
    ```

22. **Create toast notification system**:
    - Use `sonner` (shadcn/ui's toast library)
    - Replace prototype's custom toast with `toast.error()` and `toast.success()` calls

**Acceptance criteria**:
- `npm run dev` starts frontend at localhost:5173
- Chart renders with all base chart elements (saturation curve, RH curves, enthalpy lines, etc.)
- Manual point plotting works (enter temp + humidity, see point on chart with hover data)
- File upload works (.xlsx → plotted points, color-coded at 8760 boundary)
- Design zone toggle works (modal → apply → green polygon on chart)
- "Clear Data" removes all data traces
- Chart export to PNG works (download button)
- Visual parity with prototype chart

---

### Phase 3: Authentication + User Features

**Goal**: Add Supabase auth, login/register pages, and a basic dashboard.

**Steps**:

1. **Install Supabase client**:
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Create `src/lib/supabase.ts`**:
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

3. **Create `src/contexts/AuthContext.tsx`**:
   - On mount: `supabase.auth.getSession()` to check existing session
   - Subscribe to `supabase.auth.onAuthStateChange()` for real-time auth updates
   - Expose: `user`, `session`, `isLoading`, `signIn`, `signUp`, `signOut`

4. **Create `src/pages/LoginPage.tsx`**:
   - Email + password form
   - "Log In" button → calls `signIn`
   - Link to register page
   - Redirect to `/` on success

5. **Create `src/pages/RegisterPage.tsx`**:
   - Email + password + confirm password form
   - "Sign Up" button → calls `signUp`
   - Link to login page
   - Redirect to `/` on success

6. **Create `src/components/auth/ProtectedRoute.tsx`**:
   - If not authenticated, redirect to `/login`
   - If loading, show spinner

7. **Update `src/components/layout/Header.tsx`**:
   - Wire up auth buttons: show "Log In" / "Sign Up" when logged out
   - Show user email + dropdown (Dashboard, Log Out) when logged in

8. **Create `src/pages/DashboardPage.tsx`**:
   - Protected route
   - List user's projects (fetched from Supabase)
   - "New Project" button → creates project with default name
   - Each project shows its charts
   - Click a chart → navigate to `/?chartId=xxx` to load it
   - Delete project/chart buttons

9. **Add save/load chart functionality**:
   - "Save Chart" button in the sidebar (shown when logged in)
   - On save: create or update chart in Supabase with current design_zone_config
   - Save data points to `data_points` table
   - Upload .xlsx file to Supabase Storage bucket
   - "Load" from dashboard: fetch chart config + data points + download file from storage

10. **Update `src/App.tsx`**:
    - Wrap with AuthContext provider
    - Add routes: `/login`, `/register`, `/dashboard`

**Acceptance criteria**:
- Can register a new account with email/password
- Can log in and see user email in header
- Can log out
- Dashboard shows saved projects
- Can save current chart (points + zone config + uploaded file)
- Can reload a saved chart from dashboard
- Chart page still works fully without login

---

### Phase 4: Chat Placeholder + Polish

**Goal**: Add AI chat placeholder, polish UI, add Docker setup.

**Steps**:

1. **Create `src/components/chat/ChatButton.tsx`**:
   - Floating action button, bottom-right corner, `fixed` position
   - Chat bubble icon (use Lucide icon via shadcn)
   - On click: toggle ChatPanel visibility

2. **Create `src/components/chat/ChatPanel.tsx`**:
   - Slide-out panel from bottom-right (or side panel)
   - Header: "AI Assistant" with close button
   - Body: "Coming Soon" message with description
   - Footer: disabled input with placeholder "Type a message..."
   - Style consistently with rest of app

3. **Add ChatButton to AppLayout** (visible on all pages)

4. **Create `docker-compose.yml`** at project root:
   ```yaml
   services:
     backend:
       build: ./backend
       ports:
         - "8000:8000"
       volumes:
         - ./backend:/app
       command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
     frontend:
       build:
         context: ./frontend
         dockerfile: Dockerfile.dev
       ports:
         - "5173:5173"
       volumes:
         - ./frontend/src:/app/src
       environment:
         - VITE_API_URL=http://localhost:8000
         - VITE_SUPABASE_URL=${SUPABASE_URL}
         - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
   ```

5. **Create `frontend/Dockerfile.dev`**:
   ```dockerfile
   FROM node:20-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   CMD ["npm", "run", "dev", "--", "--host"]
   ```

6. **Create `frontend/Dockerfile`** (production):
   ```dockerfile
   FROM node:20-slim AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   ```

7. **Create `frontend/nginx.conf`**:
   ```nginx
   server {
       listen 80;
       root /usr/share/nginx/html;
       index index.html;
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

8. **Create `.env.example`** at project root:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=http://localhost:8000
   ```

9. **UI polish**:
   - Ensure responsive layout works on mobile (sidebar stacks above chart)
   - Add loading spinners during API calls
   - Toast notifications for all errors and success states
   - Keyboard accessibility (Enter to submit forms, Escape to close modals)

10. **Create frontend tests** (`frontend/src/__tests__/`):
    - Test ManualPointForm validation
    - Test chartBuilder produces correct trace structures
    - Test AuthContext provides correct state

**Acceptance criteria**:
- `docker-compose up` starts both frontend and backend
- Chat bubble visible on all pages, opens "Coming Soon" panel
- App is responsive on mobile
- Loading states shown during API calls
- Toast notifications work for success and error cases

---

### Phase 5: Deployment

**Goal**: Deploy to production with Cloudflare Pages + Render.

**Steps**:

1. **Deploy backend to Render**:
   - Create new Web Service on Render
   - Connect to GitHub repo, set root directory to `backend/`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set environment variables (CORS origins including `https://psychro.ai`)

2. **Deploy frontend to Cloudflare Pages**:
   - Connect to GitHub repo in Cloudflare dashboard
   - Framework preset: None (or Vite)
   - Build command: `cd frontend && npm ci && npm run build`
   - Build output directory: `frontend/dist`
   - Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (Render backend URL)

3. **Configure custom domain**:
   - In Cloudflare Pages → Custom domains → Add `psychro.ai`
   - DNS records are auto-configured since domain is on Cloudflare

4. **Update Supabase settings for production**:
   - Site URL: `https://psychro.ai`
   - Redirect URLs: `https://psychro.ai/**`
   - Enable email confirmation
   - Set up SMTP for transactional emails (optional: use Supabase's built-in or add custom SMTP)

5. **Update backend CORS** for production:
   - Add `https://psychro.ai` and `https://www.psychro.ai` to allowed origins

6. **Create GitHub Actions CI** (`.github/workflows/ci.yml`):
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     backend-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with:
             python-version: '3.11'
         - run: cd backend && pip install -r requirements.txt && pytest tests/
     frontend-build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
         - run: cd frontend && npm ci && npm run build
   ```

**Acceptance criteria**:
- `https://psychro.ai` serves the React app
- Backend API is reachable from the frontend
- Can register, log in, use chart, save/load projects in production
- GitHub Actions pass on push

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

5. **Add state** to `ChartContext` for the new overlay

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

3. **Add state** to `ChartContext` if it affects the chart

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
