# Changelog

All notable changes to this project are documented in this file.

## [1.0.1] - 2026-07-31

### Performance
- **Le changement d'état d'une entité étrangère ne déclenche plus aucun travail** : `set hass` reparcourait toutes les entités de l'installation à chaque événement de la maison, pour ne rien trouver neuf fois sur dix — la signature de rendu évitait le re-dessin, pas le recalcul. Les sensors de l'intégration repérés au passage précédent sont désormais comparés par identité, avec un comptage brut des entités pour rattraper les apparitions et disparitions. Sur une installation chargée, allumer une lampe ne coûte plus rien.
- **`readings()` mémoïsé sur l'identité de l'objet `hass`** : la carte et surtout l'éditeur l'appelaient jusqu'à sept fois par passe (colonnes, stations, enseignes, résumés), soit sept parcours complets des milliers d'entités pour un seul événement. Un seul désormais.
- **Feuille de style posée une seule fois** au lieu d'être recréée à chaque rendu, ce qui forçait le navigateur à reparser tout le CSS.
- **Tri `manual` et détection mini/maxi débarrassés de leur comportement quadratique** : rang des stations indexé dans une `Map` au lieu d'un `indexOf` dans le comparateur, valeurs distinctes collectées dans un `Set` au lieu d'un `filter` à `indexOf` imbriqué.

### Fixed
- **`decimals` hors bornes ne casse plus la carte** : `toFixed` lève une `RangeError` en dehors de 0–100, et une exception dans le rendu emportait la carte entière. La valeur est validée dans `setConfig` (entier de 0 à 10) et rejetée avec un message explicite, comme les autres options mal formées.
- **Tables de configuration créées sans prototype** : une clef `__proto__` dans `station_names`, `station_cities` ou `logos` y modifiait le prototype au lieu de créer une entrée, et une recherche de logo sur une enseigne normalisée en `constructor` remontait une fonction héritée d'`Object` en guise d'URL. `logos` passe désormais par la même normalisation de clefs que les autres tables.
- **Plus de double entrée dans le sélecteur de cartes** quand la ressource est déclarée deux fois (migration manuelle puis HACS) : l'enregistrement dans `window.customCards` est protégé, comme l'étaient déjà les `customElements.define`.

### Security
- **`referrerpolicy="no-referrer"` sur les logos** : un logo servi par un hôte tiers n'apprend plus l'adresse du tableau de bord qui l'affiche.

## [1.0.0] - 2026-07-31

### Added
- Première version publiée : tableau des prix des carburants, une ligne par station et une colonne par carburant.
- Détection des entités par attributs (`station_id` + `fuel_type`), sans dépendance au préfixe d'`entity_id` ni sensor template intermédiaire.
- Choix et ordre des stations et des colonnes, en YAML ou via l'éditeur graphique.
- Tri configurable et clic sur les en-têtes pour trier à la volée.
- Surcharge des noms et villes, logos par enseigne ou par station.
- Mise en évidence du prix le plus bas (vert) et du plus haut (rouge), ex æquo compris.
- Éditeur visuel en six sections repliables, alimenté par les données réelles de l'intégration.
- Support du sélecteur de carte « par entité » de Home Assistant 2026.6+, avec deux mises en page proposées.
