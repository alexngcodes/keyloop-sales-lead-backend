# Keyloop Sales Lead Backend

Backend for **Scenario C: The Sales Lead Management Tool** from the Keyloop technical assessment. A small REST API, backed by a file-based SQLite database, that lets a salesperson list incoming website leads, open one lead with its follow-up history, and log a new follow-up activity.

Only the backend layer is implemented. There is no frontend; the API is exercised with cURL and an automated test suite.

- System design: [docs/system-design.md](docs/system-design.md)
- Approved scope and checkpoints: [PLAN.md](PLAN.md)
- Rules the AI coding agent worked under: [CLAUDE.md](CLAUDE.md)

## What it does

1. **List leads:** `GET /leads` returns all leads, newest first.
2. **Retrieve one lead:** `GET /leads/:id` returns the lead with its activities in chronological order (oldest first).
3. **Persist an activity:** `POST /leads/:id/activities` validates and stores a follow-up activity. The server generates the timestamp.

Data is stored in a SQLite file (`data/keyloop.db` by default), so it survives restarts.

## Quick start

Requires **Node.js 24** (see [.nvmrc](.nvmrc)) and npm.

```bash
nvm use        # optional; selects Node 24 from .nvmrc
npm ci         # installs the exact versions from package-lock.json
npm run seed   # creates data/keyloop.db with 3 demo leads
npm run dev    # starts the server on http://localhost:3000
```

Check it:

```bash
curl http://localhost:3000/health
```

To run the compiled build instead of the dev server: `npm run build && npm start`.

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Runs the server with `tsx watch`, restarting on changes. |
| `npm run build` | Type-checks and compiles `src/` to `dist/` with `tsc`. |
| `npm start` | Runs the compiled server (`node dist/server.js`). Run `npm run build` first. |
| `npm run seed` | Inserts the demo data if the database has no leads; otherwise says it is already seeded and changes nothing. |
| `npm test` | Runs the test suite once with `vitest run`. |

## Environment variables

All optional.

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port the server listens on. |
| `DB_PATH` | `data/keyloop.db` | SQLite file, relative to the directory the command is run from. The folder is created if needed. Used by the server and `npm run seed`. |
| `LOG_LEVEL` | `info` | pino log level, for example `info`, `warn` or `silent`. |

## API

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/health` | `200` `{"status":"ok"}` | none |
| GET | `/leads` | `200` array of leads, newest first, without activities | none |
| GET | `/leads/:id` | `200` lead with an `activities` array, oldest first | `400 INVALID_LEAD_ID`, `404 LEAD_NOT_FOUND` |
| POST | `/leads/:id/activities` | `201` the created activity | `400 INVALID_LEAD_ID`, `400 INVALID_ACTIVITY`, `404 LEAD_NOT_FOUND` |

- `:id` must be a positive integer.
- The POST body is JSON `{"type": "...", "note": "..."}`. `type` is one of `call`, `email`, `meeting`, `note`. `note` is a string; surrounding whitespace is trimmed and the result must not be empty. Other fields (including any `createdAt`) are ignored.
- Errors always look like `{"error":{"code":"LEAD_NOT_FOUND","message":"Lead not found"}}`.

### cURL examples

Run against the seeded demo data on port 3000. The responses are real output; the `id` and `createdAt` of a newly created activity will differ on your machine.

```bash
curl http://localhost:3000/health
```
```json
{"status":"ok"}
```

```bash
curl http://localhost:3000/leads
```
```json
[{"id":3,"name":"Priya Patel","email":"priya.patel@example.com","phone":null,"vehicleInterest":"Electric SUV","message":"Please send me information on financing.","createdAt":"2025-03-12T08:45:00.000Z"},{"id":2,"name":"Michael Chen","email":"michael.chen@example.com","phone":"555-0102","vehicleInterest":"Used Ford F-150","message":"Do you have any low-mileage trucks in stock?","createdAt":"2025-03-11T13:15:00.000Z"},{"id":1,"name":"Sarah Johnson","email":"sarah.johnson@example.com","phone":"555-0101","vehicleInterest":"2025 Honda CR-V Hybrid","message":"Interested in a test drive this weekend.","createdAt":"2025-03-10T09:00:00.000Z"}]
```

One lead with its activities. Activity id 2 comes first because it happened first; ids are not in time order on purpose.

```bash
curl http://localhost:3000/leads/1
```
```json
{"id":1,"name":"Sarah Johnson","email":"sarah.johnson@example.com","phone":"555-0101","vehicleInterest":"2025 Honda CR-V Hybrid","message":"Interested in a test drive this weekend.","createdAt":"2025-03-10T09:00:00.000Z","activities":[{"id":2,"type":"email","note":"Sent brochure and pricing options.","createdAt":"2025-03-10T16:30:00.000Z"},{"id":1,"type":"call","note":"Called to confirm test drive availability.","createdAt":"2025-03-11T10:00:00.000Z"},{"id":3,"type":"meeting","note":"Test drive completed at the dealership.","createdAt":"2025-03-13T09:00:00.000Z"}]}
```

A lead with no activities (`/leads/3`) returns `"activities":[]`.

Create an activity (HTTP `201`):

```bash
curl -X POST http://localhost:3000/leads/1/activities \
  -H "Content-Type: application/json" \
  -d '{"type":"call","note":"Sarah confirmed her appointment."}'
```
```json
{"id":5,"type":"call","note":"Sarah confirmed her appointment.","createdAt":"2026-11-01T03:51:58.229Z"}
```

Fetch `/leads/1` again and the new activity appears last.

Errors:

```bash
curl -i http://localhost:3000/leads/999
# 404  {"error":{"code":"LEAD_NOT_FOUND","message":"Lead not found"}}

curl -i http://localhost:3000/leads/abc
# 400  {"error":{"code":"INVALID_LEAD_ID","message":"Lead id must be a positive integer"}}

curl -i -X POST http://localhost:3000/leads/1/activities \
  -H "Content-Type: application/json" \
  -d '{"type":"fax","note":"x"}'
# 400  {"error":{"code":"INVALID_ACTIVITY","message":"Invalid activity data"}}

curl -i -X POST http://localhost:3000/leads/999/activities \
  -H "Content-Type: application/json" \
  -d '{"type":"call","note":"x"}'
# 404  {"error":{"code":"LEAD_NOT_FOUND","message":"Lead not found"}}
```

## Testing, build and audit

```bash
npm test                 # the 11 test cases in tests/api.test.ts
npm run build            # strict TypeScript type-check and compile
npm audit                # all dependencies
npm audit --omit=dev     # runtime dependencies only
```

The tests use Supertest against `createApp(db)` with an in-memory SQLite database and their own deterministic fixtures. They never touch `data/keyloop.db` and never open a real port. They cover the health check, list ordering, chronological activity order (including activity ids that are out of time order), empty activities, unknown and invalid lead ids, creating an activity and seeing it on the next read, rejected activity bodies (bad type, whitespace-only note, malformed JSON) and posting to an unknown lead.

Persistence across a restart is not an automated test. It was verified by hand: seed a separate database, POST an activity, restart the server on the same `DB_PATH`, and GET the lead again.

## Project structure

```
src/
  server.ts          entry point: opens the database, starts HTTP, shuts down cleanly
  app.ts             createApp(db): logging, JSON parsing, routes, error handler
  db.ts              opens SQLite, enables foreign keys, applies the schema
  seed.ts            CLI script that inserts the demo data
  errors.ts          error classes and the error-handling middleware
  leads/
    routes.ts        HTTP endpoints and id validation
    schemas.ts       Zod schema for a new activity
    service.ts       business rules
    repository.ts    all SQL
tests/api.test.ts    Supertest tests on an in-memory database
docs/system-design.md
```

Request flow: `routes → service → repository → SQLite`. Stack: TypeScript on Node.js, Express 5, better-sqlite3, Zod, pino and pino-http, Vitest and Supertest. Reasons for each choice are in the [system design](docs/system-design.md#7-technology-choices).

## Assumptions and scope

- Leads come from the dealership website via another system, so this service only reads them. Demo leads are seeded; there is no create-lead endpoint.
- An activity is a `type` plus a free-text `note`, append-only, with a server-generated UTC timestamp. There is no author field.

Intentionally not included:

- No authentication or authorization.
- One dealership only.
- Local, single-instance SQLite storage, not a networked database.
- `GET /leads` is unpaginated.
- `GET /health` is liveness-only; it does not check the database.
- No frontend, status management, Docker/CI, OpenAPI document, or metrics and tracing infrastructure.

The [system design](docs/system-design.md) explains how these would be added in production.

## AI Collaboration Narrative

This project was built with **Claude Code** (Anthropic's AI coding agent) as a collaborator, as the assessment asks. Claude Code generated the code, tests and documentation. My role was to set the scope, direct the work, review every result, and decide what to accept. I am responsible for the final code, and I have not presented AI-written code as hand-written.

**How AI was used.** Claude Code was used for planning (assumptions, architecture, data model, endpoints, test mapping), scaffolding, implementation, test writing, code walkthroughs and review, and drafting this documentation.

**Controlling the agent.**

- **Plan first, then reduce it.** I asked for a plan before any code. The first plan was technically sound but too broad for a take-home: it included lead creation, pagination, status filtering, an OpenAPI spec, request IDs, WAL mode and several overlapping test suites. I deliberately cut it back to the three required behaviours. The result is the approved plan in [PLAN.md](PLAN.md).
- **Written guardrails.** [CLAUDE.md](CLAUDE.md) fixes the endpoints, the stack, the architecture, the database rules and a scope-exclusion list. It says dependencies must be justified first, that only one checkpoint is worked on at a time, and that the agent must not commit. PLAN.md may not be changed without approval.
- **Small checkpoints.** The work was split into independently verifiable checkpoints: scaffold and health, database and seed, read endpoints, activity creation, and documentation. At each checkpoint the agent first stated which files it would touch, then implemented, then ran the tests, the build and manual checks, and then stopped for review.
- **Review before every commit.** I read the summary, diff and verification output for each checkpoint, sometimes asking for a read-only code walkthrough first, and only then committed. The agent never committed.

**Verification and corrections.** Several problems were caught during review rather than assumed away:

- **Non-portable test script.** The first `npm test` script was `LOG_LEVEL=silent vitest run`, which works on macOS and Linux but not in Windows cmd. I asked for `vitest run`, accepting some log output in test runs rather than adding a dependency such as `cross-env`.
- **Vulnerable test dependencies.** `npm audit` reported vulnerabilities in `tinypool` and `@vitest/mocker`, both pulled in by the test runner Vitest 3.2.7 (development only; the runtime dependencies had none). I did not accept the finding and did not run `npm audit fix --force`, which would have installed an older, breaking Vitest. I asked for the smallest targeted upgrade, to Vitest 4.1.12. This is a major-version upgrade, which was flagged before it was installed.
- **npm resolver crash.** The install failed with an internal npm error (`Cannot read properties of null (reading 'edgesOut')`). The agent stopped and reported it instead of improvising. I approved a one-time newer npm via `npx` without changing the global installation or deleting `node_modules` or the lockfile. After the upgrade the audit reported 0 vulnerabilities and the tests still passed.
- **Unsupported Node version.** The install warned that Vitest 4 does not officially support Node 23.1. I moved the project to Node 24 LTS, added `.nvmrc`, reinstalled with `npm ci` and confirmed by checksum that `package.json` and `package-lock.json` were unchanged. While doing this, a piped `nvm use` silently left the shell on Node 20, so every later command re-activated and confirmed Node 24 first.
- **Invalid foreign-key verification.** The first check that foreign keys were enforced used double-quoted strings, which SQLite treated as column names. The resulting error looked like a foreign-key rejection but was not. It was noticed during review and repeated correctly, showing `SQLITE_CONSTRAINT_FOREIGNKEY` on both in-memory and file connections.
- **Test count.** The activity-creation checkpoint was expected to end with nine tests. It had 11 because one parameterized test expands to three cases. The difference was reported, not hidden, and [PLAN.md](PLAN.md) now lists the 11 cases.
- **Unrequested edge case.** Malformed JSON would have produced a `500`. The agent flagged it and mapped it to the existing `400 INVALID_ACTIVITY`, covered by a test.

**How quality was ensured.**

- Automated tests: 11 Supertest test cases against an in-memory database with deterministic fixtures. A deliberate seed and fixture choice (activity ids not in time order) makes the chronological-ordering test meaningful.
- `npm run build` (strict TypeScript) and `npm audit` / `npm audit --omit=dev` at each checkpoint.
- Manual cURL checks of every endpoint and error case against the running server.
- A restart-based persistence test: seed a separate database, POST an activity, stop the server, restart it on the same file, and confirm the activity is still returned. The ordinary development database was checksummed before and after to prove the test did not modify it.
- A rule that a failed command is reported as a failure, never described as a success.
- Honest limits: the tests are API-level only, and I did not measure coverage or performance.
