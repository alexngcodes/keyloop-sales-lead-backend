import { NotFoundError } from "../errors.js";
import type { LeadRepository } from "./repository.js";
import type { CreateActivityInput } from "./schemas.js";

export function createLeadService(repository: LeadRepository) {
  function requireLead(id: number) {
    const lead = repository.findLeadById(id);
    if (!lead) {
      throw new NotFoundError("LEAD_NOT_FOUND", "Lead not found");
    }
    return lead;
  }

  return {
    listLeads() {
      return repository.listLeads();
    },

    getLeadWithActivities(id: number) {
      const lead = requireLead(id);
      return { ...lead, activities: repository.listActivitiesForLead(id) };
    },

    createActivity(leadId: number, input: CreateActivityInput) {
      requireLead(leadId);
      return repository.createActivity(leadId, { ...input, createdAt: new Date().toISOString() });
    },
  };
}

export type LeadService = ReturnType<typeof createLeadService>;
