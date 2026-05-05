importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Fetch the config via a workaround or just hardcode the necessary parts
// In a real app we would load the config dynamically, but since we are compiling to static,
// we can just put minimum required fields.
const firebaseConfig = {
  projectId: "gen-lang-client-0082259364",
  appId: "1:929279176008:web:c58eaaa666db86b1e4577d",
  apiKey: "AIzaSyCYmfCeHXfrpKdMn_3G-rrim3wu0FIopiE",
  authDomain: "gen-lang-client-0082259364.firebaseapp.com",
  messagingSenderId: "929279176008"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Nuevo mensaje';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva alerta en Kira.',
    icon: '/assets/kira-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
