import { openDb } from "./db.js";

// Fixed timestamps keep the seed deterministic.
// Sarah's activities are inserted out of time order on purpose (the email has a
// higher id than the call but an earlier time), so ordering by created_at is visible.
const leads = [
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    phone: "555-0101",
    vehicle_interest: "2025 Honda CR-V Hybrid",
    message: "Interested in a test drive this weekend.",
    created_at: "2025-03-10T09:00:00.000Z",
    activities: [
      { type: "call", note: "Called to confirm test drive availability.", created_at: "2025-03-11T10:00:00.000Z" },
      { type: "email", note: "Sent brochure and pricing options.", created_at: "2025-03-10T16:30:00.000Z" },
      { type: "meeting", note: "Test drive completed at the dealership.", created_at: "2025-03-13T09:00:00.000Z" },
    ],
  },
  {
    name: "Michael Chen",
    email: "michael.chen@example.com",
    phone: "555-0102",
    vehicle_interest: "Used Ford F-150",
    message: "Do you have any low-mileage trucks in stock?",
    created_at: "2025-03-11T13:15:00.000Z",
    activities: [
      { type: "note", note: "Checked stock: two matching trucks available.", created_at: "2025-03-12T09:00:00.000Z" },
    ],
  },
  {
    name: "Priya Patel",
    email: "priya.patel@example.com",
    phone: null,
    vehicle_interest: "Electric SUV",
    message: "Please send me information on financing.",
    created_at: "2025-03-12T08:45:00.000Z",
    activities: [],
  },
];

const db = openDb();

try {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM leads").get() as { count: number };

  if (count > 0) {
    console.log(`Database already seeded (${count} leads). No changes made.`);
  } else {
    const insertLead = db.prepare(
      `INSERT INTO leads (name, email, phone, vehicle_interest, message, created_at)
       VALUES (@name, @email, @phone, @vehicle_interest, @message, @created_at)`,
    );
    const insertActivity = db.prepare(
      `INSERT INTO activities (lead_id, type, note, created_at)
       VALUES (@lead_id, @type, @note, @created_at)`,
    );

    const seedAll = db.transaction(() => {
      for (const { activities, ...lead } of leads) {
        const leadId = Number(insertLead.run(lead).lastInsertRowid);
        for (const activity of activities) {
          insertActivity.run({ lead_id: leadId, ...activity });
        }
      }
    });
    seedAll();

    console.log(`Seeded ${leads.length} leads.`);
  }
} finally {
  db.close();
}
