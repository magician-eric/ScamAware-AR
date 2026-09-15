// Kill switch. This app (the React SPA built from webapp/) never registers
// a service worker itself - but the old pre-SPA static site did, at this
// same origin+scope (see js/app.js's serviceWorker.register call), and any
// browser that visited it still has that registration active, silently
// intercepting every fetch on later visits regardless of what's actually
// deployed now. skipWaiting() + clients.claim() below mean this replaces
// that old worker on the very next load; activate then wipes every cache,
// unregisters itself, and reloads any open tab so it goes back to plain
// network requests with no service worker at all - permanently fixing
// "the site still looks like an old version" for anyone who is stuck this
// way, with no action needed on their end.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});
