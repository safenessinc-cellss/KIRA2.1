import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const projectId = "demo-kira-rules";
const rules = fs.readFileSync("firestore.rules", "utf8");
const env = await initializeTestEnvironment({ projectId, firestore: { rules } });

try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "student-a"), { uid: "student-a", email: "a@example.test", role: "alumno", approvalStatus: "approved", companyId: "company-a" });
    await setDoc(doc(db, "users", "student-b"), { uid: "student-b", email: "b@example.test", role: "alumno", approvalStatus: "approved" });
    await setDoc(doc(db, "users", "company-admin"), { uid: "company-admin", email: "hr@example.test", role: "company_admin", approvalStatus: "approved", companyId: "company-a" });
    await setDoc(doc(db, "users", "admin-a"), { uid: "admin-a", email: "admin@example.test", role: "admin", approvalStatus: "approved" });
    await setDoc(doc(db, "courses", "paid-course"), { title: "Paid", status: "published", price: 100, coachId: "coach-a", createdAt: new Date() });
    await setDoc(doc(db, "courses", "free-course"), { title: "Free", status: "published", price: 0, coachId: "coach-a", createdAt: new Date() });
    await setDoc(doc(db, "journals", "journal-b"), { userId: "student-b", content: "private", createdAt: new Date() });
    await setDoc(doc(db, "coach_applications", "application-b"), { userId: "student-b", status: "pending", createdAt: new Date() });
    await setDoc(doc(db, "reports", "report-pending"), { reporterId: "student-b", status: "pending", targetId: "message-pending" });
    await setDoc(doc(db, "reports", "report-closed"), { reporterId: "student-b", status: "resolved", targetId: "message-closed" });
    await setDoc(doc(db, "messages", "message-pending"), { senderId: "student-b", chatId: "chat-b", reportId: "report-pending", content: "reported private text" });
    await setDoc(doc(db, "messages", "message-closed"), { senderId: "student-b", chatId: "chat-b", reportId: "report-closed", content: "closed private text" });
    await setDoc(doc(db, "activity_logs", "log-b"), { userId: "student-b", action: "journal_created", entityType: "journal", entityId: "j1", metadata: {}, createdAt: new Date() });
    await setDoc(doc(db, "companies", "company-a"), { name: "Company A" });
    await setDoc(doc(db, "companies", "company-b"), { name: "Company B" });
    await setDoc(doc(db, "companies", "company-a", "members", "company-admin"), { uid: "company-admin", role: "company_admin" });
    await setDoc(doc(db, "companies", "company-a", "wellbeingAggregates", "2026-11"), { period: "2026-11", highRiskCount: 2 });
    await setDoc(doc(db, "companies", "company-b", "members", "other-admin"), { uid: "other-admin", role: "company_admin" });
  });

  const studentDb = env.authenticatedContext("student-a", { email: "a@example.test" }).firestore();
  await assertSucceeds(setDoc(doc(studentDb, "journals", "journal-a"), { userId: "student-a", content: "my private journal", createdAt: serverTimestamp() }));
  await assertFails(getDoc(doc(studentDb, "journals", "journal-b")));
  await assertFails(getDoc(doc(studentDb, "coach_applications", "application-b")));
  await assertSucceeds(setDoc(doc(studentDb, "activity_logs", "student-log"), { userId: "student-a", action: "login", entityType: "session", entityId: "student-a", metadata: {}, userAgent: "test", createdAt: serverTimestamp() }));
  await assertFails(getDoc(doc(studentDb, "activity_logs", "log-b")));
  await assertFails(updateDoc(doc(studentDb, "activity_logs", "log-b"), { action: "changed" }));
  await assertFails(deleteDoc(doc(studentDb, "activity_logs", "log-b")));
  await assertFails(setDoc(doc(studentDb, "refunds", "fake"), { userId: "student-a", amount: 1 }));
  await assertFails(setDoc(doc(studentDb, "transactions", "fake"), { userId: "student-a", amount: 999, status: "paid" }));
  await assertFails(setDoc(doc(studentDb, "orders", "fake"), { userId: "student-a", amount: 1, status: "paid" }));
  await assertFails(setDoc(doc(studentDb, "enrollments", "paid-fake"), { userId: "student-a", courseId: "paid-course", progress: 0, createdAt: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(studentDb, "enrollments", "free-valid"), { userId: "student-a", courseId: "free-course", progress: 0, createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(studentDb, "users", "student-a"), { companyId: "company-b" }));
  await assertFails(updateDoc(doc(studentDb, "users", "student-a"), { staffPermissions: ["system"] }));

  const applicantDb = env.authenticatedContext("student-b", { email: "b@example.test" }).firestore();
  await assertSucceeds(getDoc(doc(applicantDb, "coach_applications", "application-b")));
  const adminDb = env.authenticatedContext("admin-a", { email: "admin@example.test" }).firestore();
  await assertFails(getDoc(doc(adminDb, "journals", "journal-b")));
  await assertSucceeds(getDoc(doc(adminDb, "activity_logs", "log-b")));
  await assertSucceeds(getDoc(doc(adminDb, "messages", "message-pending")));
  await assertFails(getDoc(doc(adminDb, "messages", "message-closed")));

  const companyDb = env.authenticatedContext("company-admin", { email: "hr@example.test" }).firestore();
  await assertSucceeds(getDoc(doc(companyDb, "companies", "company-a", "wellbeingAggregates", "2026-11")));
  await assertSucceeds(getDoc(doc(companyDb, "companies", "company-a", "members", "company-admin")));
  await assertFails(getDoc(doc(companyDb, "companies", "company-b", "members", "other-admin")));
  await assertFails(getDoc(doc(companyDb, "journals", "journal-b")));

  console.log("Firestore rules smoke tests passed.");
} finally {
  await env.cleanup();
}
