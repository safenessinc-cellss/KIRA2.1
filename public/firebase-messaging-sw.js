/* Firebase Cloud Messaging background handler.
 * The main application initializes Firebase from VITE_* configuration.
 * This worker handles the Web Push event directly and contains no project keys.
 */
self.addEventListener("push", event => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { data: { body: event.data.text() } }; }
  const notification = payload.notification || payload.data || {};
  const title = String(notification.title || "KIRA · Nueva notificación").slice(0, 120);
  const options = {
    body: String(notification.body || notification.message || "Tienes una nueva alerta en KIRA.").slice(0, 300),
    icon: "/assets/kira-logo.png",
    badge: "/assets/kira-logo.png",
    data: { url: String(notification.click_action || payload.fcmOptions?.link || "/dashboard") }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.location.origin));
    if (existing) {
      existing.navigate(target);
      return existing.focus();
    }
    return clients.openWindow(target);
  }));
});
