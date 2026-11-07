import fs from "node:fs";

const protectedFiles = [
  "src/pages/Admin.tsx",
  "src/pages/Coach.tsx",
  "src/components/CoachAnalytics.tsx",
  "src/pages/HRDashboard.tsx"
];
const violations = [];
for (const path of protectedFiles) {
  const source = fs.readFileSync(path, "utf8");
  if (/collection\s*\(\s*db\s*,\s*["']journals["']/.test(source)) violations.push(path + " reads private journals directly");
  if (/Math\.random\s*\(/.test(source)) violations.push(path + " contains fabricated random analytics");
}
const rules = fs.readFileSync("firestore.rules", "utf8");
if (!/match\s+\/journals\/\{[^}]+\}\s*\{[\s\S]*?resource\.data\.userId\s*==\s*request\.auth\.uid/.test(rules)) {
  violations.push("firestore.rules does not enforce journal owner access");
}
if (!/match\s+\/transactions\/\{[^}]+\}\s*\{[\s\S]*?allow\s+create,\s*update,\s*delete:\s*if\s+false/.test(rules)) {
  violations.push("firestore.rules allows client-side transaction writes");
}
if (violations.length) {
  console.error("Privacy smoke test failed:\n" + violations.map(v => "- " + v).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Privacy smoke test passed: no admin/coach/HR journal reads or random executive analytics.");
}
