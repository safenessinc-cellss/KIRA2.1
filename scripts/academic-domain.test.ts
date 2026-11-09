import test from "node:test";
import assert from "node:assert/strict";
import { calculateAcademicPerformance, hasScheduleConflict, meetsCompletionThresholds, sessionDayKeysUTC } from "../server/academic-domain";

test("academic attendance and weighted grade thresholds are deterministic", () => {
  const performance = calculateAcademicPerformance(
    [{ id: "s1", status: "held" }, { id: "s2", status: "held" }, { id: "future", status: "scheduled", startsAt: new Date(Date.now() + 86400000) }],
    [{ sessionId: "s1", status: "present" }, { sessionId: "s2", status: "late" }],
    [{ score: 80, maxScore: 100, weight: 1 }, { score: 60, maxScore: 100, weight: 1 }]
  );
  assert.equal(performance.attendancePct, 100);
  assert.equal(performance.avgScorePct, 70);
  assert.equal(performance.lessonsCompleted, 2);
  assert.equal(meetsCompletionThresholds(performance, 75, 60), true);
});

test("completion is blocked below either required academic threshold", () => {
  assert.equal(meetsCompletionThresholds({ attendancePct: 74.99, avgScorePct: 90 }, 75, 60), false);
  assert.equal(meetsCompletionThresholds({ attendancePct: 90, avgScorePct: 59.99 }, 75, 60), false);
  assert.equal(meetsCompletionThresholds(null, 75, 60), false);
});

test("schedule overlap detects coach/room time collisions", () => {
  const start = new Date("2026-11-10T10:00:00Z"), end = new Date("2026-11-10T11:00:00Z");
  assert.equal(hasScheduleConflict(start, end, new Date("2026-11-10T10:30:00Z"), new Date("2026-11-10T11:30:00Z")), true);
  assert.equal(hasScheduleConflict(start, end, new Date("2026-11-10T11:00:00Z"), new Date("2026-11-10T12:00:00Z")), false);
});

test("schedule lock day buckets are timezone-independent and include every UTC day", () => {
  const start = new Date("2026-11-10T23:30:00.000Z");
  const end = new Date("2026-11-11T00:30:00.000Z");
  assert.deepEqual(sessionDayKeysUTC(start, end), ["2026-11-10", "2026-11-11"]);
  assert.deepEqual(sessionDayKeysUTC(new Date("2026-11-10T00:00:00Z"), new Date("2026-11-11T00:00:00Z")), ["2026-11-10"]);
  assert.throws(() => sessionDayKeysUTC(end, start), /Invalid session interval/);
});
