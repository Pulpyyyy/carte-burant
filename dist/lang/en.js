/*!
 * prix-carburant-card — English strings.
 *
 * One file per language, loaded by `carte-burant.js` through a relative import:
 * adding a language means dropping a file here and importing it there, nothing
 * else. Keys are shared across languages and kept in the same order, so a
 * translation reads side by side with the original.
 *
 * `{name}` marks a value injected at runtime: keep it as is.
 */

export default {
  col_logo: "",
  col_name: "Station",
  col_brand: "Brand",
  col_address: "Address",
  col_city: "City",
  col_postal_code: "ZIP",
  col_station_id: "ID",
  col_distance: "Dist.",
  col_updated: "Date",

  fuel_GPLc: "LPG",
  fuel_Gazole: "Diesel",

  no_station: "No station: check the Prix Carburant integration.",
  no_wanted_station: "None of the requested stations is reported by the integration.",
  sort_by: "Sort by {label}",
  sort_back_to: "Back to the configured sort: {label}",
  sort_manual_header: "Custom station order · click to sort by name",
  sort_manual_label: "≡ Custom order",
  sort_reset: "Back to the sort defined in the configuration",

  err_empty: "Empty configuration",
  err_columns: "`columns` must be a list",
  err_stations: "`stations` must be a list of station identifiers",
  err_station_names: "`station_names` must be a `station_id: name` table",
  err_station_cities: "`station_cities` must be a `station_id: city` table",
  err_logos: "`logos` must be a `brand: file` table",
  err_decimals: "`decimals` must be an integer between 0 and 10",

  card_name: "Fuel Prices",
  card_description: "Fuel price table: pick your stations and columns.",
  stub_title: "Fuel prices",
  suggest_compare: "Compare stations — {fuel}",
  suggest_station: "This station, all fuels",
  suggest_title: "{fuel} price",

  ed_title: "Title",
  ed_show_title: "Show the title",
  ed_sort: "Default sort",
  ed_sort_desc: "Descending",
  ed_sortable: "Clickable headers for sorting",
  ed_decimals: "Decimals",
  ed_unit: "Unit shown in the header",
  ed_highlight: "Colour the lowest / highest price",
  ed_more_info: "Clicking a row opens the entity dialog",
  ed_logo_path: "Logo prefix (e.g. /local/images/brands/)",

  help_sort:
    "“≡ Custom order” follows the Stations section; the others sort on a value.",
  help_sortable:
    "Does not affect the starting sort: the card always offers a way back to it.",
  help_unit: "Suffix added to fuel headers. Empty for none.",
  help_decimals: "Price decimals. Up to 10 in YAML.",
  help_more_info: "Opens the dialog of the station's first entity.",

  sec_stations: "Stations",
  sec_stations_hint:
    "Tick the stations to show, ▲ / ▼ to order them. As long as nothing is changed here, the card follows every station of the integration, future ones included; the first change freezes the list.",
  sec_sort: "Sorting",
  sec_sort_hint:
    "Starting order of the table. “≡ Custom order” follows the Stations section; the others sort on a value. Clicking a header sorts on the fly without writing anything here, and the card then offers a way back to this setting.",
  sec_columns: "Columns",
  sec_columns_hint:
    "Switch to show or hide, ▲ / ▼ to order. Shown columns are grouped at the top of the list, in display order.",
  sec_display: "Display",
  sec_names: "Names and cities",
  sec_names_hint: "Leave empty to keep the value reported by the integration.",
  sec_logos: "Brand logos",
  sec_logos_hint: "File relative to the prefix below, or URL / absolute path.",

  opt_distance: "Distance",
  opt_name: "Name",
  opt_brand: "Brand",
  opt_address: "Address",
  opt_city: "City",
  opt_postal_code: "Postal code",
  opt_station_id: "Station identifier",
  opt_updated: "Reading date",
  opt_manual: "≡ Custom station order",
  opt_price: "{fuel} price",

  hidden: "Hidden",
  show_column: "Show the {label} column",
  hide_column: "Hide the {label} column",
  show_station: "Show {label}",
  hide_station: "Hide {label}",
  move_up: "Move {label} up",
  move_down: "Move {label} down",
  lock_column: "At least one column must stay visible",
  lock_station: "At least one station must stay ticked",
  price_of: "{fuel} price",

  ed_no_station: "No station reported by the integration.",
  ed_no_brand: "No brand reported by the integration.",
  ed_no_match: "No station matches “{filter}”.",
  ed_filter: "Filter stations…",
  ed_filter_aria: "Filter stations",
  ed_col_name: "Displayed name",
  ed_col_city: "Displayed city",
  ed_station: "Station",
  ed_city: "City",
  ed_logo_placeholder: "file.png or URL",
  ed_logo_broken: "Image not found: {src}",

  sum_no_station: "no station detected",
  sum_some: "{count} of {total}",
  sum_all: "all ({count})",
  sum_not_sortable: " · headers not clickable",
  sum_no_title: "no title",
  sum_decimals: "{count} decimals",
  sum_no_override: "no override",
  sum_override: "{count} override",
  sum_overrides: "{count} overrides",
  sum_no_logo: "no logo",
  sum_logo: "{count} logo set",
  sum_logos: "{count} logos set"
};
