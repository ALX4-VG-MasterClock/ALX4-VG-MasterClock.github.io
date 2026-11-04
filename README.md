# Audit Unisson — site public d'Alexandre Vautour Gagnon

Site du chercheur indépendant **Alexandre Vautour Gagnon** (Sainte-Martine, Québec) :
*Audit Unisson — Preuve d'Antériorité V-G*, la vitrine publique du Protocole de
Convergence Fibonacci-23 (mémoire conversationnelle vérifiable côté utilisateur,
sceaux SHA-256 chaînés, registre d'antériorité recalculable).

- **Adresse publique** : https://alexvg1618.github.io/
- **ORCID** : [0009-0006-9124-4407](https://orcid.org/0009-0006-9124-4407)
- **Version publiée ici** : v6 « modèle d'Alex », thème clair (1er novembre 2026).

## Hébergement gratuit, sans abonnement

Ce dépôt est publié par **GitHub Pages** : l'hébergement est gratuit, sans
abonnement, sans crédits et sans date d'expiration tant que le compte GitHub
existe. Il complète le site Netlify
(https://protocole-convergence-fibonacci23.netlify.app/), il ne le remplace pas.

## Mettre à jour le site

Le site est entièrement statique : la racine de ce dépôt est la racine du site.

1. Remplacer les fichiers à la racine du dépôt (`index.html`, dossier `assets/`)
   par la nouvelle version du paquet — par téléversement dans l'interface web
   de GitHub (« Add file → Upload files ») ou en demandant à SoPHIa de pousser
   la mise à jour.
2. Valider (commit) : GitHub Pages republie automatiquement le site en
   quelques instants, à la même adresse.
3. Vérifier l'adresse publique après chaque mise à jour.

Le fichier `.nojekyll` à la racine demande à GitHub Pages de servir les
fichiers tels quels, sans transformation.

## Contenu et limites connues de cette copie

- `index.html` et `assets/registre-historique.json` (les 11 sceaux publics du
  registre, recalculés 11/11 MATCH à l'assemblage) sont publiés par pousée
  automatisée.
- Les médias binaires — `assets/sophia.webp` (avatar), `assets/sophia-plein-corps.jpg`
  et `assets/sophia-au-travail.mp4` (vidéo) — s'ajoutent dans le dossier
  `assets/` par téléversement web : aucun changement de code n'est requis,
  le site les affiche dès qu'ils sont présents.
- La fonction serveur « Instance Souveraine » (une fonction Netlify) n'est pas
  portable sur GitHub Pages, qui ne sert que du statique : sur cette copie,
  l'onglet Instance répond par le repli honnête prévu dans le site. La version
  Netlify demeure la copie où l'Instance peut être branchée.

## Portabilité

Le même paquet statique se déploie en quelques minutes sur n'importe quel
hébergeur de fichiers statiques (Netlify par glisser-déposer, GitHub Pages,
ou autre) : aucun verrouillage à une plateforme.
<!-- Redéclenchement du déploiement Pages le 2026-11-04 (sans effet sur le site servi). -->
<!-- Redéclenchement nº 2 du déploiement Pages le 2026-11-04 (sans effet sur le site servi). -->
