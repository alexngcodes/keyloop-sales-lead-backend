import { NotFoundError } from "../errors.js";
import type { LeadRepository } from "./repository.js";

export function createLeadService(repository: LeadRepository) {
  return {
    listLeads() {
      return repository.listLeads();
    },

    getLeadWithActivities(id: number) {
      const lead = repository.findLeadById(id);
      if (!lead) {
        throw new NotFoundError("LEAD_NOT_FOUND", "Lead not found");
      }
      return { ...lead, activities: repository.listActivitiesForLead(id) };
    },
  };
}

export type LeadService = ReturnType<typeof createLeadService>;
