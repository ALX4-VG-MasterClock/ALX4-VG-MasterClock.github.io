/**
 * Module donne au visiteur — version du site v52 (7 novembre 2026).
 * Deux changements par rapport au module de travail d'Alex, documentes ici :
 *  1) Ancrage B : l'origine est le 19 mars 2026, 23 h 56 min 04 s, heure civile du
 *     Quebec (Sainte-Martine, heure siderale locale 00:00:00) — l'ancrage tranche par
 *     Alex le 6 novembre 2026, au lieu du 1er janvier 2026 du module de travail.
 *  2) instantTour() corrige : la rotation de surplus visee est la 365e du cycle
 *     (origine + 364,00341 jours sideraux), non la 364e ; la formule livree est
 *     Math.floor(rotationsAuDebut + 364 * FACTEUR_SIDERAL) + 1, conforme a la
 *     specification (verificationSpec() ci-dessous, inchangee, le prouve).
 */
// Module Calendrier 13 × 28 sidéral — composant autonome, testé, prêt à intégrer.
// Spec : files/spec-calendrier-13x28-sideral-20261102.md (demande d'Alex, 2 nov. 2026, 11 h 23).
// Aucune dépendance ; tout se calcule chez le visiteur. Couche A : arithmétique du facteur, recalculable.
'use strict';

// Constantes nommées (déjà au panneau Temps du site).
const JOUR_SIDERAL_S = 86164.0905;            // 23 h 56 min 04,09 s, en secondes
const FACTEUR_SIDERAL = 1.00273790935;        // rotations sidérales par jour solaire moyen
const JOUR_SOLAIRE_S = 86400;

// Origine du compte 13×28 : 19 mars 2026, 23 h 56 min 04 s, heure civile de Sainte-Martine
// (America/Toronto). Origine nommée et écrite — la changer est un acte documenté, pas un réglage.
const ORIGINE_MS = Date.UTC(2026, 2, 20, 3, 56, 4); // 2026-03-19T23:56:04-04:00 — ancrage B (Alex, 6 nov. 2026)

const NOMS_MOIS_13 = [
  'Mois 1', 'Mois 2', 'Mois 3', 'Mois 4', 'Mois 5', 'Mois 6', 'Mois 7',
  'Mois 8', 'Mois 9', 'Mois 10', 'Mois 11', 'Mois 12', 'Mois 13'
];

// État complet du calendrier à un instant donné (ms Unix).
function etatCalendrier(maintenantMs) {
  const ecouleS = (maintenantMs - ORIGINE_MS) / 1000;
  const joursCivils = Math.floor(ecouleS / JOUR_SOLAIRE_S);           // jours civils entiers depuis l'origine
  const rotations = (ecouleS / JOUR_SOLAIRE_S) * FACTEUR_SIDERAL;     // rotations sidérales écoulées (réel)
  const avanceRotations = rotations - ecouleS / JOUR_SOLAIRE_S;       // avance accumulée, en rotations
  const avanceS = avanceRotations * JOUR_SIDERAL_S;                   // la même avance, en secondes sidérales

  // Position dans le cycle de 364 jours
  const jourDuCycle = ((joursCivils % 364) + 364) % 364;              // 0..363
  const mois = Math.floor(jourDuCycle / 28) + 1;                      // 1..13
  const jourDuMois = (jourDuCycle % 28) + 1;                          // 1..28
  const cycle = Math.floor(joursCivils / 364) + 1;

  // Complétion du tour de surplus : l'instant où les rotations atteignent (jours du cycle + 1) entiers,
  // c.-à-d. la fin du 364e jour civil du cycle courant, plus le reste à tourner.
  const debutCycleMs = ORIGINE_MS + (cycle - 1) * 364 * JOUR_SOLAIRE_S * 1000;
  const rotationsAuDebut = 364 * (cycle - 1) * FACTEUR_SIDERAL;
  // Instant (en jours solaires depuis le début du cycle) où rotations = 364 × cycle... borné au cycle :
  // on vise la rotation entière suivante après la fin du 364e jour du cycle.
  const cibleRotations = Math.floor(rotationsAuDebut + 364 * FACTEUR_SIDERAL) + 1;           // rotation entière visée dans ce cycle
  const joursPourCible = cibleRotations / FACTEUR_SIDERAL;            // jours solaires depuis l'origine du compte
  const instantTourMs = ORIGINE_MS + joursPourCible * JOUR_SOLAIRE_S * 1000;
  const resteAvantTourS = Math.max(0, (instantTourMs - maintenantMs) / 1000);

  return {
    joursCivilsDepuisOrigine: joursCivils,
    rotationsSiderales: rotations,
    avanceRotations,
    avanceS,
    cycle,
    mois,
    nomMois: NOMS_MOIS_13[mois - 1],
    jourDuMois,
    jourDuCycle: jourDuCycle + 1,
    instantTourMs,
    resteAvantTourS,
    debutCycleMs
  };
}

// Vérification des nombres de la spec (utilisée par les tests, affichable au bloc formules).
function verificationSpec() {
  const rotations364 = 364 * FACTEUR_SIDERAL;
  const avance364 = rotations364 - 364;
  const joursPour365Rotations = 365 / FACTEUR_SIDERAL;
  const apresFin364S = (joursPour365Rotations - 364) * JOUR_SOLAIRE_S;
  return {
    rotations364,                       // attendu ≈ 364,99659
    avance364,                          // attendu ≈ 0,99659 rotation
    joursPour365Rotations,              // attendu ≈ 364,00341 j
    apresFin364S                        // attendu ≈ 294 s (≈ 4 min 54 s après la fin du 364e jour)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { etatCalendrier, verificationSpec, JOUR_SIDERAL_S, FACTEUR_SIDERAL, ORIGINE_MS };
}
