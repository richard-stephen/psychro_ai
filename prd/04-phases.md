# Psychro AI — Implementation Phases

> **Agent Rules**
> - Only use the provided context. If something is unclear or missing, ask for clarification instead of assuming.
> - Do not invent APIs, fields, or behaviors not specified in these documents.
> - Refer to CLAUDE.md for code style, run commands, and architecture constraints.
> - Complete each phase fully and verify before moving to the next.
> - When a file references another PRD file, read it before proceeding.

**Prerequisites**: Read `prd/00-overview.md`, `prd/02-backend.md`, and `prd/03-frontend.md` before starting.

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
   - Pydantic models for all request/response shapes (see `prd/02-backend.md`)

5. **Create `backend/app/routers/chart_data.py`**:
   - `GET /chart/base-data` endpoint
   - Use plain `def` (not `async def`) — CPU-bound math must run in FastAPI's threadpool

6. **Create `backend/app/routers/calculations.py`**:
   - `POST /calculate/point` endpoint
   - `POST /calculate/dataset` endpoint (file upload)
   - `POST /calculate/design-zone` endpoint
   - All endpoints use plain `def` (not `async def`) — see `prd/02-backend.md` Section 5.3

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
   npm install react-plotly.js plotly.js react-router zustand
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
   - Chart colors (CHART_COLORS object from `prd/03-frontend.md`)
   - Axis ranges, default design zone values

6. **Create `src/lib/types.ts`**:
   - All TypeScript interfaces (from `prd/03-frontend.md` Section 6.4)

7. **Create `src/lib/api.ts`**:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

   export async function fetchBaseChartData(): Promise<BaseChartData> { ... }
   export async function calculatePoint(temp: number, humidity: number): Promise<PointResult> { ... }
   export async function calculateDataset(file: File): Promise<DatasetResult> { ... }
   export async function calculateDesignZone(config: DesignZoneRequest): Promise<DesignZoneResult> { ... }
   ```

8. **Create `src/lib/chartBuilder.ts`**:
   - All trace builder functions (from `prd/03-frontend.md` Section 6.2)
   - Each function returns a Plotly trace object
   - Preserve all styling: colors, dash patterns, line widths, annotation positions

9. **Create Zustand stores** (`src/stores/`):
   - `chartDataStore.ts`: State: `baseData`, `dataPoints`, `uploadedDatasets`, `designZone`, `isLoading`. Actions: `setBaseData`, `addPoint`, `removePoint`, `setUploadedData`, `setDesignZone`, `clearData`
   - `chartInteractionStore.ts`: State: `hoveredPoint`, `dragState`, `selectedPointId`, `cursorPosition`. Actions: `setHoveredPoint`, `startDrag`, `updateDrag`, `endDrag`, `setSelectedPoint`

10. **Create `src/components/chart/PsychrometricChart.tsx`**:
    - Fetch base data on mount
    - Build traces using `chartBuilder.ts`
    - Render `<Plot>` with config and layout from prototype

11. **Create `src/components/forms/ManualPointForm.tsx`**:
    - Temperature and humidity inputs
    - "Plot Point" button
    - Client-side validation + API call + update chartDataStore

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
    - Zustand stores are available (no provider needed — Zustand works without wrapping)
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

**Prerequisite**: Supabase project must be set up per `prd/01-supabase.md`.

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

**Next**: Read `prd/05-reference.md` for extensibility patterns and prototype code to preserve.
