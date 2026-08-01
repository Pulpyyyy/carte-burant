/*!
 * prix-carburant-card — textes français.
 *
 * Un fichier par langue, chargé par `carte-burant.js` en import relatif : ajouter
 * une langue, c'est déposer un fichier ici et l'importer là-bas, sans toucher au
 * reste. Les clefs sont communes à toutes les langues et rangées dans le même
 * ordre, pour qu'une traduction se relise en regard de l'originale.
 *
 * `{nom}` marque une valeur insérée à l'exécution : la garder telle quelle.
 */

export default {
  col_logo: "",
  col_name: "Station",
  col_brand: "Enseigne",
  col_address: "Adresse",
  col_city: "Ville",
  col_postal_code: "CP",
  col_station_id: "ID",
  col_distance: "Dist.",
  col_updated: "Date",

  fuel_GPLc: "GPL",
  fuel_Gazole: "Gazole",

  no_station: "Aucune station : vérifie l'intégration Prix Carburant.",
  no_wanted_station: "Aucune des stations demandées n'est remontée par l'intégration.",
  sort_by: "Trier par {label}",
  sort_back_to: "Revenir au tri configuré : {label}",
  sort_manual_header: "Ordre personnalisé des stations · cliquer pour trier par nom",
  sort_manual_label: "≡ Ordre personnalisé",
  sort_reset: "Revenir au tri défini dans la configuration",

  err_empty: "Configuration vide",
  err_columns: "`columns` doit être une liste",
  err_stations: "`stations` doit être une liste d'identifiants de station",
  err_station_names: "`station_names` doit être une table `station_id: nom`",
  err_station_cities: "`station_cities` doit être une table `station_id: ville`",
  err_logos: "`logos` doit être une table `enseigne: fichier`",
  err_decimals: "`decimals` doit être un entier entre 0 et 10",

  card_name: "Prix Carburant",
  card_description: "Tableau des prix des carburants : choix des stations et des colonnes.",
  stub_title: "Prix carburants",
  suggest_compare: "Comparer les stations — {fuel}",
  suggest_station: "Cette station, tous carburants",
  suggest_title: "Prix {fuel}",

  ed_title: "Titre",
  ed_show_title: "Afficher le titre",
  ed_sort: "Tri par défaut",
  ed_sort_desc: "Tri décroissant",
  ed_sortable: "En-têtes cliquables pour trier",
  ed_decimals: "Décimales",
  ed_unit: "Unité affichée dans l'en-tête",
  ed_highlight: "Colorer le prix le plus bas / le plus haut",
  ed_more_info: "Clic sur une ligne = fiche de l'entité",
  ed_logo_path: "Préfixe des logos (ex. /local/images/brands/)",

  help_sort:
    "« ≡ Ordre personnalisé » reprend l'ordre de la section Stations, les autres trient sur une donnée.",
  help_sortable:
    "Sans effet sur le tri de départ : la carte propose toujours un retour à celui-ci.",
  help_unit: "Suffixe ajouté aux en-têtes de carburant. Vide pour aucun.",
  help_decimals: "Décimales des prix. Jusqu'à 10 en YAML.",
  help_more_info: "Ouvre la fiche de la première entité de la station.",

  sec_stations: "Stations",
  sec_stations_hint:
    "Cocher les stations à afficher, ▲ / ▼ pour les ordonner. Tant que rien n'est touché ici, la carte suit toutes les stations de l'intégration, futures comprises ; la première modification fige la liste.",
  sec_sort: "Tri",
  sec_sort_hint:
    "Ordre de départ du tableau. « ≡ Ordre personnalisé » reprend celui de la section Stations ; les autres trient sur une donnée. Un clic sur un en-tête trie à la volée sans rien écrire ici, et la carte propose alors un retour à ce réglage.",
  sec_columns: "Colonnes",
  sec_columns_hint:
    "Interrupteur pour afficher ou masquer, ▲ / ▼ pour ordonner. Les colonnes affichées sont regroupées en tête de liste, dans leur ordre d'affichage.",
  sec_display: "Affichage",
  sec_names: "Noms et villes",
  sec_names_hint: "Laisser vide pour garder la valeur fournie par l'intégration.",
  sec_logos: "Logos des enseignes",
  sec_logos_hint: "Fichier relatif au préfixe ci-dessous, ou URL / chemin absolu.",

  opt_distance: "Distance",
  opt_name: "Nom",
  opt_brand: "Enseigne",
  opt_address: "Adresse",
  opt_city: "Ville",
  opt_postal_code: "Code postal",
  opt_station_id: "Identifiant de station",
  opt_updated: "Date de relevé",
  opt_manual: "≡ Ordre personnalisé des stations",
  opt_price: "Prix {fuel}",

  hidden: "Masquées",
  show_column: "Afficher la colonne {label}",
  hide_column: "Masquer la colonne {label}",
  show_station: "Afficher {label}",
  hide_station: "Masquer {label}",
  move_up: "Monter {label}",
  move_down: "Descendre {label}",
  lock_column: "Au moins une colonne doit rester affichée",
  lock_station: "Au moins une station doit rester cochée",
  price_of: "prix {fuel}",

  ed_no_station: "Aucune station remontée par l'intégration.",
  ed_no_brand: "Aucune enseigne remontée par l'intégration.",
  ed_no_match: "Aucune station ne correspond à « {filter} ».",
  ed_filter: "Filtrer les stations…",
  ed_filter_aria: "Filtrer les stations",
  ed_col_name: "Nom affiché",
  ed_col_city: "Ville affichée",
  ed_station: "Station",
  ed_city: "Ville",
  ed_logo_placeholder: "fichier.png ou URL",
  ed_logo_broken: "Image introuvable : {src}",

  sum_no_station: "aucune station détectée",
  sum_some: "{count} sur {total}",
  sum_all: "toutes ({count})",
  sum_not_sortable: " · en-têtes non cliquables",
  sum_no_title: "sans titre",
  sum_decimals: "{count} décimales",
  sum_no_override: "aucune surcharge",
  sum_override: "{count} surcharge",
  sum_overrides: "{count} surcharges",
  sum_no_logo: "aucun logo",
  sum_logo: "{count} logo défini",
  sum_logos: "{count} logos définis"
};
