# Le site d'Alexandre Vautour Gagnon — chercheur indépendant

Site public du chercheur indépendant **Alexandre Vautour Gagnon**
(Sainte-Martine, Québec) : montrer, preuves recalculables à l'appui, comment
les données des utilisateurs transitent chez les plateformes, donner les
gestes et les liens pour aller les reprendre, et faire naître sur l'appareil
de chaque visiteur une mémoire chaînée par SHA-256, sans compte, dont il est
le seul détenteur. Trois fonctions, du côté de l'utilisateur : **SAVOIR**,
**ACCÉDER**, **MÉMOIRE**.

- **Adresse publique** : https://alx4-vg-masterclock.github.io/
- **ORCID** : [0009-0006-9124-4407](https://orcid.org/0009-0006-9124-4407)
- **État publié** : v48 « Les textes validés » (4 novembre 2026) + correctif
  ciblé (générateur de lettre, état du cerveau local, étiquette du sceau).

## Hébergement

Ce dépôt est publié par **GitHub Pages** : hébergement gratuit, sans
abonnement, sans date d'expiration tant que le compte GitHub existe. C'est
le seul foyer du site.

## Mettre à jour le site

Le site est entièrement statique : la racine de ce dépôt est la racine du
site. Chaque mise à jour se publie par version entière, vérifiée au servi
avant d'être déclarée en ligne :

1. Remplacer les fichiers visés à la racine du dépôt par ceux du paquet de
   la version (téléversement dans l'interface web de GitHub).
2. Valider (commit) : GitHub Pages republie automatiquement.
3. Recalculer l'état servi (empreinte, sceau canonique, racine) et le
   comparer au paquet — publié ne veut pas dire déployé, déployé ne veut
   pas dire vérifié.

Le fichier `.nojekyll` à la racine demande à GitHub Pages de servir les
fichiers tels quels, sans transformation.
