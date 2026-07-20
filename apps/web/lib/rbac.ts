import { Role } from "@founderos/db";
import type { Session } from "next-auth";

/**
 * The VA executes; the founder decides. A handful of actions — anything
 * that redefines who the founder is or what the agents target — are gated
 * to FOUNDER/ADMIN. Everything else (queue execution, status updates) is
 * open to both roles. Extend this table as new gated actions are added
 * rather than scattering role checks through the UI.
 */
const FOUNDER_AND_ADMIN: Role[] = [Role.FOUNDER, Role.ADMIN];

export function hasRole(session: Session | null, allowed: Role[]): boolean {
  if (!session?.user) return false;
  return allowed.includes(session.user.role as Role);
}

export function canEditKnowledgeBase(session: Session | null): boolean {
  return hasRole(session, FOUNDER_AND_ADMIN);
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertRole(session: Session | null, allowed: Role[]): void {
  if (!hasRole(session, allowed)) throw new ForbiddenError();
}
