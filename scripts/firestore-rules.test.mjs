import fs from "node:fs";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction } from "firebase/firestore";

const projectId = "demo-kira-rules";
const rules = fs.readFileSync("firestore.rules", "utf8");
const env = await initializeTestEnvironment({ projectId, firestore: { rules } });

try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "student-a"), { uid: "student-a", email: "a@example.test", role: "alumno", approvalStatus: "approved", companyId: "company-a" });
    await setDoc(doc(db, "users", "student-b"), { uid: "student-b", email: "b@example.test", role: "alumno", approvalStatus: "approved" });
    await setDoc(doc(db, "users", "coach-a"), { uid: "coach-a", email: "coach@example.test", role: "coach", approvalStatus: "approved", membershipStatus: "active", membershipExpiresAt: new Date(Date.now() + 86400000) });
    await setDoc(doc(db, "users", "coach-expired"), { uid: "coach-expired", email: "expired@example.test", role: "coach", approvalStatus: "approved", membershipStatus: "active", membershipExpiresAt: new Date(Date.now() - 86400000) });
    await setDoc(doc(db, "users", "company-admin"), { uid: "company-admin", email: "hr@example.test", role: "company_admin", approvalStatus: "approved", companyId: "company-a" });
    await setDoc(doc(db, "courses", "paid-course"), { title: "Paid", status: "published", price: 100, coachId: "coach-a", createdAt: new Date() });
    await setDoc(doc(db, "courses", "free-course"), { title: "Free", status: "published", price: 0, coachId: "coach-a", createdAt: new Date() });
    await setDoc(doc(db, "books", "paid-book"), { title: "Paid book", status: "published", price: 20, currency: "USD" });
    await setDoc(doc(db, "bookAssets", "paid-book"), { storagePath: "books/admin/owner/file.pdf" });
    await setDoc(doc(db, "bookEntitlements", "student-a_paid-book"), { userId: "student-a", productId: "paid-book", status: "active", paymentStatus: "paid" });
    await setDoc(doc(db, "membershipPlans", "published-plan"), { title: "Annual", status: "published", price: 49, currency: "USD", durationDays: 365 });
    await setDoc(doc(db, "coachPublicProfiles", "coach-a"), { uid: "coach-a", displayName: "Approved Coach", status: "published", approvalStatus: "approved" });
    await setDoc(doc(db, "enrollments", "coach-enrollment"), { userId: "student-a", studentName: "Student A", courseId: "paid-course", progress: 25, createdAt: new Date(), paymentStatus: "paid" });
    await setDoc(doc(db, "enrollments", "expired-coach-enrollment"), { userId: "student-a", studentName: "Student A", courseId: "paid-course", progress: 25, createdAt: new Date(), paymentStatus: "paid" });
    await setDoc(doc(db, "messages", "private-message"), { chatId: "student-b_coach-a", senderId: "student-b", content: "private", participants: ["coach-a", "student-b"], createdAt: new Date() });
    await setDoc(doc(db, "journals", "journal-b"), { userId: "student-b", content: "private", createdAt: new Date() });
    await setDoc(doc(db, "companies", "company-a"), { name: "Company A" });
    await setDoc(doc(db, "companies", "company-b"), { name: "Company B" });
    await setDoc(doc(db, "companies", "company-a", "members", "company-admin"), { uid: "company-admin", role: "company_admin" });
    await setDoc(doc(db, "companies", "company-a", "wellbeingAggregates", "2026-11"), { period: "2026-11", sampleSize: 12, highRiskCount: 2 });
    await setDoc(doc(db, "companies", "company-a", "wellbeingAggregates", "2026-10"), { period: "2026-10", sampleSize: 4, highRiskCount: 1 });
    await setDoc(doc(db, "companies", "company-b", "members", "other-admin"), { uid: "other-admin", role: "company_admin" });
  });


  // Firestore transaction concurrency: capacity one permits exactly one of two students.
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const groupRef = doc(db, "course_groups", "capacity-one");
    await setDoc(groupRef, { capacity: 1, enrolledCount: 0 });
    const reserve = (studentId) => runTransaction(db, async transaction => {
      const snapshot = await transaction.get(groupRef);
      const group = snapshot.data();
      if (Number(group.enrolledCount) >= Number(group.capacity)) throw new Error("group_full");
      transaction.update(groupRef, { enrolledCount: Number(group.enrolledCount) + 1 });
      transaction.set(doc(db, "enrollments", studentId + "_course-capacity"), { userId: studentId, courseId: "course-capacity", groupId: "capacity-one", status: "active" });
      return true;
    });
    const results = await Promise.allSettled([reserve("student-a"), reserve("student-b")]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal((await getDoc(groupRef)).data().enrolledCount, 1);

    // Deterministic invoice ID + transaction guard: running generation twice creates one invoice.
    const invoiceRef = doc(db, "invoices", "enrollment-a_2026-11");
    const createInvoiceOnce = () => runTransaction(db, async transaction => {
      const existing = await transaction.get(invoiceRef);
      if (existing.exists()) return false;
      transaction.set(invoiceRef, { enrollmentId: "enrollment-a", periodLabel: "2026-11", status: "open" });
      return true;
    });
    const invoiceResults = await Promise.all([createInvoiceOnce(), createInvoiceOnce()]);
    assert.equal(invoiceResults.filter(Boolean).length, 1);
    assert.equal(await createInvoiceOnce(), false);
  });

  const studentDb = env.authenticatedContext("student-a", { email: "a@example.test" }).firestore();
  await assertSucceeds(setDoc(doc(studentDb, "journals", "journal-a"), { userId: "student-a", content: "my private journal", createdAt: serverTimestamp() }));
  await assertFails(getDoc(doc(studentDb, "journals", "journal-b")));
  await assertFails(setDoc(doc(studentDb, "transactions", "fake"), { userId: "student-a", amount: 999, status: "paid" }));
  await assertFails(setDoc(doc(studentDb, "orders", "fake"), { userId: "student-a", amount: 1, status: "paid" }));
  await assertFails(setDoc(doc(studentDb, "enrollments", "paid-fake"), { userId: "student-a", courseId: "paid-course", progress: 0, createdAt: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(studentDb, "enrollments", "free-valid"), { userId: "student-a", courseId: "free-course", progress: 0, createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(studentDb, "users", "student-a"), { companyId: "company-b" }));
  await assertFails(updateDoc(doc(studentDb, "users", "student-a"), { staffPermissions: ["system"] }));
  await assertFails(updateDoc(doc(studentDb, "users", "student-a"), { points: 9999 }));
  await assertSucceeds(getDoc(doc(studentDb, "books", "paid-book")));
  await assertSucceeds(getDoc(doc(studentDb, "membershipPlans", "published-plan")));
  await assertSucceeds(getDoc(doc(studentDb, "bookEntitlements", "student-a_paid-book")));
  await assertFails(getDoc(doc(studentDb, "bookAssets", "paid-book")));
  await assertFails(setDoc(doc(studentDb, "bookAssets", "forbidden"), { storagePath: "books/admin/forbidden.pdf" }));
  await assertFails(setDoc(doc(studentDb, "bookEntitlements", "fake-entitlement"), { userId: "student-a", productId: "paid-book", status: "active", paymentStatus: "paid" }));
  await assertFails(setDoc(doc(studentDb, "membershipPlans", "fake-plan"), { title: "Fake", status: "published", price: 1, currency: "USD", durationDays: 30 }));
  await assertFails(getDoc(doc(studentDb, "users", "coach-a")));
  await assertSucceeds(getDoc(doc(studentDb, "coachPublicProfiles", "coach-a")));
  await assertFails(setDoc(doc(studentDb, "coachPublicProfiles", "student-a"), { uid: "student-a", status: "published", approvalStatus: "approved" }));
  const sortedParticipants = ["student-a", "student-b"];
  await assertSucceeds(setDoc(doc(studentDb, "messages", "valid-message"), { chatId: sortedParticipants.join("_"), senderId: "student-a", senderName: "Student A", content: "Hello", participants: sortedParticipants, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(studentDb, "messages", "invalid-message"), { chatId: "student-a_student-b", senderId: "student-a", content: "Hello", participants: ["student-b", "student-a"], createdAt: serverTimestamp() }));
  await assertFails(getDoc(doc(studentDb, "messages", "private-message")));
  await assertSucceeds(setDoc(doc(studentDb, "notifications", "self-notification"), { userId: "student-a", title: "Notice", message: "For me", type: "system", read: false, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(studentDb, "notifications", "other-notification"), { userId: "student-b", title: "Notice", message: "For other", type: "system", read: false, createdAt: serverTimestamp() }));

  const coachDb = env.authenticatedContext("coach-a", { email: "coach@example.test" }).firestore();
  await assertFails(getDoc(doc(coachDb, "journals", "journal-b")));
  await assertSucceeds(setDoc(doc(coachDb, "courses", "coach-pending-course"), { title: "Coach course", description: "Real course", price: 10, coachId: "coach-a", status: "pending", hours: 4, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(coachDb, "courses", "coach-published-course"), { title: "Coach course", description: "Cannot publish directly", price: 10, coachId: "coach-a", status: "published", hours: 4, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(coachDb, "enrollments", "coach-paid-fake"), { userId: "student-a", courseId: "paid-course", progress: 0, createdAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(coachDb, "enrollments", "coach-enrollment"), { progress: 100 }));
  await assertFails(updateDoc(doc(coachDb, "enrollments", "coach-enrollment"), { completed: true, courseCompleted: true, completedAt: serverTimestamp(), completionConfirmedBy: "coach-a" }));
  const expiredCoachDb = env.authenticatedContext("coach-expired", { email: "expired@example.test" }).firestore();
  await assertFails(updateDoc(doc(expiredCoachDb, "enrollments", "expired-coach-enrollment"), { progress: 100, completed: true, courseCompleted: true, completedAt: serverTimestamp(), completionConfirmedBy: "coach-expired" }));

  const ownerDb = env.authenticatedContext("owner-uid", { email: "safeness.c.a@gmail.com", email_verified: true }).firestore();
  await assertSucceeds(setDoc(doc(ownerDb, "membershipPlans", "owner-plan"), { title: "Official", status: "published", price: 50, currency: "USD", durationDays: 365 }));
  await assertSucceeds(setDoc(doc(ownerDb, "books", "owner-book"), { title: "Official book", status: "published", price: 5, currency: "USD" }));
  await assertSucceeds(getDoc(doc(ownerDb, "bookAssets", "paid-book")));

  // Gateway credentials, payment configuration and financial ledgers are server-only,
  // including for the owner browser session; the Express API is the sole access path.
  for (const collectionName of ["paymentSettings","paymentGateways","paymentPlans","paymentCoupons","paymentAudit","config_audit","payments","invoices","attendance","assessments","course_groups","group_sessions","student_performance","role_permissions","webhook_inbox","payment_reminders","dashboard_aggregates","invoice_payment_claims","paymentReconciliationReports","counters","schedule_locks","homework_assignments","homework_submissions","wellbeing_checkins"]) {
    await assertFails(getDoc(doc(ownerDb, collectionName, "global")));
    await assertFails(setDoc(doc(ownerDb, collectionName, "browser-write"), { enabled: true, apiKeyEncrypted: "must-not-be-client-written" }));
    await assertFails(getDoc(doc(studentDb, collectionName, "global")));
  }

  const companyDb = env.authenticatedContext("company-admin", { email: "hr@example.test" }).firestore();
  await assertSucceeds(getDoc(doc(companyDb, "companies", "company-a", "wellbeingAggregates", "2026-11")));
  await assertFails(getDoc(doc(companyDb, "companies", "company-a", "wellbeingAggregates", "2026-10")));
  await assertSucceeds(getDoc(doc(companyDb, "companies", "company-a", "members", "company-admin")));
  await assertFails(getDoc(doc(companyDb, "companies", "company-b", "members", "other-admin")));
  await assertFails(getDoc(doc(companyDb, "journals", "journal-b")));

  console.log("Firestore rules smoke tests passed.");
} finally {
  await env.cleanup();
}
