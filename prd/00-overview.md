# Psychro AI — Overview, Tech Stack & Architecture

> **Agent Rules**
> - Only use the provided context. If something is unclear or missing, ask for clarification instead of assuming.
> - Do not invent APIs, fields, or behaviors not specified in these documents.
> - Refer to CLAUDE.md for code style, run commands, and architecture constraints.
> - Complete each phase fully and verify before moving to the next.
> - When a file references another PRD file, read it before proceeding.

---

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
| zustand | 5.x | Lightweight state management |

**State management**: Zustand for chart/app state. React Context only for Supabase auth (wraps their SDK).
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

**Next**: Read `prd/01-supabase.md` for Supabase setup (database, auth, storage).
