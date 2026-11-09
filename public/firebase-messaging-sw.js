importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

// Firebase Web config is public by design and comes from the same KIRA project
// as the application. Do not hard-code credentials from a different Firebase app.
fetch('/api/firebase/messaging-config', { cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error('Firebase Messaging no está configurado.');
    return response.json();
  })
  .then((firebaseConfig) => {
    if (!firebaseConfig.projectId || !firebaseConfig.apiKey || !firebaseConfig.appId || !firebaseConfig.messagingSenderId) {
      throw new Error('Configuración pública de Firebase incompleta.');
    }
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || 'Nuevo mensaje';
      const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva alerta en KIRA.',
        icon: '/assets/kira-logo.png',
        badge: '/assets/kira-logo.png',
        data: payload.data || {}
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  })
  .catch((error) => console.warn('[KIRA Messaging] Background messaging unavailable:', error.message));
