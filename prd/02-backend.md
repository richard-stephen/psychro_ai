# Psychro AI — Backend API Specification & Structure

> **Agent Rules**
> - Only use the provided context. If something is unclear or missing, ask for clarification instead of assuming.
> - Do not invent APIs, fields, or behaviors not specified in these documents.
> - Refer to CLAUDE.md for code style, run commands, and architecture constraints.
> - Complete each phase fully and verify before moving to the next.
> - When a file references another PRD file, read it before proceeding.

**Prerequisite**: Read `prd/00-overview.md` first.

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

### 5.3 Concurrency

CPU-bound work (psychrolib math, numpy vectorization, pandas Excel parsing) will block the async event loop if run inside an `async def` endpoint. FastAPI solves this automatically: **plain `def` endpoints run in a thread pool**, freeing the event loop for other requests.

**Rule**:
- `/calculate/*` and `/chart/base-data` → **`def`** (CPU-bound math and file parsing)
- `/health` → **`async def`** (trivial, no blocking work)
- Future I/O-bound endpoints (chatbot calling LLM API, etc.) → **`async def`** with `await`

This means a user uploading a large Excel file won't block other users from loading the chart or using the app.

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

**Next**: Read `prd/03-frontend.md` for the React frontend structure, components, and types.
