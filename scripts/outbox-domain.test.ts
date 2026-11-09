import test from "node:test";
import assert from "node:assert/strict";
import { outboxFailureTransition } from "../server/outbox-domain";

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
