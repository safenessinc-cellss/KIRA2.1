import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';

const projectId = 'demo-kira-rules';
const emulator = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: emulator[0],
      port: Number(emulator[1]),
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = Timestamp.now();

    await Promise.all([
      setDoc(doc(db, 'users/studentA'), {
        uid: 'studentA', role: 'alumno', approvalStatus: 'approved',
        assignedCoachId: 'coachA', email: 'student@example.test',
      }),
      setDoc(doc(db, 'users/studentB'), {
        uid: 'studentB', role: 'alumno', approvalStatus: 'approved',
        email: 'studentB@example.test',
      }),
      setDoc(doc(db, 'users/coachA'), {
        uid: 'coachA', role: 'coach', approvalStatus: 'approved',
        email: 'coachA@example.test',
      }),
      setDoc(doc(db, 'users/coachB'), {
        uid: 'coachB', role: 'coach', approvalStatus: 'approved',
        email: 'coachB@example.test',
      }),
      setDoc(doc(db, 'users/adminA'), {
        uid: 'adminA', role: 'admin', email: 'admin@example.test',
      }),
      setDoc(doc(db, 'courses/courseA'), {
        coachId: 'coachA', title: 'Course A', status: 'published',
      }),
      setDoc(doc(db, 'enrollments/studentA_courseA'), {
        userId: 'studentA', courseId: 'courseA', status: 'active',
        paymentStatus: 'paid', orderId: 'orderA', createdAt: now,
      }),
      setDoc(doc(db, 'journals/journalA'), {
        userId: 'studentA', title: 'Private journal', content: 'private',
        createdAt: now,
      }),
      setDoc(doc(db, 'transactions/transactionA'), {
        userId: 'studentA', amount: 125, currency: 'USD', status: 'paid',
        createdAt: now,
      }),
      setDoc(doc(db, 'automations/automationA'), {
        ownerId: 'coachA', name: 'Follow-up', condition: 'inactivity',
        thresholdDays: 5, actionType: 'message', messageTemplate: 'Hello',
        active: true, createdAt: now,
      }),
      setDoc(doc(db, 'sessions/sessionA'), {
        coachId: 'coachA', userId: 'studentA', title: 'Session A',
        status: 'completed', createdAt: now, startedAt: now,
      }),
      setDoc(doc(db, 'stats/global'), { revenue: 125 }),
    ]);
  });
});

test('private user profiles are visible only to owner, admin and assigned coach', async () => {
  const student = testEnv.authenticatedContext('studentA').firestore();
  const assignedCoach = testEnv.authenticatedContext('coachA').firestore();
  const otherCoach = testEnv.authenticatedContext('coachB').firestore();

  await assertSucceeds(getDoc(doc(student, 'users/studentA')));
  await assertFails(getDoc(doc(student, 'users/studentB')));
  await assertSucceeds(getDoc(doc(assignedCoach, 'users/studentA')));
  await assertFails(getDoc(doc(otherCoach, 'users/studentA')));
});

test('journals remain private even from assigned coaches and admins', async () => {
  const owner = testEnv.authenticatedContext('studentA').firestore();
  const coach = testEnv.authenticatedContext('coachA').firestore();
  const admin = testEnv.authenticatedContext('adminA').firestore();

  await assertSucceeds(getDoc(doc(owner, 'journals/journalA')));
  await assertFails(getDoc(doc(coach, 'journals/journalA')));
  await assertFails(getDoc(doc(admin, 'journals/journalA')));
});

test('clients cannot create paid enrollment grants or ledger transactions', async () => {
  const student = testEnv.authenticatedContext('studentA').firestore();

  await assertFails(setDoc(doc(student, 'enrollments/studentA_courseB'), {
    userId: 'studentA', courseId: 'courseB', status: 'active',
    paymentStatus: 'paid', orderId: 'fake-order', createdAt: Timestamp.now(),
  }));
  await assertFails(setDoc(doc(student, 'transactions/fakeTransaction'), {
    userId: 'studentA', amount: 1, currency: 'USD', status: 'paid',
  }));
});

test('coach automations are scoped to their owner', async () => {
  const owner = testEnv.authenticatedContext('coachA').firestore();
  const otherCoach = testEnv.authenticatedContext('coachB').firestore();

  await assertSucceeds(getDoc(doc(owner, 'automations/automationA')));
  await assertFails(getDoc(doc(otherCoach, 'automations/automationA')));
});

test('coach can update own session but cannot transfer ownership', async () => {
  const coach = testEnv.authenticatedContext('coachA').firestore();

  await assertSucceeds(updateDoc(doc(coach, 'sessions/sessionA'), {
    status: 'reviewed',
  }));
  await assertFails(updateDoc(doc(coach, 'sessions/sessionA'), {
    coachId: 'coachB',
  }));
});

test('global stats are restricted to administrators', async () => {
  const student = testEnv.authenticatedContext('studentA').firestore();
  const admin = testEnv.authenticatedContext('adminA').firestore();

  await assertFails(getDoc(doc(student, 'stats/global')));
  await assertSucceeds(getDoc(doc(admin, 'stats/global')));
});

test('superadmin email alone is insufficient without verified email claim', async () => {
  const unverified = testEnv.authenticatedContext('super', {
    email: 'safeness.c.a@gmail.com',
    email_verified: false,
  }).firestore();
  const verified = testEnv.authenticatedContext('super', {
    email: 'safeness.c.a@gmail.com',
    email_verified: true,
  }).firestore();

  await assertFails(getDoc(doc(unverified, 'stats/global')));
  await assertSucceeds(getDoc(doc(verified, 'stats/global')));
});

test('learners may edit profile content but cannot self-promote or grant staff permissions', async () => {
  const student = testEnv.authenticatedContext('studentA').firestore();
  const profile = doc(student, 'users/studentA');

  await assertSucceeds(updateDoc(profile, { displayName: 'Learner A' }));
  await assertFails(updateDoc(profile, { role: 'admin' }));
  await assertFails(updateDoc(profile, { staffPermissions: ['users:write', 'billing:write'] }));
  await assertFails(updateDoc(profile, { approvalStatus: 'suspended' }));
});

test('notification creation is restricted to the authenticated recipient', async () => {
  const student = testEnv.authenticatedContext('studentA').firestore();
  const ownNotification = {
    userId: 'studentA', title: 'Welcome', message: 'Welcome to KIRA',
    type: 'system', read: false, createdAt: Timestamp.now(),
  };

  await assertSucceeds(setDoc(doc(student, 'notifications/own'), ownNotification));
  await assertFails(setDoc(doc(student, 'notifications/other'), {
    ...ownNotification, userId: 'studentB',
  }));
});
