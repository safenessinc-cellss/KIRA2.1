importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCYmfCeHXfrpKdMn_3G-rrim3wu0FIopiE",
  authDomain: "kira2-a6a20.firebaseapp.com",
  projectId: "kira2-a6a20",
  messagingSenderId: "929279176008",
  appId: "1:929279176008:web:c58eaaa666db86b1e4577d",
  storageBucket: "kira2-a6a20.firebasestorage.app"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Nuevo mensaje';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva alerta en Kira.',
    icon: '/assets/kira-logo.png',
    badge: '/assets/kira-logo.png',
    data: { url: payload.fcmOptions?.link || '/' }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => 'focus' in client);
      if (existingClient) {
        return existingClient.navigate(targetUrl).then((client) => client?.focus());
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
