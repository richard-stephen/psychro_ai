# Agent Workflow Guide

How to instruct the AI agent session-by-session when migrating to the professional app.

## General Rules

- **One phase per session** — keeps context focused, prevents drift
- **Always start with CLAUDE.md + 00-overview.md** — sets architecture rules before any code
- **Feed only the relevant PRD files** — don't dump all 6 at once
- **Point to existing code explicitly** — prevents the agent from inventing logic
- **End with "verify acceptance criteria"** — forces the agent to test before declaring done
- **If the agent asks a question, that's good** — the guardrails are working. Answer it rather than letting it guess

---

## Session 1: Backend (Phase 1)

**Give this prompt to the agent:**

```
Read CLAUDE.md, then read prd/00-overview.md and prd/02-backend.md.
Now read prd/04-phases.md and implement Phase 1 (Backend Restructuring) only.
The existing code to preserve is in main.py and simple_enthalpy.py — read those before writing anything.
Verify the acceptance criteria before telling me you're done.
```

**What the agent should produce:**
- `backend/` directory with proper package structure
- All 4 API endpoints returning data (not Plotly figures)
- Passing tests in `backend/tests/`
- CSV data files copied to `backend/data/`

**How to verify:**
```bash
cd backend && python -m pytest tests/ -v
cd backend && uvicorn app.main:app --reload
# Then test: curl http://localhost:8000/api/v1/chart/base-data
# Then test: curl -X POST http://localhost:8000/api/v1/calculate/point -H "Content-Type: application/json" -d '{"temperature": 25, "humidity": 50}'
```

---

## Session 2: Frontend Chart (Phase 2)

**Give this prompt to the agent:**

```
Read CLAUDE.md, then read prd/00-overview.md and prd/03-frontend.md.
Now read prd/04-phases.md and implement Phase 2 (React Frontend — Scaffold + Chart) only.
Read prd/05-reference.md for the exact chart colors, trace styles, and formulas to preserve.
The backend from Phase 1 should already be running. Verify visual parity with the prototype.
```

**What the agent should produce:**
- `frontend/` with Vite + React + TypeScript project
- Chart rendering with all elements (saturation curve, RH curves, enthalpy lines, etc.)
- Manual point form, file upload, design zone modal all working
- Toast notifications, clear data button

**How to verify:**
```bash
cd frontend && npm run dev
# Open http://localhost:5173 — chart should render
# Test: enter temperature 25, humidity 50, click "Plot Point"
# Test: upload a .xlsx file
# Test: toggle design zone checkbox, configure, apply
# Compare visually with prototype at http://localhost:8000
```

**Note:** This is the highest-risk session. The chart translation from Python Plotly to TypeScript Plotly is where most issues will appear. Pay close attention to trace colors, dash patterns, and annotation positions.

---

## Session 3: Auth + User Features (Phase 3)

**Prerequisite:** Set up Supabase project first using `prd/01-supabase.md` (do this manually in the Supabase dashboard before starting this session).

**Give this prompt to the agent:**

```
Read CLAUDE.md, then read prd/01-supabase.md and prd/03-frontend.md.
Now read prd/04-phases.md and implement Phase 3 (Authentication + User Features) only.
The Supabase project is already set up with tables, RLS policies, and storage bucket.
The frontend from Phase 2 should already be working.
```

**What the agent should produce:**
- AuthContext with Supabase integration
- Login/register pages
- Header with auth state (logged in / logged out)
- Dashboard page with project list
- Save/load chart functionality

**How to verify:**
- Register a new account → should succeed
- Log in → email appears in header
- Save a chart → check Supabase dashboard for data
- Navigate to Dashboard → project appears
- Log out → chart page still works without login

---

## Session 4: Polish + Deploy (Phases 4-5)

**Give this prompt to the agent:**

```
Read CLAUDE.md, then read prd/04-phases.md and implement Phase 4 (Chat Placeholder + Polish) and Phase 5 (Deployment).
The full app should already be working from previous sessions.
```

**What the agent should produce:**
- Chat button + "Coming Soon" panel
- Docker setup (docker-compose.yml, Dockerfiles)
- GitHub Actions CI
- Deployment configs for Cloudflare Pages + Render
- Loading spinners, responsive layout, keyboard accessibility

**How to verify:**
```bash
docker-compose up
# Both services should start
# Chat bubble should be visible on all pages
# Test on mobile viewport (responsive)
```

---

## Troubleshooting

**Agent invents new APIs or fields:**
Remind it: "Only use endpoints and fields specified in prd/02-backend.md. Do not add new ones."

**Agent skips acceptance criteria:**
Say: "Before moving on, verify each acceptance criterion listed at the end of Phase N in prd/04-phases.md."

**Chart doesn't match prototype:**
Have the agent re-read `prd/05-reference.md` and compare trace-by-trace with the prototype's `main.py`.

**Agent tries to do multiple phases at once:**
Say: "Stop. Only implement Phase N. Do not start Phase N+1."
