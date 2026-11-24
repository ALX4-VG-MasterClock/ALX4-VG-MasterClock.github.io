
/* ===== v63 corrigé — Pièce « Reviens avec ta preuve » =====
   Tout se calcule dans le navigateur du visiteur : aucun téléversement,
   aucun appel réseau pour ses fichiers. Les fonctions pures (entre
   RP-PURES-DEBUT et RP-PURES-FIN) ne touchent pas au DOM : elles sont
   testées hors navigateur au chantier. */
/* RP-PURES-DEBUT */
var RP_OTS_MAGIE = [0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94];
function rpHexOctets(u8) { var s = ''; for (var i = 0; i < u8.length; i++) { s += ('0' + u8[i].toString(16)).slice(-2); } return s; }
async function rpSha256Hex(donnees) {
  var buf = (typeof donnees === 'string') ? new TextEncoder().encode(donnees) : donnees;
  var h = await crypto.subtle.digest('SHA-256', buf);
  return rpHexOctets(new Uint8Array(h));
}
function rpVaruint(u8, p) {
  var v = 0, decal = 0, x;
  do {
    if (p >= u8.length) throw new Error('preuve tronquée');
    x = u8[p++]; v += (x & 0x7f) * Math.pow(2, decal); decal += 7;
  } while (x & 0x80);
  return [v, p];
}
function rpParseOts(u8) {
  try {
    if (!u8 || u8.length < 65) return { ok: false, erreur: 'fichier trop court pour une preuve OpenTimestamps' };
    for (var i = 0; i < 31; i++) { if (u8[i] !== RP_OTS_MAGIE[i]) return { ok: false, erreur: 'ce fichier ne commence pas comme une preuve OpenTimestamps (.ots)' }; }
    if (u8[31] !== 1) return { ok: false, erreur: 'version de preuve non prise en charge (' + u8[31] + ')' };
    if (u8[32] !== 0x08) return { ok: false, erreur: 'la preuve ne porte pas une empreinte SHA-256' };
    var empreinte = rpHexOctets(u8.slice(33, 65));
    var attestations = [];
    var TAGS = { '0588960d73d71901': 'bitcoin', '0686aa0d73d71901': 'litecoin', '83dfe30d2ef90c8e': 'calendrier' };
    function branche(p) {
      while (p < u8.length) {
        var op = u8[p];
        if (op === 0xff) { p = branche(p + 1); continue; }
        if (op === 0x00) {
          var tag = rpHexOctets(u8.slice(p + 1, p + 9));
          var r = rpVaruint(u8, p + 9); var ln = r[0]; var q = r[1];
          if (q + ln > u8.length) throw new Error('attestation tronquée');
          var charge = u8.slice(q, q + ln);
          var type = TAGS[tag] || 'autre';
          var detail = '';
          if (type === 'bitcoin' || type === 'litecoin') { detail = 'bloc ' + rpVaruint(charge, 0)[0]; }
          else if (type === 'calendrier') { var r2 = rpVaruint(charge, 0); detail = new TextDecoder().decode(charge.slice(r2[1], r2[1] + r2[0])); }
          else { detail = 'étiquette ' + tag; }
          attestations.push({ type: type, detail: detail });
          return q + ln;
        }
        if (op === 0xf0 || op === 0xf1) { var r3 = rpVaruint(u8, p + 1); p = r3[1] + r3[0]; continue; }
        if (op === 0x08 || op === 0x02 || op === 0x03) { p += 1; continue; }
        throw new Error('opération inconnue dans la preuve (0x' + op.toString(16) + ')');
      }
      return p;
    }
    branche(65);
    return { ok: true, empreinte: empreinte, attestations: attestations };
  } catch (e) { return { ok: false, erreur: 'preuve illisible : ' + e.message }; }
}
var RP_GENESE = '0000000000000000000000000000000000000000000000000000000000000000';
function rpCanonique(e) { return JSON.stringify({ seq: e.seq, ts: e.ts, type: e.type, contenu: e.contenu }); }
async function rpScellerEntree(prevSceau, prevDigest, seq, ts, type, contenu) {
  var e = { seq: seq, ts: ts, type: type, contenu: contenu };
  var sceau = await rpSha256Hex(prevSceau + rpCanonique(e));
  var digest = await rpSha256Hex(prevDigest + sceau);
  e.sceau = sceau; e.digest = digest; return e;
}
async function rpVerifierChaine(entrees) {
  /* Miroir exact de cuRecalculer, la revérification du cerveau local du site :
     seq 0-based strict, mêmes raisons, même maillon_rompu (le seq). Le champ
     position (1-based) ne sert qu'à l'affichage pour le visiteur. */
  var prevSceau = RP_GENESE, prevDigest = RP_GENESE;
  for (var i = 0; i < entrees.length; i++) {
    var e = entrees[i];
    if (!e || typeof e.contenu !== 'string' || typeof e.sceau !== 'string' || typeof e.digest !== 'string' || typeof e.ts !== 'string')
      return { ok: false, maillon_rompu: i, position: i + 1, raison: 'entrée incomplète (date, contenu, sceau ou digest manquant)', nombre_sain: i, somme_dernier_sain: prevDigest };
    if (e.seq !== i)
      return { ok: false, maillon_rompu: i, position: i + 1, raison: 'séquence discontinue', nombre_sain: i, somme_dernier_sain: prevDigest };
    var sceau = await rpSha256Hex(prevSceau + rpCanonique(e));
    if (sceau !== e.sceau)
      return { ok: false, maillon_rompu: e.seq, position: i + 1, raison: 'sceau recalculé différent du sceau consigné', nombre_sain: i, somme_dernier_sain: prevDigest };
    var digest = await rpSha256Hex(prevDigest + sceau);
    if (digest !== e.digest)
      return { ok: false, maillon_rompu: e.seq, position: i + 1, raison: 'digest cumulé différent', nombre_sain: i, somme_dernier_sain: prevDigest };
    prevSceau = sceau; prevDigest = digest;
  }
  return { ok: true, somme: prevDigest, nombre: entrees.length };
}
async function rpVerifierRegistre(entrees) {
  var prev = 'GENÈSE';
  for (var i = 0; i < entrees.length; i++) {
    var e = entrees[i];
    if (!e || typeof e.texte !== 'string' || typeof e.sceau !== 'string')
      return { ok: false, maillon_rompu: i + 1, raison: 'entrée incomplète (texte ou sceau manquant)' };
    var s = await rpSha256Hex(prev + e.texte + e.horodatage);
    if (s !== e.sceau) return { ok: false, maillon_rompu: i + 1, raison: 'sceau recalculé différent de celui consigné' };
    prev = e.sceau;
  }
  return { ok: true, nombre: entrees.length, somme: prev };
}
var RP_DEMO_MEMOIRE = [
  { ts: '2026-11-15T12:00:00.000Z', type: 'note', contenu: 'Relevé hebdomadaire des empreintes — semaine du 15 novembre 2026.' },
  { ts: '2026-11-15T12:05:00.000Z', type: 'note', contenu: 'Preuve OpenTimestamps complétée dans Bitcoin — premier bloc : 976 052.' },
  { ts: '2026-11-15T12:10:00.000Z', type: 'note', contenu: 'La somme des précédents : chaque entrée porte la précédente.' }
];
/* RP-PURES-FIN */

/* ===== Câblage DOM (navigateur seulement) ===== */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('rp-doc')) return;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function court(hex) { return hex ? esc(String(hex).slice(0, 16)) + '…' : '—'; }

  /* ---------- 1 · Document + preuve du visiteur ---------- */
  var docBuf = null, docNom = '', otsRes = null;
  function lignesAttestations(atts) {
    if (!atts || !atts.length) return '<p class="petite">Aucune attestation lue dans cette preuve.</p>';
    var noms = { bitcoin: 'Bitcoin', litecoin: 'Litecoin', calendrier: 'Calendrier OpenTimestamps (en attente)', autre: 'Autre attestation' };
    return '<ul>' + atts.map(function (a) { return '<li>' + esc(noms[a.type] || a.type) + ' — ' + esc(a.detail) + '</li>'; }).join('') + '</ul>';
  }
  async function majVerdict() {
    var zone = $('rp-verdict'), det = $('rp-details');
    if (!docBuf && !otsRes) { zone.textContent = 'En attente de tes deux fichiers.'; det.innerHTML = ''; return; }
    if (docBuf && !otsRes) {
      var h1 = await rpSha256Hex(docBuf);
      zone.innerHTML = 'Empreinte de ton document, recalculée ici : <span class="mono">' + esc(h1) + '</span><br>Dépose maintenant sa preuve (.ots) pour la comparaison.';
      det.innerHTML = ''; return;
    }
    if (!otsRes.ok) { zone.innerHTML = '<strong>Preuve non lue.</strong> ' + esc(otsRes.erreur) + ' — aucun verdict n’est affiché : une preuve illisible n’est ni un MATCH ni un ÉCART.'; det.innerHTML = ''; return; }
    if (!docBuf) {
      zone.innerHTML = 'Empreinte inscrite dans la preuve : <span class="mono">' + esc(otsRes.empreinte) + '</span><br>Dépose maintenant le document pour la comparaison.';
      det.innerHTML = '<h4>Attestations portées par la preuve</h4>' + lignesAttestations(otsRes.attestations); return;
    }
    var h = await rpSha256Hex(docBuf);
    var match = (h === otsRes.empreinte);
    zone.innerHTML = match
      ? '<strong style="font-size:1.15em">MATCH ✓</strong> — le document déposé est, caractère pour caractère, celui que la preuve a sécurisé.'
      : '<strong style="font-size:1.15em">ÉCART ✗</strong> — le document déposé n’est pas celui que la preuve a sécurisé : au moins un caractère diffère.';
    det.innerHTML = '<p>Empreinte du document déposé (<span class="mono">' + esc(docNom) + '</span>), recalculée ici :<br><span class="mono">' + esc(h) + '</span></p>'
      + '<p>Empreinte inscrite dans la preuve :<br><span class="mono">' + esc(otsRes.empreinte) + '</span></p>'
      + '<h4>Attestations portées par la preuve</h4>' + lignesAttestations(otsRes.attestations)
      + '<p class="petite">Un MATCH dit « inchangé depuis la date de la preuve » — il ne dit pas que le contenu est vrai. Le chemin de calcul complet jusqu’à l’en-tête du bloc Bitcoin est revérifié juste en dessous (« Le dernier maillon — jusqu’à Bitcoin ») quand la hauteur du bloc est parmi les en-têtes embarqués du site ; sinon, un bouton de contre-vérification en direct le propose, au clic seulement.</p>';
  }
  $('rp-doc').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) { docBuf = null; majVerdict(); return; }
    docNom = f.name;
    f.arrayBuffer().then(function (b) { docBuf = b; majVerdict(); });
  });
  $('rp-ots').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) { otsRes = null; majVerdict(); return; }
    f.arrayBuffer().then(function (b) { otsRes = rpParseOts(new Uint8Array(b)); majVerdict(); });
  });

  /* ---------- 2 · Mémoire cumulée du visiteur ---------- */
  function vueChaine(titre, entrees, verdict) {
    var h = '<h4>' + esc(titre) + '</h4>';
    if (verdict.ok) h += '<p><strong>Chaîne revérifiée entrée par entrée : MATCH ✓</strong> — ' + verdict.nombre + ' entrée' + (verdict.nombre > 1 ? 's' : '') + ', somme recalculée <span class="mono">' + court(verdict.somme) + '</span></p>';
    else h += '<p><strong>RUPTURE à l’entrée nº ' + verdict.position + '</strong> — ' + esc(verdict.raison) + '. Les ' + verdict.nombre_sain + ' entrée(s) avant elle se revérifient.</p>';
    h += '<ol>' + entrees.map(function (e, i) {
      var etat = verdict.ok ? '✓ recalculée' : (i + 1 < verdict.position ? '✓ recalculée' : (i + 1 === verdict.position ? '✗ rupture ici' : '— après la rupture'));
      return '<li>entrée nº ' + (i + 1) + ' — <span class="mono">' + esc(e.ts) + '</span> — ' + esc(e.type || 'entrée') + '<br>' + esc(String(e.contenu || '').slice(0, 140)) + '<br><span class="petite">sceau <span class="mono">' + court(e.sceau) + '</span> · digest <span class="mono">' + court(e.digest) + '</span> · ' + etat + '</span></li>';
    }).join('') + '</ol>';
    return h;
  }
  function vueRegistre(titre, entrees, verdict) {
    var h = '<h4>' + esc(titre) + '</h4>';
    if (verdict.ok) h += '<p><strong>Registre revérifié sceau par sceau : MATCH ✓</strong> — ' + verdict.nombre + ' sceau' + (verdict.nombre > 1 ? 'x' : '') + '.</p>';
    else h += '<p><strong>RUPTURE au sceau ' + verdict.maillon_rompu + '</strong> — ' + esc(verdict.raison) + '.</p>';
    h += '<ol>' + entrees.map(function (e, i) {
      var etat = verdict.ok ? '✓ recalculé' : (i + 1 < verdict.maillon_rompu ? '✓ recalculé' : (i + 1 === verdict.maillon_rompu ? '✗ rupture ici' : '— après la rupture'));
      return '<li><span class="mono">' + esc(e.horodatage) + '</span> — ' + esc(String(e.texte || '').slice(0, 140)) + '<br><span class="petite">sceau <span class="mono">' + court(e.sceau) + '</span> · ' + etat + '</span></li>';
    }).join('') + '</ol>';
    return h;
  }
  async function rendreMemoire(zone, cerveau, registre) {
    var morceaux = [];
    if (cerveau && cerveau.length) morceaux.push(vueChaine('Le cerveau local — la mémoire cumulée de tes passages ici', cerveau, await rpVerifierChaine(cerveau)));
    if (registre && registre.length) morceaux.push(vueRegistre('Le registre de l’atelier Sceller', registre, await rpVerifierRegistre(registre)));
    zone.innerHTML = morceaux.length ? morceaux.join('') : '<p class="petite">Rien n’est conservé pour l’instant dans ce navigateur : ni cerveau local, ni sceaux de l’atelier. Scelle un premier mot à l’atelier, ou construis ton cerveau local (panneau Faire pareil), puis reviens ici — ou apporte l’export de ta mémoire ci-dessous, ou lance la démonstration en un clic.</p>';
    return morceaux.length;
  }
  function lireLocal(cle) { try { var v = localStorage.getItem(cle); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  async function chargerMemoireLocale() {
    var etat = $('rp-memoire-etat'); if (!etat) return;
    var cerveau = null, registre = null;
    var c = lireLocal('cerveau-utilisateur-v1');
    if (c && Array.isArray(c.entrees)) cerveau = c.entrees;
    var r = lireLocal('registre-vg-v2');
    if (Array.isArray(r)) registre = r;
    var n = await rendreMemoire($('rp-memoire'), cerveau, registre);
    etat.textContent = n ? 'Voici ce que ce navigateur conserve de tes passages ici — revérifié maintenant, entrée par entrée. Rien de tout cela n’existe chez nous : ce site ne détient aucune base de données.' : 'Lecture de ce que ce navigateur conserve de tes passages ici :';
  }
  $('rp-import').addEventListener('change', function () {
    var f = this.files && this.files[0]; var etatImp = $('rp-import-etat'), vue = $('rp-import-vue');
    if (!f) return;
    f.text().then(async function (t) {
      var j = null; try { j = JSON.parse(t); } catch (e) { }
      if (!j) { etatImp.textContent = 'Fichier illisible comme export JSON — rien n’est affiché.'; vue.innerHTML = ''; return; }
      if (Array.isArray(j)) { etatImp.textContent = 'Export reconnu : un registre de l’atelier Sceller (' + j.length + ' sceaux), apporté par toi.'; vue.innerHTML = vueRegistre('La mémoire apportée — registre de l’atelier', j, await rpVerifierRegistre(j)); return; }
      if (Array.isArray(j.entrees)) { etatImp.textContent = 'Export reconnu : un cerveau local (' + j.entrees.length + ' entrées), apporté par toi.'; vue.innerHTML = vueChaine('La mémoire apportée — cerveau local', j.entrees, await rpVerifierChaine(j.entrees)); return; }
      if (Array.isArray(j.registre)) { etatImp.textContent = 'Export reconnu : un registre de l’atelier Sceller (' + j.registre.length + ' sceaux), apporté par toi.'; vue.innerHTML = vueRegistre('La mémoire apportée — registre de l’atelier', j.registre, await rpVerifierRegistre(j.registre)); return; }
      etatImp.textContent = 'Format non reconnu : ni cerveau local, ni registre de l’atelier — rien n’est affiché.'; vue.innerHTML = '';
    });
  });
  document.addEventListener('panneau-ouvert', function (ev) { if (ev.detail && ev.detail.nom === 'ancrage') chargerMemoireLocale(); });
  chargerMemoireLocale();

  /* ---------- 3 · Démonstration en un clic ---------- */
  var demoDocOriginal = null, demoDocActuel = null, demoOts = null;
  function majDemoVerdict() {
    var zone = $('rp-demo-verdict'), det = $('rp-demo-details');
    if (!demoDocActuel || !demoOts) return;
    rpSha256Hex(demoDocActuel).then(function (h) {
      var match = demoOts.ok && h === demoOts.empreinte;
      zone.innerHTML = match
        ? '<strong style="font-size:1.15em">MATCH ✓</strong> — l’exemple se revérifie : le relevé du 15 novembre 2026 est inchangé depuis sa preuve.'
        : '<strong style="font-size:1.15em">ÉCART ✗</strong> — un caractère de l’exemple a été changé : son empreinte recalculée ne correspond plus à celle de la preuve. C’est exactement ce que verrait un document altéré.';
      det.innerHTML = '<p>Empreinte recalculée de l’exemple :<br><span class="mono">' + esc(h) + '</span></p>'
        + '<p>Empreinte inscrite dans la preuve :<br><span class="mono">' + esc(demoOts.empreinte) + '</span></p>'
        + '<h4>Attestations portées par la preuve</h4>' + lignesAttestations(demoOts.attestations);
    });
  }
  $('rp-demo-charge').addEventListener('click', function () {
    var zone = $('rp-demo-verdict');
    zone.textContent = 'Chargement de l’exemple publié…';
    Promise.all([
      fetch('assets/jetons/ancrage-hebdo-empreintes-2026-11-15.txt').then(function (r) { if (!r.ok) throw new Error('document'); return r.arrayBuffer(); }),
      fetch('assets/jetons/ancrage-hebdo-empreintes-2026-11-15.txt.ots').then(function (r) { if (!r.ok) throw new Error('preuve'); return r.arrayBuffer(); })
    ]).then(function (res) {
      demoDocOriginal = new Uint8Array(res[0]); demoDocActuel = demoDocOriginal;
      demoOts = rpParseOts(new Uint8Array(res[1]));
      $('rp-demo-casse').disabled = false; $('rp-demo-repare').disabled = true;
      majDemoVerdict();
    }).catch(function () {
      zone.textContent = 'L’exemple publié n’a pas pu être chargé depuis cette page (fichiers absents ou lecture bloquée) — la démonstration ne simule rien : dépose plutôt tes propres fichiers à l’étape 1, ou télécharge le couple depuis la section des jetons du panneau Ancrage.';
    });
  });
  $('rp-demo-casse').addEventListener('click', function () {
    if (!demoDocOriginal) return;
    var texte = new TextDecoder().decode(demoDocOriginal);
    var i = texte.search(/[0-9a-f]/);
    if (i < 0) return;
    var c = texte.charAt(i) === '0' ? '1' : '0';
    demoDocActuel = new TextEncoder().encode(texte.slice(0, i) + c + texte.slice(i + 1));
    $('rp-demo-repare').disabled = false; $('rp-demo-casse').disabled = true;
    majDemoVerdict();
  });
  $('rp-demo-repare').addEventListener('click', function () {
    if (!demoDocOriginal) return;
    demoDocActuel = demoDocOriginal;
    $('rp-demo-casse').disabled = false; $('rp-demo-repare').disabled = true;
    majDemoVerdict();
  });

  /* ---------- 3b · Mémoire d’exemple ---------- */
  var demoChaine = null;
  async function construireDemoChaine() {
    var prevS = RP_GENESE, prevD = RP_GENESE, out = [];
    for (var i = 0; i < RP_DEMO_MEMOIRE.length; i++) {
      var d = RP_DEMO_MEMOIRE[i];
      var e = await rpScellerEntree(prevS, prevD, i, d.ts, d.type, d.contenu);
      out.push(e); prevS = e.sceau; prevD = e.digest;
    }
    return out;
  }
  async function rendreDemoChaine(cassee) {
    var vue = $('rp-demo-memoire-vue');
    if (!demoChaine) demoChaine = await construireDemoChaine();
    var copie = demoChaine.map(function (e) { return { seq: e.seq, ts: e.ts, type: e.type, contenu: e.contenu, sceau: e.sceau, digest: e.digest }; });
    if (cassee) copie[1].contenu = copie[1].contenu + ' (un caractère a été changé ici)';
    var verdict = await rpVerifierChaine(copie);
    vue.innerHTML = vueChaine(cassee ? 'La mémoire d’exemple — un maillon cassé' : 'La mémoire d’exemple — intacte', copie, verdict)
      + (cassee ? '<p class="petite">L’entrée nº 2 a été modifiée dans la copie montrée : son sceau recalculé ne correspond plus, et la chaîne le dit exactement là. La mémoire d’exemple intacte se reconstruit avec « Réparer ».</p>' : '');
    $('rp-demo-memoire-casse').disabled = !!cassee;
    $('rp-demo-memoire-repare').disabled = !cassee;
  }
  $('rp-demo-memoire').addEventListener('click', function () { rendreDemoChaine(false); });
  $('rp-demo-memoire-casse').addEventListener('click', function () { rendreDemoChaine(true); });
  $('rp-demo-memoire-repare').addEventListener('click', function () { rendreDemoChaine(false); });
})();
