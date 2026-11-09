import test from "node:test";
import assert from "node:assert/strict";
import { canSettleInvoice, installmentAmountCents, invoiceDocumentId, isValidPeriodLabel } from "../server/finance-domain";

test("invoice document IDs are deterministic per enrollment and period", () => {
  assert.equal(invoiceDocumentId("enroll/123", "2026-11"), "enroll_123_2026-11");
  assert.equal(invoiceDocumentId("enroll/123", "2026-11"), invoiceDocumentId("enroll/123", "2026-11"));
  assert.notEqual(invoiceDocumentId("enroll/123", "2026-12"), invoiceDocumentId("enroll/123", "2026-11"));
});

test("monthly installment amount never silently reuses the full course price", () => {
  assert.equal(installmentAmountCents({}, { price: 1200 }), 0);
  assert.equal(installmentAmountCents({ installmentsCount: 12 }, { price: 1200 }), 10000);
  assert.equal(installmentAmountCents({}, { monthlyAmountCents: 9500, price: 1200 }), 9500);
});

test("invoice settlement requires verified matching student, amount, currency and open state", () => {
  const invoice = { studentId: "student-1", amountCents: 12500, currency: "BRL", status: "overdue" };
  assert.equal(canSettleInvoice(invoice, 12500, "brl", "student-1"), true);
  assert.equal(canSettleInvoice(invoice, 12500, "USD", "student-1"), false);
  assert.equal(canSettleInvoice(invoice, 12499, "BRL", "student-1"), false);
  assert.equal(canSettleInvoice(invoice, 12500, "BRL", "student-2"), false);
  assert.equal(canSettleInvoice({ ...invoice, status: "paid" }, 12500, "BRL", "student-1"), false);
});

test("monthly period labels accept valid YYYY-MM and reject invalid months", () => {
  assert.equal(isValidPeriodLabel("2026-11"), true);
  assert.equal(isValidPeriodLabel("2026-01"), true);
  assert.equal(isValidPeriodLabel("2026-00"), false);
  assert.equal(isValidPeriodLabel("2026-13"), false);
  assert.equal(isValidPeriodLabel("26-11"), false);
});
