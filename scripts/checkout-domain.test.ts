import test from "node:test";
import assert from "node:assert/strict";
import { buildCheckoutIdentity } from "../server/checkout-domain";

test("checkout identity is stable for retries and ignores cart item ordering", () => {
  const first = buildCheckoutIdentity("user-a", "request-123456789012", "stripe", [{ id: "course-b", quantity: 1 }, { id: "course-a", quantity: 2 }]);
  const retry = buildCheckoutIdentity("user-a", "request-123456789012", "stripe", [{ id: "course-a", quantity: 2 }, { id: "course-b", quantity: 1 }]);
  assert.deepEqual(retry, first);
});

test("checkout identity isolates users, keys, providers, and changed quantities", () => {
  const base = buildCheckoutIdentity("user-a", "request-123456789012", "stripe", [{ id: "course-a", quantity: 1 }]);
  assert.notEqual(buildCheckoutIdentity("user-b", "request-123456789012", "stripe", [{ id: "course-a", quantity: 1 }]).orderId, base.orderId);
  assert.notEqual(buildCheckoutIdentity("user-a", "request-223456789012", "stripe", [{ id: "course-a", quantity: 1 }]).orderId, base.orderId);
  assert.notEqual(buildCheckoutIdentity("user-a", "request-123456789012", "mercadopago", [{ id: "course-a", quantity: 1 }]).fingerprint, base.fingerprint);
  assert.notEqual(buildCheckoutIdentity("user-a", "request-123456789012", "stripe", [{ id: "course-a", quantity: 2 }]).fingerprint, base.fingerprint);
});
