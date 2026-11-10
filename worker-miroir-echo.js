/* =====================================================================
   Worker « écho du miroir » — AUDIT UNISSON (Porte documentée nº 3)
   Méthode et site : propriété intellectuelle d'Alexandre Vautour Gagnon,
   concepteur indépendant de systèmes et développeur —
   ORCID 0009-0006-9124-4407 — © 2026, tous droits réservés.

   RÔLE — répondre à une seule question, du bord du serveur :
   « voici ce qu'un serveur reçoit de toi, pour vrai ».
   Le panneau Miroir du site (mode démonstration avec serveurs) appelle
   ce point de terminaison ; le Worker renvoie AU SEUL DEMANDEUR les
   en-têtes de sa requête et l'adresse telle que le réseau la présente,
   plus les métadonnées de bordure que Cloudflare joint à la requête.

   RÈGLE 15 — L'OPÉRATEUR SANS ACCÈS : ce Worker ne journalise rien,
   ne stocke rien, n'écrit dans aucun KV, aucune base, aucun journal
   applicatif. La réponse est calculée à la volée, en mémoire, et
   renvoyée au demandeur ; quand la requête se ferme, il ne reste rien.
   (Les compteurs agrégés de la plateforme d'hébergement, s'ils existent,
   relèvent de l'hébergeur, pas de ce code — aucun accès opérateur n'est
   codé ni requis ici.)

   DÉPLOIEMENT : hors du paquet servi ; déployé séparément, à la
   publication, sur le go de l'auteur. L'adresse déployée se pose dans
   la constante B53_ECHO_URL du script v53 du site (index.html).
   ===================================================================== */

const ENTETES_REPONSE = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: ENTETES_REPONSE });
    }
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ erreur: 'méthode non admise — GET seulement' }), {
        status: 405,
        headers: ENTETES_REPONSE,
      });
    }

    /* Les en-têtes, tels que reçus — rien d'autre n'est lu : ni corps
       (il n'y en a pas en GET), ni témoin (ce service n'en pose pas). */
    const enTetes = {};
    for (const [nom, valeur] of request.headers) enTetes[nom] = valeur;

    const cf = request.cf || {};
    const asn = cf.asn ? 'AS' + cf.asn + (cf.asOrganization ? ' — ' + cf.asOrganization : '') : null;

    const corps = {
      format: 'echo-miroir/v1',
      genere_le: new Date().toISOString(),
      recu_par_le_serveur: {
        adresse_ip: request.headers.get('cf-connecting-ip') || null,
        methode: request.method,
        en_tetes: enTetes,
        metadonnees_reseau: {
          pays: cf.country || null,
          region: cf.region || null,
          ville: cf.city || null,
          fournisseur: asn,
          http: cf.httpProtocol || null,
          protocole_tls: cf.tlsVersion || null,
          centre: cf.colo || null,
        },
      },
      conservation:
        "Rien n'est journalisé ni conservé : cette réponse est calculée à la volée et renvoyée au seul demandeur (règle de l'opérateur sans accès).",
    };

    return new Response(JSON.stringify(corps, null, 2), { status: 200, headers: ENTETES_REPONSE });
  },
};
