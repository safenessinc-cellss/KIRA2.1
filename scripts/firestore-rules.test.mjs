import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

const projectId = "demo-kira-rules";
const rules = fs.readFileSync("firestore.rules", "utf8");
const env = await initializeTestEnvironment({ projectId, firestore: { rules } });

try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "student-a"), { uid: "student-a", email: "a@example.test", role: "alumno", approvalStatus: "approved", companyId: "company-a" });
    await setDoc(doc(db, "users", "student-b"), { uid: "student-b", email: "b@example.test", role: "alumno", approvalStatus: "approved" });
    await setDoc(doc(db, "users", "company-admin"), { uid: "company-admin", email: "hr@example.test", role: "company_admin", approvalStatus: "approved", companyId: "company-a" });
    await setDoc(doc(db, "courses", "paid-course"), { title: "Paid", status: "published", price: 100, coachId: "coach-a", createdAt: new Date() });
    await setDoc(doc(db, "courses", "free-course"), { title: "Free", status: "published", price: 0, coachId: "coach-a", createdAt: new Date() });
    await setDoc(doc(db, "journals", "journal-b"), { userId: "student-b", content: "private", createdAt: new Date() });
    await setDoc(doc(db, "companies", "company-a"), { name: "Company A" });
    await setDoc(doc(db, "companies", "company-b"), { name: "Company B" });
    await setDoc(doc(db, "companies", "company-a", "members", "company-admin"), { uid: "company-admin", role: "company_admin" });
    await setDoc(doc(db, "companies", "company-a", "wellbeingAggregates", "2026-11"), { period: "2026-11", highRiskCount: 2 });
    await setDoc(doc(db, "companies", "company-b", "members", "other-admin"), { uid: "other-admin", role: "company_admin" });
    await setDoc(doc(db, "chats", "student-a_student-b"), { participants: ["student-a", "student-b"], createdAt: new Date() });
    await setDoc(doc(db, "chats", "student-b_other-user"), { participants: ["student-b", "other-user"], createdAt: new Date() });
    await setDoc(doc(db, "messages", "message-in-own-chat"), { chatId: "student-a_student-b", senderId: "student-b", content: "hello", participants: ["student-a", "student-b"], createdAt: new Date() });
    await setDoc(doc(db, "messages", "message-in-other-chat"), { chatId: "student-b_other-user", senderId: "student-b", content: "private", participants: ["student-b", "other-user"], createdAt: new Date() });
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

  // Chat membership is proven by chats/{chatId}.participants, not by the chatId string.
  await assertSucceeds(getDoc(doc(studentDb, "messages", "message-in-own-chat")));
  await assertFails(getDoc(doc(studentDb, "messages", "message-in-other-chat")));
  await assertSucceeds(addDoc(collection(studentDb, "messages"), { chatId: "student-a_student-b", senderId: "student-a", content: "hi", participants: ["student-a", "student-b"], createdAt: serverTimestamp() }));
  await assertFails(addDoc(collection(studentDb, "messages"), { chatId: "student-a_other-user", senderId: "student-a", content: "intrusion", participants: ["student-a", "other-user"], createdAt: serverTimestamp() }));
  await assertSucceeds(setDoc(doc(studentDb, "chats", "student-a_other-user"), { participants: ["student-a", "other-user"], createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(studentDb, "chats", "student-a_other-user"), { participants: ["student-a", "other-user", "student-b"], createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(studentDb, "chats", "intruder_chat"), { participants: ["student-a"], createdAt: serverTimestamp() }));

  const companyDb = env.authenticatedContext("company-admin", { email: "hr@example.test" }).firestore();
  await assertSucceeds(getDoc(doc(companyDb, "companies", "company-a", "wellbeingAggregates", "2026-11")));
  await assertSucceeds(getDoc(doc(companyDb, "companies", "company-a", "members", "company-admin")));
  await assertFails(getDoc(doc(companyDb, "companies", "company-b", "members", "other-admin")));
  await assertFails(getDoc(doc(companyDb, "journals", "journal-b")));

  console.log("Firestore rules smoke tests passed.");
} finally {
  await env.cleanup();
}
