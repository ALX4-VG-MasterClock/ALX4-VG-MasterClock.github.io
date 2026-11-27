// repertoire.js — Le répertoire des outils et des lieux, côté navigateur.
//
// Usage prescrit par le répertoire lui-même (repertoire-outils.json,
// champ documentation.usage) : « À chaque question d'un visiteur, la
// chambre retrouve d'abord les passages (recherche hybride), puis
// présente l'outil ou le lieu exact à ouvrir. » Ce module fait la
// deuxième moitié : à partir de la question telle qu'écrite et des
// passages sources retrouvés, il retrouve —
//   1. la question de la banque la plus proche (recouvrement de jetons
//      ≥ seuil) et les outils qu'elle ouvre (questions[].outils_ouverts) ;
//   2. les outils portés par les passages sources eux-mêmes
//      (outils[].passages_porteurs — identifiants du noyau, inchangés
//      dans le bundle fusionné) ;
//   3. le lieu d'orientation dont une formulation de personne perdue
//      recoupe la question (orientation[].formulations → places exactes).
//
// Borne tenue : on ne présente que ce que le répertoire tient. Aucun
// recoupement suffisant → rien (la réponse reste les passages, et ce
// que le site ne tient pas, il le dit — la porte du courriel est dans
// la page). Les 6 questions de la banque sans outil (réponses-bornes
// ou connaissances) ne produisent donc aucun lien forcé.
//
// Aucune dépendance sauf les jetons de recherche.js (même normalisation
// française, même radicalisation — la question et les formulations sont
// comparées dans le même espace de mots).
import { jetons } from './recherche.js';

const SEUIL_RECOUVREMENT = 0.5;
const MAX_OUTILS = 3;

export function preparerRepertoire(data) {
  const outilsParId = new Map(data.outils.map((o) => [o.id, o]));
  const questions = (data.questions || []).map((q) => ({
    ref: q.ref,
    formulation: q.formulation || '',
    outils: q.outils_ouverts || [],
    jetons: new Set(jetons(q.formulation || '')),
  }));
  const lieux = (data.orientation || []).map((o) => ({
    lieu: o.lieu,
    places: o.places || [],
    formulations: (o.formulations || []).map((f) => new Set(jetons(f))),
  }));
  const parPassage = new Map();
  for (const o of data.outils) {
    for (const pid of o.passages_porteurs || []) {
      if (!parPassage.has(pid)) parPassage.set(pid, []);
      parPassage.get(pid).push(o.id);
    }
  }
  return { outilsParId, questions, lieux, parPassage };
}

// Recouvrement : |intersection| / min(|a|, |b|) — tolère une question
// plus longue ou plus courte que la formulation de la banque. Garde-fou
// mesuré au branchement : les seuls mots grammaticaux partagés (« est »,
// « la »…) ne suffisent pas — il faut au moins 2 jetons communs ET au
// moins un mot de contenu (≥ 4 lettres après radicalisation), sinon une
// question hors champ (la météo) ramassait un lieu par les mots vides.
function recouvrement(a, b) {
  if (!a.size || !b.size) return 0;
  let commun = 0;
  let contenu = false;
  for (const t of a) {
    if (b.has(t)) {
      commun++;
      if (t.length >= 4) contenu = true;
    }
  }
  if (commun < 2 || !contenu) return 0;
  return commun / Math.min(a.size, b.size);
}

function decrireOutil(o) {
  return {
    id: o.id,
    nom: o.nom,
    description: o.description || '',
    url: o.lien ? o.lien.url : null,
    statut: o.lien ? o.lien.statut : null,
  };
}

// question : la question telle qu'écrite par le visiteur.
// idsSources : les identifiants des passages sources retrouvés (noyau).
export function trouverOutils(rep, question, idsSources = []) {
  const qj = new Set(jetons(String(question)));

  // 1. La question de la banque la plus proche.
  let questionBanque = null;
  for (const q of rep.questions) {
    const s = recouvrement(qj, q.jetons);
    if (s >= SEUIL_RECOUVREMENT && (!questionBanque || s > questionBanque.score)) {
      questionBanque = { ref: q.ref, score: s, outils: q.outils };
    }
  }
  const ids = [];
  if (questionBanque) for (const id of questionBanque.outils) if (!ids.includes(id)) ids.push(id);

  // 2. Les outils portés par les passages sources retrouvés.
  for (const pid of idsSources) {
    for (const id of rep.parPassage.get(pid) || []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  // 3. Le lieu d'orientation le plus proche (formulations de personne perdue).
  let lieu = null;
  for (const l of rep.lieux) {
    for (const f of l.formulations) {
      const s = recouvrement(qj, f);
      if (s >= SEUIL_RECOUVREMENT && (!lieu || s > lieu.score)) {
        lieu = { lieu: l.lieu, places: l.places, score: s };
      }
    }
  }

  return {
    questionBanque: questionBanque
      ? { ref: questionBanque.ref, score: Math.round(questionBanque.score * 100) / 100 }
      : null,
    outils: ids.slice(0, MAX_OUTILS).map((id) => rep.outilsParId.get(id)).filter(Boolean).map(decrireOutil),
    lieu: lieu ? { lieu: lieu.lieu, places: lieu.places } : null,
  };
}
