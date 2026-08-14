# Prix Carburant Card

Tableau des prix des carburants pour Home Assistant, à partir de l'intégration [Prix Carburant](https://github.com/Aohzan/hass-prixcarburant) : une ligne par station, une colonne par carburant.

**Fonctionnalités :**
- ⛽ Lecture des entités par leurs **attributs** (`station_id` + `fuel_type`), insensible aux renommages
- 🔀 Choix et ordre des stations et des colonnes, en YAML comme à la souris
- ↕️ Tri configurable et clic sur les en-têtes pour trier à la volée
- 🏷️ Noms et villes surchargeables, logos par enseigne ou par station
- 🟢 Prix le plus bas en vert, le plus haut en rouge, ex æquo compris
- 🗺️ Lien carte optionnel sur le nom de la station : Google Maps, Plans, Waze, ou auto selon l'appareil
- ✏️ Éditeur graphique en six sections repliables
- 📱 Sélecteur de carte « par entité » de HA 2026.6+

**Contenu :**
- Carte Lovelace `custom:prix-carburant-card` (éditeur visuel inclus)

**Compatibilité :**
- Home Assistant 2024.4.0+ (le sélecteur par entité demande 2026.6+, ignoré avant)
- Intégration [Prix Carburant](https://github.com/Aohzan/hass-prixcarburant) requise
- Tous les navigateurs supportant les Web Components
