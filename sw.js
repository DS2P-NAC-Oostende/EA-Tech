const PREFIX = "eatech-";   // eigen voorvoegsel: alle GitHub-apps delen één opslag
const CACHE = PREFIX + "1";
const BESTANDEN = ["./", "./index.html", "./styles.css?v=1", "./data.js?v=1", "./app.js?v=1", "./favorieten.js?v=1", "./videos.js", "./nac-logo.png"];
self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(BESTANDEN)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((namen) =>
            Promise.all(namen.filter((n) => (n.startsWith(PREFIX)) && n !== CACHE).map((n) => caches.delete(n)))
        )
    );
    self.clients.claim();
});

// Eerst het netwerk, bij geen verbinding de cache
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    // Eigen bestanden altijd bij de server nakijken (geen verouderde kopie uit de browsercache),
    // zodat een nieuwe versie meteen zichtbaar is. Zonder verbinding: de opgeslagen kopie.
    const eigen = new URL(event.request.url).origin === self.location.origin;
    const verzoek = eigen ? new Request(event.request, { cache: "no-cache" }) : event.request;
    event.respondWith(
        fetch(verzoek).catch(() => caches.match(event.request, { ignoreSearch: false }))
    );
});
