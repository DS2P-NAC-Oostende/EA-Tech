// =============================================================
// Service worker - EA Tech
// -------------------------------------------------------------
// LEERMODUS - wat doet dit bestand?
//  1. Het bewaart een kopie van de app op het toestel, zodat hij ook
//     zonder internet opengaat.
//  2. Het zorgt dat iedereen automatisch de nieuwste versie krijgt.
//
// BELANGRIJK: de regel VERSIE hieronder wordt bij elke wijziging in de
// repo automatisch vervangen door de robot "Versie"
// (.github/workflows/versie.yml). Niet met de hand aanpassen.
// Waarom het zo werkt: een telefoon herlaadt de app alleen als DIT
// bestand verandert. Verandert alleen app.js of styles.css, dan merkt
// de telefoon dat niet. Door hier elke keer een nieuw versienummer in
// te zetten, verandert dit bestand altijd mee en herlaadt elke telefoon
// zichzelf. Dat is de garantie.
// =============================================================

const VERSIE = "start";            // ROBOT-VERSIE (niet met de hand wijzigen)
const PREFIX = "eatech-";      // eigen opslag: alle apps op dit adres delen een opslag
const CACHE = PREFIX + VERSIE;

// Bestanden voor offline gebruik. Zonder ?v=... : de versie zit al in CACHE.
const BESTANDEN = [
    "./", "./index.html", "./styles.css",
    "./data.js", "./app.js", "./favorieten.js", "./videos.js",
    "./nac-logo.png", "./manifest.json", "./versie.json",
    "./icon-192-optimized.png", "./apple-touch-icon-optimized.png",
    "./favicon-32x32.png", "./favicon-16x16.png"
];

// ---------- Installeren ----------
// Elk bestand apart ophalen: gaat er een mis (bijv. tijdelijk weggehaald),
// dan mislukt NIET de hele installatie. Bij een mislukte installatie krijgt
// niemand daarna ooit nog een nieuwe versie.
self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const c = await caches.open(CACHE);
        await Promise.all(BESTANDEN.map((b) =>
            c.add(new Request(b, { cache: "reload" })).catch(() => {})
        ));
        await self.skipWaiting();        // niet wachten tot alle schermen dicht zijn
    })());
});

// ---------- Overnemen ----------
self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const namen = await caches.keys();
        await Promise.all(namen
            .filter((n) => n.startsWith(PREFIX) && n !== CACHE)   // ALLEEN eigen opslag opruimen
            .map((n) => caches.delete(n)));
        await self.clients.claim();
    })());
});

// De pagina kan vragen om direct over te nemen (zie index.html).
self.addEventListener("message", (e) => { if (e.data === "neem-over") self.skipWaiting(); });

// ---------- Opvragen: eerst het netwerk, zonder verbinding de kopie ----------
self.addEventListener("fetch", (event) => {
    const verzoek = event.request;
    if (verzoek.method !== "GET") return;
    // YouTube, de Google Sheet en de lettertypes laten we rechtstreeks gaan.
    if (new URL(verzoek.url).origin !== self.location.origin) return;

    event.respondWith((async () => {
        try {
            // no-cache: altijd bij de server nakijken, nooit een oude browserkopie.
            const net = await fetch(new Request(verzoek, { cache: "no-cache" }));
            if (!net || !net.ok) throw new Error("HTTP " + (net && net.status));
            const c = await caches.open(CACHE);
            c.put(verzoek, net.clone());          // offline-kopie meteen bijwerken
            return net;
        } catch (e) {
            // ignoreSearch: ook een adres met ?v=... of ?embed=1 vindt zijn kopie.
            const kopie = await caches.match(verzoek, { ignoreSearch: true });
            if (kopie) return kopie;
            if (verzoek.mode === "navigate") {
                const start = await caches.match("./index.html", { ignoreSearch: true });
                if (start) return start;
            }
            throw e;
        }
    })());
});
