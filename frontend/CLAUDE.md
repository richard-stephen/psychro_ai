# Frontend Guidelines for Psychro AI

This file provides frontend-specific guidance for Claude.

## Running the Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` with API proxy to backend.

For production build:
```bash
npm run build   # outputs to frontend/dist/
```

### Both (Docker)
```bash
docker-compose up
```
Backend at `:8000`, frontend at `:5173`.

## Testing

```bash
# Frontend tests
cd frontend && npm run test
```

## Frontend Structure

```
frontend/src/
  components/
    chart/               # PsychrometricChart, DesignZoneModal, ChartToolbar
    forms/               # ManualPointForm, FileUploadForm
    layout/              # AppLayout, Header, Sidebar
    auth/                # LoginForm, RegisterForm, ProtectedRoute
    chat/                # ChatButton, ChatPanel (placeholder)
    ui/                  # shadcn/ui components
  contexts/
    AuthContext.tsx       # Supabase auth state (React Context)
  stores/
    chartDataStore.ts    # Chart data state — Zustand (base data, points, zones)
    chartInteractionStore.ts  # Interaction state — Zustand (drag, hover, selection)
  lib/
    supabase.ts          # Supabase client
    api.ts               # FastAPI fetch helpers
    chartBuilder.ts      # Converts API data → Plotly traces
    types.ts             # TypeScript interfaces
    constants.ts         # Chart colors, axis ranges
  pages/
    ChartPage.tsx        # Home page (the chart tool)
    LoginPage.tsx
    RegisterPage.tsx
    DashboardPage.tsx    # Saved projects/charts
```

## TypeScript Code Style
- React functional components only
- State: Zustand for chart/app state. React Context only for auth (wraps Supabase SDK).
- Data fetching: plain `fetch` + async/await (no query library)
- Forms: native controlled inputs (no form library)
- Styling: Tailwind CSS utility classes
- UI components: shadcn/ui (in `components/ui/`)
- Chart rendering happens entirely on the frontend — `chartBuilder.ts` converts API data to Plotly traces.

## Chart Specifications
- X-axis: Dry-bulb temperature, -10°C to 50°C, tick every 5°C
- Y-axis: Humidity ratio, 0 to 30 g/kg, displayed on right side
- Colors: Primary `rgba(38,70,83,*)` at various opacities
- Plotly config: no logo, minimal toolbar (download PNG only), 3x export scale

## Environment Variables
### Frontend (`.env.local`)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Deployment
- **Frontend**: Cloudflare Pages (auto-deploys from GitHub, serves at psychro.ai)
