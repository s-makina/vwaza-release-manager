# Vwaza Release Manager

## Overview
Vwaza Release Manager is an MVP that simulates a real-world music ingestion pipeline.
It allows artists to upload releases and tracks, processes media asynchronously,
and enables administrators to review and publish content.

The goal of this project is to demonstrate system design, raw SQL proficiency,
and production-minded backend architecture within a constrained timeline.

This repo includes:
- **Backend** (`backend/`): Fastify + TypeScript + PostgreSQL (raw SQL)
- **Frontend** (`frontend/`): React + React Router

---

## Architecture decisions
- **Separation by module**: HTTP routes are grouped by feature (`auth`, `releases`, `tracks`, `storage`, `admin`). Route handlers are thin and delegate to services.
- **Raw SQL over an ORM**: queries live in services and run via `pg` for clarity and explicit control.
- **Database-enforced invariants**: critical business rules (role constraints, status transitions, editability) are enforced with SQL constraints/triggers in addition to application checks.
- **JWT + role-based access control**: role is embedded in the JWT and checked on protected endpoints.
- **S3-compatible object storage**: audio and cover art are uploaded and stored separately from the DB; the DB stores object keys and optional public URLs.
- **Async processing as a worker loop**: a lightweight in-process worker periodically promotes releases from `PROCESSING` to `PENDING_REVIEW` once track media is present (MVP stand-in for a real queue/worker system).

---

## Tech Stack

### Backend
- Node.js + Fastify
- TypeScript (Strict Mode)
- PostgreSQL (Raw SQL via `pg`)
- JWT-based authentication
- Cloud object storage (S3-compatible)

### Frontend
- React
- React Router v7

---

## Database design rationale
Core entities:
- `users`: authentication + `role` (`ARTIST` | `ADMIN`)
- `releases`: owned by an artist, has a lifecycle status
- `tracks`: belong to a release; store audio refs

Key constraints and why they exist:
- **Role integrity**: a trigger enforces that `releases.artist_id` always points to a user with role `ARTIST`.
- **Lifecycle safety**: a trigger enforces allowed release status transitions (`DRAFT → PROCESSING → PENDING_REVIEW → (PUBLISHED|REJECTED)`; plus limited transitions for MVP).
- **Editability boundaries**: a trigger enforces that tracks can only be created/updated/deleted while the parent release is `DRAFT`.
- **Data correctness**:
  - `tracks.isrc` length constraint (12)
  - unique index on `tracks.isrc`
  - optional positive duration constraint

Indexes:
- `releases(status)` for queueing/admin review
- `releases(artist_id)` and `tracks(release_id)` for dashboard listing

---

## Media ingestion strategy
Uploads are handled via the backend and stored in S3-compatible object storage.

Persisted fields:
- **DB**: stores references (`*_object_key`) and optional public URLs (`*_public_url`).
- **Object storage**: stores the binary media (cover art and audio).

Serving media:
- The UI can use `*_public_url` when available.
- For admin-only audio review, the backend also exposes an authenticated streaming endpoint (`/admin/tracks/:trackId/audio`).

---

## Async processing (MVP)
In a production ingestion pipeline you would typically use:
- a message queue (SQS/RabbitMQ/Kafka)
- dedicated worker(s) for transcoding/validation
- callbacks or events to update state

In this MVP, async processing is simulated with an in-process worker loop:
- When an artist submits a release, it transitions to `PROCESSING`.
- A worker periodically checks `PROCESSING` releases.
- Once all tracks for a release have `audio_object_key` set, the release is promoted to `PENDING_REVIEW`.

This keeps the API synchronous and predictable while still demonstrating the separation between HTTP handlers and background state changes.

---

## Authentication & RBAC
- JWT is issued via `POST /auth/login` and includes `{ userId, role }`.
- Endpoints check role and ownership:
  - Artists can manage only their own releases/tracks.
  - Admins can list `PENDING_REVIEW` releases and approve/reject.

The frontend implements role-based route protection:
- `/artist/*` requires authentication
- `/admin/*` requires `ADMIN`

---

## Trade-offs and limitations
- **In-process worker**: the async worker runs in the API process; it is not durable and does not scale horizontally.
- **No real transcoding**: audio “processing” is simulated by checking for uploaded audio objects.
- **Polling UX**: the UI refreshes status on demand (no WebSockets).
- **Simple UI**: intentionally minimal styling and components.
- **Security model is MVP-grade**:
  - JWT is stored in `localStorage` (acceptable for demos, not ideal for high-security production).
  - Public media URLs depend on bucket policy/CDN configuration.

---

## Setup instructions

### Prerequisites
- Node.js (18+ recommended)
- PostgreSQL (local or hosted)
- Optional: S3-compatible storage (AWS S3 / MinIO / etc.)

### 1) Backend
1. Install dependencies:
   - `cd backend`
   - `npm install`

2. Create `backend/.env` from the example:
   - Copy `backend/.env.example` to `backend/.env`

3. Configure environment variables (minimum required):
- `DATABASE_URL`
- `JWT_SECRET`

Optional (required in production):
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT` (for non-AWS providers)
- `S3_PUBLIC_BASE_URL` (if you want public URLs for media)

4. Start the backend:
- Development: `npm run dev`
- Production build: `npm run build` then `npm start`

The backend listens on `PORT` (default `3000`) and runs migrations automatically on startup.

### 2) Frontend
1. Install dependencies:
   - `cd frontend`
   - `npm install`

2. Start the dev server:
- `npm run dev`

The frontend runs on `http://localhost:5173` and proxies `/api/*` to `http://localhost:3000` (see `frontend/vite.config.ts`).

### 3) Create users
Register users via API (example):
- `POST /auth/register` with `{ "email": "admin@example.com", "password": "...", "role": "ADMIN" }`
- `POST /auth/register` with `{ "email": "artist@example.com", "password": "...", "role": "ARTIST" }`

Then log in via:
- `POST /auth/login`

### 4) Basic workflow
- Artist:
  - create release (starts in `DRAFT`)
  - add tracks
  - upload cover art + track audio
  - submit release → `PROCESSING`
  - wait for worker to promote it to `PENDING_REVIEW`

- Admin:
  - visit `/admin` to review `PENDING_REVIEW` releases
  - play track audio
  - approve → `PUBLISHED` or reject → `REJECTED`

---
