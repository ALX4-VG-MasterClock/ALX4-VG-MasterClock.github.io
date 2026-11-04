/* Audit Unisson — travailleur de service (v28).
   Stratégies, dans l'ordre :
   1) La page (HTML), le journal des mises à jour (JSON) et TOUS les fichiers
      de données JSON sous assets/ (coffre, coffre privé, état de la chaîne,
      historique, Merkle) : RÉSEAU D'ABORD. La fraîcheur prime sur le hors
      ligne — jamais un état périmé présenté comme l'état courant.
   2) Images et actifs statiques : cache d'abord, réseau en remplissage.
   3) AUCUNE interception des appels externes (autres origines : météo,
      géolocalisation, relais de l'Instance) ni des requêtes non-GET.
   Aucune donnée collectée, aucun suivi : ce fichier ne fait que servir.
   Correctif v20 (3 nov. 2026) : la v19 mémorisait la première réponse reçue
   pour assets/coffre-prive.json — y compris un 404 d'avant le premier
   dépôt — et la reservait indéfiniment : la zone Mémoire verrouillée
   restait « en attente » sur les appareils déjà visiteurs alors que le
   paquet était en ligne. Désormais : réseau d'abord pour les données, et
   une réponse non-OK n'entre jamais au cache.
   Propriété intellectuelle du site et de sa méthode : © 2026 Alexandre Vautour Gagnon, chercheur indépendant (ORCID 0009-0006-9124-4407) — tous droits réservés. */
var CACHE = 'sophia-site-v28';
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
  var estDonnees = url.pathname.indexOf('/assets/') !== -1 && url.pathname.endsWith('.json');
  if (estDocument || estJournal || estDonnees) {
    // Réseau d'abord ; le cache n'est qu'un repli hors ligne, et seulement
    // pour une réponse OK — une absence (404) ne se mémorise jamais.
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copie = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copie); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (m) {
          if (m) return m;
          if (estDonnees) return new Response('', { status: 504, statusText: 'hors ligne' });
          return caches.match('index.html');
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
        if (res && res.ok) {
          var copie = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copie); }).catch(function () {});
        }
        return res;
      });
    })
  );
});
