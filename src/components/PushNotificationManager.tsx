import { useEffect, useRef } from 'react';
import { db, getBrowserMessaging } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '../hooks/useAuth';

const FCM_WORKER_URL = '/firebase-messaging-sw.js';
const FCM_WORKER_SCOPE = '/firebase-cloud-messaging-push-scope';

export type PushSetupResult = { ok: boolean; message: string };

async function waitForWorkerActivation(
  registration: ServiceWorkerRegistration,
  timeoutMs = 15000
): Promise<ServiceWorkerRegistration> {
  if (registration.active?.state === 'activated') return registration;

  return new Promise((resolve, reject) => {
    let settled = false;
    const workerEvents = new Map<ServiceWorker, () => void>();

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      registration.removeEventListener('updatefound', watchWorkers);
      workerEvents.forEach((listener, worker) => worker.removeEventListener('statechange', listener));
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(registration);
    };

    const checkState = () => {
      if (registration.active?.state === 'activated') {
        finish();
        return;
      }
      const candidate = registration.installing || registration.waiting;
      if (candidate?.state === 'redundant') {
        finish(new Error('El Service Worker de notificaciones fue reemplazado antes de activarse.'));
      }
    };

    function watchWorkers() {
      const workers = [registration.installing, registration.waiting, registration.active];
      workers.forEach(worker => {
        if (!worker || workerEvents.has(worker)) return;
        const listener = () => checkState();
        workerEvents.set(worker, listener);
        worker.addEventListener('statechange', listener);
      });
      checkState();
    }

    const timeoutId = window.setTimeout(
      () => finish(new Error('El Service Worker de notificaciones no se activó a tiempo.')),
      timeoutMs
    );
    registration.addEventListener('updatefound', watchWorkers);
    watchWorkers();
  });
}

async function registerPushToken(userId: string): Promise<PushSetupResult> {
  if (!userId) return { ok: false, message: 'Inicia sesión para activar las notificaciones.' };
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, message: 'Este navegador no admite notificaciones push.' };
  }
  if (!('serviceWorker' in navigator)) {
    return { ok: false, message: 'Este navegador no admite Service Workers.' };
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, message: 'Permite las notificaciones para activar los avisos.' };
  }

  try {
    const messagingClient = await getBrowserMessaging();
    if (!messagingClient) {
      return { ok: false, message: 'Las notificaciones push no son compatibles con este navegador.' };
    }

    // FCM's default worker scope is separate from the app's Workbox PWA worker.
    // Pass the explicit registration to getToken to avoid the SDK's default-registration race.
    const registration = await navigator.serviceWorker.register(FCM_WORKER_URL, {
      scope: FCM_WORKER_SCOPE,
      updateViaCache: 'none'
    });
    await waitForWorkerActivation(registration);

    const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
    const tokenOptions = vapidKey
      ? { serviceWorkerRegistration: registration, vapidKey }
      : { serviceWorkerRegistration: registration };
    const token = await getToken(messagingClient, tokenOptions);

    if (!token) {
      return { ok: false, message: 'Firebase no devolvió un token para este dispositivo.' };
    }

    await setDoc(doc(db, 'users', userId, 'tokens', token), {
      token,
      createdAt: new Date(),
      userAgent: navigator.userAgent
    }, { merge: true });

    return { ok: true, message: 'Notificaciones push activadas en este dispositivo.' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn('[FCM] No se pudo activar el envío push:', detail);
    return {
      ok: false,
      message: 'No se pudieron activar los avisos push. Revisa el Service Worker y la configuración Firebase.'
    };
  }
}

/** Called only from a deliberate user click in the Notification Center. */
export async function requestPushNotifications(userId: string): Promise<PushSetupResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, message: 'Este navegador no admite notificaciones.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        message: permission === 'denied'
          ? 'El navegador bloqueó las notificaciones. Cámbialo en los permisos del sitio.'
          : 'No se concedió permiso para enviar notificaciones.'
      };
    }
    return await registerPushToken(userId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn('[FCM] No se pudo solicitar permiso:', detail);
    return { ok: false, message: 'No se pudo solicitar permiso para las notificaciones.' };
  }
}

export function PushNotificationManager() {
  const { user } = useAuth();
  const initialLoadRef = useRef(true);
  const userId = user?.uid;

  // FCM foreground listener. Existing permission is respected; no automatic prompts.
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let unsubscribe = () => {};

    const setupForegroundMessaging = async () => {
      const messagingClient = await getBrowserMessaging();
      if (!messagingClient || disposed) return;

      unsubscribe = onMessage(messagingClient, payload => {
        if (Notification.permission !== 'granted') return;
        new Notification(payload.notification?.title || 'Nuevo mensaje', {
          body: payload.notification?.body || 'Tienes una nueva alerta en Kira.',
          icon: '/assets/kira-logo.png'
        });
      });

      if (Notification.permission === 'granted') {
        await registerPushToken(userId);
      }
    };

    void setupForegroundMessaging().catch(error => {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn('[FCM] No se pudo preparar la mensajería en primer plano:', detail);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [userId]);

  // Firestore-backed notifications remain available even when push is unsupported.
  useEffect(() => {
    if (!userId) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const qNotif = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const qMsg = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(1));

    const unsubNotif = onSnapshot(qNotif, snap => {
      if (initialLoadRef.current) return;
      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        if (!data.read && Notification.permission === 'granted') {
          new Notification(data.title || 'Nueva notificación', {
            body: data.message || 'Tienes una nueva alerta en el portal.',
            icon: '/assets/kira-logo.png'
          });
        }
      });
    });

    const unsubMsg = onSnapshot(qMsg, snap => {
      if (initialLoadRef.current) return;
      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        if (
          data.chatId &&
          data.chatId.includes(userId) &&
          data.senderId !== userId &&
          Notification.permission === 'granted'
        ) {
          new Notification(`Mensaje de ${data.senderName || 'un contacto'}`, {
            body: data.content || 'Tienes un nuevo mensaje en Kira.',
            icon: '/assets/kira-logo.png'
          });
        }
      });
    });

    const readyTimer = window.setTimeout(() => {
      initialLoadRef.current = false;
    }, 2000);

    return () => {
      window.clearTimeout(readyTimer);
      unsubNotif();
      unsubMsg();
    };
  }, [userId]);

  return null;
}
