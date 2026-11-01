import { z } from "zod";

export const ACTIVITY_TYPES = ["call", "email", "meeting", "note"] as const;

// The timestamp is not part of the input: the server generates it.
export const createActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  note: z.string().trim().min(1),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
