import { useEffect, useRef } from 'react';
import { db, messaging } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '../hooks/useAuth';

export function PushNotificationManager() {
  const { user } = useAuth();
  const initialLoadRef = useRef(true);

  useEffect(() => {
    async function setupPush() {
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted' && messaging && user) {
          try {
            const currentToken = await getToken(messaging, {
              // vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE' 
            });
            if (currentToken) {
              await setDoc(doc(db, 'users', user.uid, 'tokens', currentToken), {
                token: currentToken,
                createdAt: new Date(),
                userAgent: navigator.userAgent
              });
            }
          } catch (err) {
            console.log('FCM Token error or VAPID required', err);
          }
        }
      } else if (Notification.permission === 'granted' && messaging && user) {
         try {
            const currentToken = await getToken(messaging);
            if (currentToken) {
              await setDoc(doc(db, 'users', user.uid, 'tokens', currentToken), {
                token: currentToken,
                createdAt: new Date(),
                userAgent: navigator.userAgent
              });
            }
          } catch (err) {
            console.log('FCM Token error or VAPID required', err);
          }
      }
    }
    setupPush();
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
