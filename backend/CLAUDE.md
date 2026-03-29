# Backend Guidelines for Psychro AI

This file provides backend-specific guidance for Claude.

## Running the Backend (FastAPI)

Since we are using Docker, you can run both the frontend and backend locally with:
```bash
docker-compose up --build
```
Backend runs at `http://localhost:8000`, frontend at `http://localhost:5173`.

Python version: **3.11**


## Testing

```bash
# Backend tests
cd backend && python -m pytest tests/ -v
```
Backend tests cover psychrometric calculations and API endpoints. No E2E tests yet.

## Backend Structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, health check
    config.py            # Settings from env vars
    routers/
      calculations.py    # /calculate/point, /calculate/dataset, /calculate/design-zone, /calculate/process
      chart_data.py      # /chart/base-data
    services/
      psychrometrics.py  # All psychrometric math (psychrolib + numpy)
    schemas/
      requests.py        # Pydantic request models
      responses.py       # Pydantic response models
  data/
    dewpoint_data.csv
    enthalpy_intersections.csv
  tests/
```

## API Endpoints (Backend)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/chart/base-data` | Static chart geometry (cached on frontend) |
| POST | `/api/v1/calculate/point` | Single point: `{temperature, humidity}` → `{humidity_ratio, enthalpy}` |
| POST | `/api/v1/calculate/dataset` | .xlsx upload → array of `{temperature, humidity_ratio}` |
| POST | `/api/v1/calculate/design-zone` | Zone config → polygon coordinates |
| POST | `/api/v1/calculate/process` | Calculates thermodynamic processes (`sensible_heating_cooling`, `cooling_dehumidification`, `evaporative_cooling`, `mixing`) |
| GET | `/health` | Health check |

All calculation endpoints are public (no auth required).

## Python Code Style
- Keep functions pure where possible — input data in, results out
- Use Pydantic models for all request/response validation
- `psychrometrics.py` is the single source of truth for all math
- Preserve psychrometric formulas exactly — they are ASHRAE-standard
- CPU-bound endpoints use `def` (not `async def`) so FastAPI runs them in a threadpool automatically. Only use `async def` for endpoints that `await` I/O (external APIs, database).

## Environment Variables
### Backend (`.env`)
```
CORS_ORIGINS=http://localhost:5173,https://psychro.ai
```
