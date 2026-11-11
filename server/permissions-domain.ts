export type PermissionMap = Record<string, boolean>;
export function permissionMapFromList(keys: string[]): PermissionMap { return Object.fromEntries(keys.map(key => [key, true])); }
export function hasPermission(permissions: PermissionMap | null | undefined, key: string): boolean {
  if (!permissions || typeof permissions !== "object") return false;
  if (permissions["*"] === true || permissions[key] === true) return true;
  const parts = key.split(".");
  while (parts.length > 1) { parts.pop(); if (permissions[parts.join(".") + ".*"] === true) return true; }
  return false;
}
export function hasScopedPermission(permissions: PermissionMap | null | undefined, key: string, scope: "assigned" | "own" | "all" = "all"): boolean {
  const parts = key.split(".");
  const action = parts.pop() || "";
  const base = parts.join(".");
  const scoped = base ? base + "." + scope + "." + action : key + "." + scope;
  const all = base ? base + ".all." + action : key + ".all";
  if (scope === "all") return hasPermission(permissions, key) || hasPermission(permissions, all) || hasPermission(permissions, key + ".all");
  return hasPermission(permissions, scoped) || hasPermission(permissions, key + "." + scope) || hasPermission(permissions, all) || hasPermission(permissions, key + ".all") || hasPermission(permissions, key);
}
