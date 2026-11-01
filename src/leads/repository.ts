import type { Db } from "../db.js";

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  vehicleInterest: string | null;
  message: string | null;
  createdAt: string;
}

export interface Activity {
  id: number;
  type: string;
  note: string;
  createdAt: string;
}

// SQL aliases (AS) turn snake_case columns into the camelCase names used by the API.
export function createLeadRepository(db: Db) {
  const listLeads = db.prepare(
    `SELECT id, name, email, phone, vehicle_interest AS vehicleInterest, message, created_at AS createdAt
     FROM leads
     ORDER BY created_at DESC, id DESC`,
  );
  const findLead = db.prepare(
    `SELECT id, name, email, phone, vehicle_interest AS vehicleInterest, message, created_at AS createdAt
     FROM leads
     WHERE id = ?`,
  );
  const listActivities = db.prepare(
    `SELECT id, type, note, created_at AS createdAt
     FROM activities
     WHERE lead_id = ?
     ORDER BY created_at ASC, id ASC`,
  );

  const insertActivity = db.prepare(
    "INSERT INTO activities (lead_id, type, note, created_at) VALUES (?, ?, ?, ?)",
  );

  return {
    listLeads: () => listLeads.all() as Lead[],
    findLeadById: (id: number) => findLead.get(id) as Lead | undefined,
    listActivitiesForLead: (leadId: number) => listActivities.all(leadId) as Activity[],
    createActivity(leadId: number, { type, note, createdAt }: Omit<Activity, "id">): Activity {
      const { lastInsertRowid } = insertActivity.run(leadId, type, note, createdAt);
      return { id: Number(lastInsertRowid), type, note, createdAt };
    },
  };
}

export type LeadRepository = ReturnType<typeof createLeadRepository>;
