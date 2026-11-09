import test from "node:test";
import assert from "node:assert/strict";
import { aggregateCompanyWellbeing, isValidWellbeingCheckin } from "../server/wellbeing-domain.js";

test("wellbeing check-in values are restricted to the 1-5 scale", () => {
  assert.equal(isValidWellbeingCheckin(1, 5), true);
  assert.equal(isValidWellbeingCheckin(0, 3), false);
  assert.equal(isValidWellbeingCheckin(3, 6), false);
  assert.equal(isValidWellbeingCheckin(2.5, 4), false);
});

test("small HR cohorts are suppressed and disclose no metrics", () => {
  const rows = Array.from({ length: 4 }, (_, index) => ({
    userId: "user-" + index, companyId: "company-a", shareWithCompany: true,
    energyLevel: 1, clarityLevel: 1
  }));
  assert.deepEqual(aggregateCompanyWellbeing(rows), { suppressed: true, sampleSize: 0, minimumCohortSize: 5 });
});

test("HR aggregation uses one latest consented check-in per user", () => {
  const rows = [
    { userId: "a", companyId: "company-a", shareWithCompany: true, energyLevel: 1, clarityLevel: 2, updatedAt: "2026-11-01T00:00:00Z" },
    { userId: "a", companyId: "company-a", shareWithCompany: true, energyLevel: 5, clarityLevel: 5, updatedAt: "2026-11-02T00:00:00Z" },
    { userId: "b", companyId: "company-a", shareWithCompany: true, energyLevel: 3, clarityLevel: 4 },
    { userId: "c", companyId: "company-a", shareWithCompany: true, energyLevel: 3, clarityLevel: 3 },
    { userId: "d", companyId: "company-a", shareWithCompany: true, energyLevel: 4, clarityLevel: 4 },
    { userId: "e", companyId: "company-a", shareWithCompany: true, energyLevel: 2, clarityLevel: 3 },
    { userId: "private", companyId: "company-a", shareWithCompany: false, energyLevel: 1, clarityLevel: 1 }
  ];
  const result = aggregateCompanyWellbeing(rows);
  assert.equal(result.suppressed, false);
  assert.equal(result.sampleSize, 5);
  assert.equal(result.averageEnergy, 3.4);
  assert.equal(result.averageClarity, 3.8);
  assert.equal(result.highRiskCount, 1);
});
