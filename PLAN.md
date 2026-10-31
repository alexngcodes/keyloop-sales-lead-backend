# Scenario C – Sales Lead Backend: Plan (revised, minimal)

## Context
Keyloop take-home, Scenario C, backend only. Goal: finish and clearly explain three behaviours: list leads, get one lead with chronological activities, add an activity (persisted). Local repository for the Keyloop Scenario C backend assessment.

## Assumptions (documented in system-design.md)
- Leads arrive from the website elsewhere; we seed demo leads. No create-lead endpoint.
- Activity = `type` (call | email | meeting | note) + free-text `note`. Timestamp is server-generated (UTC ISO-8601). No author field, no auth.
- Activities are append-only. Order: `created_at ASC, id ASC`. Lead list: newest first.
- Single dealership; integer autoincrement ids.

## Stack
TypeScript, Node, Express, better-sqlite3 (file-backed), Zod, pino + pino-http, Vitest, Supertest. Nothing else.

## Architecture
`routes (HTTP + Zod) → service (rules, NotFound) → repository (SQL)`.
`createApp(db)` takes a DB handle so tests pass `:memory:`. One error middleware maps `NotFoundError` → 404, `ZodError` → 400, else 500, logging the error via pino.

## Data model
```sql
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  vehicle_interest TEXT, message TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  type TEXT NOT NULL, note TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id, created_at, id);
```
`foreign_keys=ON`. Schema applied idempotently at startup.

## Endpoints
| Method | Path | Result |
|---|---|---|
| GET | `/health` | 200 `{status:"ok"}` |
| GET | `/leads` | 200 array of leads, newest first |
| GET | `/leads/:id` | 200 lead + `activities[]` chronological; 400 bad id; 404 unknown |
| POST | `/leads/:id/activities` body `{type, note}` | 201 created activity; 400 invalid body; 404 unknown lead |

## Folder structure
```
keyloop/
├── README.md              run/test, cURL examples, AI Collaboration Narrative
├── PLAN.md                this plan
├── docs/system-design.md  Mermaid diagram, components, data flow, tech, observability, GenAI use
├── src/
│   ├── server.ts          entrypoint (config, open DB, listen)
│   ├── app.ts             createApp(db): logging, routes, error middleware
│   ├── db.ts              open SQLite, apply schema
│   ├── seed.ts            demo leads + a few activities
│   ├── leads/             routes.ts, service.ts, repository.ts, schemas.ts
│   └── errors.ts          NotFoundError + error middleware
├── tests/api.test.ts      single focused test file
└── package.json, tsconfig.json, .gitignore
```

## Tests (tests/api.test.ts, Supertest + in-memory DB, 7 tests)
1. `GET /health` → 200.
2. `GET /leads` → seeded leads, newest first. (R1)
3. `GET /leads/:id` → lead with activities in chronological order. (R2)
4. `GET /leads/:id` unknown id → 404. (R2)
5. `POST /leads/:id/activities` valid → 201, and activity appears in subsequent GET detail, last in order. (R3)
6. `POST` invalid body (bad type / empty note) → 400. (R3)
7. `POST` to unknown lead → 404. (R3)

File-backed persistence (R4) is verified manually in checkpoint 5: create activity, restart server, GET again.

## Checkpoints (five)
1. **Scaffold and health** — package.json, tsconfig, Vitest, `createApp`, `/health`, pino-http logging. Verify: `npm test` (test 1), `npm run build`, `curl /health`.
2. **Database and seed** — `db.ts`, schema, `seed.ts`. Verify: `npm run seed`, inspect rows with `sqlite3`.
3. **Lead read endpoints** — repository, service, routes, error middleware. Verify: tests 2–4, curl.
4. **Activity creation** — Zod schema, POST route. Verify: tests 5–7, curl.
5. **Documentation and final verification** — README (build/run/test, cURL, AI narrative), system-design.md (Mermaid). Verify: fresh `npm install && npm test`, start server, run README cURL commands, restart and confirm data persisted.

## Removed from earlier plan
POST /leads, status and filtering, pagination, performedBy, backdating/future-date validation, OpenAPI and /docs, WAL, request IDs, logging tests, duplicated unit/integration suites, DB constraint tests, coverage targets.

## Out of scope (mention as future work in design doc)
Auth, multi-dealership, lead ingestion webhook/queue, edit/delete, pagination, metrics/tracing, Postgres, Docker/CI.
