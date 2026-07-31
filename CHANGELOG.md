# Changelog

All notable changes to this project are documented in this file.

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
