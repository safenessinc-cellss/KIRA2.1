import { useEffect, useRef } from 'react';
import { db, messaging } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const FCM_WORKER_SCOPE = '/firebase-cloud-messaging-push-scope';
import { useAuth } from '../hooks/useAuth';

export function PushNotificationManager() {
  const { user } = useAuth();
  const initialLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function setupPush() {
      if (!user || !messaging || !('Notification' in window) || !('serviceWorker' in navigator)) return;

      // FCM requires the project's public VAPID key. Do not start a doomed
      // registration attempt when the deployment has not been configured.
      if (!VAPID_KEY) {
        console.info('[FCM] Push notifications are disabled: VITE_FIREBASE_VAPID_KEY is not configured.');
        return;
      }

      try {
        let permission = Notification.permission;
        if (permission === 'default') permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        // Keep FCM in its own scope; VitePWA owns the root /sw.js scope.
        const registration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: FCM_WORKER_SCOPE, updateViaCache: 'none' }
        );
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        const currentToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (currentToken && !cancelled) {
          await setDoc(doc(db, 'users', user.uid, 'tokens', currentToken), {
            token: currentToken,
            createdAt: new Date(),
            userAgent: navigator.userAgent,
          });
        }
      } catch (err) {
        // Push is an optional enhancement; never block the dashboard if a
        // browser, permission policy, or service worker does not support it.
        console.warn('[FCM] Push setup unavailable; in-app notifications remain active.', err);
      }
    }

    void setupPush();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    // Foreground FCM listening
    let unsubFCM = () => {};
    if (messaging) {
      unsubFCM = onMessage(messaging, (payload) => {
        new Notification(payload.notification?.title || 'Nuevo mensaje', {
          body: payload.notification?.body || 'Tienes una nueva alerta en Kira.',
          icon: '/assets/kira-logo.png'
        });
      });
    }

    // Listen to new notifications in db as fallback
    const qNotif = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubNotif = onSnapshot(qNotif, (snap) => {
      if (initialLoadRef.current) {
        return;
      }
      
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (!data.read && Notification.permission === 'granted') {
            new Notification(data.title || 'Nueva Notificación', {
              body: data.message || 'Tienes una nueva alerta en el portal.',
              icon: '/assets/kira-logo.png'
            });
          }
        }
      });
    });

    // Listen to new chat messages
    const qMsg = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    // Note: We listen globally to newly incoming messages addressed to this user's chat.
    // Given the chatId format (uid1_uid2), we find matching ones.
    const unsubMsg = onSnapshot(qMsg, (snap) => {
      if (initialLoadRef.current) {
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.chatId && data.chatId.includes(user.uid) && data.senderId !== user.uid) {
            if (Notification.permission === 'granted') {
              new Notification(`Mensaje de ${data.senderName}`, {
                body: data.content,
                icon: '/assets/kira-logo.png'
              });
            }
          }
        }
      });
    });

    setTimeout(() => {
      initialLoadRef.current = false;
    }, 2000);

    return () => {
      unsubNotif();
      unsubMsg();
      unsubFCM();
    };
  }, [user]);

  return null;
}
