# Psychro AI — Supabase Setup

> **Agent Rules**
> - Only use the provided context. If something is unclear or missing, ask for clarification instead of assuming.
> - Do not invent APIs, fields, or behaviors not specified in these documents.
> - Refer to CLAUDE.md for code style, run commands, and architecture constraints.
> - Complete each phase fully and verify before moving to the next.
> - When a file references another PRD file, read it before proceeding.

**Prerequisite**: Read `prd/00-overview.md` first.

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

**Next**: Read `prd/02-backend.md` for the FastAPI API specification and backend structure.
