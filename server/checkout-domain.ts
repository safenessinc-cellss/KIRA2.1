import { createHash } from "node:crypto";

export type CheckoutItemIdentity = { id: string; quantity: number; unitPrice?: number; currency?: string };

export function buildCheckoutIdentity(userId: string, idempotencyKey: string, provider: string, items: CheckoutItemIdentity[]) {
  const normalizedItems = items
    .map(item => ({ id: String(item.id), quantity: Number(item.quantity), unitPrice: item.unitPrice === undefined ? null : Number(item.unitPrice), currency: item.currency === undefined ? null : String(item.currency).toLowerCase() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ provider, items: normalizedItems }))
    .digest("hex");
  const digest = createHash("sha256")
    .update(userId + ":" + idempotencyKey)
    .digest("hex");
  return { orderId: "checkout_" + digest, providerIdempotencyKey: digest, fingerprint };
}

export function isGatewayCredentialModeCompatible(provider: string, mode: string, credential: string): boolean {
  const value = String(credential || "").trim();
  if (!value) return false;
  if (provider === "stripe") return mode === "test" ? /^(sk|rk)_test_/.test(value) : mode === "live" ? /^(sk|rk)_live_/.test(value) : false;
  if (provider === "mercadopago") return mode === "test" ? value.startsWith("TEST-") : mode === "live" ? value.startsWith("APP_USR-") : false;
  return false;
}
