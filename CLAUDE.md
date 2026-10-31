# Keyloop Sales Lead Backend

## Project goal

Implement the backend for Scenario C of the Keyloop assessment.

The application has only three required behaviours:

1. List all leads.
2. Retrieve one lead with activities in chronological order.
3. Add and persist an activity for a lead.

The complete approved scope and checkpoints are documented in PLAN.md.
Do not modify PLAN.md or expand its scope without explicit approval.

## Required endpoints

- GET /health
- GET /leads
- GET /leads/:id
- POST /leads/:id/activities

Do not add other endpoints unless explicitly requested.

## Technology

- TypeScript
- Node.js
- Express
- better-sqlite3
- Zod
- pino and pino-http
- Vitest
- Supertest

Do not add dependencies without first explaining why they are necessary.

## Architecture

Use this flow:

routes -> service -> repository -> SQLite

Responsibilities:

- Routes handle HTTP requests and Zod validation.
- Services apply business rules.
- Repositories contain SQL and database access.
- SQLite provides persistent local storage.

Keep the implementation small and easy to explain.

## Scope restrictions

Do not implement:

- A frontend
- Authentication or authorization
- Lead creation, editing or deletion
- Status management
- Pagination or filtering
- Multiple dealerships
- OpenAPI documentation
- Docker or CI
- PostgreSQL
- Message queues
- Metrics or tracing infrastructure
- Skills, subagents, hooks or MCP integrations

These can be discussed as future improvements in the system design document.

## Working method

- Work on only one approved checkpoint at a time.
- Before editing, briefly state which files you expect to create or modify.
- Do not continue into the next checkpoint automatically.
- Do not refactor unrelated code.
- Do not make Git commits.
- After a meaningful implementation change, run the relevant tests.
- Before declaring a checkpoint complete, run `npm test` and `npm run build`.
- Report errors honestly; do not claim success if a command failed.
- Explain any deviation from PLAN.md before making it.
- Prefer the simplest implementation that satisfies the acceptance criteria.

## Database rules

- Development uses a file-backed SQLite database.
- Tests may use an in-memory SQLite database.
- Do not commit database files.
- Enable SQLite foreign keys.
- Seed data must be deterministic and must not duplicate itself when rerun.

## Completion rules

A checkpoint is complete only when:

1. Its requested behaviour works.
2. Relevant tests pass.
3. The TypeScript build passes.
4. The changes have been explained.
5. No work from later checkpoints has been introduced.

For checkpoint 1 only, use `createApp()` without a database argument.
Checkpoint 2 may change it to `createApp(db)` when the database exists.
