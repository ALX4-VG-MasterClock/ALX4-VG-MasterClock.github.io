
/* ===== v63 corrigé — Vérification Bitcoin complète et autonome =====
   Le dernier maillon, donné au site : pour une preuve OpenTimestamps, cette
   page applique le chemin d'opérations EN ENTIER — de l'empreinte du fichier
   jusqu'au digest engagé par chaque attestation — et compare ce digest à la
   racine de Merkle de l'en-tête réel du bloc Bitcoin attesté (80 octets,
   embarqués dans assets/entetes-bitcoin.json pour les hauteurs publiées).
   Mécanique (python-opentimestamps, référence du format) : append ajoute
   l'argument à droite, prepend à gauche, les opérations de hachage
   transforment le message ; l'attestation Bitcoin (étiquette
   0588960d73d71901) engage le digest du chemin comme racine de Merkle du
   bloc à la hauteur portée par sa charge (LEB128). Le digest du chemin est
   en ordre interne — les octets 36..68 de l'en-tête brut, tels quels.
   Tout est local : aucun appel réseau, sauf le clic exprès de
   contre-vérification en direct (divulgation écrite à côté du bouton).
   Les fonctions pures (VB-PURES-DEBUT..FIN) ne touchent pas au DOM :
   elles sont testées hors navigateur au chantier. */
/* VB-PURES-DEBUT */
var VB_OTS_MAGIE = [0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94];
var VB_TAGS = { '0588960d73d71901': 'bitcoin', '0686aa0d73d71901': 'litecoin', '83dfe30d2ef90c8e': 'calendrier' };
function vbHex(u8) { var s = ''; for (var i = 0; i < u8.length; i++) { s += ('0' + u8[i].toString(16)).slice(-2); } return s; }
function vbDepuisHex(hex) {
  var propre = String(hex).trim();
  if (!/^[0-9a-fA-F]*$/.test(propre) || propre.length % 2) throw new Error('hexadécimal illisible');
  var out = new Uint8Array(propre.length / 2);
  for (var i = 0; i < out.length; i++) out[i] = parseInt(propre.substr(i * 2, 2), 16);
  return out;
}
function vbConcat(a, b) { var out = new Uint8Array(a.length + b.length); out.set(a, 0); out.set(b, a.length); return out; }
function vbRenverse(u8) { var out = new Uint8Array(u8.length); for (var i = 0; i < u8.length; i++) out[i] = u8[u8.length - 1 - i]; return out; }
function vbEgal(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; } return true; }
async function vbSha256(u8) { return new Uint8Array(await crypto.subtle.digest('SHA-256', u8)); }
async function vbSha1(u8) { return new Uint8Array(await crypto.subtle.digest('SHA-1', u8)); }
async function vbSha256Hex(u8) { return vbHex(await vbSha256(u8)); }
async function vbHashBloc(entete) { return vbHex(vbRenverse(await vbSha256(await vbSha256(entete)))); }
function vbMerkleHex(entete) { return vbHex(vbRenverse(entete.slice(36, 68))); }
function vbCheminAboutit(digestChemin, entete) { return vbEgal(digestChemin, entete.slice(36, 68)); }
/* RIPEMD-160 en JavaScript pur (l'API WebCrypto ne l'offre pas) — nécessaire
   aux preuves dont le chemin passe par l'opération 0x03. Vecteurs de test
   officiels vérifiés au chantier. */
function vbRipemd160(msg) {
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
function vbVaruint(u8, p) {
  var v = 0, decal = 0, x;
  do {
    if (p >= u8.length) throw new Error('preuve tronquée');
    x = u8[p++]; v += (x & 0x7f) * Math.pow(2, decal); decal += 7;
  } while (x & 0x80);
  return [v, p];
}
/* Parse la preuve en APPLIQUANT les opérations : chaque attestation est
   relevée avec le digest du chemin qui y aboutit. Opérations prises en
   charge : append (0xf0), prepend (0xf1), SHA-256 (0x08), SHA-1 (0x02),
   RIPEMD-160 (0x03). Toute autre opération arrête le calcul avec une
   erreur nette — jamais un verdict fabriqué. */
async function vbParseChemin(u8) {
  try {
    if (!u8 || u8.length < 65) return { ok: false, erreur: 'fichier trop court pour une preuve OpenTimestamps' };
    for (var i = 0; i < 31; i++) { if (u8[i] !== VB_OTS_MAGIE[i]) return { ok: false, erreur: 'ce fichier ne commence pas comme une preuve OpenTimestamps (.ots)' }; }
    if (u8[31] !== 1) return { ok: false, erreur: 'version de preuve non prise en charge (' + u8[31] + ')' };
    if (u8[32] !== 0x08) return { ok: false, erreur: 'la preuve ne porte pas une empreinte SHA-256' };
    var empreinte = u8.slice(33, 65);
    var attestations = [];
    async function branche(p, msg) {
      while (p < u8.length) {
        var op = u8[p];
        if (op === 0xff) { p = await branche(p + 1, msg); continue; }
        if (op === 0x00) {
          var tag = vbHex(u8.slice(p + 1, p + 9));
          var r = vbVaruint(u8, p + 9); var ln = r[0]; var q = r[1];
          if (q + ln > u8.length) throw new Error('attestation tronquée');
          var charge = u8.slice(q, q + ln);
          var type = VB_TAGS[tag] || 'autre';
          var a = { type: type, digest: msg, digestHex: vbHex(msg) };
          if (type === 'bitcoin' || type === 'litecoin') { a.hauteur = vbVaruint(charge, 0)[0]; }
          else if (type === 'calendrier') { var r2 = vbVaruint(charge, 0); a.detail = new TextDecoder().decode(charge.slice(r2[1], r2[1] + r2[0])); }
          else { a.detail = 'étiquette ' + tag; }
          attestations.push(a);
          return q + ln;
        }
        if (op === 0xf0 || op === 0xf1) {
          var r3 = vbVaruint(u8, p + 1);
          if (r3[1] + r3[0] > u8.length) throw new Error('opération tronquée');
          var arg = u8.slice(r3[1], r3[1] + r3[0]);
          msg = (op === 0xf0) ? vbConcat(msg, arg) : vbConcat(arg, msg);
          p = r3[1] + r3[0]; continue;
        }
        if (op === 0x08) { msg = await vbSha256(msg); p += 1; continue; }
        if (op === 0x02) { msg = await vbSha1(msg); p += 1; continue; }
        if (op === 0x03) { msg = vbRipemd160(msg); p += 1; continue; }
        throw new Error('opération 0x' + op.toString(16) + ' non prise en charge dans cette page — le chemin de cette preuve n’est pas calculable ici ; la revérification complète se fait alors avec l’outil OpenTimestamps');
      }
      return p;
    }
    await branche(65, empreinte);
    return { ok: true, empreinte: vbHex(empreinte), attestations: attestations };
  } catch (e) { return { ok: false, erreur: 'preuve illisible : ' + e.message }; }
}
/* VB-PURES-FIN */

/* ===== Câblage DOM (navigateur seulement) ===== */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('vb-etat') && !$('vb-piece')) return;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function court(hex) { return hex ? esc(String(hex).slice(0, 16)) + '…' : '—'; }
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  /* ---------- En-têtes embarqués (même origine, aucun tiers) ---------- */
  var entetesPromise = null;
  function chargerEntetes() {
    if (!entetesPromise) {
      entetesPromise = fetch('assets/entetes-bitcoin.json')
        .then(function (r) { if (!r.ok) throw new Error('absent'); return r.json(); })
        .then(function (j) { return j.entetes || {}; })
        .catch(function () { return null; });
    }
    return entetesPromise;
  }
  /* Revérifie un en-tête embarqué : 80 octets, et son double-SHA-256 doit
     redonner le hash du bloc consigné à côté de lui. */
  async function enteteValide(entree) {
    try {
      var brut = vbDepuisHex(entree.entete);
      if (brut.length !== 80) return null;
      var h = await vbHashBloc(brut);
      return (h === entree.hash) ? brut : null;
    } catch (e) { return null; }
  }

  /* ---------- A · Les sept preuves du site (§F) ---------- */
  var VB_PAIRES = [
    { f: 'ancrage-hebdo-empreintes-2026-10-18', label: 'Ancrage hebdomadaire — 18 octobre 2026' },
    { f: 'ancrage-hebdo-empreintes-2026-10-25', label: 'Ancrage hebdomadaire — 25 octobre 2026' },
    { f: 'ancrage-hebdo-empreintes-2026-11-01', label: 'Ancrage hebdomadaire — 1er novembre 2026' },
    { f: 'ancrage-hebdo-empreintes-2026-11-08', label: 'Ancrage hebdomadaire — 8 novembre 2026' },
    { f: 'ancrage-hebdo-empreintes-2026-11-15', label: 'Ancrage hebdomadaire — 15 novembre 2026' },
    { f: 'ancrage-live-empreintes-2026-11-16', label: 'Ancrage en direct — 16 novembre 2026' },
    { f: 'ancrage-hebdo-empreintes-2026-11-22', label: 'Ancrage hebdomadaire — 22 novembre 2026' }
  ];
  var vbSiteFait = false;
  async function verifierSite() {
    var etat = $('vb-etat'), liste = $('vb-liste');
    if (!etat || !liste || vbSiteFait) return;
    vbSiteFait = true;
    var entetes = await chargerEntetes();
    if (!entetes) { etat.textContent = 'Les en-têtes de blocs embarqués n’ont pas pu être chargés depuis cette page : aucun verdict n’est affiché — la vérification ne simule rien. Les couples (.txt + .ots) ci-dessus restent téléchargeables pour une revérification chez le tiers.'; return; }
    etat.textContent = 'Calcul en cours, dans ton navigateur…';
    var lignes = [];
    for (var i = 0; i < VB_PAIRES.length; i++) {
      var paire = VB_PAIRES[i];
      try {
        var res = await Promise.all([
          fetch(`assets/jetons/${paire.f}.txt`).then(function (r) { if (!r.ok) throw new Error('doc'); return r.arrayBuffer(); }),
          fetch(`assets/jetons/${paire.f}.txt.ots`).then(function (r) { if (!r.ok) throw new Error('ots'); return r.arrayBuffer(); })
        ]);
        var docHex = await vbSha256Hex(new Uint8Array(res[0]));
        var parsed = await vbParseChemin(new Uint8Array(res[1]));
        if (!parsed.ok) { lignes.push('<li><strong>' + esc(paire.label) + '</strong> — preuve non lue : ' + esc(parsed.erreur) + '</li>'); continue; }
        if (docHex !== parsed.empreinte) { lignes.push('<li><strong>' + esc(paire.label) + '</strong> — <strong>ÉCART</strong> : l’empreinte du fichier publié ne correspond pas à celle inscrite dans sa preuve.</li>'); continue; }
        var btc = parsed.attestations.filter(function (a) { return a.type === 'bitcoin'; });
        if (!btc.length) {
          var cals = parsed.attestations.filter(function (a) { return a.type === 'calendrier'; }).length;
          lignes.push('<li><strong>' + esc(paire.label) + '</strong> — <strong>EN ATTENTE</strong> : attestations des calendriers seulement (' + cals + '), aucun en-tête Bitcoin à comparer — la preuve n’est pas encore complétée dans Bitcoin, et cette page le dit au lieu de l’inventer.</li>');
          continue;
        }
        var details = [], premierMatch = null, coherent = true;
        for (var k = 0; k < btc.length; k++) {
          var a2 = btc[k], entree = entetes[String(a2.hauteur)];
          if (!entree) { details.push('bloc nº ' + fmtN(a2.hauteur) + ' : hauteur non embarquée — non comparée ici'); continue; }
          var brut = await enteteValide(entree);
          if (!brut) { coherent = false; details.push('bloc nº ' + fmtN(a2.hauteur) + ' : <strong>ÉCART</strong> — l’en-tête embarqué ne se revérifie pas (son double-SHA-256 ne redonne pas le hash consigné)'); continue; }
          if (vbCheminAboutit(a2.digest, brut)) { if (!premierMatch) premierMatch = a2.hauteur; details.push('bloc nº ' + fmtN(a2.hauteur) + ' : <strong>MATCH complet — jusqu’à l’en-tête du bloc nº ' + fmtN(a2.hauteur) + '</strong> (racine de Merkle <span class="mono">' + court(vbMerkleHex(brut)) + '</span>)'); }
          else { details.push('bloc nº ' + fmtN(a2.hauteur) + ' : <strong>ÉCART</strong> — le chemin de la preuve n’aboutit pas à la racine de Merkle de cet en-tête'); }
        }
        var verdict = premierMatch
          ? '<strong>MATCH complet — jusqu’à l’en-tête du bloc nº ' + fmtN(premierMatch) + '</strong>'
          : (coherent ? '<strong>ÉCART</strong> — aucun chemin n’aboutit à un en-tête attesté' : '<strong>ÉCART</strong> — données embarquées incohérentes');
        lignes.push('<li><strong>' + esc(paire.label) + '</strong> — ' + verdict + '<br><span class="petite">' + details.join('<br>') + '</span></li>');
      } catch (e) {
        lignes.push('<li><strong>' + esc(paire.label) + '</strong> — fichiers non chargés depuis cette page : aucun verdict, rien n’est simulé.</li>');
      }
    }
    liste.innerHTML = '<ul>' + lignes.join('') + '</ul>';
    etat.textContent = 'Verdicts calculés maintenant, dans ton navigateur — chemin complet de chaque preuve, comparé aux en-têtes embarqués :';
  }

  /* ---------- B · La pièce de retour : le même traitement ---------- */
  var vbDocBuf = null, vbOtsBuf = null, vbLiveContexte = {};
  async function rendrePiece() {
    var zone = $('vb-piece');
    if (!zone) return;
    if (!vbOtsBuf) { zone.innerHTML = ''; return; }
    var parsed = await vbParseChemin(new Uint8Array(vbOtsBuf));
    if (!parsed.ok) { zone.innerHTML = '<h4>Le dernier maillon — jusqu’à Bitcoin</h4><p>' + esc(parsed.erreur) + '</p>'; return; }
    var entetes = await chargerEntetes();
    var h = '<h4>Le dernier maillon — jusqu’à Bitcoin</h4>';
    var btc = parsed.attestations.filter(function (a) { return a.type === 'bitcoin'; });
    var ltc = parsed.attestations.filter(function (a) { return a.type === 'litecoin'; });
    var cal = parsed.attestations.filter(function (a) { return a.type === 'calendrier'; });
    vbLiveContexte = {};
    if (!btc.length && !ltc.length) {
      h += '<p>Cette preuve ne porte que des attestations de calendriers (' + cal.length + ') : elle est <strong>en attente</strong> de complétion dans Bitcoin — il n’y a encore aucun en-tête à comparer, et cette page ne fabrique pas de verdict.</p>';
    }
    btc.forEach(function (a, idx) {
      var entree = entetes ? entetes[String(a.hauteur)] : null;
      if (entree) {
        h += '<p data-vb-ligne="' + idx + '">Bloc Bitcoin nº ' + fmtN(a.hauteur) + ' : comparaison à l’en-tête embarqué…</p>';
      } else {
        var cle = 'att' + idx;
        vbLiveContexte[cle] = a;
        h += '<p>Bloc Bitcoin nº ' + fmtN(a.hauteur) + ' : cette hauteur n’est pas parmi les en-têtes embarqués du site.</p>'
          + '<p><button type="button" class="secondaire" data-vb-live="' + cle + '">Contre-vérifier en direct — bloc nº ' + fmtN(a.hauteur) + '</button></p>'
          + '<p class="petite">Divulgation, avant le clic : ce bouton fait <strong>une seule requête</strong> à un explorateur Bitcoin public (mempool.space) pour chercher l’en-tête de ce bloc. Il n’envoie que le numéro du bloc — ni ton document, ni ta preuve, ni aucune donnée sur toi ne partent. Sans ce clic, rien ne sort de ton appareil.</p>'
          + '<p data-vb-live-resultat="' + cle + '" role="status"></p>';
      }
    });
    if (ltc.length) h += '<p class="petite">Attestation Litecoin lue (bloc nº ' + fmtN(ltc[0].hauteur) + ') : cette page ne revérifie que Bitcoin — elle est montrée, pas verdictée.</p>';
    if (cal.length) h += '<p class="petite">' + cal.length + ' attestation(s) de calendrier lue(s) — l’étape « en attente » de la preuve.</p>';
    zone.innerHTML = h;
    /* Comparaisons embarquées, après insertion dans le DOM. */
    var lignes = zone.querySelectorAll('[data-vb-ligne]');
    for (var i = 0; i < lignes.length; i++) {
      (async function (el, a) {
        var brut = await enteteValide(entetes[String(a.hauteur)]);
        if (!brut) { el.innerHTML = 'Bloc Bitcoin nº ' + fmtN(a.hauteur) + ' : <strong>ÉCART</strong> — l’en-tête embarqué ne se revérifie pas (son double-SHA-256 ne redonne pas le hash consigné).'; return; }
        el.innerHTML = vbCheminAboutit(a.digest, brut)
          ? 'Bloc Bitcoin nº ' + fmtN(a.hauteur) + ' : <strong>MATCH complet — jusqu’à l’en-tête du bloc nº ' + fmtN(a.hauteur) + '</strong> (racine de Merkle <span class="mono">' + court(vbMerkleHex(brut)) + '</span>, recalculée de ton document jusqu’à l’en-tête).'
          : 'Bloc Bitcoin nº ' + fmtN(a.hauteur) + ' : <strong>ÉCART</strong> — le chemin de ta preuve n’aboutit pas à la racine de Merkle de l’en-tête de ce bloc.';
      })(lignes[i], btc[Number(lignes[i].getAttribute('data-vb-ligne'))]);
    }
    zone.querySelectorAll('[data-vb-live]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var cle = btn.getAttribute('data-vb-live');
        var a = vbLiveContexte[cle];
        var sortie = zone.querySelector('[data-vb-live-resultat="' + cle + '"]');
        if (!a || !sortie) return;
        btn.disabled = true;
        sortie.textContent = 'Requête à mempool.space pour l’en-tête du bloc nº ' + fmtN(a.hauteur) + '…';
        try {
          var hash = (await (await fetch('https://mempool.space/api/block-height/' + a.hauteur)).text()).trim();
          if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('réponse inattendue');
          var hex = (await (await fetch('https://mempool.space/api/block/' + hash + '/header')).text()).trim();
          var brut = vbDepuisHex(hex);
          if (brut.length !== 80) throw new Error('en-tête inattendu');
          var recalcule = await vbHashBloc(brut);
          if (recalcule !== hash) throw new Error('l’en-tête reçu ne redonne pas le hash du bloc — contre-vérification interrompue, aucun verdict');
          sortie.innerHTML = vbCheminAboutit(a.digest, brut)
            ? '<strong>MATCH complet — jusqu’à l’en-tête du bloc nº ' + fmtN(a.hauteur) + '</strong>, contre-vérifié en direct chez mempool.space à l’instant (bloc <span class="mono">' + court(hash) + '</span>, racine de Merkle <span class="mono">' + court(vbMerkleHex(brut)) + '</span>).'
            : '<strong>ÉCART</strong> — le chemin de ta preuve n’aboutit pas à la racine de Merkle de l’en-tête du bloc nº ' + fmtN(a.hauteur) + ', contre-vérifié en direct chez mempool.space à l’instant.';
        } catch (e) {
          sortie.textContent = 'La contre-vérification en direct a échoué (' + e.message + ') : aucun verdict n’est affiché — rien n’est simulé.';
          btn.disabled = false;
        }
      });
    });
  }
  function brancherPiece() {
    var d = $('rp-doc'), o = $('rp-ots');
    if (!d || !o || d.getAttribute('data-vb-branche')) return;
    d.setAttribute('data-vb-branche', '1'); o.setAttribute('data-vb-branche', '1');
    d.addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) { vbDocBuf = null; return; }
      f.arrayBuffer().then(function (b) { vbDocBuf = b; });
    });
    o.addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) { vbOtsBuf = null; rendrePiece(); return; }
      f.arrayBuffer().then(function (b) { vbOtsBuf = b; rendrePiece(); });
    });
  }

  document.addEventListener('panneau-ouvert', function (ev) {
    if (ev.detail && ev.detail.nom === 'ancrage') { verifierSite(); brancherPiece(); }
  });
  verifierSite();
  brancherPiece();
})();
