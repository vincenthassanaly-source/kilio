const CACHE_NAME = "nutrition-app-shell-v2";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-badge.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// Network-first pour les pages ET les fetch internes du routeur Next.js (payloads
// RSC lors d'une navigation <Link>, qui ont mode "cors" et non "navigate") : sans
// ça, le cache-first servirait indéfiniment une version périmée d'une page après
// qu'une entrée ait été ajoutée côté serveur (ex: Supabase directement, sans passer
// par une Server Action de ce site). Cache-first réservé aux vrais assets statiques
// versionnés par build (_next/static) et aux icônes. Les appels Supabase (autre
// origine) ne passent pas ici.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

  if (!isStaticAsset) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
    )
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Kilio", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-badge.png",
      data: { url: data.url || "/agenda" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/agenda";
  // Comparaison sur le pathname (pas l'URL complète) : une fenêtre déjà
  // ouverte sur /agenda est réutilisée même si son ?tache= diffère (ou est
  // absent) de celui de la notification cliquée, plutôt que d'ouvrir une
  // nouvelle fenêtre à chaque notification.
  const path = new URL(url, self.location.origin).pathname;
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(async (clients) => {
      const existing = clients.find((c) => new URL(c.url).pathname === path);
      if (existing) {
        if ("navigate" in existing) {
          try {
            await existing.navigate(url);
          } catch {
            // navigate() peut échouer selon le navigateur : la fenêtre
            // existante est quand même mise au premier plan ci-dessous,
            // simplement pas repositionnée sur la bonne tâche/jour.
          }
        }
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
