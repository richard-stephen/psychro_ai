# CLAUDE.md

This file provides core architectural guidance to AI agents. 
For specific implementation details, refer to sub-directory guides:
- **Backend guide**: `backend/CLAUDE.md`
- **Frontend guide**: `frontend/CLAUDE.md`

## Project Overview

Psychro AI is a professional web-based psychrometric chart tool for HVAC engineers. It uses a React frontend with a FastAPI calculation backend and Supabase for auth/database/storage.

**Domain**: psychro.ai

## Core Architecture Rule

**Two separate data flows — this is the strict architectural rule:**

1. **React ↔ FastAPI**: Psychrometric calculations and chart data. Public, no auth. FastAPI does math and returns numbers — it never builds Plotly figures.
2. **React ↔ Supabase**: Auth, saved projects/charts, file storage. Uses `@supabase/supabase-js` directly from React. Backend never touches Supabase.

**FastAPI does NOT**: handle auth, access the database, store files, or return Plotly figure JSON.
**Supabase does NOT**: do psychrometric math or serve chart data.

## General Code Style
- No over-engineering. Simple solutions first.
- Don't add abstractions for single-use code.
- Chart rendering happens entirely on the frontend.

## Key Domain Constraints
- **8760 split**: One year has 8760 hours. Datasets larger than this are split into two color-coded traces for comparison.
- **SI Units**: All calculations MUST use **SI units** and **standard atmospheric pressure** (101325 Pa).
*(Standard terms like enthalpy, humidity ratio, and psychrometric charts are assumed knowledge).*

## Supabase (Not Yet Implemented)

Auth, database, and storage via Supabase are **planned but not yet built**.
When the time comes to implement Supabase, read `prd/01-supabase.md` for the full database schema, RLS policies, and setup instructions. **Do not read this file otherwise — it is not relevant to current work.**

## Extending the Application

Follow these established patterns when adding new features:

**New chart overlay** (e.g., comfort zone, process lines):
1. Backend: Add endpoint in `routers/calculations.py` + request/response schemas
2. Frontend: Add trace builder in `chartBuilder.ts`
3. Frontend: Add toggle in Sidebar + state in `chartDataStore`

**New calculation** (e.g., wet bulb, specific volume):
1. Backend: Add function in `psychrometrics.py`
2. Backend: Add to existing response or create new endpoint
3. Frontend: Update types in `types.ts`, display in UI

**New sidebar panel** (e.g., process plotter):
1. Frontend: Create component in `components/forms/`
2. Frontend: Add to `Sidebar.tsx` as collapsible section
3. Backend: Add endpoint if calculation needed

**New Supabase table** (when Supabase is implemented):
1. Create table via SQL (follow patterns in `prd/01-supabase.md`)
2. Enable RLS, add policies (same ownership pattern as existing tables)
3. Add TypeScript type in `types.ts`

## Centralized Deployment
- **Database/Auth/Storage**: Supabase (managed)
*(See backend/frontend CLAUDE.md for specific deployment commands).*
