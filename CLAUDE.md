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

## PRD Files (Implementation Spec)

The full implementation spec is split into sequential files in `prd/` for step-by-step execution:

| File | Content |
|------|---------|
| `prd/00-overview.md` | Project overview, tech stack, architecture |
| `prd/01-supabase.md` | Supabase setup: database schema, RLS policies, storage |
| `prd/02-backend.md` | FastAPI API spec and backend file structure |
| `prd/03-frontend.md` | React components, types, routing, state |
| `prd/04-phases.md` | Step-by-step implementation phases with acceptance criteria |
| `prd/05-reference.md` | Extensibility patterns and prototype code to preserve |

**How to use**:
- Start with `prd/00-overview.md` — read it fully before writing any code
- Follow the "Next" pointers at the bottom of each file
- Complete each phase and verify acceptance criteria before moving on
- The full PRD is also available as a single file in `PRD.md` for reference

**Agent guardrails**:
- Only use the provided context. If something is unclear or missing, ask for clarification instead of assuming.
- Do not invent APIs, fields, or behaviors not specified in these documents.
- Complete each phase fully and verify before moving to the next.

## Centralized Deployment
- **Database/Auth/Storage**: Supabase (managed)
*(See backend/frontend CLAUDE.md for specific deployment commands).*
