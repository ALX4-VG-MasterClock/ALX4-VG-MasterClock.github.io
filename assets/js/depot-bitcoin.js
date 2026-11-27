/* ===== Dépôt Bitcoin — la même empreinte, ancrée dans Bitcoin =====
   Version 64 du site (25 novembre 2026, directive d'Alex du même jour,
   08 h 39 : « Il faut qu'on se serve de mon site web aussi pour déposer
   les empreintes autant sur Bitcoin que sur mon site web »).

   Ce moteur accomplit le dépôt OpenTimestamps DEPUIS le navigateur du
   visiteur : l'empreinte (un nombre, 32 octets) est soumise aux serveurs
   calendriers publics du protocole ; la preuve (.ots) produite est
   téléchargée par le visiteur, qui la garde. Rien ne transite par ce
   site — il n'a pas de serveur — et le site ne garde rien du geste :
   seuls des nombres partent chez les calendriers publics.

   Le format des preuves est celui du protocole OpenTimestamps, relu et
   réécrit ici dans les conventions du site (comme les lecteurs de
   preuves des panneaux Ancrage, t55/t56) : en-tête détachée, arbre
   d'opérations et d'attestations, fusion des réponses de plusieurs
   calendriers, mise à niveau des attestations en attente. Opérations
   prises en charge : append (0xf0), prepend (0xf1), reverse (0xf2),
   hexlify (0xf3), SHA-1 (0x02), RIPEMD-160 (0x03), SHA-256 (0x08).
   Toute autre opération arrête le calcul avec un message nommé — le
   chemin d'une telle preuve se revérifie avec l'outil OpenTimestamps.

   Fonctions pures éprouvées au chantier contre l'implémentation de
   référence (python-opentimestamps) : analyse, fusion et sérialisation
   reproduites à l'octet sur des réponses réelles de calendriers.      */
(function () {
  'use strict';

  var MAGIE = [0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94];
  var TAG_EN_ATTENTE = '83dfe30d2ef90c8e';
  var TAG_BITCOIN = '0588960d73d71901';
  var TAG_LITECOIN = '06869a0d73d71b45';
  var CALENDRIERS = [
    'https://a.pool.opentimestamps.org',
    'https://b.pool.opentimestamps.org',
    'https://a.pool.eternitywall.com',
    'https://ots.btc.catallaxy.com'
  ];

  /* ---------------- octets ---------------- */

  function hex(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i++) s += ('0' + u8[i].toString(16)).slice(-2);
    return s;
  }
  function depuisHex(s) {
    var out = new Uint8Array(s.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }
  function concatener(a, b) {
    var out = new Uint8Array(a.length + b.length);
    out.set(a, 0); out.set(b, a.length);
    return out;
  }
  function egal(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function comparerOctets(a, b) {
    var n = Math.min(a.length, b.length);
    for (var i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  }

  /* varuint du protocole : LEB128 non signé (base 128, petit-boutien,
     bit de continuation 0x80) — le format de l'implémentation de
     référence, le même que lit déjà le panneau Ancrage (t56). */
  function ecrireVaruint(v) {
    var out = [];
    if (v === 0) return new Uint8Array([0]);
    while (v > 0) {
      var b = v % 128;
      v = Math.floor(v / 128);
      if (v > 0) b |= 0x80;
      out.push(b);
    }
    return new Uint8Array(out);
  }
  function lireVaruint(u8, etat) {
    var v = 0, decal = 0;
    for (var garde = 0; garde < 10; garde++) {
      if (etat.p >= u8.length) throw new Error('preuve tronquée (varuint)');
      var x = u8[etat.p++];
      v += (x & 0x7f) * Math.pow(2, decal);
      decal += 7;
      if (!(x & 0x80)) return v;
    }
    throw new Error('varuint trop long dans la preuve');
  }
  function ecrireVarbytes(octets) {
    return concatener(ecrireVaruint(octets.length), octets);
  }
  function lireVarbytes(u8, etat) {
    var n = lireVaruint(u8, etat);
    if (etat.p + n > u8.length) throw new Error('preuve tronquée (varbytes)');
    var out = u8.slice(etat.p, etat.p + n);
    etat.p += n;
    return out;
  }

  /* ---------------- hachages ---------------- */

  function sha256(u8) {
    return crypto.subtle.digest('SHA-256', u8).then(function (h) { return new Uint8Array(h); });
  }
  function sha1(u8) {
    return crypto.subtle.digest('SHA-1', u8).then(function (h) { return new Uint8Array(h); });
  }
  /* RIPEMD-160 en JavaScript pur (WebCrypto ne l'offre pas) — même
     implémentation que le lecteur de preuves du panneau Ancrage (t56),
     vecteurs officiels vérifiés au chantier. */
  function ripemd160(msg) {
    var R1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
    var R2 = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
    var S1 = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
    var S2 = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
    var K1 = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e];
    var K2 = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];
    function rol(x, n) { return (x << n) | (x >>> (32 - n)); }
    function f(j, x, y, z) {
      if (j < 16) return x ^ y ^ z;
      if (j < 32) return (x & y) | (~x & z);
      if (j < 48) return (x | ~y) ^ z;
      if (j < 64) return (x & z) | (y & ~z);
      return x ^ (y | ~z);
    }
    var ml = msg.length;
    var total = ((ml + 72) >> 6) << 6;
    var buf = new Uint8Array(total);
    buf.set(msg); buf[ml] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, (ml * 8) >>> 0, true);
    dv.setUint32(total - 4, Math.floor(ml / 536870912) >>> 0, true);
    var h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    for (var bloc = 0; bloc < total; bloc += 64) {
      var X = [];
      for (var i = 0; i < 16; i++) X[i] = dv.getUint32(bloc + i * 4, true);
      var a1 = h0, b1 = h1, c1 = h2, d1 = h3, e1 = h4, a2 = h0, b2 = h1, c2 = h2, d2 = h3, e2 = h4, t;
      for (var j = 0; j < 80; j++) {
        t = (rol((a1 + f(j, b1, c1, d1) + X[R1[j]] + K1[j >> 4]) | 0, S1[j]) + e1) | 0;
        a1 = e1; e1 = d1; d1 = rol(c1, 10); c1 = b1; b1 = t;
        t = (rol((a2 + f(79 - j, b2, c2, d2) + X[R2[j]] + K2[j >> 4]) | 0, S2[j]) + e2) | 0;
        a2 = e2; e2 = d2; d2 = rol(c2, 10); c2 = b2; b2 = t;
      }
      t = (h1 + c1 + d2) | 0; h1 = (h2 + d1 + e2) | 0; h2 = (h3 + e1 + a2) | 0; h3 = (h4 + a1 + b2) | 0; h4 = (h0 + b1 + c2) | 0; h0 = t;
    }
    var out = new Uint8Array(20), odv = new DataView(out.buffer);
    [h0, h1, h2, h3, h4].forEach(function (h, i) { odv.setUint32(i * 4, h >>> 0, true); });
    return out;
  }

  /* ---------------- opérations ---------------- */

  var OPS_BINAIRES = { 0xf0: 'append', 0xf1: 'prepend' };
  var OPS_SIMPLES = { 0xf2: 'reverse', 0xf3: 'hexlify', 0x02: 'sha1', 0x03: 'ripemd160', 0x08: 'sha256' };

  function cleOp(op) { return op.tag + ':' + (op.arg ? hex(op.arg) : ''); }
  function comparerOps(a, b) {
    if (a.tag !== b.tag) return a.tag - b.tag;
    return comparerOctets(a.arg || new Uint8Array(0), b.arg || new Uint8Array(0));
  }
  function appliquerOp(op, msg) {
    switch (op.tag) {
      case 0xf0: return Promise.resolve(concatener(msg, op.arg));
      case 0xf1: return Promise.resolve(concatener(op.arg, msg));
      case 0xf2:
        var r = new Uint8Array(msg.length);
        for (var i = 0; i < msg.length; i++) r[i] = msg[msg.length - 1 - i];
        return Promise.resolve(r);
      case 0xf3:
        var h = hex(msg), out = new Uint8Array(h.length);
        for (var j = 0; j < h.length; j++) out[j] = h.charCodeAt(j);
        return Promise.resolve(out);
      case 0x02: return sha1(msg);
      case 0x03: return Promise.resolve(ripemd160(msg));
      case 0x08: return sha256(msg);
      default:
        return Promise.reject(new Error('opération 0x' + ('0' + op.tag.toString(16)).slice(-2) +
          ' non prise en charge dans cette page — le chemin de cette preuve se revérifie avec l’outil OpenTimestamps'));
    }
  }
  function serialiserOp(op) {
    if (OPS_BINAIRES[op.tag]) return concatener(new Uint8Array([op.tag]), ecrireVarbytes(op.arg));
    return new Uint8Array([op.tag]);
  }

  /* ---------------- attestations ----------------
     Représentation : { tag: hex(8 octets), charge: octets } où « charge »
     est la charge utile sérialisée (pour une attestation en attente :
     varbytes de l'URI ; pour Bitcoin/Litecoin : varuint de la hauteur ;
     pour une attestation inconnue : les octets tels que lus).          */

  function cleAttestation(att) { return att.tag + ':' + hex(att.charge); }
  function comparerAttestations(a, b) {
    var c = comparerOctets(depuisHex(a.tag), depuisHex(b.tag));
    if (c !== 0) return c;
    if (a.tag === TAG_EN_ATTENTE) {
      var ua = uriAttestation(a), ub = uriAttestation(b);
      if (ua !== ub) return ua < ub ? -1 : 1;
      return 0;
    }
    if (a.tag === TAG_BITCOIN || a.tag === TAG_LITECOIN) {
      return hauteurAttestation(a) - hauteurAttestation(b);
    }
    return comparerOctets(a.charge, b.charge);
  }
  function serialiserAttestation(att) {
    return concatener(depuisHex(att.tag), ecrireVarbytes(att.charge));
  }
  function uriAttestation(att) {
    if (att.tag !== TAG_EN_ATTENTE) return null;
    var etat = { p: 0 };
    var brut = lireVarbytes(att.charge, etat);
    return new TextDecoder('utf-8').decode(brut);
  }
  function hauteurAttestation(att) {
    if (att.tag !== TAG_BITCOIN && att.tag !== TAG_LITECOIN) return null;
    var etat = { p: 0 };
    return lireVaruint(att.charge, etat);
  }
  function attestationEnAttente(uri) {
    var brut = new TextEncoder().encode(uri.replace(/\/+$/, ''));
    return { tag: TAG_EN_ATTENTE, charge: ecrireVarbytes(brut) };
  }

  /* ---------------- l'arbre d'estampille ----------------
     Nœud : { msg, attestations: [], ops: [{op, sous}] }                 */

  function nouveauNoeud(msg) { return { msg: msg, attestations: [], ops: [] }; }

  function lireAttestation(u8, etat) {
    if (etat.p + 8 > u8.length) throw new Error('preuve tronquée (attestation)');
    var tag = hex(u8.slice(etat.p, etat.p + 8)); etat.p += 8;
    var charge = lireVarbytes(u8, etat);
    return { tag: tag, charge: charge };
  }
  function lireOp(u8, etat, tag) {
    if (OPS_BINAIRES[tag]) {
      return { tag: tag, arg: lireVarbytes(u8, etat) };
    }
    if (OPS_SIMPLES[tag]) return { tag: tag, arg: null };
    throw new Error('opération 0x' + ('0' + tag.toString(16)).slice(-2) +
      ' non prise en charge dans cette page — le chemin de cette preuve se revérifie avec l’outil OpenTimestamps');
  }

  function analyserArbre(u8, msgDepart) {
    var etat = { p: 0 };
    return analyserNoeud(u8, etat, msgDepart, 256).then(function (racine) {
      return { racine: racine, consomme: etat.p };
    });
  }
  /* Lecture strictement séquentielle, comme l'implémentation de
     référence : une étiquette 0xff annonce un élément de plus (attestation
     si l'octet suivant vaut 0x00, sinon une opération dont tout le
     sous-arbre se lit avant l'étiquette suivante). */
  async function analyserNoeud(u8, etat, msg, profondeur) {
    if (profondeur <= 0) throw new Error('preuve trop profonde');
    var noeud = nouveauNoeud(msg);
    async function traiter(tag) {
      if (tag === 0x00) {
        noeud.attestations.push(lireAttestation(u8, etat));
        return;
      }
      var op = lireOp(u8, etat, tag);
      var res = await appliquerOp(op, msg);
      var sous = await analyserNoeud(u8, etat, res, profondeur - 1);
      noeud.ops.push({ op: op, sous: sous });
    }
    if (etat.p >= u8.length) throw new Error('preuve tronquée');
    var tag = u8[etat.p++];
    while (tag === 0xff) {
      if (etat.p >= u8.length) throw new Error('preuve tronquée');
      await traiter(u8[etat.p++]);
      if (etat.p >= u8.length) throw new Error('preuve tronquée');
      tag = u8[etat.p++];
    }
    await traiter(tag);
    return noeud;
  }

  function serialiserNoeud(noeud) {
    if (!noeud.attestations.length && !noeud.ops.length) {
      throw new Error('un arbre vide ne se sérialise pas');
    }
    var atts = noeud.attestations.slice().sort(comparerAttestations);
    var ops = noeud.ops.slice().sort(function (x, y) { return comparerOps(x.op, y.op); });
    var morceaux = [];
    function pousser() { for (var i = 0; i < arguments.length; i++) morceaux.push(arguments[i]); }
    var i;
    if (atts.length > 1) {
      for (i = 0; i < atts.length - 1; i++) pousser(new Uint8Array([0xff, 0x00]), serialiserAttestation(atts[i]));
    }
    if (!ops.length) {
      pousser(new Uint8Array([0x00]), serialiserAttestation(atts[atts.length - 1]));
    } else {
      if (atts.length) pousser(new Uint8Array([0xff, 0x00]), serialiserAttestation(atts[atts.length - 1]));
      for (i = 0; i < ops.length - 1; i++) {
        pousser(new Uint8Array([0xff]), serialiserOp(ops[i].op), serialiserNoeud(ops[i].sous));
      }
      var d = ops[ops.length - 1];
      pousser(serialiserOp(d.op), serialiserNoeud(d.sous));
    }
    var total = 0;
    for (i = 0; i < morceaux.length; i++) total += morceaux[i].length;
    var out = new Uint8Array(total), pos = 0;
    for (i = 0; i < morceaux.length; i++) { out.set(morceaux[i], pos); pos += morceaux[i].length; }
    return out;
  }

  function fusionner(cible, source) {
    if (!egal(cible.msg, source.msg)) {
      throw new Error('fusion impossible : les deux arbres ne portent pas sur le même message');
    }
    var cles = {};
    cible.attestations.forEach(function (a) { cles[cleAttestation(a)] = true; });
    source.attestations.forEach(function (a) {
      if (!cles[cleAttestation(a)]) { cible.attestations.push(a); cles[cleAttestation(a)] = true; }
    });
    source.ops.forEach(function (entree) {
      var cle = cleOp(entree.op), trouve = null;
      cible.ops.forEach(function (e) { if (cleOp(e.op) === cle) trouve = e; });
      if (trouve) fusionner(trouve.sous, entree.sous);
      else cible.ops.push(entree);
    });
    return cible;
  }

  function releverAttestations(noeud, sortie) {
    sortie = sortie || [];
    noeud.attestations.forEach(function (att) {
      if (att.tag === TAG_EN_ATTENTE) sortie.push({ type: 'en-attente', detail: uriAttestation(att), msg: hex(noeud.msg) });
      else if (att.tag === TAG_BITCOIN) sortie.push({ type: 'bitcoin', detail: hauteurAttestation(att), msg: hex(noeud.msg) });
      else if (att.tag === TAG_LITECOIN) sortie.push({ type: 'litecoin', detail: hauteurAttestation(att), msg: hex(noeud.msg) });
      else sortie.push({ type: 'inconnue', detail: att.tag, msg: hex(noeud.msg) });
    });
    noeud.ops.forEach(function (e) { releverAttestations(e.sous, sortie); });
    return sortie;
  }

  /* ---------------- le fichier détaché .ots ---------------- */

  function construireOts(digest, racine) {
    var tete = new Uint8Array(MAGIE.length + 2 + 32);
    tete.set(MAGIE, 0);
    tete[MAGIE.length] = 1;      /* version majeure */
    tete[MAGIE.length + 1] = 0x08; /* l'empreinte est un SHA-256 */
    tete.set(digest, MAGIE.length + 2);
    return concatener(tete, serialiserNoeud(racine));
  }
  function analyserOts(u8) {
    if (u8.length < MAGIE.length + 2 + 32) return Promise.reject(new Error('fichier trop court pour une preuve OpenTimestamps'));
    for (var i = 0; i < MAGIE.length; i++) {
      if (u8[i] !== MAGIE[i]) return Promise.reject(new Error('ce fichier ne commence pas comme une preuve OpenTimestamps (.ots)'));
    }
    if (u8[MAGIE.length] !== 1) return Promise.reject(new Error('version de preuve non prise en charge : ' + u8[MAGIE.length]));
    if (u8[MAGIE.length + 1] !== 0x08) return Promise.reject(new Error('la preuve ne porte pas une empreinte SHA-256'));
    var digest = u8.slice(MAGIE.length + 2, MAGIE.length + 2 + 32);
    var corps = u8.slice(MAGIE.length + 2 + 32);
    return analyserArbre(corps, digest).then(function (r) {
      if (r.consomme !== corps.length) throw new Error('la preuve porte des octets au-delà de son arbre');
      return { digest: digest, racine: r.racine };
    });
  }

  /* ---------------- les calendriers ---------------- */

  function fetchParDefaut(url, options) {
    if (typeof fetch === 'function') return fetch(url, options);
    return Promise.reject(new Error('aucune fonction fetch disponible'));
  }
  function avecDelai(promesse, ms) {
    return new Promise(function (resolve, reject) {
      var fini = false;
      var minuteur = setTimeout(function () {
        if (!fini) { fini = true; reject(new Error('délai dépassé (' + Math.round(ms / 1000) + ' s)')); }
      }, ms);
      promesse.then(function (v) { if (!fini) { fini = true; clearTimeout(minuteur); resolve(v); } },
                    function (e) { if (!fini) { fini = true; clearTimeout(minuteur); reject(e); } });
    });
  }

  /* Estampiller : soumettre le digest (32 octets) à chaque calendrier,
     analyser chaque réponse et fusionner les arbres obtenus. Aucun
     échec silencieux : le sort de chaque calendrier est rapporté. */
  function estampiller(digest, options) {
    options = options || {};
    var fetchFn = options.fetch || fetchParDefaut;
    var calendriers = options.calendriers || CALENDRIERS;
    var delai = options.delai || 20000;
    var demandes = calendriers.map(function (cal) {
      var demande = fetchFn(cal + '/digest', { method: 'POST', body: digest })
        .then(function (resp) {
          if (!resp.ok) throw new Error('le calendrier a répondu ' + resp.status);
          return resp.arrayBuffer();
        })
        .then(function (buf) { return analyserArbre(new Uint8Array(buf), digest); })
        .then(function (r) { return { calendrier: cal, ok: true, racine: r.racine }; });
      return avecDelai(demande, delai).then(null, function (e) {
        return { calendrier: cal, ok: false, erreur: String((e && e.message) || e) };
      });
    });
    return Promise.all(demandes).then(function (reponses) {
      var bonnes = reponses.filter(function (r) { return r.ok; });
      if (!bonnes.length) return { ok: false, reponses: reponses };
      var racine = bonnes[0].racine;
      for (var i = 1; i < bonnes.length; i++) fusionner(racine, bonnes[i].racine);
      return { ok: true, racine: racine, reponses: reponses };
    });
  }

  /* Mettre à niveau : pour chaque attestation en attente, demander au
     calendrier l'arbre complété du message du nœud ; en cas de réponse,
     l'attestation en attente est remplacée par l'arbre reçu (fusion).
     Un 404 du calendrier signifie « pas encore » — rapporté tel quel. */
  function mettreANiveau(racine, options) {
    options = options || {};
    var fetchFn = options.fetch || fetchParDefaut;
    var delai = options.delai || 20000;
    var rapport = [];
    function traiterNoeud(noeud, rondes) {
      var change = false;
      var chaine = Promise.resolve();
      var restantes = noeud.attestations.filter(function (a) { return a.tag === TAG_EN_ATTENTE; });
      restantes.forEach(function (att) {
        chaine = chaine.then(function () {
          var uri = uriAttestation(att);
          var url = uri.replace(/\/+$/, '') + '/timestamp/' + hex(noeud.msg);
          return avecDelai(fetchFn(url).then(function (resp) {
            if (resp.status === 404) { rapport.push({ uri: uri, statut: 'en-attente' }); return null; }
            if (!resp.ok) throw new Error('le calendrier a répondu ' + resp.status);
            return resp.arrayBuffer();
          }), delai).then(function (buf) {
            if (buf === null) return;
            return analyserArbre(new Uint8Array(buf), noeud.msg).then(function (r) {
              noeud.attestations = noeud.attestations.filter(function (a) { return cleAttestation(a) !== cleAttestation(att); });
              fusionner(noeud, r.racine);
              change = true;
              rapport.push({ uri: uri, statut: 'completee' });
            });
          }).then(null, function (e) {
            rapport.push({ uri: uri, statut: 'erreur', erreur: String((e && e.message) || e) });
          });
        });
      });
      return chaine.then(function () {
        if (change && rondes < 4) {
          /* l'arbre reçu peut porter ses propres attestations en attente :
             un passage de plus, borné à quatre rondes par nœud. */
          return traiterNoeud(noeud, rondes + 1);
        }
        var sous = Promise.resolve();
        noeud.ops.forEach(function (e) {
          sous = sous.then(function () { return traiterNoeud(e.sous, 0); });
        });
        return sous;
      });
    }
    return traiterNoeud(racine, 0).then(function () { return rapport; });
  }

  var api = {
    CALENDRIERS: CALENDRIERS,
    MAGIE: MAGIE,
    hex: hex,
    depuisHex: depuisHex,
    ripemd160: ripemd160,
    sha256: sha256,
    analyserArbre: analyserArbre,
    serialiserNoeud: serialiserNoeud,
    fusionner: fusionner,
    releverAttestations: releverAttestations,
    construireOts: construireOts,
    analyserOts: analyserOts,
    estampiller: estampiller,
    mettreANiveau: mettreANiveau,
    attestationEnAttente: attestationEnAttente,
    uriAttestation: uriAttestation,
    hauteurAttestation: hauteurAttestation
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof document === 'undefined') return;

  /* ---------------- partie page (navigateur seulement) ---------------- */

  function $(id) { return document.getElementById(id); }
  function telecharger(nom, octets) {
    var blob = new Blob([octets], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nom;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function lignesEtat(zone, lignes) {
    zone.innerHTML = '';
    lignes.forEach(function (l) {
      var p = document.createElement('p');
      p.textContent = l;
      zone.appendChild(p);
    });
  }

  var preuveEnMain = null; /* { nom, octets } de la dernière estampille produite */

  function lancerEstampillage() {
    var etat = $('db-etat');
    var saisie = ($('db-empreinte').value || '').replace(/\s+/g, '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(saisie)) {
      lignesEtat(etat, ['Format refusé : 64 caractères hexadécimaux exactement — l’empreinte calculée ou collée ci-dessus.']);
      return;
    }
    var digest = depuisHex(saisie);
    var bouton = $('db-estampiller');
    bouton.disabled = true;
    lignesEtat(etat, ['Soumission en cours aux calendriers publics du protocole…']);
    estampiller(digest).then(function (res) {
      bouton.disabled = false;
      var lignes = res.reponses.map(function (r) {
        return r.ok
          ? 'Calendrier ' + r.calendrier + ' : estampille reçue.'
          : 'Calendrier ' + r.calendrier + ' : échec — ' + r.erreur + ' (nommé, pas caché : réessaie plus tard, ou un autre calendrier a pu répondre).';
      });
      if (!res.ok) {
        lignes.push('Aucun calendrier n’a répondu : aucune preuve n’a été produite. Rien n’a été gardé, rien n’a été envoyé ailleurs. Réessaie plus tard — ou accomplis le même geste chez opentimestamps.org, « Stamp », avec la même empreinte.');
        lignesEtat(etat, lignes);
        return;
      }
      var octets = construireOts(digest, res.racine);
      var nom = 'empreinte-' + saisie.slice(0, 16) + '.ots';
      preuveEnMain = { nom: nom, octets: octets };
      var releves = releverAttestations(res.racine);
      var nbAttente = releves.filter(function (r) { return r.type === 'en-attente'; }).length;
      lignes.push('Preuve produite : ' + nom + ' (' + octets.length + ' octets) — téléchargement lancé. Elle porte ' +
        nbAttente + ' attestation(s) en attente : l’ancrage Bitcoin se complètera quand les calendriers auront regroupé les empreintes dans une transaction. Reviens dans quelques heures avec ce fichier et mets-la à niveau ci-dessous — ou vérifie-la, complétée, par le panneau Ancrage (« Reviens avec ta preuve »).');
      lignesEtat(etat, lignes);
      telecharger(nom, octets);
      var b2 = $('db-telecharger');
      if (b2) b2.hidden = false;
    }).then(null, function (e) {
      bouton.disabled = false;
      lignesEtat(etat, ['Échec nommé : ' + String((e && e.message) || e) + ' — aucune preuve produite.']);
    });
  }

  function lancerMiseANiveau() {
    var etat = $('db-maj-etat');
    var f = $('db-maj-fichier').files && $('db-maj-fichier').files[0];
    if (!f) {
      lignesEtat(etat, ['Choisis d’abord ton fichier de preuve (.ots), celui téléchargé à l’estampillage.']);
      return;
    }
    var bouton = $('db-maj-bouton');
    bouton.disabled = true;
    lignesEtat(etat, ['Lecture de ta preuve…']);
    f.arrayBuffer().then(function (buf) {
      return analyserOts(new Uint8Array(buf));
    }).then(function (analyse) {
      var avant = releverAttestations(analyse.racine);
      if (!avant.some(function (r) { return r.type === 'en-attente'; })) {
        bouton.disabled = false;
        var btc = avant.filter(function (r) { return r.type === 'bitcoin'; });
        lignesEtat(etat, ['Cette preuve est déjà complète : aucune attestation en attente.' +
          (btc.length ? ' Ancrage Bitcoin relevé : bloc ' + btc.map(function (r) { return r.detail; }).join(', ') + '.' : '') +
          ' Rien à mettre à niveau — revérifie-la quand tu veux par le panneau Ancrage (« Reviens avec ta preuve »).']);
        return null;
      }
      lignesEtat(etat, ['Preuve lue : empreinte ' + hex(analyse.digest) + '. Demande de complétion aux calendriers…']);
      return mettreANiveau(analyse.racine).then(function (rapport) {
        bouton.disabled = false;
        var lignes = rapport.map(function (r) {
          if (r.statut === 'completee') return 'Calendrier ' + r.uri + ' : chemin complété.';
          if (r.statut === 'en-attente') return 'Calendrier ' + r.uri + ' : pas encore — l’ancrage Bitcoin n’est pas revenu. Réessaie plus tard ; ta preuve actuelle reste valide.';
          return 'Calendrier ' + r.uri + ' : échec — ' + r.erreur + ' (nommé ; ta preuve actuelle reste valide).';
        });
        var completees = rapport.filter(function (r) { return r.statut === 'completee'; }).length;
        if (completees) {
          var octets = construireOts(analyse.digest, analyse.racine);
          var nom = f.name.replace(/\.ots$/i, '') + '-completee.ots';
          var apres = releverAttestations(analyse.racine);
          var btc = apres.filter(function (r) { return r.type === 'bitcoin'; });
          lignes.push('Preuve complétée produite : ' + nom + ' — téléchargement lancé. Garde-la à la place de l’ancienne, toujours à côté de ton document.' +
            (btc.length ? ' Ancrage Bitcoin : bloc ' + btc.map(function (r) { return r.detail; }).join(', ') + '.' : ''));
          lignesEtat(etat, lignes);
          telecharger(nom, octets);
        } else {
          lignesEtat(etat, lignes);
        }
      });
    }).then(null, function (e) {
      bouton.disabled = false;
      lignesEtat(etat, ['Lecture impossible : ' + String((e && e.message) || e)]);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('db-estampiller')) return;
    $('db-estampiller').addEventListener('click', lancerEstampillage);
    var b2 = $('db-telecharger');
    if (b2) b2.addEventListener('click', function () {
      if (preuveEnMain) telecharger(preuveEnMain.nom, preuveEnMain.octets);
    });
    var reprendre = $('db-reprendre');
    if (reprendre) reprendre.addEventListener('click', function () {
      var zone = document.getElementById('de-empreinte-resultat');
      var v = zone ? (zone.textContent || '').replace(/\s+/g, '').toLowerCase() : '';
      if (/^[0-9a-f]{64}$/.test(v)) { $('db-empreinte').value = v; }
      else {
        lignesEtat($('db-etat'), ['Aucune empreinte calculée ci-dessus pour l’instant : calcule-la dans l’outil de dépôt, ou colle-la directement dans le champ.']);
      }
    });
    var maj = $('db-maj-bouton');
    if (maj) maj.addEventListener('click', lancerMiseANiveau);
  });
})();
