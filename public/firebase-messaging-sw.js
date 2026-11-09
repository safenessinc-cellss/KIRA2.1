importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Do not hardcode a Firebase project or API key in the public service worker.
// Load the same public web configuration used by the application at runtime.
fetch('/api/firebase-config', { cache: 'no-store' })
  .then(async (response) => {
    if (!response.ok) {
      throw new Error(`Firebase config endpoint returned HTTP ${response.status}`);
    }
    return response.json();
  })
  .then((firebaseConfig) => {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || 'Nuevo mensaje';
      const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva alerta en Kira.',
        icon: '/assets/kira-logo.png'
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  })
  .catch((error) => {
    console.error('[firebase-messaging-sw.js] No se pudo inicializar Firebase Messaging:', error);
  });
