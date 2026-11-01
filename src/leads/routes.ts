import { Router } from "express";
import { AppError } from "../errors.js";
import { createActivitySchema } from "./schemas.js";
import type { LeadService } from "./service.js";

function parseLeadId(raw: string): number {
  const id = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(id)) {
    throw new AppError(400, "INVALID_LEAD_ID", "Lead id must be a positive integer");
  }
  return id;
}

export function createLeadRouter(service: LeadService) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(service.listLeads());
  });

  router.get("/:id", (req, res) => {
    const id = parseLeadId(req.params.id);
    res.json(service.getLeadWithActivities(id));
  });

  router.post("/:id/activities", (req, res) => {
    const id = parseLeadId(req.params.id);
    const input = createActivitySchema.parse(req.body);
    res.status(201).json(service.createActivity(id, input));
  });

  return router;
}
