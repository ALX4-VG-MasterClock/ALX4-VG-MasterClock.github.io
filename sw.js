/* Audit Unisson — travailleur de service (v19).
   Stratégies, dans l'ordre :
   1) La page (HTML) et le journal des mises à jour (JSON) : RÉSEAU D'ABORD.
      La fraîcheur du fichier scellé prime sur le hors ligne — jamais une
      vieille page présentée comme la version courante. Le cache ne sert
      qu'en repli, quand le réseau échoue.
   2) Images et actifs statiques : cache d'abord, réseau en remplissage.
   3) AUCUNE interception des appels externes (autres origines : météo,
      géolocalisation, relais de l'Instance) ni des requêtes non-GET.
   Aucune donnée collectée, aucun suivi : ce fichier ne fait que servir. */
var CACHE = 'sophia-site-v19';
var COEUR = ['./', 'index.html', 'manifest.webmanifest', 'assets/journal-mises-a-jour.json',
  'assets/terre-atlantique.webp', 'assets/terre-atlantique.jpg',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // Chaque actif est mis en cache pour lui-même : un seul absent
      // n'empêche pas les autres d'être prêts pour le hors ligne.
      return Promise.all(COEUR.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms.map(function (n) { if (n !== CACHE) return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;               // non-GET : aucune interception
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // externe : aucune interception
  var estDocument = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  var estJournal = url.pathname.endsWith('assets/journal-mises-a-jour.json');
  if (estDocument || estJournal) {
    // Réseau d'abord ; le cache n'est qu'un repli hors ligne.
    e.respondWith(
      fetch(req).then(function (res) {
        var copie = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copie); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (m) {
          return m || caches.match('index.html');
        });
      })
    );
    return;
  }
  // Actifs statiques (images, icônes, manifeste, feuilles) : cache d'abord.
  e.respondWith(
    caches.match(req).then(function (m) {
      if (m) return m;
      return fetch(req).then(function (res) {
        var copie = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copie); }).catch(function () {});
        return res;
      });
    })
  );
});
