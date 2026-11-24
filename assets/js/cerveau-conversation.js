
/* ===== Le cerveau du site SoPHIa — la conversation du site =====
   La salle de conversation du site web SoPHIa (page cerveau.html).
   Tout est préparé : un labyrinthe de questions et de réponses tirées des
   pages du site, une cascade de recherche pour la question libre
   (mots-clés sur les questions préparées, puis le noyau du site —
   « SoPHIa, mémoire cumulative chaînée » : l'index plein texte rendu
   plus poussé, phrase exacte d'abord, citations avec leur chemin de
   Merkle et l'action d'accompagnement —, puis — si le visiteur active
   le palier P1 — la recherche par le sens, branchée dans ce paquet sur
   un modèle de plongement français servi par le site, puis les mots-clés
   de l'index plein texte des endroits (le filet), puis le recouvrement
   de jetons), un état de conversation chaîné par SHA-256 et CHIFFRÉ au
   repos (AES-GCM, clé d'appareil gardée dans l'appareil du visiteur
   seulement — mandat d'Alex, 24 novembre 2026), et une échelle de paliers de capacités détectées localement
   (assets/paliers.json) — plancher universel, plafond qui monte avec le
   matériel. Le site ne reçoit ni ne garde rien.
   Les fonctions pures (entre CV-PURES-DEBUT et CV-PURES-FIN) ne touchent
   pas au DOM : elles sont testées hors navigateur au chantier.
   Une feuille peut porter des « suites » : les choix qui enchaînent
   l'étape suivante d'un parcours guidé (la branche « exercer mes
   droits », sept étapes-feuilles de A à Z) — ils sont rendus après la
   réponse de l'étape, avant la navigation générale. */
/* CV-PURES-DEBUT */
function cvHexOctets(u8) { var s = ''; for (var i = 0; i < u8.length; i++) { s += ('0' + u8[i].toString(16)).slice(-2); } return s; }
async function cvSha256Hex(donnees) {
  var buf = (typeof donnees === 'string') ? new TextEncoder().encode(donnees) : donnees;
  var h = await crypto.subtle.digest('SHA-256', buf);
  return cvHexOctets(new Uint8Array(h));
}
var CV_GENESE = '0000000000000000000000000000000000000000000000000000000000000000';

/* ---------- normalisation et jetons (cascade déterministe) ---------- */
function cvNormaliser(texte) {
  return String(texte || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
var CV_MOTS_VIDES = {};
('le la les de des du un une et ou a au aux en dans sur sous chez par pour avec sans ' +
 'est sont ce cet cette ces qui que quoi quel quelle quels quelles je tu il elle nous vous ils elles ' +
 'mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs ' +
 'se si y ne pas plus moins tres peu aussi comme quand comment pourquoi ou ' +
 'd l j n s t c qu il y a').split(' ').forEach(function (m) { CV_MOTS_VIDES[m] = true; });
function cvJetons(texte) {
  var norm = cvNormaliser(texte);
  if (!norm) return [];
  return norm.split(' ').filter(function (t) { return t.length >= 2 && !CV_MOTS_VIDES[t]; });
}
function cvEnsembleJetons(texte) {
  var ens = {};
  cvJetons(texte).forEach(function (t) { ens[t] = true; });
  return ens;
}

/* ---------- l'état de conversation chaîné ----------
   Recette (celle du site, adaptée à la conversation) :
   entrée canonique = JSON {n, ts, type, contenu} (clés dans cet ordre) ;
   état_n = SHA-256(état_{n-1} + entrée canonique) ; genèse = 64 zéros.
   L'historique vit dans le stockage local de l'appareil du visiteur. */
function cvCanoniqueEntree(e) { return JSON.stringify({ n: e.n, ts: e.ts, type: e.type, contenu: e.contenu }); }
async function cvAjouterEntree(entrees, ts, type, contenu) {
  var prev = entrees.length ? entrees[entrees.length - 1].etat : CV_GENESE;
  var e = { n: entrees.length + 1, ts: ts, type: type, contenu: contenu };
  e.etat = await cvSha256Hex(prev + cvCanoniqueEntree(e));
  entrees.push(e);
  return e;
}
async function cvVerifierChaine(entrees) {
  var prev = CV_GENESE;
  for (var i = 0; i < entrees.length; i++) {
    var e = entrees[i];
    if (!e || e.n !== i + 1 || typeof e.ts !== 'string' || typeof e.type !== 'string' ||
        typeof e.contenu !== 'string' || typeof e.etat !== 'string')
      return { ok: false, nombre: entrees.length, etat: prev, premierEcart: i + 1, raison: 'entrée incomplète ou séquence discontinue' };
    var etat = await cvSha256Hex(prev + cvCanoniqueEntree(e));
    if (etat !== e.etat)
      return { ok: false, nombre: entrees.length, etat: prev, premierEcart: e.n, raison: 'état recalculé différent de l’état consigné' };
    prev = etat;
  }
  return { ok: true, nombre: entrees.length, etat: prev, premierEcart: 0, raison: '' };
}

/* ---------- l'arbre de Merkle de la conversation ----------
   Recette alignée sur assets/merkle.json du site : digest de feuille =
   SHA-256 de la forme canonique de la feuille ; nœud interne = SHA-256 de
   la concaténation (hex gauche + hex droite) ; niveau impair : le dernier
   digest est dupliqué. */
function cvFeuilleCanonique(f) {
  return JSON.stringify({
    endroit: { ancre: f.endroit.ancre, page: f.endroit.page },
    id: f.id, question: f.question, reponse: f.reponse
  });
}
async function cvDigestFeuille(f) { return cvSha256Hex(cvFeuilleCanonique(f)); }
async function cvConstruireNiveaux(digests) {
  var niveaux = [digests.slice()];
  var courant = digests.slice();
  while (courant.length > 1) {
    var suivant = [];
    for (var i = 0; i < courant.length; i += 2) {
      var d = (i + 1 < courant.length) ? courant[i + 1] : courant[i];
      suivant.push(await cvSha256Hex(courant[i] + d));
    }
    niveaux.push(suivant);
    courant = suivant;
  }
  return niveaux;
}
function cvCheminMerkle(niveaux, index) {
  var chemin = [];
  var idx = index;
  for (var n = 0; n < niveaux.length - 1; n++) {
    var niv = niveaux[n];
    if (idx % 2 === 0) {
      chemin.push({ cote: 'd', digest: (idx + 1 < niv.length) ? niv[idx + 1] : niv[idx] });
    } else {
      chemin.push({ cote: 'g', digest: niv[idx - 1] });
    }
    idx = Math.floor(idx / 2);
  }
  return chemin;
}
async function cvVerifierChemin(digestFeuille, chemin, racine) {
  var courant = digestFeuille;
  for (var i = 0; i < chemin.length; i++) {
    courant = (chemin[i].cote === 'g')
      ? await cvSha256Hex(chemin[i].digest + courant)
      : await cvSha256Hex(courant + chemin[i].digest);
  }
  return courant === racine;
}

/* ---------- les paliers de capacités — l'échelle ouverte ----------
   Principe d'Alexandre (23 novembre 2026) : plancher universel, plafond
   qui monte avec le matériel. Le site donne le plus de capacités qu'il
   peut ; chaque appareil reçoit la profondeur que ses capacités RÉELLES
   portent — jamais le nom de son modèle. La détection se fait dans le
   navigateur du visiteur seulement : rien n'est envoyé, rien n'est
   stocké côté site. L'échelle vit dans les données (assets/paliers.json,
   généré depuis le champ paliers de la source du cerveau) : un palier
   futur s'ajoute comme une entrée de la liste, sans toucher ce code. */
async function cvDetecterCapacites(env) {
  env = env || {};
  var nav = env.navigator || {};
  var caps = {
    webgpu: false,
    webassembly: (typeof env.WebAssembly !== 'undefined') && !!env.WebAssembly &&
                 typeof env.WebAssembly.instantiate === 'function',
    memoire: (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0) ? nav.deviceMemory : null,
    concurrence: (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0) ? nav.hardwareConcurrency : null,
    ecran: (env.screen && typeof env.screen.width === 'number') ? env.screen.width
           : (typeof env.innerWidth === 'number' ? env.innerWidth : null)
  };
  if (nav.gpu && typeof nav.gpu.requestAdapter === 'function') {
    try { var adaptateur = await nav.gpu.requestAdapter(); caps.webgpu = !!adaptateur; }
    catch (e) { caps.webgpu = false; }
  }
  return caps;
}
function cvCapaciteOk(exigence, caps) {
  var v = caps[exigence.id];
  if (exigence.id === 'webgpu' || exigence.id === 'webassembly') return v === true;
  if (typeof v === 'number') return v >= (typeof exigence.min === 'number' ? exigence.min : 1);
  return false;
}
function cvExigencesManquantes(palier, caps) {
  return (palier.capacites || []).filter(function (r) { return !cvCapaciteOk(r, caps); });
}
function cvPalierPorte(palier, caps) { return cvExigencesManquantes(palier, caps).length === 0; }
function cvPalierActuel(paliers, caps) {
  var actuel = null;
  (paliers || []).forEach(function (p) { if (cvPalierPorte(p, caps)) actuel = p.id; });
  return actuel;
}

/* ---------- la cascade de recherche de la question libre ----------
   Ordre de confiance (recherche du 23 novembre 2026, mesures à l'appui ;
   étage 1 de la version suivante, 24 novembre 2026, pour le sens ;
   intégration du noyau, 24 novembre 2026, GO d'Alex 07 h 56) :
   1) mots-clés en mode ET sur les questions préparées ;
   2) le NOYAU du site — « SoPHIa, mémoire cumulative chaînée » : l'index
      plein texte rendu plus poussé (index inversé à positions construit
      d'avance, livré en éclats par chambre dans assets/noyau/), phrase
      exacte d'abord, mots séparés ensuite, réponse composée de citations
      seulement, chacune avec sa pièce et son chemin de Merkle, et
      l'action d'accompagnement quand un passage mène à un parcours.
      Branché quand le navigateur a chargé les éclats ; sinon sauté,
      sans rien simuler ;
   3) couche sémantique — le palier P1, BRANCHÉ dans ce paquet : un modèle
      de plongement français servi par le site (voir CV_SEMANTIQUE et
      assets/js/cerveau-semantique.mjs), chargé seulement quand le
      visiteur active le palier (opt-in, taille affichée) ; tant qu'il
      n'est pas activé, cette étape est sautée, sans rien simuler ;
   4) mots-clés en mode ET sur l'index plein texte des endroits du site —
      le filet, conservé pour quand le noyau n'est pas branché ou ne
      tient rien ;
   5) recouvrement de jetons sur les questions préparées (déterministe) ;
   6) la porte du courriel. Jamais de réponse inventée, jamais de fusion
   de classements (la fusion RRF a dégradé les résultats aux mesures). */
var CV_SEMANTIQUE = {
  actif: false,
  fonction: null,      /* async (question, feuilles) -> {feuilles: {idFeuille: score}, endroits: [{page, ancre, titre, panneauNom, score}]} — la forme plate {idFeuille: score} reste acceptée */
  vecteurs: null,      /* les métadonnées du fichier de vecteurs, une fois le palier activé */
  brancher: function (fonction, vecteurs) {
    this.fonction = fonction; this.vecteurs = vecteurs; this.actif = (typeof fonction === 'function');
  }
};
/* Le noyau du site (intégration du 24 novembre 2026) : branché par le
   câblage DOM quand les éclats de son index (assets/noyau/) ont été
   chargés et reconstruits en mémoire. noyauRepondre est le moteur pur
   d'assets/js/noyau.js, chargé avant ce fichier ; la cascade l'appelle
   seulement s'il est là — sinon l'étape est sautée, sans rien simuler. */
var CV_NOYAU = {
  actif: false,
  index: null,         /* {racine_merkle_passages, passages, inverse} reconstruit depuis les éclats */
  brancher: function (index) { this.index = index; this.actif = !!index; }
};
/* Seuils de la couche sémantique, calibrés au chantier sur le corpus réel
   (questions paraphrasées contre questions hors sujet, vecteurs int8
   déquantifiés — voir le rapport de l'étage 1) : une feuille préparée
   l'emporte dès 0,40 ; un endroit seul exige 0,58, plus strict, parce
   qu'aucune réponse préparée ne le porte. */
var CV_SEUIL_SEMANTIQUE = 0.40;
var CV_SEUIL_SEMANTIQUE_ENDROIT = 0.58;
function cvCosinus(a, b) {
  var dot = 0, na = 0, nb = 0, n = Math.min(a.length, b.length);
  for (var i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
/* Recherche par le sens, pure : vecteurRequete (le plongement de la
   question, calculé par le modèle) contre la base des vecteurs du site
   (feuilles préparées + endroits de l'index, plongés à la construction).
   Retourne les scores bruts ; la cascade applique les seuils. */
function cvRechercheSemantique(vecteurRequete, base) {
  var feuilles = {}, endroits = [];
  (base || []).forEach(function (e) {
    var s = cvCosinus(vecteurRequete, e.vec);
    if (e.type === 'feuille') { feuilles[e.id] = s; }
    else if (e.type === 'endroit') {
      endroits.push({ page: e.page, ancre: e.ancre, titre: e.titre, panneauNom: e.panneauNom, score: s });
    }
  });
  endroits.sort(function (a, b) { return (b.score - a.score) || ((a.page + a.ancre) < (b.page + b.ancre) ? -1 : 1); });
  return { feuilles: feuilles, endroits: endroits };
}
function cvIndexFeuilles(feuilles) {
  return feuilles.map(function (f) {
    return {
      id: f.id,
      question: cvEnsembleJetons(f.question),
      mots: cvEnsembleJetons((f.mots || []).join(' ')),
      tout: cvEnsembleJetons(f.question + ' ' + (f.mots || []).join(' ')),
      reponse: cvEnsembleJetons(f.reponse)
    };
  });
}
function cvContientTout(ens, jetons) {
  for (var i = 0; i < jetons.length; i++) { if (!ens[jetons[i]]) return false; }
  return true;
}
function cvCompteDans(ens, jetons) {
  var n = 0;
  for (var i = 0; i < jetons.length; i++) { if (ens[jetons[i]]) n++; }
  return n;
}
async function cvCascade(question, feuilles, endroits) {
  var jetons = cvJetons(question);
  if (!jetons.length) return { etape: 'courriel', feuilles: [], endroits: [] };
  var index = cvIndexFeuilles(feuilles);
  /* 1) mots-clés ET sur les questions préparées */
  var mc = index.filter(function (ix) {
    return cvContientTout(ix.tout, jetons) || cvContientTout(ix.reponse, jetons) || cvContientTout(ix.question, jetons) || cvContientTout(ix.mots, jetons);
  });
  if (mc.length) {
    mc.sort(function (a, b) {
      var d = cvCompteDans(b.question, jetons) - cvCompteDans(a.question, jetons);
      if (d) return d;
      d = cvCompteDans(b.mots, jetons) - cvCompteDans(a.mots, jetons);
      if (d) return d;
      return a.id < b.id ? -1 : 1;
    });
    return { etape: 'mots-cles', feuilles: mc.map(function (ix) { return ix.id; }), endroits: [] };
  }
  /* 2) le noyau — l'index plein texte rendu plus poussé : phrase exacte
     d'abord, seuils honnêtes, citations avec chemin de Merkle et action
     d'accompagnement. S'il ne tient rien (statut 'vide'), la cascade
     continue : le noyau ne force jamais une réponse. */
  if (CV_NOYAU.actif && CV_NOYAU.index && typeof noyauRepondre === 'function') {
    try {
      var repNoyau = noyauRepondre(CV_NOYAU.index, question);
      if (repNoyau && repNoyau.statut === 'trouve') {
        return { etape: 'noyau', feuilles: [], endroits: [], noyau: repNoyau };
      }
    } catch (e) { /* noyau en échec : la cascade continue sans lui */ }
  }
  /* 3) couche sémantique — le palier P1, quand le visiteur l'a activé :
     la question est plongée par le modèle, dans son navigateur, et
     comparée aux vecteurs des feuilles puis des endroits du site.
     Une feuille préparée au-dessus du seuil l'emporte ; sinon un
     endroit au-dessus du seuil strict est proposé ; sinon la cascade
     continue — le sens ne force jamais une réponse. */
  if (CV_SEMANTIQUE.actif && CV_SEMANTIQUE.fonction) {
    try {
      var brut = await CV_SEMANTIQUE.fonction(question, feuilles);
      var scoresF = (brut && brut.feuilles) ? brut.feuilles : (brut || {});
      var semF = Object.keys(scoresF).filter(function (id) { return scoresF[id] >= CV_SEUIL_SEMANTIQUE; });
      if (semF.length) {
        semF.sort(function (a, b) { return (scoresF[b] - scoresF[a]) || (a < b ? -1 : 1); });
        return { etape: 'semantique', feuilles: semF.slice(0, 3), endroits: [] };
      }
      var semE = ((brut && brut.endroits) || []).filter(function (e) { return e.score >= CV_SEUIL_SEMANTIQUE_ENDROIT; });
      if (semE.length) {
        return { etape: 'semantique', feuilles: [], endroits: semE.slice(0, 5).map(function (e) {
          return { page: e.page, ancre: e.ancre, titre: e.titre, panneauNom: e.panneauNom };
        }) };
      }
    } catch (e) { /* couche sémantique en échec : la cascade continue sans elle */ }
  }
  /* 4) mots-clés ET sur l'index plein texte des endroits — le filet,
     conservé pour quand le noyau n'est pas branché ou ne tient rien */
  if (endroits && endroits.length) {
    var me = [];
    endroits.forEach(function (e) {
      var ens = cvEnsembleJetons((e.titre || '') + ' ' + (e.texte || ''));
      if (cvContientTout(ens, jetons)) {
        me.push({ page: e.page, ancre: e.ancre, titre: e.titre, panneauNom: e.panneauNom,
                  dansTitre: cvCompteDans(cvEnsembleJetons(e.titre || ''), jetons) });
      }
    });
    if (me.length) {
      me.sort(function (a, b) {
        if (b.dansTitre !== a.dansTitre) return b.dansTitre - a.dansTitre;
        return (a.page + a.ancre) < (b.page + b.ancre) ? -1 : 1;
      });
      return { etape: 'endroits', feuilles: [], endroits: me.slice(0, 5).map(function (e) {
        return { page: e.page, ancre: e.ancre, titre: e.titre, panneauNom: e.panneauNom };
      }) };
    }
  }
  /* 5) recouvrement de jetons (déterministe, JS pur) */
  var rec = [];
  index.forEach(function (ix) {
    var ens = {};
    Object.keys(ix.question).forEach(function (t) { ens[t] = true; });
    Object.keys(ix.mots).forEach(function (t) { ens[t] = true; });
    var touches = cvCompteDans(ens, jetons);
    var score = touches / jetons.length;
    if (touches >= 1 && score >= 0.34) rec.push({ id: ix.id, score: score, touches: touches });
  });
  if (rec.length) {
    rec.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.touches !== a.touches) return b.touches - a.touches;
      return a.id < b.id ? -1 : 1;
    });
    return { etape: 'recouvrement', feuilles: rec.slice(0, 3).map(function (r) { return r.id; }), endroits: [] };
  }
  /* 6) la porte du courriel */
  return { etape: 'courriel', feuilles: [], endroits: [] };
}

/* ---------- revérification d'un endroit contre le manifeste ----------
   Miroir du kit autonome du site (kit-verifier.py) : extraire l'élément
   <section> aux octets exacts, neutraliser les sceaux affichés, recalculer. */
function cvExtent(html, start, tag) {
  var pat = new RegExp('<(/?)' + tag + '(?=[\\s>])[^>]*?(/?)>', 'g');
  pat.lastIndex = start;
  var depth = 0, m;
  while ((m = pat.exec(html)) !== null) {
    if (m[2] === '/') { if (depth === 0) return [start, pat.lastIndex]; continue; }
    if (m[1] === '/') { depth--; if (depth === 0) return [start, pat.lastIndex]; }
    else depth++;
  }
  return null;
}
function cvTrouverSection(html, id) {
  var re = /<section(?=[\s>])/g, m;
  while ((m = re.exec(html)) !== null) {
    var ext = cvExtent(html, m.index, 'section');
    if (!ext) return null;
    var seg = html.slice(ext[0], ext[1]);
    var mid = /\bid="([^"]+)"/.exec(seg.slice(0, 400));
    if (mid && mid[1] === id) return seg;
  }
  return null;
}
function cvNeutralise(txt, valeurs) {
  var Z = '0000000000000000000000000000000000000000000000000000000000000000';
  var out = txt;
  valeurs.forEach(function (v) { if (v) out = out.split(v).join(Z); });
  return out;
}
/* CV-PURES-FIN */

/* ===== Câblage DOM (navigateur seulement) ===== */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var racineEl = document.getElementById('cv-conversation');
  if (!racineEl) return;

  var CLE = 'sophia-cerveau-conversation-v1';
  var arbre = null, arbreMerkle = null, manifeste = null, indexEndroits = null;
  var paliersData = null;
  var parId = {};
  var entrees = [];
  var stockageOk = true;
  var retourAjoute = false;

  function $(id) { return document.getElementById(id); }
  function el(tag, classe, texte) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texte != null) e.textContent = texte;
    return e;
  }
  function maintenant() { return new Date().toISOString(); }

  /* --- persistance locale CHIFFRÉE (cet appareil seulement) ---
     Mandat d'Alex (24 novembre 2026, 08 h 08) : la conversation gardée
     dans le téléphone du visiteur est CHIFFRÉE, pas seulement signée et
     chaînée. Forme choisie — la plus simple, documentée au rapport
     d'intégration du noyau : une CLÉ D'APPAREIL.
       · clé AES-GCM 256 bits générée ici, par WebCrypto, NON
         extractible : ses octets ne sortent jamais du module crypto du
         navigateur ; elle est gardée dans l'IndexedDB de ce navigateur,
         sous l'identifiant « appareil » ;
       · les entrées chaînées vivent dans le stockage local, chiffrées
         (AES-GCM, vecteur d'initialisation aléatoire à chaque écriture)
         — format « conversation-sophia/v2-chiffre » ;
       · la chaîne SHA-256 se revérifie APRÈS déchiffrement, dans
         l'appareil seulement (afficherParcours) ;
       · ni le site ni son opérateur ne détiennent la clé : ils ne
         peuvent pas lire cette mémoire (« opérateur sans accès »).
     Borne, nommée : si la clé se perd — données de ce navigateur
     effacées, autre appareil — la mémoire devient ILLISIBLE, pour tout
     le monde et pour toujours. C'est le prix de la souveraineté du
     visiteur. Dans ce cas, l'enregistrement est SUSPENDU (on n'écrase
     pas un chiffré qu'on ne peut pas relire) ; le visiteur peut effacer
     et repartir à zéro, par le bouton « Effacer » ci-dessous.
     Migration : un historique en clair de l'ancien format (v1) est lu
     une dernière fois, puis réécrit chiffré. */
  var cleAppareil = null;
  var memoireChiffree = false;    /* l'historique tient sous clé, sur cet appareil */
  var memoireIllisible = false;   /* un chiffré existe, sa clé est introuvable */
  var sauvegardeSuspendue = false;
  var migrationClair = false;

  function idbOuvrir() {
    return new Promise(function (resoudre, rejeter) {
      var demande = window.indexedDB.open('sophia-memoire-cle', 1);
      demande.onupgradeneeded = function () { demande.result.createObjectStore('cles'); };
      demande.onsuccess = function () { resoudre(demande.result); };
      demande.onerror = function () { rejeter(demande.error); };
    });
  }
  async function idbCle(lire, valeur) {
    var bd = await idbOuvrir();
    return new Promise(function (resoudre, rejeter) {
      var tx = bd.transaction('cles', lire ? 'readonly' : 'readwrite');
      var magasin = tx.objectStore('cles');
      var demande = lire ? magasin.get('appareil') : magasin.put(valeur, 'appareil');
      demande.onsuccess = function () { resoudre(lire ? (demande.result || null) : true); };
      demande.onerror = function () { rejeter(demande.error); };
      tx.oncomplete = function () { bd.close(); };
    });
  }
  async function chargerCleAppareil(creer) {
    if (cleAppareil) return cleAppareil;
    var cle = await idbCle(true);
    if (!cle && creer) {
      cle = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await idbCle(false, cle);
    }
    if (cle) cleAppareil = cle;
    return cleAppareil;
  }
  async function supprimerCleAppareil() {
    try {
      var bd = await idbOuvrir();
      await new Promise(function (resoudre, rejeter) {
        var tx = bd.transaction('cles', 'readwrite');
        var demande = tx.objectStore('cles').delete('appareil');
        demande.onsuccess = function () { resoudre(true); };
        demande.onerror = function () { rejeter(demande.error); };
        tx.oncomplete = function () { bd.close(); };
      });
    } catch (e) { /* clé déjà absente ou IndexedDB indisponible */ }
  }
  function versBase64(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return window.btoa(s);
  }
  function depuisBase64(b64) {
    var s = window.atob(b64), u8 = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }
  async function chargerHistorique() {
    var brut = null;
    try { brut = localStorage.getItem(CLE); } catch (e) { stockageOk = false; return []; }
    if (!brut) return [];
    var lu = null;
    try { lu = JSON.parse(brut); } catch (e) { return []; }
    if (lu && Array.isArray(lu.entrees)) { migrationClair = true; return lu.entrees; }
    if (lu && lu.format === 'conversation-sophia/v2-chiffre' && typeof lu.donnees === 'string') {
      try {
        var cle = await chargerCleAppareil(false);
        if (!cle) { memoireIllisible = true; sauvegardeSuspendue = true; return []; }
        var paquetOctets = depuisBase64(lu.donnees);
        var iv = paquetOctets.slice(0, 12), chiffre = paquetOctets.slice(12);
        var clairOctets = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, cle, chiffre);
        var luClair = JSON.parse(new TextDecoder().decode(clairOctets));
        if (luClair && Array.isArray(luClair.entrees)) { memoireChiffree = true; return luClair.entrees; }
        memoireIllisible = true; sauvegardeSuspendue = true; return [];
      } catch (e) { memoireIllisible = true; sauvegardeSuspendue = true; return []; }
    }
    return [];
  }
  async function sauverHistorique() {
    if (!stockageOk || sauvegardeSuspendue) return;
    try {
      var cle = await chargerCleAppareil(true);
      if (!cle) { stockageOk = false; return; }
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var clairOctets = new TextEncoder().encode(JSON.stringify({ format: 'conversation-sophia/v1', entrees: entrees }));
      var chiffreOctets = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, cle, clairOctets));
      var paquetOctets = new Uint8Array(iv.length + chiffreOctets.length);
      paquetOctets.set(iv, 0); paquetOctets.set(chiffreOctets, iv.length);
      localStorage.setItem(CLE, JSON.stringify({ format: 'conversation-sophia/v2-chiffre', donnees: versBase64(paquetOctets) }));
      memoireChiffree = true;
    } catch (e) { stockageOk = false; }
  }
  async function ajouter(type, contenu) {
    var e = await cvAjouterEntree(entrees, maintenant(), type, contenu);
    await sauverHistorique();
    afficherParcours();
    return e;
  }
  /* La mémoire de la conversation, nommée et partagée : c'est ELLE que
     le noyau écrit aussi (ses échanges deviennent des entrées « noyau »
     de la même chaîne chiffrée) — une seule mémoire locale, chaînée par
     SHA-256 et chiffrée au repos, gardée dans cet appareil seulement.
     Le site « se rappelle de son utilisateur » ici, chez l'utilisateur. */
  window.CV_MEMOIRE = {
    ajouter: ajouter,
    verifier: cvVerifierChaine,
    entrees: function () { return entrees; },
    etat: function () { return entrees.length ? entrees[entrees.length - 1].etat : CV_GENESE; },
    chiffree: function () { return memoireChiffree; }
  };

  /* --- affichage du parcours (l'historique chaîné) --- */
  async function afficherParcours() {
    var liste = $('cv-parcours-liste'), etatEl = $('cv-parcours-etat'), verdictEl = $('cv-parcours-verdict');
    if (!liste) return;
    liste.innerHTML = '';
    if (!entrees.length) {
      liste.appendChild(el('li', 'petite', 'Aucune entrée pour le moment : ton parcours commencera à ta première question.'));
    } else {
      entrees.forEach(function (e) {
        var li = el('li', 'cv-entree');
        li.appendChild(el('span', 'mono petite', 'nº ' + e.n + ' · ' + e.type + ' · '));
        li.appendChild(el('span', null, e.contenu));
        li.appendChild(el('span', 'mono petite', ' — état ' + e.etat.slice(0, 12) + '…'));
        liste.appendChild(li);
      });
    }
    var v = await cvVerifierChaine(entrees);
    if (etatEl) etatEl.textContent = v.etat;
    if (verdictEl) {
      if (memoireIllisible) {
        verdictEl.textContent = 'Une mémoire chiffrée existe sur cet appareil, mais sa clé d’appareil est introuvable : elle est illisible — pour le site comme pour toi. C’est le prix de ta souveraineté : sans la clé, personne ne lit ta mémoire. L’enregistrement est suspendu pour ne pas l’écraser ; tu peux l’effacer ci-dessous pour repartir à zéro.';
      } else if (!stockageOk) {
        verdictEl.textContent = 'Sur ce navigateur, la clé d’appareil n’a pas pu être gardée : ton historique vit pour cette visite seulement et ne persiste pas.';
      } else {
        verdictEl.textContent = !entrees.length ? 'Chaîne vide — rien à revérifier pour le moment.'
          : (v.ok ? 'Revérification de l’historique, après déchiffrement, depuis ton appareil : MATCH — ' + v.nombre + ' entrée' + (v.nombre > 1 ? 's' : '') + ', la chaîne se recalcule au complet.'
                  : 'Revérification de l’historique : ÉCART à l’entrée nº ' + v.premierEcart + ' (' + v.raison + ').');
      }
    }
  }

  /* --- les paliers : détection locale et échelle ouverte --- */
  async function afficherPaliers() {
    var zone = $('cv-paliers-detail');
    if (!zone) return;
    zone.innerHTML = '';
    if (!paliersData || !Array.isArray(paliersData.paliers)) {
      zone.appendChild(el('p', 'petite', 'L’échelle des paliers n’a pas pu être chargée (assets/paliers.json). La base te sert déjà au complet : le labyrinthe et la recherche par mots-clés, ci-dessus.'));
      return;
    }
    var caps = await cvDetecterCapacites({
      navigator: window.navigator, WebAssembly: window.WebAssembly,
      screen: window.screen, innerWidth: window.innerWidth
    });
    var nomsCaps = {};
    (paliersData.capacites || []).forEach(function (c) { nomsCaps[c.id] = c.nom; });
    function nomCap(id) { return nomsCaps[id] || id; }
    zone.appendChild(el('p', null, 'Ce que ton appareil expose, mesuré ici même, dans ton navigateur — rien de tout cela n’est envoyé ni gardé :'));
    var ulCaps = el('ul');
    [['webgpu', caps.webgpu ? 'oui' : 'non'],
     ['webassembly', caps.webassembly ? 'oui' : 'non'],
     ['memoire', (caps.memoire != null) ? ('environ ' + caps.memoire + ' Go annoncés') : 'non exposée par ton navigateur'],
     ['concurrence', (caps.concurrence != null) ? String(caps.concurrence) : 'non exposés par ton navigateur'],
     ['ecran', (caps.ecran != null) ? (caps.ecran + ' px de large') : 'inconnue']
    ].forEach(function (ligne) {
      var li = el('li');
      li.appendChild(el('b', null, nomCap(ligne[0]) + ' : '));
      li.appendChild(document.createTextNode(ligne[1]));
      ulCaps.appendChild(li);
    });
    zone.appendChild(ulCaps);
    var actuel = cvPalierActuel(paliersData.paliers, caps);
    var pActuel = paliersData.paliers.find(function (p) { return p.id === actuel; });
    if (pActuel) {
      var pT = el('p');
      pT.appendChild(el('b', null, 'Ton appareil porte le palier ' + pActuel.id + ' — ' + pActuel.nom + '.'));
      zone.appendChild(pT);
    }
    var ul = el('ul');
    paliersData.paliers.forEach(function (p) {
      var li = el('li');
      li.appendChild(el('b', null, 'Palier ' + p.id + ' — ' + p.nom + '. '));
      li.appendChild(document.createTextNode(p.debloque + ' '));
      var porte = cvPalierPorte(p, caps);
      var statut;
      if (!porte) {
        var manquantes = cvExigencesManquantes(p, caps).map(function (r) { return nomCap(r.id); });
        statut = 'Ton appareil ne porte pas ce palier — il lui manque : ' + manquantes.join(', ') + '.';
      } else if (p.etat === 'livre' && p.id === 'P1') {
        statut = CV_SEMANTIQUE.actif
          ? 'Actif — tu l’as activé : la recherche par le sens est branchée, ci-dessous.'
          : 'Livré dans ce paquet et porté par ton appareil — il s’active ci-dessous, à ta demande seulement : le téléchargement du modèle est opt-in, rien ne part sans ton geste.';
      } else if (p.etat === 'livre') {
        statut = (p.id === actuel) ? 'C’est le tien : actif, ici et maintenant.' : 'Actif sur ton appareil.';
      } else if (p.etat === 'pret') {
        statut = 'Ton appareil le porte — la couche est prête à brancher, pas encore branchée : rien n’est simulé.';
      } else {
        statut = 'Ton appareil le porterait — mais ce palier n’est pas encore livré : aucun modèle n’est chargé, rien n’est promis en silence.';
      }
      li.appendChild(el('span', 'petite', statut));
      ul.appendChild(li);
    });
    zone.appendChild(ul);
    /* --- le palier P1 : l'activation opt-in, ici ---
       Le modèle ne se télécharge QUE sur ce geste : sa taille est dite
       avant, tout vient de ce site (aucun tiers, jamais Hugging Face ni
       un CDN au moment de la visite), tout se calcule dans le navigateur
       (WASM) et la question ne quitte pas l'appareil. */
    var p1 = paliersData.paliers.find(function (p) { return p.id === 'P1'; });
    if (p1 && p1.etat === 'livre' && cvPalierPorte(p1, caps)) {
      var zoneP1 = el('div');
      zoneP1.id = 'cv-p1-zone';
      zoneP1.appendChild(el('h3', null, 'Activer la recherche par le sens (palier P1)'));
      zoneP1.appendChild(el('p', null, 'Le modèle de plongement français du site (paraphrase-multilingual-MiniLM-L12-v2, quantifié — 384 dimensions) et son moteur local : environ 147 Mo à télécharger, depuis ce site seulement, seulement si tu appuies. Le compte exact s’affiche pendant le téléchargement. Ensuite, tes questions en texte libre sont aussi cherchées par le sens — calculées ici, dans ton navigateur : rien n’est envoyé, ni ta question ni tes mesures. Ton navigateur peut effacer ce téléchargement après environ sept jours sans visite (règle de Safari) : il faudra alors le retélécharger, et le site te le redira.'));
      var boutonP1 = el('button', null, CV_SEMANTIQUE.actif ? 'Recherche par le sens : active' : 'Télécharger et activer la recherche par le sens (~147 Mo, ce site seulement)');
      boutonP1.type = 'button';
      if (CV_SEMANTIQUE.actif) boutonP1.disabled = true;
      var statutP1 = el('p', 'petite', CV_SEMANTIQUE.actif ? 'Le palier P1 est actif pour cette visite : la cascade cherche aussi par le sens.' : 'Pas encore activé : la cascade reste aux mots-clés et au recouvrement, comme au palier P0.');
      statutP1.id = 'cv-p1-statut';
      boutonP1.addEventListener('click', async function () {
        boutonP1.disabled = true;
        statutP1.textContent = 'Chargement du module sémantique du site…';
        try {
          var moduleSem = await import('assets/js/cerveau-semantique.mjs');
          await moduleSem.cvActiverP1(function (msg) { statutP1.textContent = msg; });
          boutonP1.textContent = 'Recherche par le sens : active';
          statutP1.textContent = 'Le palier P1 est actif : pose ta question en texte libre, ci-dessus — elle sera aussi cherchée par le sens, dans ton navigateur.';
          afficherPaliers();
        } catch (e) {
          boutonP1.disabled = false;
          statutP1.textContent = 'L’activation n’a pas pu se faire ici (' + e.message + '). Rien n’est simulé : la cascade continue aux mots-clés et au recouvrement, et tu peux réessayer.';
        }
      });
      zoneP1.appendChild(boutonP1);
      zoneP1.appendChild(statutP1);
      zone.appendChild(zoneP1);
    }
    zone.appendChild(el('p', 'petite', 'Cette échelle vit dans les données du site (assets/paliers.json) : un palier futur s’y ajoutera comme une entrée de plus, sans rebâtir le site — les téléphones d’aujourd’hui seront les vieux téléphones de demain, et chacun gardera la place que ses capacités lui donnent.'));
  }

  /* --- le fil de conversation --- */
  function bulleSite(texte) {
    var d = el('div', 'cv-bulle cv-site');
    d.appendChild(el('p', 'cv-qui', 'Le site web SoPHIa'));
    d.appendChild(el('p', null, texte));
    $('cv-fil').appendChild(d);
    return d;
  }
  function bulleVisiteur(texte) {
    var d = el('div', 'cv-bulle cv-visiteur');
    d.appendChild(el('p', 'cv-qui', 'Toi'));
    d.appendChild(el('p', null, texte));
    $('cv-fil').appendChild(d);
    return d;
  }
  function zoneChoix() {
    var z = $('cv-choix');
    z.innerHTML = '';
    return z;
  }
  function boutonChoix(libelle, action) {
    var b = el('button', 'cv-choix-btn', libelle);
    b.type = 'button';
    b.addEventListener('click', function () { action(); });
    return b;
  }
  function choixNavigation(z) {
    z.appendChild(boutonChoix('↩ Revenir aux thèmes', function () { afficherNoeud(arbre.racine); }));
    z.appendChild(boutonChoix('✎ Poser ma question en texte libre', function () {
      var i = $('cv-libre-input'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); }
    }));
  }

  async function afficherNoeud(id) {
    var n = parId[id];
    if (!n) return;
    bulleSite(n.question + (n.intro ? ' ' + n.intro : ''));
    var z = zoneChoix();
    n.choix.forEach(function (c) {
      z.appendChild(boutonChoix(c.libelle, async function () {
        bulleVisiteur(c.libelle);
        await ajouter('question', c.libelle);
        var cible = parId[c.vers];
        if (cible && cible.reponse !== undefined) { afficherFeuille(cible); }
        else if (cible && cible.id === 'fin-courriel') { afficherFeuille(cible); }
        else { afficherNoeud(c.vers); }
      }));
    });
    if (id !== arbre.racine) choixNavigation(z);
  }

  async function afficherFeuille(f) {
    var d = bulleSite(f.reponse);
    /* l'endroit qui porte la réponse */
    var p = el('p', 'petite');
    p.appendChild(document.createTextNode('Cette réponse vit à l’endroit « ' + f.endroit.nom + ' » : '));
    var a = el('a', null, f.endroit.page + '#' + f.endroit.ancre);
    a.href = f.endroit.page + '#' + f.endroit.ancre;
    p.appendChild(a);
    d.appendChild(p);
    if (f.renvoi) {
      var p2 = el('p', 'petite');
      p2.appendChild(document.createTextNode('Renvoi du site : '));
      var a2 = el('a', null, f.renvoi.libelle);
      a2.href = f.renvoi.page + '#' + f.renvoi.ancre;
      p2.appendChild(a2);
      d.appendChild(p2);
    }
    /* le chemin de preuve de Merkle, recalculé ici */
    var preuve = el('div', 'cv-preuve');
    preuve.appendChild(el('p', 'petite', 'Preuve — recalculée dans ton navigateur, à l’instant :'));
    d.appendChild(preuve);
    try {
      var digest = await cvDigestFeuille(f);
      var idx = arbreMerkle.feuilles.findIndex(function (x) { return x.id === f.id; });
      var chemin = cvCheminMerkle(arbreMerkle.niveaux, idx);
      var okM = await cvVerifierChemin(digest, chemin, arbreMerkle.racine);
      var lignes = chemin.map(function (pas, i) {
        return '  pas ' + (i + 1) + ' : ' + (pas.cote === 'g' ? 'frère à gauche ' : 'frère à droite ') + pas.digest.slice(0, 16) + '…';
      }).join('\n');
      preuve.appendChild(el('pre', 'mono petite',
        'feuille « ' + f.id + ' » : ' + digest.slice(0, 16) + '…\n' + lignes +
        '\nracine de l’arbre de la conversation : ' + arbreMerkle.racine.slice(0, 16) + '…\nchemin de Merkle : ' + (okM ? 'MATCH' : 'ÉCART')));
    } catch (e) {
      preuve.appendChild(el('p', 'petite', 'Le chemin de Merkle n’a pas pu être recalculé ici (' + e.message + ').'));
    }
    /* la revérification de l'endroit contre le manifeste, sur demande */
    var bouton = el('button', 'secondaire', 'Recalculer l’endroit contre le manifeste');
    bouton.type = 'button';
    var sortie = el('p', 'petite');
    bouton.addEventListener('click', async function () {
      bouton.disabled = true;
      sortie.textContent = 'Recalcul en cours — la page de l’endroit et le manifeste du site…';
      try {
        if (!manifeste) manifeste = await (await fetch('assets/manifeste.json')).json();
        var pageEntree = manifeste.pages.find(function (x) { return x.fichier === f.endroit.page; });
        var endroitEntree = pageEntree.endroits.find(function (x) { return x.id === f.endroit.ancre; });
        var textePage = await (await fetch(f.endroit.page)).text();
        var seg = cvTrouverSection(textePage, f.endroit.ancre);
        if (!seg) { sortie.textContent = 'ÉCART — l’endroit est introuvable dans la page servie.'; return; }
        var calc = await cvSha256Hex(cvNeutralise(seg, [manifeste.sceau, manifeste.sceau_canonique_noyau, manifeste.sceau_chaine_version]));
        sortie.textContent = (calc === endroitEntree.empreinte)
          ? 'Endroit recalculé : MATCH — l’empreinte de l’endroit au manifeste (' + endroitEntree.empreinte.slice(0, 16) + '…) se recalcule à l’octet près depuis la page servie.'
          : 'Endroit recalculé : ÉCART — ' + calc.slice(0, 16) + '… ≠ ' + endroitEntree.empreinte.slice(0, 16) + '… au manifeste.';
      } catch (e) {
        sortie.textContent = 'Le recalcul n’a pas pu être fait ici (' + e.message + ') — le kit autonome du site fait le même calcul hors navigateur.';
      }
    });
    preuve.appendChild(bouton);
    preuve.appendChild(sortie);
    await ajouter('reponse', f.id + ' — ' + f.question);
    var z = zoneChoix();
    /* les suites d'un parcours guidé : l'étape suivante, en choix —
       la branche « exercer mes droits » se marche ainsi de A à Z */
    if (Array.isArray(f.suites)) {
      f.suites.forEach(function (s) {
        z.appendChild(boutonChoix(s.libelle, async function () {
          bulleVisiteur(s.libelle);
          await ajouter('question', s.libelle);
          var cible = parId[s.vers];
          if (cible && cible.reponse !== undefined) { afficherFeuille(cible); }
          else if (cible && cible.id === 'fin-courriel') { afficherFeuille(cible); }
          else { afficherNoeud(s.vers); }
        }));
      });
    }
    choixNavigation(z);
  }

  async function afficherCourriel(raison) {
    var f = parId['fin-courriel'];
    var d = bulleSite((raison ? raison + ' ' : '') + f.reponse);
    var p = el('p');
    var a = el('a', null, f.adresse);
    a.href = 'mailto:' + f.adresse;
    p.appendChild(a);
    d.appendChild(p);
    var p2 = el('p', 'petite', 'Le relais courriel du site, à son endroit : ');
    var a2 = el('a', null, f.endroit.nom);
    a2.href = f.endroit.page + '#' + f.endroit.ancre;
    p2.appendChild(a2);
    d.appendChild(p2);
    await ajouter('courriel', 'porte du courriel montrée');
    var z = zoneChoix();
    choixNavigation(z);
  }

  /* --- le noyau du site : « SoPHIa, mémoire cumulative chaînée » ---
     Son index vit en éclats par chambre (assets/noyau/) : le manifeste
     du noyau d'abord (petit), puis chaque éclat, depuis ce site
     seulement, au premier besoin (ou par le bouton de sa section).
     Reconstruit en mémoire : passages + index inversé. Rien n'est
     envoyé ; l'index ne quitte pas l'appareil, il y arrive. */
  var noyauCharge = null;
  function chargerNoyau() {
    if (CV_NOYAU.actif) return Promise.resolve(true);
    if (noyauCharge) return noyauCharge;
    var etatEl = $('cv-noyau-etat');
    noyauCharge = (async function () {
      try {
        if (etatEl) etatEl.textContent = 'Chargement du noyau du site — son manifeste, puis son index par chambres, depuis ce site seulement…';
        var man = await (await fetch('assets/noyau/noyau-manifeste.json')).json();
        var passages = [], inverse = {};
        for (var i = 0; i < man.chambres.length; i++) {
          var eclat = await (await fetch('assets/noyau/' + man.chambres[i].fichier)).json();
          eclat.passages.forEach(function (p) { passages[p.id] = p; });
          Object.keys(eclat.inverse).forEach(function (mot) {
            inverse[mot] = (inverse[mot] || []).concat(eclat.inverse[mot]);
          });
          if (etatEl) etatEl.textContent = 'Chargement du noyau du site — ' + (i + 1) + ' chambre(s) sur ' + man.chambres.length + '…';
        }
        CV_NOYAU.brancher({ format: man.format, racine_merkle_passages: man.racine_merkle_passages,
                            nombre_passages: man.nombre_passages, passages: passages, inverse: inverse });
        if (etatEl) etatEl.textContent = 'Le noyau du site est chargé : ' + man.nombre_passages + ' passages, ' +
          man.nombre_mots_indexes + ' mots indexés. Racine de Merkle des passages : ' + man.racine_merkle_passages.slice(0, 16) + '… ' +
          'Pose ta question en texte libre, ci-dessus : le noyau répond depuis ce que le site tient.';
        return true;
      } catch (e) {
        noyauCharge = null;
        if (etatEl) etatEl.textContent = 'Le noyau n’a pas pu être chargé ici (' + e.message + '). La cascade continue sans lui : questions préparées, mots-clés, recouvrement — rien n’est simulé.';
        return false;
      }
    })();
    return noyauCharge;
  }

  async function afficherReponseNoyau(rep, texte) {
    var d = bulleSite('Le noyau du site répond — à partir de ce que le site tient, seulement : ta phrase d’abord, si elle y est ; tes mots ensuite, séparément. Chaque réponse est une citation, avec sa pièce et son chemin de preuve.');
    function blocPassage(p) {
      var bloc = el('div');
      var h = el('p');
      var aT = el('a', null, p.titre + ' — ' + p.page + '#' + p.ancre);
      aT.href = p.page + '#' + p.ancre;
      h.appendChild(aT);
      bloc.appendChild(h);
      (p.occurrences || []).forEach(function (o) {
        bloc.appendChild(el('blockquote', null, (o.extrait.avant || '') + o.extrait.texte + (o.extrait.apres || '')));
        var po = el('p', 'petite');
        var aO = el('a', null, 'Aller à cette occurrence, dans la pièce');
        aO.href = p.page + '#' + p.ancre + (o.fragment ? ':~:text=' + encodeURIComponent(o.fragment) : '');
        po.appendChild(aO);
        bloc.appendChild(po);
      });
      var meta = el('p', 'petite', 'Pièce : ' + p.page + '#' + p.ancre + ' (' + p.panneau + ') · feuille nº ' + p.merkle.feuille +
        ' de l’arbre des passages du noyau · empreinte ' + p.empreinte.slice(0, 16) + '…');
      bloc.appendChild(meta);
      var bouton = el('button', 'secondaire', 'Revérifier le chemin de cette pièce, ici');
      bouton.type = 'button';
      var sortie = el('span', 'petite');
      bouton.addEventListener('click', async function () {
        bouton.disabled = true;
        var cur = p.empreinte;
        for (var i = 0; i < p.merkle.chemin.length; i++) {
          var pas = p.merkle.chemin[i];
          cur = await cvSha256Hex(pas.cote === 'droite' ? cur + pas.digest : pas.digest + cur);
        }
        sortie.textContent = (cur === rep.racine)
          ? ' Chemin revérifié : MATCH — la pièce remonte à la racine du noyau (' + rep.racine.slice(0, 16) + '…).'
          : ' ÉCART — le chemin ne remonte pas à la racine du noyau.';
      });
      bloc.appendChild(bouton); bloc.appendChild(sortie);
      return bloc;
    }
    var phrase = rep.passages.filter(function (p) { return p.groupe === 'phrase'; });
    var motsSep = rep.passages.filter(function (p) { return p.groupe !== 'phrase'; });
    if (phrase.length) {
      d.appendChild(el('p', null, 'Ta phrase, telle quelle, dans les mots du site :'));
      phrase.forEach(function (p) { d.appendChild(blocPassage(p)); });
    }
    if (motsSep.length) {
      d.appendChild(el('p', null, 'Tes mots, séparément — ces passages portent tes mots sans porter ta phrase :'));
      motsSep.forEach(function (p) { d.appendChild(blocPassage(p)); });
    }
    /* L'accompagnement poussé (Alex, 24 novembre 2026, 08 h 02) :
       répondre ET mener à l'action. Le bouton nomme le geste et mène à
       l'étape exacte du parcours — « pour ça, c'est cet endroit-là ».
       Sans action du site qui corresponde, la porte du courriel est la
       seule action offerte. */
    if (rep.action) {
      var pa = el('p');
      pa.appendChild(document.createTextNode('Pour ça, c’est cet endroit-là : '));
      var aA = el('a', 'cv-action', '➜ ' + rep.action.libelle);
      aA.href = rep.action.page + '#' + rep.action.ancre + (rep.action.fragment ? ':~:text=' + encodeURIComponent(rep.action.fragment) : '');
      pa.appendChild(aA);
      d.appendChild(pa);
    } else {
      var pc = el('p');
      pc.appendChild(document.createTextNode('Pour agir là-dessus, le site n’a pas d’étape de parcours à te montrer — sa porte, c’est le courriel : '));
      var fCourriel = parId['fin-courriel'];
      var aC = el('a', 'cv-action', '➜ Écrire à SoPHIa — le relais courriel du site');
      aC.href = 'mailto:' + (fCourriel ? fCourriel.adresse : 'agent.ia.sophia@gmail.com');
      pc.appendChild(aC);
      d.appendChild(pc);
    }
    var refs = [];
    rep.passages.forEach(function (p) { var r = p.page + '#' + p.ancre; if (refs.indexOf(r) === -1) refs.push(r); });
    await ajouter('noyau', 'question au noyau — ' + texte.slice(0, 160) + ' → ' + refs.join(', ') +
      (rep.action ? ' · action : ' + rep.action.libelle + ' (' + rep.action.page + '#' + rep.action.ancre + ')' : ''));
    var z = zoneChoix();
    choixNavigation(z);
  }

  /* --- la question libre et sa cascade --- */
  async function traiterQuestionLibre(texte) {
    bulleVisiteur(texte);
    await ajouter('libre', texte.slice(0, 500));
    var feuillesToutes = arbre.feuilles.concat([arbre.courriel]);
    var endroits = null;
    try {
      if (!indexEndroits) indexEndroits = await (await fetch('assets/recherche-index.json')).json();
      endroits = indexEndroits;
    } catch (e) { endroits = null; }
    await chargerNoyau();
    var res = await cvCascade(texte, feuillesToutes, endroits);
    if (res.etape === 'noyau' && res.noyau) {
      await afficherReponseNoyau(res.noyau, texte);
    } else if ((res.etape === 'mots-cles' || res.etape === 'semantique' || res.etape === 'recouvrement') && res.feuilles.length) {
      if (res.etape === 'recouvrement') bulleSite('Ta question n’est pas dans les questions préparées mot pour mot — voici les questions préparées les plus proches, par recouvrement de mots :');
      else if (res.etape === 'semantique') bulleSite('Ta question rejoint, par le sens, une question préparée du site — le palier P1 l’a retrouvée sans les mots exacts :');
      else if (res.etape === 'mots-cles') bulleSite('Ta question rejoint une question préparée du site :');
      if (res.feuilles.length === 1) {
        var f = parId[res.feuilles[0]];
        if (f.id === 'fin-courriel') { afficherCourriel(); } else { afficherFeuille(f); }
      } else {
        var z = zoneChoix();
        res.feuilles.forEach(function (id) {
          var ff = parId[id];
          z.appendChild(boutonChoix(ff.question, async function () {
            bulleVisiteur(ff.question);
            await ajouter('question', ff.question);
            if (ff.id === 'fin-courriel') { afficherCourriel(); } else { afficherFeuille(ff); }
          }));
        });
        choixNavigation(z);
      }
    } else if (res.etape === 'endroits' || (res.etape === 'semantique' && res.endroits.length)) {
      var d = bulleSite(res.etape === 'semantique'
        ? 'Par le sens (palier P1), le site trouve ces endroits — la réponse y vit, dans les mots du site :'
        : 'Aucune question préparée ne tient ta question mot pour mot, mais l’index plein texte du site trouve ces endroits — la réponse y vit, dans les mots du site :');
      var ul = el('ul');
      res.endroits.forEach(function (e) {
        var li = el('li');
        var a = el('a', null, (e.titre || e.ancre) + ' — ' + e.page + '#' + e.ancre);
        a.href = e.page + '#' + e.ancre;
        li.appendChild(a);
        ul.appendChild(li);
      });
      d.appendChild(ul);
      var z2 = zoneChoix();
      choixNavigation(z2);
    } else {
      afficherCourriel('Aucune question préparée ni aucun endroit du site ne tient ta question.');
    }
  }

  /* --- démarrage --- */
  async function demarrer() {
    try { paliersData = await (await fetch('assets/paliers.json')).json(); }
    catch (e) { paliersData = null; }
    afficherPaliers();
    try {
      arbre = await (await fetch('assets/labyrinthe.json')).json();
      arbreMerkle = await (await fetch('assets/arbre-cerveau.json')).json();
    } catch (e) {
      bulleSite('Le labyrinthe n’a pas pu être chargé (' + e.message + '). La porte du courriel reste : agent.ia.sophia@gmail.com.');
      return;
    }
    arbre.noeuds.forEach(function (n) { parId[n.id] = n; });
    arbre.feuilles.forEach(function (f) { parId[f.id] = f; });
    parId[arbre.courriel.id] = arbre.courriel;
    var racineEl2 = $('cv-racine-arbre');
    if (racineEl2) racineEl2.textContent = arbreMerkle.racine;
    var nbEl = $('cv-nombre-feuilles');
    if (nbEl) nbEl.textContent = String(arbreMerkle.nombre_feuilles);
    entrees = await chargerHistorique();
    if (migrationClair) { await sauverHistorique(); }
    var v = await cvVerifierChaine(entrees);
    await afficherParcours();
    if (entrees.length && v.ok && !retourAjoute) {
      retourAjoute = true;
      await ajouter('retour', 'retour — historique relu et revérifié depuis cet appareil (MATCH)');
    }
    afficherNoeud(arbre.racine);
    var form = $('cv-libre-form');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var i = $('cv-libre-input');
        var texte = (i.value || '').trim();
        if (!texte) return;
        i.value = '';
        traiterQuestionLibre(texte);
      });
    }
    var btnNoyau = $('cv-noyau-charger');
    if (btnNoyau) btnNoyau.addEventListener('click', async function () {
      btnNoyau.disabled = true;
      var okNoyau = await chargerNoyau();
      if (okNoyau) { btnNoyau.textContent = 'Le noyau du site est chargé'; }
      else { btnNoyau.disabled = false; }
    });
    var exp = $('cv-exporter');
    if (exp) exp.addEventListener('click', function () {
      var charge = { format: 'conversation-sophia/v1', exporte: maintenant(), entrees: entrees,
                     etat: entrees.length ? entrees[entrees.length - 1].etat : CV_GENESE };
      var blob = new Blob([JSON.stringify(charge, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'conversation-sophia.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    });
    var eff = $('cv-effacer');
    if (eff) eff.addEventListener('click', async function () {
      if (!window.confirm('Effacer l’historique de conversation gardé sur cet appareil ? Le site n’en garde aucune copie — l’effacement est définitif.')) return;
      entrees = [];
      try { localStorage.removeItem(CLE); } catch (e) { /* stockage indisponible */ }
      await supprimerCleAppareil();
      cleAppareil = null; memoireIllisible = false; sauvegardeSuspendue = false; memoireChiffree = false;
      await afficherParcours();
      bulleSite('Historique effacé de cet appareil. Rien n’en subsiste — le site n’en avait aucune copie.');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
