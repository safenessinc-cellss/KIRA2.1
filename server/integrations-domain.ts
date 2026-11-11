import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function isFreshWebhookTimestamp(value: string | number, now = Date.now(), maxSkewMs = 5 * 60 * 1000): boolean {
  const raw = Number(value); if (!Number.isFinite(raw) || raw <= 0) return false;
  const timestampMs = raw < 10_000_000_000 ? raw * 1000 : raw;
  return Math.abs(now - timestampMs) <= maxSkewMs;
}
export function verifyWebhookHmac(secret: string, timestamp: string | number, rawBody: Buffer | string, signature: string, now = Date.now()): boolean {
  if (!secret || !signature || !isFreshWebhookTimestamp(timestamp, now)) return false;
  const expected = createHmac("sha256", secret).update(String(timestamp) + "." + (Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody))).digest("hex");
  const supplied = signature.replace(/^sha256=/i, "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  const a = Buffer.from(expected, "hex"), b = Buffer.from(supplied, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function webhookDedupeKey(provider: string, eventId: string): string {
  if (!provider.trim() || !eventId.trim()) throw new Error("provider and eventId are required");
  return createHash("sha256").update(provider.trim().toLowerCase() + ":" + eventId.trim()).digest("hex");
}

export function isPaymentGatewayCredentialModeValid(
  provider: string,
  mode: string,
  apiKey: string,
  webhookSecret: string
): boolean {
  if (!apiKey || !webhookSecret || !["test", "live"].includes(mode)) return false;
  if (provider === "stripe") {
    return (mode === "test" ? apiKey.startsWith("sk_test_") : apiKey.startsWith("sk_live_"))
      && webhookSecret.startsWith("whsec_");
  }
  if (provider === "mercadopago") {
    return mode === "test" ? apiKey.startsWith("TEST-") : apiKey.startsWith("APP_USR-");
  }
  return false;
}
