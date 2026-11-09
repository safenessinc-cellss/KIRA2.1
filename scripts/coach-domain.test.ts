import test from "node:test";
import assert from "node:assert/strict";
import { calculateCoachClientRetention, coachClientIdentity, homeworkPointsAward, normalizeCoachLeadStage, validateHomeworkReview } from "../server/coach-domain.js";

test("coach retention never treats the coach userId as a client identity", () => {
  assert.equal(coachClientIdentity({ userId: "coach-1", coachId: "coach-1" }), null);
  const result = calculateCoachClientRetention([
    { userId: "coach-1", coachId: "coach-1", clientName: "Ana" },
    { userId: "coach-1", coachId: "coach-1", clientName: "ana" },
    { userId: "coach-1", coachId: "coach-1" }
  ]);
  assert.deepEqual(result, { uniqueClients: 1, returningClients: 1, identifiedSessions: 2, rate: 100 });
});

test("CRM stage aliases normalize known Portuguese and English states", () => {
  assert.equal(normalizeCoachLeadStage("contactado"), "contacted");
  assert.equal(normalizeCoachLeadStage("converted"), "enrolled");
  assert.equal(normalizeCoachLeadStage("unknown"), null);
});

test("homework review rejects invalid data and limits points", () => {
  assert.equal(validateHomeworkReview({ status: "approved", score: 100, feedback: "Muy bien", energyPoints: 100 }), true);
  assert.equal(validateHomeworkReview({ status: "approved", score: 101, feedback: "ok", energyPoints: 0 }), false);
  assert.equal(validateHomeworkReview({ status: "pending", score: 50, feedback: "ok", energyPoints: 0 }), false);
  assert.equal(validateHomeworkReview({ status: "approved", score: 50, feedback: "x", energyPoints: 0 }), false);
});

test("energy points are awarded once and only for approval", () => {
  assert.equal(homeworkPointsAward("approved", null, 30), 30);
  assert.equal(homeworkPointsAward("approved", "2026-01-01", 30), 0);
  assert.equal(homeworkPointsAward("needs_correction", null, 30), 0);
  assert.equal(homeworkPointsAward("approved", null, 150), 100);
});
