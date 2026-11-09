import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission, hasScopedPermission, permissionMapFromList } from "../server/permissions-domain";
test("permission seed arrays become explicit boolean maps",()=>{assert.deepEqual(permissionMapFromList(["crm.leads.read"]),{"crm.leads.read":true});});
test("permissions support exact and hierarchical wildcard grants",()=>{assert.equal(hasPermission({"crm.*":true},"crm.leads.read"),true);assert.equal(hasPermission({"crm.leads.read":true},"crm.leads.read"),true);assert.equal(hasPermission({"crm.leads.read":false},"crm.leads.read"),false);});
test("scope checks require own or assigned grant unless all is granted",()=>{assert.equal(hasScopedPermission({"students.attendance.own":true},"students.attendance","own"),true);assert.equal(hasScopedPermission({"students.attendance.own":true},"students.attendance","all"),false);assert.equal(hasScopedPermission({"students.attendance.all":true},"students.attendance","all"),true);});
