#VWAZA Release Manager - Backend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `.env` file with your actual configuration values.

##Development

To run the development server:
```bash
npm run dev
```

## Production

To build for production:
```bash
npm run build
```

To start the production server:
```bash
npm start
```

## Project Structure

```
src/
├── app.ts          # Fastify appinstance
├── server.ts       # Server entry point
├── config/         # Configuration files
├── db/             # Database connection and queries
├── modules/        # Feature modules (auth, releases, tracks, etc.)
├── plugins/        # Fastify plugins
├── utils/          #Utility functions
└── tests/          # Test files
```

##OverviewVwaza Release Manager is an MVP that simulates a real-world music ingestion pipeline.
It allows artists to upload releases and tracks, processes media asynchronously,
and enables administrators to review and publish content.

The goal of this project is to demonstrate system design, raw SQL proficiency,
and production-minded backend architecture within a constrained timeline.

---

## Architecture
The system is split into two main layers:

- **Backend**: Fastify (Node.js) API responsible for authentication, business logic,
  database access using raw SQL, and asynchronous processing simulation.
- **Frontend**: React application providing Artist and Admin dashboards.

A clear separation is maintained between:
- API layer (HTTP handlers)
- Domain logic
- Processing / ingestion simulation
- Persistence (PostgreSQL)

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

## Database Design
The database schema models the core relationships between:
- Users (ARTIST, ADMIN)
- Releases (Album / EP)
- Tracks

The database enforces:
- Role constraints
- Release lifecycle status transitions
- Referentialintegrity via foreign keys
- Performance through targeted indexing

---

## Ingestion Pipeline
When an artist submits a release:
1. The release enters a `PROCESSING` state.
2. A background process simulates transcoding and metadata extraction.
3. Once all tracks are processed, the release automatically transitions to
  `PENDING_REVIEW`.

This logic is intentionally separated from HTTP handlers to reflect a
production-style architecture.

---

## Authentication & RBAC
Authentication is implemented using JWT.
Role-based access control ensures:
- Artists can manage only their own releases.
- Admins can review, approve, or reject releases.

---

## ErrorHandling
The backend implements centralized error handling to ensure:
- Consistent API responses
- Graceful handling of invalid input
- Database consistency during failures

---

## Testing Strategy
The project includes:
- Unit tests for core business logic (status transitions, validation)
- Integration tests for critical API flows

---

## Trade-offs& Limitations
Due to the 1-week scope:
- Polling is used instead of WebSockets for real-time updates.
- Asynchronous processing is simulated in-memory.
- The UI focuses on clarity over advanced visual design.

---

## Setup Instructions
Detailed setup instructions will be provided, including:
- Environment variables
- Database initialization
- Cloud storage configuration
