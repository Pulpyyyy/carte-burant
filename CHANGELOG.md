# Changelog

All notable changes to this project are documented in this file.

## [1.0.5] - 2026-08-14

### Added
- **`map_link` : le nom de la station devient un lien vers une application de cartes** — `google`, `apple` (Plans), `waze`, ou `auto` qui suit l'appareil : sélecteur d'applications sur Android (lien `geo:`, qui respecte l'app carto préférée de l'utilisateur, Waze comprise), Plans sur iPhone / iPad, Google Maps sur PC. Il n'existe pas d'URL unique qui ouvre partout l'application choisie par l'utilisateur — `geo:` ne vit que sur Android, iOS n'ouvre que Plans ou le site du service visé — le mode `auto` fabrique donc le lien par appareil. Sans colonne `name` affichée, le lien se pose sur la première colonne d'identité présente : `city`, puis `address`, puis `brand` — une configuration n'affiche pas toujours le nom des stations. Le lien vise les coordonnées GPS remontées par l'intégration, retombe sur une recherche `adresse + code postal + ville` sans elles, et reste du texte sans l'un ni l'autre. Désactivé par défaut (`none`) : rien ne change sans le demander. Le clic sur le lien n'ouvre pas la fiche de l'entité (`more_info`), et le lien ne transmet pas l'adresse du tableau de bord au service de cartes (`rel="noreferrer"`), comme les logos distants. Réglable dans l'éditeur, section Affichage. Suggéré par Kro sur le forum HACF.

## [1.0.4] - 2026-08-01

### Changed
- **Réordonner les stations bascule sur l'ordre personnalisé** : les flèches ▲ / ▼ rangent la liste, mais le tableau ne la suivait qu'avec le tri « ≡ Ordre personnalisé » — sous tout autre tri, réordonner semblait sans effet. La première flèche bascule désormais d'elle-même, le dit (« Le tableau suit maintenant votre ordre. ») et propose le retour au tri d'avant, nommé. Le sens décroissant est remis à plat au passage : hérité d'un autre tri, il aurait rendu la liste à l'envers, soit l'inverse de ce qui vient d'être demandé — et il est restitué si l'on revient en arrière. Tant que le tri n'est pas l'ordre personnalisé, la section rappelle lequel est en place et offre d'y basculer sans toucher à la liste.

### Fixed
- **`sort: manual` sans liste `stations` rend l'ordre de l'intégration** au lieu de retomber sur un tri par nom. Toutes les stations étant à égalité de rang, la carte départageait par le nom : un tri que personne n'avait demandé, et qui se lisait comme un tri manuel cassé. L'éditeur fige la liste au moment où cet ordre est choisi, mais rien n'empêche d'écrire `sort: manual` seul en YAML.

## [1.0.3] - 2026-08-01

### Fixed
- **L'éditeur graphique ne perdait plus rien dès qu'un nom, une ville ou un logo était surchargé** : cocher une colonne ou une station la voyait revenir en arrière aussitôt. Les tables de surcharges étaient créées sans prototype — une protection contre les clefs `__proto__` — mais la configuration ne nous appartient pas : Home Assistant la fige en profondeur (`deep-freeze`) à la réception, et ce figeage appelle `o.hasOwnProperty(...)` sur chaque valeur. Sur un objet sans prototype il lève `hasOwnProperty is not a function`, et le dialogue d'édition abandonne **avant** d'appliquer la configuration, qu'il remplace par la précédente. Les tables gardent désormais `Object.prototype` ; les entrées sont posées par `defineProperty` et lues par `tableValue`, ce qui écarte aussi bien `__proto__` en écriture que `constructor` ou `toString` en lecture. La configuration reste inchangée : rien à modifier en YAML.
- **L'éditeur n'est plus vide quand la langue se résout avant sa construction** : `_rebuild()` ne faisait rien tant que rien n'avait été construit, alors que c'est justement le rendu initial qu'il restait à faire.

## [1.0.2] - 2026-08-01

### Added
- **Retour au tri configuré, par un bouton et par un troisième clic** : le tri de la configuration n'a pas toujours d'en-tête à cliquer — `manual` n'en a aucun par construction, et rien n'oblige à afficher la colonne sur laquelle `sort` porte. Un clic sur n'importe quel en-tête enfermait donc la carte dans ce tri jusqu'au rechargement de la page. Un bouton `↺` apparaît désormais au-dessus du tableau dès qu'un tri au clic est actif, annonce sa destination (`↺ ≡ Ordre personnalisé`, `↺ Distance ▲`…) et ne dépend d'aucune colonne affichée ; le troisième clic sur l'en-tête courant fait la même chose. Le marqueur `≡` signale la colonne `name` quand le tableau suit l'ordre personnalisé.

### Changed
- **L'interrupteur « Toutes les stations » disparaît de l'éditeur** : les stations se cochent une à une, et toutes le sont tant que `stations` est absent de la configuration. La première modification — décocher, réordonner, ou choisir l'ordre personnalisé — fige la liste complète. Un verrou de moins, et l'état de la section se lit directement dans les cases.
- **La carte reste un fichier unique** : les traductions vivent dans `carte-burant.js` plutôt que dans un dossier `lang/` importé relativement. HACS installe un plugin comme un seul fichier — sans arborescence à côté de la ressource Lovelace, un import relatif ne se résout pas. L'URL de la ressource ne change pas, et une installation manuelle se résume de nouveau à copier un fichier.
- **« ≡ Ordre personnalisé des stations » passe en tête du menu de tri** et porte le marqueur affiché par la carte. C'est le seul choix qui ne trie sur aucune donnée et qui dépend d'un réglage fait ailleurs dans l'éditeur : il ne se lit pas comme les autres et n'a rien à faire au milieu d'eux.

- **Traduction française et anglaise**, carte et éditeur : en-têtes de colonnes, messages, infobulles, libellés et aides de l'éditeur, suggestions du sélecteur par entité, messages d'erreur de configuration et format de date. La langue suit `hass.locale.language` — français dès qu'elle commence par `fr`, anglais sinon — et un changement de langue dans Home Assistant est pris en compte sans recharger la page. Les identifiants de carburant restent ceux du référentiel (`Gazole`, `GPLc`…) en configuration ; seule leur étiquette d'affichage est traduite (*Diesel*, *LPG*). Une table par langue en tête de `carte-burant.js`, mêmes clefs dans le même ordre : ajouter une langue ne touche à rien d'autre.
- **Textes d'aide sous les champs de l'éditeur** via `computeHelper`, comme le fait Home Assistant dans ses propres éditeurs, et lien *Documentation* dans le sélecteur de cartes (`documentationURL`).

### Fixed
- **Choisir l'ordre personnalisé sans liste de stations ne produit plus un tri inerte** : toutes les stations étant alors à égalité, le tri retombait silencieusement sur le nom, `sort_desc` compris ignoré. L'éditeur fige désormais la liste au moment où cet ordre est choisi.

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
