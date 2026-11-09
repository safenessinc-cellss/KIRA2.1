export interface OutboxFailureInput {
  id: string;
  eventId?: string;
  type?: string;
  aggregate?: string;
  aggregateId?: string;
  schemaVersion?: number;
  payload?: unknown;
  attempts?: number;
  createdAt?: string;
}

export interface OutboxFailureTransition {
  status: "pending" | "failed";
  attempts: number;
  nextAttemptAt: string | null;
  leaseUntil: null;
  claimToken: null;
  lastError: string;
  failedAt: string | null;
  deadLetter: null | {
    id: string;
    sourceEventId: string;
    eventId: string;
    type: string;
    aggregate: string;
    aggregateId: string;
    schemaVersion: number;
    payload: unknown;
    attempts: number;
    lastError: string;
    status: "pending_review";
    createdAt: string;
    failedAt: string;
  };
}

export function outboxFailureTransition(
  event: OutboxFailureInput,
  error: unknown,
  now = Date.now(),
  maxAttempts = 8,
  baseDelayMs = 30_000,
  maxDelayMs = 3_600_000
): OutboxFailureTransition {
  const attempts = Math.max(1, Math.floor(Number(event.attempts) || 1));
  const lastError = String(error instanceof Error ? error.message : error || "outbox_processing_error").slice(0, 300);
  const terminal = attempts >= maxAttempts;
  const failedAt = terminal ? new Date(now).toISOString() : null;
  const nextAttemptAt = terminal
    ? null
    : new Date(now + Math.min(maxDelayMs, baseDelayMs * (2 ** Math.max(0, attempts - 1)))).toISOString();

  return {
    status: terminal ? "failed" : "pending",
    attempts,
    nextAttemptAt,
    leaseUntil: null,
    claimToken: null,
    lastError,
    failedAt,
    deadLetter: terminal ? {
      id: event.id,
      sourceEventId: event.id,
      eventId: String(event.eventId || event.id),
      type: String(event.type || "unknown"),
      aggregate: String(event.aggregate || "unknown"),
      aggregateId: String(event.aggregateId || ""),
      schemaVersion: Math.max(1, Number(event.schemaVersion) || 1),
      payload: event.payload ?? null,
      attempts,
      lastError,
      status: "pending_review",
      createdAt: String(event.createdAt || failedAt),
      failedAt: failedAt!
    } : null
  };
}
