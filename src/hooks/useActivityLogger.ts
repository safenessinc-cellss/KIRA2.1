import { useCallback } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type ActivityAction =
  | 'login' | 'logout' | 'course_enrolled' | 'lesson_completed'
  | 'journal_created' | 'journal_deleted' | 'message_sent'
  | 'review_created' | 'certificate_issued' | 'coach_approved'
  | 'payment_succeeded' | 'calm_activated' | 'report_filed';

const SAFE_METADATA_KEYS = new Set(['courseId','lessonId','reviewId','certificateId','coachId','paymentId','provider','currency','amount','mood','durationSeconds','reportId','channel']);

export async function logActivityEvent(userId: string, action: ActivityAction, entityType = 'user', entityId = '', metadata: Record<string, unknown> = {}) {
  if (!userId) return;
  const safeMetadata = Object.fromEntries(Object.entries(metadata).filter(([key, value]) =>
    SAFE_METADATA_KEYS.has(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
  ));
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId, action, entityType, entityId: String(entityId || '').slice(0, 160),
      metadata: safeMetadata,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : '',
      createdAt: Timestamp.now()
    });
  } catch (error) {
    // Activity logging must not block the user's primary action.
    console.warn('[ActivityLogger] Could not persist metadata event:', error);
  }
}

export function useActivityLogger() {
  return useCallback((action: ActivityAction, entityType = 'user', entityId = '', metadata: Record<string, unknown> = {}) => {
    const uid = auth.currentUser?.uid;
    if (uid) void logActivityEvent(uid, action, entityType, entityId, metadata);
  }, []);
}
