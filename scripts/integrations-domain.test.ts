import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { isFreshWebhookTimestamp, verifyWebhookHmac, webhookDedupeKey } from "../server/integrations-domain";
test("WhatsApp HMAC binds timestamp and exact raw body", () => {
 const now=Date.now(), timestamp=String(Math.floor(now/1000)), body=Buffer.from('{"event_id":"evt-1"}');
 const signature=createHmac("sha256","test-secret").update(timestamp+".").update(body).digest("hex");
 assert.equal(verifyWebhookHmac("test-secret",timestamp,body,signature,now),true);
 assert.equal(verifyWebhookHmac("wrong-secret",timestamp,body,signature,now),false);
 assert.equal(verifyWebhookHmac("test-secret",timestamp,Buffer.from("{}"),signature,now),false);
});
test("webhook timestamp rejects replay outside five minutes",()=>{const now=Date.now();assert.equal(isFreshWebhookTimestamp(Math.floor(now/1000),now),true);assert.equal(isFreshWebhookTimestamp(Math.floor((now-301000)/1000),now),false);});
test("provider event dedupe key is deterministic and namespaced",()=>{assert.equal(webhookDedupeKey("whatsapp","evt-1"),webhookDedupeKey("WHATSAPP","evt-1"));assert.notEqual(webhookDedupeKey("whatsapp","evt-1"),webhookDedupeKey("landing","evt-1"));});
