import { runAudit } from "./engine";
import { getSpecimen } from "./specimens";
import type { AuditReport } from "./types";

const cache = new Map<string, Promise<AuditReport>>();

/**
 * Specimens are deterministic, so a single measured report is shared between
 * the landing instrument and the inspector for the life of the session.
 */
export function auditSpecimen(id: string): Promise<AuditReport> {
  const specimen = getSpecimen(id);
  const existing = cache.get(specimen.id);
  if (existing) return existing;
  const job = runAudit({
    html: specimen.html,
    url: `https://${specimen.domain}`,
    displayUrl: specimen.domain,
    source: "specimen",
    specimenId: specimen.id,
    notes: [
      `${specimen.name} is a built-in specimen: complete HTML that is rendered and measured locally.`,
    ],
  });
  cache.set(specimen.id, job);
  return job;
}
