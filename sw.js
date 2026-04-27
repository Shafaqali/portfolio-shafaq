const CACHE = 'sa-admin-v1';
const OFFLINE_URLS = [
  './dashboard.html',
  './manifest.json'
];

// ── Install: cache essential files ──────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network first, fallback to cache ─────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(cached => cached || caches.match('./dashboard.html'))
      )
  );
});

// ── Push Notification ───────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = {
    title:   '📬 New Contact Message!',
    body:    'Someone filled your contact form.',
    name:    '',
    subject: ''
  };

  try {
    if (e.data) data = e.data.json();
  } catch (err) {
    console.warn('[SW] Push data parse error:', err);
  }

  const notifTitle = data.title || '📬 New Contact Message!';
  const notifBody  = data.body  ||
    `From: ${data.name || 'Someone'}${data.subject ? ' — ' + data.subject : ''}`;

  const options = {
    body:      notifBody,
    icon:      './icon-192.svg',
    badge:     './icon-192.svg',
    vibrate:   [200, 100, 200, 100, 200],
    tag:       'new-contact',
    renotify:  true,
    data:      { url: './dashboard.html#contacts' },
    actions: [
      { action: 'view',    title: '👁 View Message' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(notifTitle, options)
  );
});

// ── Notification Click ──────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const targetUrl = (e.notification.data && e.notification.data.url)
    || './dashboard.html';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Agar admin panel already khula hai toh focus karo
        for (const client of clientList) {
          if (client.url.includes('dashboard') && 'focus' in client) {
            client.postMessage({ action: 'navigate', page: 'contacts' });
            return client.focus();
          }
        }
        // Warna naya tab kholo
        return clients.openWindow(targetUrl);
      })
  );
});
