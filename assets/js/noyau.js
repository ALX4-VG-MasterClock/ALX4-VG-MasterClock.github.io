/* ===== Noyau du site SoPHIa — « SoPHIa, mémoire cumulative chaînée » =====
   Le moteur de réponse du noyau, intégré au paquet de la version suivante
   (24 novembre 2026, GO d'Alex 07 h 56 ; nom du noyau donné par Alex le
   24 novembre 2026 : « SoPHIa, mémoire cumulative chaînée » — et sécurisée ;
   forme exacte à confirmer par lui).

   Mécanique (Alex) : quelqu'un écrit au site, par mots ou par phrases ; le
   site répond avec ce qui est DÉJÀ sur le site — les passages tenus par son
   index, montrés avec leur contexte, leur pièce source et leur chemin de
   Merkle. Ce que l'index ne tient pas, le noyau le dit et montre la porte
   (le relais courriel). Jamais une réponse inventée.

   Raffinements de l'intégration (propositions 1 à 8 de la NOTE-CONCEPTION
   du prototype v0, appliquées ici) :
   - un résultat par OCCURRENCE, avec son contexte propre : chaque
     occurrence de la phrase exacte, puis chaque occurrence des mots,
     séparément, a son extrait et son lien ;
   - la phrase exacte d'abord, les mots séparés ensuite, ÉTIQUETÉS comme
     tels (champ groupe : 'phrase' | 'mots') ;
   - le clic mène à l'occurrence elle-même : chaque occurrence porte un
     fragment de texte (#:~:text=…) construit depuis le texte réel du
     passage, pour atterrir sur l'occurrence dans la pièce ;
   - l'ACCOMPAGNEMENT poussé (Alex, 24 novembre 2026, 08 h 02) : la
     réponse porte une ACTION — quand un passage tenu est lié à un
     parcours ou à une démarche du site (droits, demandes de données,
     recours devant la Commission…), l'action nomme le geste (« Préparer
     ma demande », « Faire un recours devant la Commission ») et mène à
     l'étape exacte du parcours (page + ancre, l'endroit précis). Quand
     aucune action du site ne correspond, action = null : la porte du
     courriel reste la seule action offerte (rendue par l'appelant).

   Ce fichier est pur : aucune fonction ne touche au réseau ni au DOM.
   Tout s'exécute dans l'appareil du visiteur, sur des fichiers statiques.
   Aucune base de données, aucun serveur, rien ne part. */

'use strict';

/* Mots-outils français : présents dans l'index (la concordance les voit),
   mais ils ne pondèrent pas la recherche par question. Même liste que
   construit-index.py. */
var NOYAU_MOTS_OUTILS = {};
("le la les de des du un une et est en au aux je tu il elle nous vous ils elles " +
 "ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs " +
 "qui que quoi dont ou où quand comment pourquoi dans sur sous chez vers entre " +
 "par pour avec sans plus pas ne se si comme aussi mais donc car ni y a à " +
 "être avoir fait faire tout tous toute toutes même autres autre ont été étant suis es sommes êtes sont " +
 "ai as avons avez on cela ça ceci celui celle ceux celles " +
 "très trop peu beaucoup alors ainsi ensuite enfin depuis pendant avant après contre malgré selon " +
 "est-ce qu'est-ce qu'un qu'une qu'il qu'elle qu'ils qu'on d'un d'une l'un l'une"
).split(/\s+/).forEach(function (m) { NOYAU_MOTS_OUTILS[noyauNormaliser(m)] = true; });

function noyauNormaliser(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* Normalise en gardant la correspondance caractère par caractère vers le
   texte d'origine, pour extraire les contextes dans le texte réel. */
function noyauNormaliserAvecCarte(texte) {
  var norm = '', carte = [];
  var orig = String(texte || '');
  for (var i = 0; i < orig.length; i++) {
    var n = orig[i].toLowerCase().normalize('NFD');
    for (var j = 0; j < n.length; j++) {
      var code = n.charCodeAt(j);
      if (code >= 0x300 && code <= 0x36f) continue; /* marques diacritiques */
      norm += n[j]; carte.push(i);
    }
  }
  carte.push(orig.length);
  return { norm: norm, carte: carte };
}

var NOYAU_RE_JETON = /[a-z0-9]+(?:[-'][a-z0-9]+)*/g;

/* Jetons d'un texte normalisé : [{mot, debut, fin}] (positions caractères
   dans le texte normalisé donné). */
function noyauJetons(texteNorm) {
  var res = [], m;
  NOYAU_RE_JETON.lastIndex = 0;
  while ((m = NOYAU_RE_JETON.exec(texteNorm)) !== null) {
    res.push({ mot: m[0], debut: m.index, fin: m.index + m[0].length });
  }
  return res;
}

function noyauMotsSignificatifs(question) {
  var toks = noyauJetons(noyauNormaliser(question));
  var vus = {}, mots = [];
  toks.forEach(function (t) {
    if (NOYAU_MOTS_OUTILS[t.mot]) return;
    if (t.mot.length < 2 && !/^[0-9]+$/.test(t.mot)) return;
    if (!vus[t.mot]) { vus[t.mot] = true; mots.push(t.mot); }
  });
  return mots;
}

/* La suite de jetons de la question apparaît-elle telle quelle dans le
   flux de jetons du passage ? Retourne la première position, ou -1. */
function noyauPhrasePosition(motsPassage, motsQuestion) {
  if (!motsQuestion.length || motsQuestion.length > motsPassage.length) return -1;
  for (var i = 0; i + motsQuestion.length <= motsPassage.length; i++) {
    var ok = true;
    for (var j = 0; j < motsQuestion.length; j++) {
      if (motsPassage[i + j] !== motsQuestion[j]) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

/* TOUTES les positions de la suite de jetons dans le passage — la
   concordance par occurrence : « Fibonacci 23 » n'existe qu'une fois,
   et le noyau doit pouvoir le montrer, occurrence par occurrence. */
function noyauPhrasePositions(motsPassage, motsQuestion) {
  var res = [];
  if (!motsQuestion.length || motsQuestion.length > motsPassage.length) return res;
  for (var i = 0; i + motsQuestion.length <= motsPassage.length; i++) {
    var ok = true;
    for (var j = 0; j < motsQuestion.length; j++) {
      if (motsPassage[i + j] !== motsQuestion[j]) { ok = false; break; }
    }
    if (ok) res.push(i);
  }
  return res;
}

/* Fenêtre minimale (en jetons) couvrant une occurrence de chaque mot
   présent ; Infinity si un mot manque. */
function noyauFenetreMin(positionsParMot) {
  var listes = positionsParMot.filter(function (l) { return l.length; });
  if (!listes.length) return Infinity;
  var meilleur = Infinity;
  listes[0].forEach(function (p0) {
    var min = p0, max = p0;
    listes.slice(1).forEach(function (l) {
      var proche = l[0];
      l.forEach(function (p) { if (Math.abs(p - p0) < Math.abs(proche - p0)) proche = p; });
      if (proche < min) min = proche;
      if (proche > max) max = proche;
    });
    if (max - min < meilleur) meilleur = max - min;
  });
  return meilleur;
}

var NOYAU_SEUIL_COUVERTURE = 0.5;  /* au moins la moitié des mots significatifs */
var NOYAU_SEUIL_SCORE = 3;         /* en deçà : le site ne tient pas la réponse */
var NOYAU_MAX_PASSAGES = 7;
var NOYAU_MAX_EXTRAITS = 3;
var NOYAU_MAX_OCCURRENCES = 6;     /* par passage, toutes occurrences confondues */
var NOYAU_CONTEXTE_CAR = 90;       /* caractères de contexte de chaque côté */

/* Recherche du noyau. index = l'objet d'index (construit au chantier,
   livré en éclats par chambre dans assets/noyau/, reconstruit en mémoire
   par l'appelant). Retourne {statut: 'trouve'|'vide', mots, resultats}.
   Un résultat : {passage, score, couverture, positionsParMot, phrasePos}. */
function noyauRechercher(index, question) {
  var mots = noyauMotsSignificatifs(question);
  if (!mots.length) return { statut: 'vide', mots: mots, resultats: [], raison: 'aucun-mot-significatif' };
  var seqQuestion = noyauJetons(noyauNormaliser(question)).map(function (t) { return t.mot; });
  var candidats = {};
  mots.forEach(function (mot) {
    (index.inverse[mot] || []).forEach(function (entree) {
      var pid = entree[0];
      if (!candidats[pid]) candidats[pid] = {};
      candidats[pid][mot] = entree[1];
    });
  });
  var resultats = [];
  Object.keys(candidats).forEach(function (pidStr) {
    var pid = Number(pidStr), parMot = candidats[pidStr];
    var presents = mots.filter(function (m) { return parMot[m]; });
    var couverture = presents.length / mots.length;
    if (couverture < NOYAU_SEUIL_COUVERTURE) return;
    var passage = index.passages[pid];
    var score = 0;
    presents.forEach(function (m) { score += 1 + Math.log(parMot[m].length); });
    /* Phrase exacte (la question entière, jetons bruts) : le bonus maître. */
    var phrasePos = noyauPhrasePosition(passage.mots, seqQuestion);
    if (phrasePos > -1) score += 25;
    /* Proximité : les mots présents tiennent dans une petite fenêtre. */
    var fen = noyauFenetreMin(presents.map(function (m) { return parMot[m]; }));
    if (isFinite(fen)) score += Math.max(0, 12 - fen) * 0.6;
    /* Le titre nomme le sujet : bonus. */
    var titreNorm = noyauNormaliser(passage.titre);
    presents.forEach(function (m) { if (titreNorm.indexOf(m) > -1) score += 2; });
    if (score < NOYAU_SEUIL_SCORE) return;
    resultats.push({
      passage: passage, score: Math.round(score * 100) / 100,
      couverture: couverture, positionsParMot: parMot, phrasePos: phrasePos
    });
  });
  resultats.sort(function (a, b) { return b.score - a.score; });
  resultats = resultats.slice(0, NOYAU_MAX_PASSAGES);
  if (!resultats.length) return { statut: 'vide', mots: mots, resultats: [], raison: 'rien-au-dessus-des-seuils' };
  return { statut: 'trouve', mots: mots, resultats: resultats };
}

/* Extrait de contexte autour d'UNE occurrence (span de jetons
   [debutJeton, finJeton) dans le flux du passage), dans le texte
   d'origine, + le fragment de texte exact de l'occurrence — celui que
   le lien #::~:text= utilise pour atterrir SUR l'occurrence. */
function noyauExtraitOccurrence(passage, jetons, nc, debutJeton, finJeton) {
  var jtD = jetons[debutJeton], jtF = jetons[finJeton - 1];
  if (!jtD || !jtF) return null;
  var debutCar = nc.carte[Math.max(0, jtD.debut - NOYAU_CONTEXTE_CAR)];
  var finCar = nc.carte[Math.min(nc.norm.length, jtF.fin + NOYAU_CONTEXTE_CAR)];
  var texte = passage.texte.slice(debutCar, finCar).replace(/\s+/g, ' ').trim();
  /* Fragment : le texte exact de l'occurrence, en jetons entiers ; si la
     phrase est longue, on garde ses premiers jetons (≥ ~48 caractères) —
     un fragment de début suffit au navigateur pour situer l'occurrence. */
  var fragFin = jtF.fin;
  if (nc.carte[fragFin] - nc.carte[jtD.debut] > 120) {
    var acc = jtD.fin;
    for (var k = debutJeton + 1; k < finJeton; k++) {
      acc = jetons[k].fin;
      if (nc.carte[acc] - nc.carte[jtD.debut] >= 48) break;
    }
    fragFin = acc;
  }
  var fragment = passage.texte.slice(nc.carte[jtD.debut], nc.carte[fragFin]).replace(/\s+/g, ' ').trim();
  return {
    extrait: { avant: (debutCar > 0 ? '…' : ''), texte: texte, apres: (finCar < passage.texte.length ? '…' : '') },
    fragment: fragment
  };
}

/* Les occurrences d'un résultat, étiquetées : la phrase exacte (toutes
   ses occurrences) pour les passages qui la portent ; sinon les mots,
   séparément (première occurrence de chaque mot présent). */
function noyauOccurrences(passage, resultat, question) {
  var nc = noyauNormaliserAvecCarte(passage.texte);
  var jetons = noyauJetons(nc.norm);
  var seqQuestion = noyauJetons(noyauNormaliser(question)).map(function (t) { return t.mot; });
  var occurrences = [];
  if (resultat.phrasePos > -1) {
    var positions = noyauPhrasePositions(passage.mots, seqQuestion);
    positions.slice(0, NOYAU_MAX_OCCURRENCES).forEach(function (p) {
      var o = noyauExtraitOccurrence(passage, jetons, nc, p, p + seqQuestion.length);
      if (o) occurrences.push({ type: 'phrase', position: p, extrait: o.extrait, fragment: o.fragment });
    });
    return { groupe: 'phrase', occurrences: occurrences };
  }
  var mots = noyauMotsSignificatifs(question);
  var parPos = [];
  mots.forEach(function (mot) {
    var poss = resultat.positionsParMot[mot];
    if (poss && poss.length) parPos.push({ mot: mot, position: poss[0] });
  });
  parPos.sort(function (a, b) { return a.position - b.position; });
  parPos.slice(0, NOYAU_MAX_OCCURRENCES).forEach(function (mp) {
    var o = noyauExtraitOccurrence(passage, jetons, nc, mp.position, mp.position + 1);
    if (o) occurrences.push({ type: 'mot', mot: mp.mot, position: mp.position, extrait: o.extrait, fragment: o.fragment });
  });
  return { groupe: 'mots', occurrences: occurrences };
}

/* Extraits de contexte (forme v0, conservée) : autour des occurrences
   des mots de la question, la phrase exacte d'abord. */
function noyauExtraits(passage, resultat) {
  var nc = noyauNormaliserAvecCarte(passage.texte);
  var jetons = noyauJetons(nc.norm);
  var positions = [];
  if (resultat.phrasePos > -1) positions.push(resultat.phrasePos);
  Object.keys(resultat.positionsParMot).forEach(function (mot) {
    resultat.positionsParMot[mot].slice(0, 2).forEach(function (p) {
      if (positions.indexOf(p) === -1) positions.push(p);
    });
  });
  positions.sort(function (a, b) { return a - b; });
  var ordre = positions.slice();
  if (resultat.phrasePos > -1) {
    ordre = [resultat.phrasePos].concat(ordre.filter(function (p) { return p !== resultat.phrasePos; }));
  }
  var extraits = [], plages = [];
  ordre.forEach(function (p) {
    if (extraits.length >= NOYAU_MAX_EXTRAITS) return;
    var jt = jetons[p];
    if (!jt) return;
    var chevauche = plages.some(function (pl) { return jt.debut < pl[1] && jt.fin > pl[0]; });
    if (chevauche) return;
    var debutCar = nc.carte[Math.max(0, jt.debut - NOYAU_CONTEXTE_CAR)];
    var finCar = nc.carte[Math.min(nc.norm.length - 1, jt.fin + NOYAU_CONTEXTE_CAR)] + 1;
    var texte = passage.texte.slice(debutCar, finCar).replace(/\s+/g, ' ').trim();
    extraits.push({
      avant: (debutCar > 0 ? '…' : ''),
      texte: texte,
      apres: (finCar < passage.texte.length ? '…' : '')
    });
    plages.push([jt.debut, jt.fin]);
  });
  return extraits;
}

/* L'action d'accompagnement de la réponse : le premier passage tenu (dans
   l'ordre du classement) qui porte des actions en propose une ; parmi
   les siennes, celle dont les mots recouvrent le plus la question
   l'emporte (à égalité, la première — l'ordre du parcours). Les actions
   vivent dans les données des passages (construites au chantier depuis
   le labyrinthe du site : les étapes des parcours et les endroits
   d'action), jamais inventées par le moteur. */
function noyauChoisirAction(resultats, mots) {
  for (var i = 0; i < resultats.length; i++) {
    var acts = resultats[i].passage.actions;
    if (!acts || !acts.length) continue;
    var meilleur = null, meilleurScore = -1;
    acts.forEach(function (a) {
      var s = 0;
      (a.mots || []).forEach(function (m) { if (mots.indexOf(m) > -1) s++; });
      if (s > meilleurScore) { meilleurScore = s; meilleur = a; }
    });
    if (meilleur) {
      return {
        libelle: meilleur.libelle, page: meilleur.page, ancre: meilleur.ancre,
        fragment: meilleur.fragment || null,
        depuis: { page: resultats[i].passage.page, ancre: resultats[i].passage.ancre }
      };
    }
  }
  return null;
}

/* La réponse du noyau : UNIQUEMENT des passages tenus, cités avec leur
   pièce et leur chemin, groupés et étiquetés (la phrase exacte, puis les
   mots séparément), chaque occurrence avec son contexte et son lien vers
   l'occurrence elle-même ; plus l'action d'accompagnement quand un
   passage tenu y mène. Aucune phrase n'est générée hors des citations ;
   l'en-tête et les sources sont des gabarits fixes, marqués comme tels.
   Quand l'index ne tient rien : statut 'vide' — le site le dit et
   l'appelant montre la porte (relais courriel). */
function noyauRepondre(index, question) {
  var r = noyauRechercher(index, question);
  if (r.statut === 'vide') {
    return {
      statut: 'vide', question: question, mots: r.mots, action: null,
      message: "Le site ne tient rien là-dessus : aucun passage de son index ne répond à cette question au-dessus des seuils honnêtes. Le site ne l'inventera pas."
    };
  }
  return {
    statut: 'trouve', question: question, mots: r.mots,
    racine: index.racine_merkle_passages,
    action: noyauChoisirAction(r.resultats, r.mots),
    passages: r.resultats.map(function (res) {
      var occ = noyauOccurrences(res.passage, res, question);
      return {
        titre: res.passage.titre,
        page: res.passage.page,
        ancre: res.passage.ancre,
        panneau: res.passage.panneau,
        score: res.score,
        couverture: res.couverture,
        phraseExacte: res.phrasePos > -1,
        groupe: occ.groupe,
        occurrences: occ.occurrences,
        extraits: noyauExtraits(res.passage, res),
        empreinte: res.passage.empreinte,
        merkle: {
          feuille: res.passage.merkle.feuille,
          chemin: res.passage.merkle.chemin,
          racine: index.racine_merkle_passages
        }
      };
    })
  };
}

/* Export Node (tests au chantier) — ignoré dans le navigateur. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normaliser: noyauNormaliser, motsSignificatifs: noyauMotsSignificatifs,
    rechercher: noyauRechercher, repondre: noyauRepondre,
    occurrences: noyauOccurrences, choisirAction: noyauChoisirAction,
    phrasePositions: noyauPhrasePositions
  };
}
