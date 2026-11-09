export type CoachLeadStage = "new" | "contacted" | "qualified" | "enrolled" | "lost";

const stageAliases: Record<string, CoachLeadStage> = {
  new: "new", lead: "new", new_lead: "new",
  contacted: "contacted", contactado: "contacted", in_contact: "contacted",
  qualified: "qualified", calificado: "qualified",
  enrolled: "enrolled", converted: "enrolled", won: "enrolled", matriculado: "enrolled",
  lost: "lost", closed_lost: "lost", perdido: "lost"
};

export function normalizeCoachLeadStage(value: unknown): CoachLeadStage | null {
  return stageAliases[String(value ?? "").trim().toLowerCase()] ?? null;
}

export function coachClientIdentity(session: Record<string, unknown>): string | null {
  const value = session.clientId || session.clientUid || session.studentId || session.clientName || session.customerName;
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().toLocaleLowerCase();
}

export function calculateCoachClientRetention(sessions: readonly Record<string, unknown>[]) {
  const counts = new Map<string, number>();
  let identifiedSessions = 0;
  for (const session of sessions) {
    const identity = coachClientIdentity(session);
    if (!identity) continue;
    identifiedSessions++;
    counts.set(identity, (counts.get(identity) || 0) + 1);
  }
  const uniqueClients = counts.size;
  const returningClients = [...counts.values()].filter(count => count > 1).length;
  return {
    uniqueClients,
    returningClients,
    identifiedSessions,
    rate: uniqueClients ? Math.round(returningClients / uniqueClients * 1000) / 10 : 0
  };
}

export function validateHomeworkReview(input: {
  status: unknown; score: unknown; feedback: unknown; energyPoints: unknown;
}): boolean {
  const score = Number(input.score);
  const points = Number(input.energyPoints);
  const feedback = String(input.feedback ?? "").trim();
  return (input.status === "approved" || input.status === "needs_correction")
    && Number.isInteger(score) && score >= 0 && score <= 100
    && feedback.length >= 2 && feedback.length <= 5000
    && Number.isInteger(points) && points >= 0 && points <= 100;
}

export function homeworkPointsAward(status: unknown, pointsAwardedAt: unknown, requestedPoints: number): number {
  if (status !== "approved" || pointsAwardedAt || !Number.isInteger(requestedPoints)) return 0;
  return Math.max(0, Math.min(100, requestedPoints));
}
