import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { openDb, type Db } from "../src/db.js";

let db: Db;

// Deterministic fixtures, inserted into a fresh in-memory database for every test.
// Lead 1's activities are inserted out of time order: id 2 (email) is earlier than id 1 (call).
beforeEach(() => {
  db = openDb(":memory:");

  const insertLead = db.prepare(
    `INSERT INTO leads (name, email, phone, vehicle_interest, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insertLead.run("Sarah Johnson", "sarah@example.com", "555-0101", "Honda CR-V", "Test drive?", "2025-03-10T09:00:00.000Z");
  insertLead.run("Michael Chen", "michael@example.com", "555-0102", "Ford F-150", "Any trucks?", "2025-03-11T13:15:00.000Z");
  insertLead.run("Priya Patel", "priya@example.com", null, "Electric SUV", "Financing info?", "2025-03-12T08:45:00.000Z");

  const insertActivity = db.prepare(
    "INSERT INTO activities (lead_id, type, note, created_at) VALUES (?, ?, ?, ?)",
  );
  insertActivity.run(1, "call", "Called to confirm.", "2025-03-11T10:00:00.000Z");
  insertActivity.run(1, "email", "Sent brochure.", "2025-03-10T16:30:00.000Z");
  insertActivity.run(1, "meeting", "Test drive done.", "2025-03-13T09:00:00.000Z");
});

afterEach(() => {
  db.close();
});

describe("API", () => {
  it("GET /health returns 200 and { status: 'ok' }", async () => {
    const res = await request(createApp(db)).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /leads returns the leads newest first, without activities", async () => {
    const res = await request(createApp(db)).get("/leads");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 3,
        name: "Priya Patel",
        email: "priya@example.com",
        phone: null,
        vehicleInterest: "Electric SUV",
        message: "Financing info?",
        createdAt: "2025-03-12T08:45:00.000Z",
      },
      {
        id: 2,
        name: "Michael Chen",
        email: "michael@example.com",
        phone: "555-0102",
        vehicleInterest: "Ford F-150",
        message: "Any trucks?",
        createdAt: "2025-03-11T13:15:00.000Z",
      },
      {
        id: 1,
        name: "Sarah Johnson",
        email: "sarah@example.com",
        phone: "555-0101",
        vehicleInterest: "Honda CR-V",
        message: "Test drive?",
        createdAt: "2025-03-10T09:00:00.000Z",
      },
    ]);
  });

  it("GET /leads/:id returns activities in chronological order, not id order", async () => {
    const res = await request(createApp(db)).get("/leads/1");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Sarah Johnson");
    expect(res.body.vehicleInterest).toBe("Honda CR-V");
    expect(res.body.activities).toEqual([
      { id: 2, type: "email", note: "Sent brochure.", createdAt: "2025-03-10T16:30:00.000Z" },
      { id: 1, type: "call", note: "Called to confirm.", createdAt: "2025-03-11T10:00:00.000Z" },
      { id: 3, type: "meeting", note: "Test drive done.", createdAt: "2025-03-13T09:00:00.000Z" },
    ]);
  });

  it("GET /leads/:id returns an empty activities array for a lead with none", async () => {
    const res = await request(createApp(db)).get("/leads/3");

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Priya Patel");
    expect(res.body.activities).toEqual([]);
  });

  it("GET /leads/:id returns 404 for an unknown lead", async () => {
    const res = await request(createApp(db)).get("/leads/999");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "LEAD_NOT_FOUND", message: "Lead not found" } });
  });

  it("GET /leads/:id returns 400 when the id is not a positive integer", async () => {
    const res = await request(createApp(db)).get("/leads/not-a-number");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: "INVALID_LEAD_ID", message: "Lead id must be a positive integer" },
    });
  });

  const countActivities = () =>
    (db.prepare("SELECT COUNT(*) AS count FROM activities").get() as { count: number }).count;

  it("POST /leads/:id/activities creates a trimmed activity that persists in chronological order", async () => {
    const app = createApp(db);

    const created = await request(app)
      .post("/leads/1/activities")
      .send({ type: "call", note: "  Sarah confirmed her appointment.  " });

    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: 4,
      type: "call",
      note: "Sarah confirmed her appointment.",
      createdAt: expect.any(String),
    });
    expect(new Date(created.body.createdAt).toISOString()).toBe(created.body.createdAt);

    // The fixtures are all dated 2025, so a new activity timestamped "now" sorts last.
    const detail = await request(app).get("/leads/1");
    expect(detail.body.activities.map((a: { id: number }) => a.id)).toEqual([2, 1, 3, 4]);
    expect(detail.body.activities[3]).toEqual(created.body);
  });

  it.each([
    ["an unsupported type", { type: "phone", note: "Called." }],
    ["a whitespace-only note", { type: "call", note: "   " }],
    ["malformed JSON", '{"type": "call", "note": '],
  ])("POST /leads/:id/activities returns 400 for %s", async (_name, body) => {
    const res = await request(createApp(db))
      .post("/leads/1/activities")
      .set("Content-Type", "application/json")
      .send(typeof body === "string" ? body : JSON.stringify(body));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: "INVALID_ACTIVITY", message: "Invalid activity data" } });
    expect(countActivities()).toBe(3);
  });

  it("POST /leads/:id/activities returns 404 for an unknown lead and inserts nothing", async () => {
    const res = await request(createApp(db))
      .post("/leads/999/activities")
      .send({ type: "note", note: "Nobody to attach this to." });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "LEAD_NOT_FOUND", message: "Lead not found" } });
    expect(countActivities()).toBe(3);
  });
});
