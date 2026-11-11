export interface AuthenticationAssurance {
  mfaSecondFactor?: string;
  authTime?: number;
}

/** Require a Firebase-authenticated second factor and a recent authentication timestamp. */
export function hasRecentMfaAuthentication(
  assurance: AuthenticationAssurance,
  nowMs = Date.now(),
  maxAgeMs = 10 * 60 * 1000,
  futureClockSkewMs = 5 * 60 * 1000
): boolean {
  const factor = String(assurance.mfaSecondFactor || "").trim();
  const authTimeMs = Number(assurance.authTime) * 1000;
  if (!factor || !Number.isFinite(authTimeMs)) return false;
  const age = nowMs - authTimeMs;
  return age >= -futureClockSkewMs && age <= maxAgeMs;
}

/** Superadmin has an explicit root bypass; staff must hold the exact permission.
 * The legacy "system" token is deliberately not treated as a wildcard.
 */
export function canAccessBackofficePermission(
  isSuperAdmin: boolean,
  permissions: unknown,
  permission?: string
): boolean {
  if (isSuperAdmin) return true;
  if (!permission) return true;
  return Array.isArray(permissions) && permissions.includes(permission);
}
