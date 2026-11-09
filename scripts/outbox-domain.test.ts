import test from "node:test";
import assert from "node:assert/strict";
import { isOutboxEventEligible, outboxFailureTransition } from "../server/outbox-domain";

const event = {
  id: "attendance_marked_student_group",
  eventId: "session.attendance_marked.student_group",
  type: "session.attendance_marked.v1",
  aggregate: "attendance",
  aggregateId: "student_group",
  schemaVersion: 1,
  payload: { studentId: "student-1", groupId: "group-1" },
  attempts: 1,
  createdAt: "2026-11-09T00:00:00.000Z"
};

test("outbox failures use capped exponential retry and clear the lease", () => {
  const result = outboxFailureTransition({ ...event, attempts: 3 }, new Error("temporary"), 0);
  assert.equal(result.status, "pending");
  assert.equal(result.attempts, 3);
  assert.equal(result.nextAttemptAt, new Date(120_000).toISOString());
  assert.equal(result.leaseUntil, null);
  assert.equal(result.claimToken, null);
  assert.equal(result.deadLetter, null);
});

test("outbox retry delay is capped at one hour", () => {
  const result = outboxFailureTransition({ ...event, attempts: 20 }, "temporary", 0, 30, 30_000, 3_600_000);
  assert.equal(result.nextAttemptAt, new Date(3_600_000).toISOString());
  assert.equal(result.status, "pending");
});

test("max-attempt failure creates a reviewable dead-letter record with original payload", () => {
  const result = outboxFailureTransition({ ...event, attempts: 8 }, new Error("permanent failure"), 1_800_000_000_000);
  assert.equal(result.status, "failed");
  assert.equal(result.nextAttemptAt, null);
  assert.equal(result.failedAt, new Date(1_800_000_000_000).toISOString());
  assert.deepEqual(result.deadLetter, {
    id: event.id,
    sourceEventId: event.id,
    eventId: event.eventId,
    type: event.type,
    aggregate: event.aggregate,
    aggregateId: event.aggregateId,
    schemaVersion: 1,
    payload: event.payload,
    attempts: 8,
    lastError: "permanent failure",
    status: "pending_review",
    createdAt: event.createdAt,
    failedAt: new Date(1_800_000_000_000).toISOString()
  });
});

test("failure details are bounded before persistence", () => {
  const result = outboxFailureTransition(event, "x".repeat(1000), 0);
  assert.equal(result.lastError.length, 300);
});


test("outbox batch eligibility skips backoff and active leases before limiting a batch", () => {
  const now = Date.parse("2026-11-09T00:00:00.000Z");
  const delayed = Array.from({ length: 30 }, (_, index) => ({
    id: `delayed-${index}`, status: "pending", nextAttemptAt: new Date(now + 60_000).toISOString()
  }));
  const leased = { id: "leased", status: "processing", leaseUntil: new Date(now + 60_000).toISOString() };
  const ready = { id: "ready", status: "pending", nextAttemptAt: new Date(now - 1).toISOString() };
  const batch = [...delayed, leased, ready].filter(event => isOutboxEventEligible(event, now)).slice(0, 25);
  assert.deepEqual(batch.map(event => event.id), ["ready"]);
});

test("outbox eligibility allows expired leases and rejects terminal events", () => {
  const now = Date.parse("2026-11-09T00:00:00.000Z");
  assert.equal(isOutboxEventEligible({ status: "processing", leaseUntil: new Date(now - 1).toISOString() }, now), true);
  assert.equal(isOutboxEventEligible({ status: "processed" }, now), false);
  assert.equal(isOutboxEventEligible({ status: "failed" }, now), false);
});
