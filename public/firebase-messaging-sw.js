/* Firebase Cloud Messaging worker. Kept separate from the PWA worker scope. */
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCYmfCeHXfrpKdMn_3G-rrim3wu0FIopiE',
  authDomain: 'kira2-a6a20.firebaseapp.com',
  projectId: 'kira2-a6a20',
  storageBucket: 'kira2-a6a20.firebasestorage.app',
  messagingSenderId: '929279176008',
  appId: '1:929279176008:web:c58eaaa666db86b1e4577d',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Nuevo mensaje';
  const options = {
    body: payload.notification?.body || 'Tienes una nueva alerta en KIRA.',
    icon: '/assets/kira-logo.png',
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
