import test from "node:test";
import assert from "node:assert/strict";
import { hasRecentMfaAuthentication } from "../server/security-domain";

const NOW = 1_800_000_000_000;

test("MFA assurance accepts a recent Firebase second-factor sign-in", () => {
  assert.equal(hasRecentMfaAuthentication({ mfaSecondFactor: "phone", authTime: NOW / 1000 - 60 }, NOW), true);
  assert.equal(hasRecentMfaAuthentication({ mfaSecondFactor: "totp", authTime: NOW / 1000 - 60 }, NOW), true);
});

test("MFA assurance rejects missing second factor and missing auth_time", () => {
  assert.equal(hasRecentMfaAuthentication({ authTime: NOW / 1000 }, NOW), false);
  assert.equal(hasRecentMfaAuthentication({ mfaSecondFactor: "phone" }, NOW), false);
  assert.equal(hasRecentMfaAuthentication({}, NOW), false);
});

test("MFA assurance rejects stale or implausibly future authentication", () => {
  assert.equal(hasRecentMfaAuthentication({ mfaSecondFactor: "phone", authTime: NOW / 1000 - 601 }, NOW), false);
  assert.equal(hasRecentMfaAuthentication({ mfaSecondFactor: "phone", authTime: NOW / 1000 + 301 }, NOW), false);
});
