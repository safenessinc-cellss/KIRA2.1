import { createHash } from "node:crypto";

export type CheckoutItemIdentity = { id: string; quantity: number };

export function buildCheckoutIdentity(userId: string, idempotencyKey: string, provider: string, items: CheckoutItemIdentity[]) {
  const normalizedItems = items
    .map(item => ({ id: String(item.id), quantity: Number(item.quantity) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ provider, items: normalizedItems }))
    .digest("hex");
  const digest = createHash("sha256")
    .update(userId + ":" + idempotencyKey)
    .digest("hex");
  return { orderId: "checkout_" + digest, providerIdempotencyKey: digest, fingerprint };
}
