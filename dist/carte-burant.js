/*!
 * prix-carburant-card — tableau des prix des carburants pour Home Assistant.
 *
 * Lit directement les entites de l'integration "Prix Carburant" : tout sensor
 * portant les attributs `station_id` et `fuel_type` est pris en compte. Aucun
 * filtre sur le prefixe d'entity_id, la carte est donc insensible aux renommages
 * et ne demande aucun sensor template intermediaire.
 *
 * Ecrit en JS natif (pas de build, pas de dependance) et volontairement en
 * syntaxe ES2017 : pas de `?.` ni de `??`, pour rester lisible par les outils
 * d'analyse et par les navigateurs anciens.
 */

const CARD_VERSION = "1.0.1";

console.info(
  `%c 🙂 Prix Carburant Card %c v${CARD_VERSION} %c`,
  "background:#2196F3;color:white;padding:2px 8px;border-radius:3px 0 0 3px;font-weight:bold",
  "background:#4CAF50;color:white;padding:2px 8px;border-radius:0 3px 3px 0",
  "background:none"
);

/* Colonnes "meta". Tout identifiant de colonne absent de cette table est traite
   comme un fuel_type de l'integration (E10, SP95, SP98, GPLc, Gazole, E85...). */
const META = {
  logo: { label: "", align: "center", width: "40px", sortable: false },
  name: { label: "Station", align: "left", width: "34%" },
  brand: { label: "Enseigne", align: "left" },
  address: { label: "Adresse", align: "left" },
  city: { label: "Ville", align: "left" },
  postal_code: { label: "CP", align: "center" },
  station_id: { label: "ID", align: "center" },
  distance: { label: "Dist.", align: "center", width: "9%" },
  updated: { label: "Date", align: "center", width: "11%" }
};

const FUEL_LABELS = {
  GPLc: "GPL",
  E10: "E10",
  E85: "E85",
  SP95: "SP95",
  SP98: "SP98",
  Gazole: "Gazole"
};

const DEFAULT_COLUMNS = ["logo", "name", "distance", "E10", "SP95", "SP98", "updated"];

const DEFAULTS = {
  title: null,
  show_title: true,
  stations: [],
  station_names: {},
  station_cities: {},
  columns: null,
  logos: {},
  logo_path: "",
  decimals: 3,
  highlight: true,
  unit: "€/L",
  sort: "distance",
  sort_desc: false,
  sortable: true,
  more_info: true,
  background: null,
  color_min: "#4caa40",
  color_max: "#e05252"
};

const STYLE = [
  ":host { display: block; }",
  "ha-card { overflow: hidden; }",
  ".wrap { padding: 8px 12px 12px; overflow-x: auto; }",
  "table { width: 100%; border-collapse: collapse; font-size: var(--prix-carburant-font-size, 14px); }",
  "th { padding: 4px 6px; white-space: nowrap; font-weight: 600;",
  "     color: var(--secondary-text-color); border-bottom: 1px solid var(--divider-color); }",
  "th.sortable { cursor: pointer; user-select: none; }",
  "th.sortable:hover { color: var(--primary-text-color); }",
  "th.sorted { color: var(--primary-color); }",
  "th .caret { font-size: 0.75em; margin-left: 2px; }",
  "td { padding: 4px 6px; white-space: nowrap; font-variant-numeric: tabular-nums; }",
  /* Lignes alternees : gris neutre, lisible sur theme clair comme sombre. */
  "tbody tr:nth-child(even) td { background: var(--prix-carburant-stripe, rgba(127,127,127,0.12)); }",
  "tbody tr:hover td { background: var(--prix-carburant-hover, rgba(127,127,127,0.22)); }",
  "tbody tr.clickable { cursor: pointer; }",
  "td.col-name { white-space: normal; overflow-wrap: break-word; }",
  "img.logo { height: var(--prix-carburant-logo-size, 24px); width: auto; max-width: 80px;",
  "           object-fit: contain; vertical-align: middle; display: block; margin: 0 auto; }",
  ".min { color: var(--prix-carburant-color-min, #4caa40); font-weight: 700; }",
  ".max { color: var(--prix-carburant-color-max, #e05252); font-weight: 700; }",
  ".left { text-align: left; }",
  ".center { text-align: center; }",
  ".right { text-align: right; }",
  ".empty { padding: 16px; color: var(--secondary-text-color); }",
  "@media (max-width: 600px) {",
  "  table { font-size: 12px; }",
  "  th, td { padding: 3px 4px; }",
  "  img.logo { height: 18px; }",
  "}"
].join("\n");

const fireEvent = function (node, type, detail) {
  const ev = new CustomEvent(type, {
    detail: detail || {},
    bubbles: true,
    composed: true,
    cancelable: false
  });
  node.dispatchEvent(ev);
  return ev;
};

/* "Intermarché Contact" -> "intermarchecontact" : clef stable pour la table
   `logos` de la configuration, insensible aux accents et a la ponctuation. */
const brandKey = function (brand) {
  return String(brand || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

const toNumber = function (value, fallback) {
  const n = parseFloat(value);
  return isFinite(n) ? n : fallback;
};

const isPlainObject = function (value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

/* Les clefs viennent du YAML : `45650001` (nombre) et `"45650001"` doivent
   designer la meme station. L'objet est cree sans prototype : une clef
   `__proto__` y devient une entree ordinaire au lieu de changer le prototype,
   et une recherche sur une clef comme `constructor` rend `undefined` au lieu de
   remonter une fonction heritee d'`Object`. */
const stringKeys = function (table) {
  const out = Object.create(null);
  Object.keys(table).forEach(function (key) {
    out[String(key)] = table[key];
  });
  return out;
};

/* `logo_path` ne prefixe que les valeurs relatives : une URL complete ou un
   chemin absolu reste utilisable meme quand un prefixe global est defini. */
const isAbsoluteUrl = function (src) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(String(src));
};

/* Nombre d'entites de l'installation. Volontairement sans `Object.keys`, qui
   allouerait un tableau de plusieurs milliers de chaines a chaque appel : on ne
   veut qu'un compteur, pour reperer une entite apparue ou disparue. */
const statesCount = function (hass) {
  let count = 0;
  if (!hass || !hass.states) return count;
  for (const id in hass.states) count++;
  return count;
};

/* Home Assistant remplace l'objet `hass` a chaque changement d'etat de la
   maison, mais ne remplace l'objet d'etat que de l'entite concernee : une
   comparaison d'identite sur les seuls sensors de l'integration suffit donc a
   savoir s'il y a lieu de retravailler. Sans cette garde, allumer une lampe
   ferait reparcourir toutes les entites pour, neuf fois sur dix, ne rien
   trouver. Le compteur rattrape les apparitions et disparitions d'entites, que
   la comparaison d'identite ne verrait pas. */
const readingsUnchanged = function (previous, next, watched, count) {
  if (!previous || !next || !previous.states || !next.states || !watched) return false;
  if (statesCount(next) !== count) return false;
  for (let i = 0; i < watched.length; i++) {
    if (previous.states[watched[i]] !== next.states[watched[i]]) return false;
  }
  return true;
};

/* Nom "brut" d'une station. Le referentiel gouvernemental laisse beaucoup de
   stations sans nom : l'integration renvoie alors la chaine "Undefined", qu'il
   vaut mieux remplacer par "enseigne + identifiant" que d'afficher telle quelle. */
const stationLabel = function (attrs, sid) {
  const name = attrs && attrs.name ? String(attrs.name) : "";
  if (name && name.toLowerCase() !== "undefined") return name;
  const brand = attrs && attrs.brand ? String(attrs.brand) + " " : "";
  return brand + sid;
};

/* Cle de colonne : accepte la forme courte ("E10") comme la forme longue
   ({ key: "E10", name: "Sans plomb" }). */
const columnKeyOf = function (entry) {
  if (typeof entry === "string") return entry;
  if (!isPlainObject(entry)) return "";
  return entry.key || entry.fuel || entry.type || "";
};

const columnLabelOf = function (key) {
  const meta = META[key];
  if (meta) return meta.label || key;
  return FUEL_LABELS[key] || key;
};

class PrixCarburantCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._signature = "";
    this._rowCount = 0;
    /* Tri demande a la volee par un clic sur un en-tete. Null = celui de la
       configuration. Remis a zero a chaque setConfig. */
    this._sortKey = null;
    this._sortDesc = null;
    /* Sensors de l'integration reperes au dernier passage, et nombre total
       d'entites : de quoi ecarter sans travail les `hass` sans rapport. */
    this._watched = null;
    this._stateCount = 0;
    /* Noeuds conserves entre deux rendus. */
    this._styleNode = null;
    this._cardNode = null;
  }

  /* ---------- decouverte des donnees de l'integration ---------- */

  /* Un "releve" = un couple (station, carburant), soit une entite.

     Le resultat est memoise sur l'identite de l'objet `hass` : la carte et
     l'editeur appellent cette methode jusqu'a sept fois par passe (colonnes,
     stations, enseignes, resumes...), et rien ne justifie de reparcourir sept
     fois les memes milliers d'entites. Le tableau rendu est partage, les
     appelants ne doivent donc pas le modifier. */
  static readings(hass) {
    if (hass && hass === PrixCarburantCard._readingsHass) {
      return PrixCarburantCard._readingsValue;
    }
    const out = [];
    if (!hass || !hass.states) return out;
    const states = hass.states;
    for (const id in states) {
      if (!Object.prototype.hasOwnProperty.call(states, id)) continue;
      if (id.slice(0, 7) !== "sensor.") continue;
      const attrs = states[id].attributes;
      if (!attrs || attrs.station_id === undefined || attrs.station_id === null) continue;
      if (!attrs.fuel_type) continue;
      const price = toNumber(states[id].state, null);
      out.push({
        id: id,
        sid: String(attrs.station_id),
        fuel: String(attrs.fuel_type),
        price: price !== null && price > 0 ? price : null,
        attrs: attrs
      });
    }
    PrixCarburantCard._readingsHass = hass;
    PrixCarburantCard._readingsValue = out;
    return out;
  }

  static discoverFuels(hass) {
    const seen = [];
    PrixCarburantCard.readings(hass).forEach(function (r) {
      if (seen.indexOf(r.fuel) === -1) seen.push(r.fuel);
    });
    return seen.sort();
  }

  static discoverStations(hass) {
    const map = new Map();
    PrixCarburantCard.readings(hass).forEach(function (r) {
      if (map.has(r.sid)) return;
      map.set(r.sid, {
        sid: r.sid,
        name: stationLabel(r.attrs, r.sid),
        brand: r.attrs.brand || "",
        city: r.attrs.city || "",
        distance: toNumber(r.attrs.distance, Infinity)
      });
    });
    return Array.from(map.values()).sort(function (a, b) {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  /* Enseignes distinctes, pour proposer un logo par enseigne dans l'editeur. */
  static discoverBrands(hass) {
    const map = new Map();
    PrixCarburantCard.readings(hass).forEach(function (r) {
      const brand = r.attrs.brand;
      if (!brand) return;
      const key = brandKey(brand);
      if (!key || map.has(key)) return;
      map.set(key, { key: key, label: String(brand) });
    });
    return Array.from(map.values()).sort(function (a, b) {
      return a.label.localeCompare(b.label);
    });
  }

  /* ---------- interface carte Lovelace ---------- */

  static getConfigElement() {
    return document.createElement("prix-carburant-card-editor");
  }

  static getStubConfig(hass) {
    const fuels = PrixCarburantCard.discoverFuels(hass).slice(0, 4);
    return {
      title: "Prix carburants",
      stations: [],
      columns: ["logo", "name", "distance"].concat(fuels).concat(["updated"])
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration vide");
    const cfg = Object.assign({}, DEFAULTS, config);
    if (cfg.columns !== null && !Array.isArray(cfg.columns)) {
      throw new Error("`columns` doit etre une liste");
    }
    if (!Array.isArray(cfg.stations)) {
      throw new Error("`stations` doit etre une liste d'identifiants de station");
    }
    if (!isPlainObject(cfg.station_names)) {
      throw new Error("`station_names` doit etre une table `station_id: nom`");
    }
    if (!isPlainObject(cfg.station_cities)) {
      throw new Error("`station_cities` doit etre une table `station_id: ville`");
    }
    if (!isPlainObject(cfg.logos)) {
      throw new Error("`logos` doit etre une table `enseigne: fichier`");
    }
    /* `toFixed` leve une RangeError hors de 0-100 : sans ce controle, un
       `decimals: -1` ecrit a la main ferait echouer le rendu de chaque prix, et
       une exception dans le rendu emporte la carte entiere. */
    const decimals = Math.round(toNumber(cfg.decimals, DEFAULTS.decimals));
    if (!isFinite(decimals) || decimals < 0 || decimals > 10) {
      throw new Error("`decimals` doit etre un entier entre 0 et 10");
    }
    cfg.decimals = decimals;
    if (!cfg.columns || cfg.columns.length === 0) cfg.columns = DEFAULT_COLUMNS.slice();
    cfg.stations = cfg.stations.map(String);
    cfg.station_names = stringKeys(cfg.station_names);
    cfg.station_cities = stringKeys(cfg.station_cities);
    cfg.logos = stringKeys(cfg.logos);
    this._config = cfg;
    this._sortKey = null;
    this._sortDesc = null;
    this._signature = "";
    this._watched = null;
    this._update();
  }

  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    /* Rien de l'integration n'a bouge : ni recalcul, ni rendu. */
    if (readingsUnchanged(previous, hass, this._watched, this._stateCount)) return;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return 1 + Math.max(1, this._rowCount);
  }

  /* Vue "sections" : pleine largeur par defaut, un tableau a 8 colonnes n'a
     rien a faire dans une demi-colonne. */
  getGridOptions() {
    return { columns: "full", min_columns: 6, min_rows: 3 };
  }

  /* ---------- construction des lignes ---------- */

  _columns() {
    const cfg = this._config;
    return cfg.columns.map(function (entry) {
      const spec = typeof entry === "string" ? { key: entry } : Object.assign({}, entry);
      const key = columnKeyOf(entry);
      const meta = META[key];
      const isFuel = !meta;
      let label;
      if (spec.name !== undefined) label = spec.name;
      else if (meta) label = meta.label;
      else label = (FUEL_LABELS[key] || key) + (cfg.unit ? " " + cfg.unit : "");
      let sortable;
      if (spec.sortable !== undefined) sortable = !!spec.sortable;
      else if (meta && meta.sortable === false) sortable = false;
      else sortable = true;
      return {
        key: key,
        fuel: isFuel ? key : null,
        label: label,
        align: spec.align || (meta && meta.align) || "center",
        width: spec.width || (meta && meta.width) || null,
        sortable: sortable
      };
    });
  }

  /* Nom affiche : surcharge de la configuration, sinon nom de l'integration.
     Quand le referentiel ne connait pas le nom, l'integration renvoie la chaine
     "Undefined" : on la traite comme absente et on retombe sur enseigne + id. */
  _stationName(row) {
    const custom = this._config.station_names[row.sid];
    if (custom !== undefined && custom !== null && String(custom) !== "") return String(custom);
    return stationLabel(row.attrs, row.sid);
  }

  /* Idem pour la ville : `station_cities` prime sur l'attribut `city`. */
  _stationCity(row) {
    const custom = this._config.station_cities[row.sid];
    if (custom !== undefined && custom !== null && String(custom) !== "") return String(custom);
    return row.attrs.city ? String(row.attrs.city) : "";
  }

  /* Logo : surcharge par station_id, puis par enseigne, puis entity_picture. */
  _logoSrc(row) {
    const cfg = this._config;
    let src = cfg.logos[row.sid];
    if (!src) src = cfg.logos[brandKey(row.attrs.brand)];
    if (src) {
      src = String(src);
      if (cfg.logo_path && !isAbsoluteUrl(src)) src = cfg.logo_path + src;
      return src;
    }
    return row.attrs.entity_picture || "";
  }

  /* Tri courant : clic sur un en-tete s'il y en a eu un, sinon configuration. */
  _activeSort() {
    const cfg = this._config;
    return {
      key: this._sortKey !== null ? this._sortKey : cfg.sort,
      desc: this._sortDesc !== null ? this._sortDesc : !!cfg.sort_desc
    };
  }

  /* Valeur comparable d'une ligne pour une colonne. `null` = valeur absente,
     toujours renvoyee en fin de tableau quel que soit le sens du tri. */
  _sortValue(row, key) {
    if (key === "name") return this._stationName(row);
    if (key === "city") return this._stationCity(row) || null;
    if (key === "distance") return toNumber(row.attrs.distance, null);
    if (key === "updated") return row.updated;
    if (key === "station_id") return row.sid;
    if (META[key]) {
      const value = row.attrs[key];
      if (value === undefined || value === null || value === "") return null;
      const num = toNumber(value, null);
      return num !== null && String(num) === String(value) ? num : String(value);
    }
    const price = row.fuels[key];
    return typeof price === "number" ? price : null;
  }

  _sortRows(rows) {
    const cfg = this._config;
    const active = this._activeSort();
    const dir = active.desc ? -1 : 1;
    const self = this;

    /* "manual" : l'ordre est celui de la liste `stations` de la configuration.
       Le rang est indexe une fois pour toutes : chercher dans la liste depuis
       le comparateur multiplierait le cout du tri par sa longueur. */
    if (active.key === "manual") {
      const order = new Map();
      cfg.stations.forEach(function (sid, index) {
        if (!order.has(sid)) order.set(sid, index);
      });
      rows.sort(function (a, b) {
        const ai = order.has(a.sid) ? order.get(a.sid) : -1;
        const bi = order.has(b.sid) ? order.get(b.sid) : -1;
        if (ai === bi) return self._stationName(a).localeCompare(self._stationName(b), "fr");
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return dir * (ai - bi);
      });
      return rows;
    }

    rows.sort(function (a, b) {
      const av = self._sortValue(a, active.key);
      const bv = self._sortValue(b, active.key);
      const aEmpty = av === null || av === undefined;
      const bEmpty = bv === null || bv === undefined;
      if (aEmpty || bEmpty) {
        if (aEmpty && bEmpty) return 0;
        return aEmpty ? 1 : -1;
      }
      let cmp;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), "fr");
      if (cmp !== 0) return dir * cmp;
      return self._stationName(a).localeCompare(self._stationName(b), "fr");
    });
    return rows;
  }

  _rows() {
    const cfg = this._config;
    const wanted = cfg.stations;
    const byStation = new Map();
    PrixCarburantCard.readings(this._hass).forEach(function (r) {
      if (wanted.length && wanted.indexOf(r.sid) === -1) return;
      let station = byStation.get(r.sid);
      if (!station) {
        station = { sid: r.sid, attrs: r.attrs, ids: [], fuels: {}, updated: null };
        byStation.set(r.sid, station);
      }
      station.ids.push(r.id);
      if (r.price !== null) station.fuels[r.fuel] = r.price;
      const stamp = r.attrs.updated_date ? Date.parse(r.attrs.updated_date) : NaN;
      if (isFinite(stamp) && (station.updated === null || stamp > station.updated)) {
        station.updated = stamp;
      }
    });

    return this._sortRows(Array.from(byStation.values()));
  }

  /* Le plancher est toujours signale, meme quand la colonne ne contient qu'un
     prix ou que toutes les stations sont au meme tarif : c'est le prix a payer,
     autant le dire en vert. Le plafond, lui, ne sort qu'a partir de 2 valeurs
     distinctes, sinon la meme cellule serait a la fois le moins cher et le plus
     cher. La comparaison porte sur la valeur exacte remontee par l'integration.
     Les ex aequo sont volontairement tous colores : trois stations au meme prix
     plancher sont trois fois la bonne affaire, en distinguer une seule serait
     faux. */
  _levels(rows, fuels) {
    const levels = {};
    fuels.forEach(function (fuel) {
      const values = [];
      /* Un `Set` plutot qu'un `filter` a `indexOf` imbrique : meme resultat,
         sans le comportement quadratique quand la liste s'allonge. */
      const distinct = new Set();
      rows.forEach(function (row) {
        const price = row.fuels[fuel];
        if (typeof price !== "number") return;
        values.push(price);
        distinct.add(price);
      });
      levels[fuel] = {
        min: distinct.size >= 1 ? Math.min.apply(null, values) : null,
        max: distinct.size >= 2 ? Math.max.apply(null, values) : null
      };
    });
    return levels;
  }

  /* ---------- rendu ---------- */

  _update() {
    if (!this._config || !this._hass) return;
    /* Sensors a surveiller au prochain `set hass`, releves ici pendant que la
       liste est de toute facon parcourue. */
    this._watched = PrixCarburantCard.readings(this._hass).map(function (r) {
      return r.id;
    });
    this._stateCount = statesCount(this._hass);
    const rows = this._rows();
    const active = this._activeSort();
    const signature =
      active.key +
      "/" +
      active.desc +
      "#" +
      rows
        .map(function (r) {
          const prices = Object.keys(r.fuels)
            .sort()
            .map(function (f) {
              return f + "=" + r.fuels[f];
            })
            .join(",");
          return r.sid + "|" + prices + "|" + r.updated + "|" + r.attrs.distance;
        })
        .join(";");
    if (signature === this._signature) return;
    this._signature = signature;
    this._rowCount = rows.length;
    this._render(rows);
  }

  /* Clic sur un en-tete : meme colonne = on inverse, autre colonne = tri
     ascendant sur celle-ci. */
  _toggleSort(key) {
    const active = this._activeSort();
    if (active.key === key) {
      this._sortDesc = !active.desc;
    } else {
      this._sortKey = key;
      this._sortDesc = false;
    }
    this._signature = "";
    this._update();
  }

  _render(rows) {
    const cfg = this._config;
    const root = this.shadowRoot;

    /* La feuille de style ne depend pas des donnees : posee une seule fois,
       elle evite au navigateur de reparser tout le CSS a chaque rendu. Seule la
       carte est remplacee. */
    if (!this._styleNode) {
      this._styleNode = document.createElement("style");
      this._styleNode.textContent = STYLE;
      root.appendChild(this._styleNode);
    }
    if (this._cardNode) {
      root.removeChild(this._cardNode);
      this._cardNode = null;
    }

    const card = document.createElement("ha-card");
    /* `show_title: false` garde le titre en configuration mais masque l'en-tete. */
    if (cfg.show_title !== false && cfg.title) card.header = cfg.title;
    if (cfg.background) card.style.background = cfg.background;
    card.style.setProperty("--prix-carburant-color-min", cfg.color_min);
    card.style.setProperty("--prix-carburant-color-max", cfg.color_max);

    const wrap = document.createElement("div");
    wrap.className = "wrap";
    card.appendChild(wrap);
    this._cardNode = card;
    root.appendChild(card);

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = cfg.stations.length
        ? "Aucune des stations demandées n'est remontée par l'intégration."
        : "Aucune station : vérifie l'intégration Prix Carburant.";
      wrap.appendChild(empty);
      return;
    }

    const columns = this._columns();
    const fuels = [];
    columns.forEach(function (c) {
      if (c.fuel) fuels.push(c.fuel);
    });
    const levels = cfg.highlight ? this._levels(rows, fuels) : {};

    const table = document.createElement("table");

    const colgroup = document.createElement("colgroup");
    columns.forEach(function (c) {
      const col = document.createElement("col");
      if (c.width) col.style.width = c.width;
      colgroup.appendChild(col);
    });
    table.appendChild(colgroup);

    const active = this._activeSort();
    const self = this;
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    columns.forEach(function (c) {
      const th = document.createElement("th");
      th.className = c.align;
      th.textContent = c.label;
      if (cfg.sortable && c.sortable && c.key) {
        th.classList.add("sortable");
        th.title = "Trier par " + (c.label || c.key);
        if (active.key === c.key) {
          th.classList.add("sorted");
          const caret = document.createElement("span");
          caret.className = "caret";
          caret.textContent = active.desc ? "▼" : "▲";
          th.appendChild(caret);
        }
        th.addEventListener("click", function () {
          self._toggleSort(c.key);
        });
      }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach(function (row) {
      const tr = document.createElement("tr");
      columns.forEach(function (c) {
        tr.appendChild(self._cell(c, row, levels));
      });
      if (cfg.more_info && row.ids.length) {
        tr.classList.add("clickable");
        tr.addEventListener("click", function () {
          fireEvent(self, "hass-more-info", { entityId: row.ids[0] });
        });
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  _cell(column, row, levels) {
    const cfg = this._config;
    const attrs = row.attrs;
    const td = document.createElement("td");
    td.className = column.align + " col-" + column.key;

    if (column.fuel) {
      const price = row.fuels[column.fuel];
      if (typeof price !== "number") {
        td.textContent = "-";
        return td;
      }
      const text = price.toFixed(cfg.decimals);
      const level = levels[column.fuel];
      if (level && level.min !== null && price === level.min) {
        const span = document.createElement("span");
        span.className = "min";
        span.textContent = text;
        td.appendChild(span);
      } else if (level && level.max !== null && price === level.max) {
        const span = document.createElement("span");
        span.className = "max";
        span.textContent = text;
        td.appendChild(span);
      } else {
        td.textContent = text;
      }
      return td;
    }

    switch (column.key) {
      case "logo": {
        const src = this._logoSrc(row);
        if (src) {
          const img = document.createElement("img");
          img.className = "logo";
          img.src = src;
          img.alt = attrs.brand || "";
          img.loading = "lazy";
          /* Un logo distant ne doit pas apprendre a l'hote tiers l'adresse du
             tableau de bord qui l'affiche. */
          img.referrerPolicy = "no-referrer";
          td.appendChild(img);
        } else {
          td.textContent = attrs.brand || "—";
        }
        break;
      }
      case "name": {
        td.textContent = this._stationName(row);
        break;
      }
      case "city": {
        td.textContent = this._stationCity(row) || "-";
        break;
      }
      case "distance": {
        const km = toNumber(attrs.distance, null);
        td.textContent = km === null ? "-" : km.toFixed(1) + " km";
        break;
      }
      case "updated": {
        td.textContent = row.updated
          ? new Date(row.updated).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit"
            })
          : "-";
        break;
      }
      case "station_id": {
        td.textContent = row.sid;
        break;
      }
      default: {
        const value = attrs[column.key];
        td.textContent = value === undefined || value === null || value === "" ? "-" : String(value);
      }
    }
    return td;
  }
}

/* ---------- editeur graphique ---------- */

const EDITOR_LABELS = {
  title: "Titre",
  show_title: "Afficher le titre",
  sort: "Tri par défaut",
  sort_desc: "Tri décroissant",
  sortable: "En-têtes cliquables pour trier",
  decimals: "Décimales",
  unit: "Unité affichée dans l'en-tête",
  highlight: "Colorer le prix le plus bas / le plus haut",
  more_info: "Clic sur une ligne = fiche de l'entité",
  logo_path: "Préfixe des logos (ex. /local/images/brands/)"
};

const EDITOR_STYLE = [
  ":host { display: block; }",
  "ha-expansion-panel { display: block; margin-bottom: 8px; }",
  /* Repli de secours quand `ha-expansion-panel` n'est pas (encore) enregistre. */
  "details.panel { display: block; margin-bottom: 8px; border: 1px solid var(--divider-color);",
  "  border-radius: 6px; }",
  "details.panel > summary { cursor: pointer; padding: 10px 12px; font-weight: 500;",
  "  color: var(--primary-text-color); }",
  "details.panel > summary .sum { color: var(--secondary-text-color); font-weight: 400; }",
  ".inner { padding: 4px 12px 12px; }",
  ".hint { color: var(--secondary-text-color); font-size: 12px; margin: 0 0 10px; line-height: 1.4; }",

  /* Une ligne = [switch] [libelle + sous-titre] [champs] [fleches]. */
  ".row { display: flex; align-items: center; gap: 8px; padding: 2px 0; min-height: 34px; }",
  ".row.head-row { border-bottom: 1px solid var(--divider-color); margin-bottom: 4px;",
  "  padding-bottom: 6px; }",
  ".row .grow { flex: 1 1 auto; min-width: 0; }",
  ".row.off .label { color: var(--secondary-text-color); }",
  ".row.off .logo-box { opacity: 0.5; }",
  ".label { flex: 0 0 34%; min-width: 0; }",
  ".label .main { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
  "  color: inherit; }",
  ".sub { color: var(--secondary-text-color); font-size: 11px; }",
  /* Entete des colonnes de champs : meme base de flex que les champs eux-memes,
     pour que les libelles tombent bien au-dessus. */
  ".col-head { flex: 1 1 0; min-width: 60px; color: var(--secondary-text-color);",
  "  font-size: 11px; }",
  ".label .sub { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",

  /* Separateur entre la partie active et la partie masquee. */
  ".sep { display: flex; align-items: center; gap: 8px; margin: 10px 0 2px;",
  "  color: var(--secondary-text-color); font-size: 11px; text-transform: uppercase;",
  "  letter-spacing: 0.06em; }",
  ".sep::after { content: ''; flex: 1 1 auto; height: 1px; background: var(--divider-color); }",

  ".sw { flex: 0 0 auto; }",
  "input.sw { width: 18px; height: 18px; margin: 0 6px; accent-color: var(--primary-color); }",

  "input.txt { box-sizing: border-box; height: 32px; padding: 4px 8px;",
  "  border: 1px solid var(--divider-color); border-radius: 4px;",
  "  background: var(--card-background-color, transparent); color: var(--primary-text-color);",
  "  font-family: inherit; font-size: 13px; }",
  "input.txt:focus { outline: none; border-color: var(--primary-color);",
  "  box-shadow: 0 0 0 1px var(--primary-color); }",
  ".row input.txt { flex: 1 1 0; min-width: 60px; }",
  "input.filter { width: 100%; margin: 0 0 8px; }",

  ".logo-box { flex: 0 0 auto; display: flex; align-items: center; justify-content: center;",
  "  width: 36px; height: 24px; border-radius: 3px; background: rgba(127,127,127,0.12); }",
  ".logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }",
  ".logo-box.broken { background: rgba(224,82,82,0.18); }",

  "button.mini { flex: 0 0 auto; width: 30px; height: 30px; line-height: 1;",
  "  border: 1px solid var(--divider-color); border-radius: 4px; cursor: pointer;",
  "  background: transparent; color: var(--primary-text-color); font-size: 13px; }",
  "button.mini:hover:not(:disabled) { background: rgba(127,127,127,0.16); }",
  "button.mini:disabled { opacity: 0.3; cursor: default; }",
  ".empty { color: var(--secondary-text-color); font-size: 13px; padding: 6px 0; }",

  /* Barre laterale etroite : le libelle passe au-dessus des champs. */
  "@media (max-width: 460px) {",
  "  .row { flex-wrap: wrap; padding: 6px 0; }",
  "  .label { flex: 1 1 100%; order: -1; }",
  "  .row input.txt { flex: 1 1 40%; }",
  "}"
].join("\n");

class PrixCarburantCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._built = false;
    this._forms = [];
    this._upgradeWaiting = false;
    this._stationFilter = "";
    /* Meme garde que la carte : l'editeur ouvert ne doit pas se reconstruire
       parce qu'une lampe a change d'etat. */
    this._watched = null;
    this._stateCount = 0;
    this._sigStations = null;
    this._sigColumns = null;
    this._sigNames = null;
    this._sigLogos = null;
  }

  setConfig(config) {
    this._config = Object.assign({}, DEFAULTS, config);
    if (!this._config.columns || !this._config.columns.length) {
      this._config.columns = DEFAULT_COLUMNS.slice();
    }
    if (!Array.isArray(this._config.stations)) this._config.stations = [];
    this._config.stations = this._config.stations.map(String);
    if (!isPlainObject(this._config.station_names)) this._config.station_names = {};
    if (!isPlainObject(this._config.station_cities)) this._config.station_cities = {};
    if (!isPlainObject(this._config.logos)) this._config.logos = {};
    this._config.station_names = stringKeys(this._config.station_names);
    this._config.station_cities = stringKeys(this._config.station_cities);
    this._config.logos = stringKeys(this._config.logos);
    this._watched = null;
    this._render();
  }

  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (readingsUnchanged(previous, hass, this._watched, this._stateCount)) return;
    this._render();
  }

  /* Emet la nouvelle configuration. On nettoie les tables vides pour ne pas
     polluer le YAML avec `station_names: {}`. */
  _emit(patch) {
    const next = Object.assign({}, this._config, patch);
    ["station_names", "station_cities", "logos"].forEach(function (key) {
      const table = next[key];
      if (isPlainObject(table) && !Object.keys(table).length) delete next[key];
    });
    if (!next.title) delete next.title;
    if (!next.logo_path) delete next.logo_path;
    this._config = Object.assign({}, DEFAULTS, next);
    fireEvent(this, "config-changed", { config: next });
  }

  /* Met a jour une entree d'une table de surcharges ; valeur vide = on retire
     la clef, pour ne pas laisser de `"45650001": ""` dans le YAML. */
  _emitTable(table, key, value) {
    const next = Object.assign({}, this._config[table]);
    if (value) next[key] = value;
    else delete next[key];
    const patch = {};
    patch[table] = next;
    this._emit(patch);
  }

  /* ---------- schemas, un par section ----------
     L'editeur suit l'ordre des decisions : quelles stations, dans quel ordre,
     quelles colonnes, puis l'habillage (titre, format, couleurs, logos). */

  _schemaSort() {
    const fuels = PrixCarburantCard.discoverFuels(this._hass);
    /* Toute colonne triable par un clic sur son en-tete doit aussi etre
       proposee ici : le menu et les en-tetes designent le meme tri. */
    const sorts = [
      { value: "distance", label: "Distance" },
      { value: "name", label: "Nom" },
      { value: "brand", label: "Enseigne" },
      { value: "address", label: "Adresse" },
      { value: "city", label: "Ville" },
      { value: "postal_code", label: "Code postal" },
      { value: "station_id", label: "Identifiant de station" },
      { value: "updated", label: "Date de relevé" },
      { value: "manual", label: "Ordre de la liste des stations" }
    ].concat(
      fuels.map(function (f) {
        return { value: f, label: "Prix " + (FUEL_LABELS[f] || f) };
      })
    );
    return [
      { name: "sort", selector: { select: { mode: "dropdown", options: sorts } } },
      { name: "sort_desc", selector: { boolean: {} } },
      { name: "sortable", selector: { boolean: {} } }
    ];
  }

  _schemaDisplay() {
    return [
      { name: "title", selector: { text: {} } },
      { name: "show_title", selector: { boolean: {} } },
      { name: "unit", selector: { text: {} } },
      { name: "decimals", selector: { number: { min: 0, max: 3, mode: "box" } } },
      { name: "highlight", selector: { boolean: {} } },
      { name: "more_info", selector: { boolean: {} } }
    ];
  }

  _schemaLogoPath() {
    return [{ name: "logo_path", selector: { text: {} } }];
  }

  /* ---------- briques d'interface ---------- */

  /* Section repliable. `ha-expansion-panel` quand le frontend l'a enregistre,
     `<details>` sinon : meme contrat (`_body`, `_setSummary`) dans les deux cas,
     le reste de l'editeur n'a pas a savoir lequel est utilise. */
  _section(title, hint, expanded) {
    const useHa = !!customElements.get("ha-expansion-panel");
    const root = document.createElement(useHa ? "ha-expansion-panel" : "details");
    const inner = document.createElement("div");
    inner.className = "inner";

    if (useHa) {
      root.outlined = true;
      root.leftChevron = true;
      root.header = title;
      root.expanded = !!expanded;
      root._setSummary = function (text) {
        root.secondary = text;
      };
    } else {
      root.className = "panel";
      root.open = !!expanded;
      const summary = document.createElement("summary");
      summary.textContent = title + " ";
      const sum = document.createElement("span");
      sum.className = "sum";
      summary.appendChild(sum);
      root.appendChild(summary);
      root._setSummary = function (text) {
        sum.textContent = text ? "— " + text : "";
      };
    }

    if (hint) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = hint;
      inner.appendChild(p);
    }
    const body = document.createElement("div");
    inner.appendChild(body);
    root.appendChild(inner);
    root._body = body;
    root._inner = inner;
    return root;
  }

  /* Titre de groupe entre la partie active et la partie masquee d'une liste :
     sans lui, la frontiere ne tient qu'a une nuance de gris. */
  _separator(text) {
    const sep = document.createElement("div");
    sep.className = "sep";
    sep.textContent = text;
    return sep;
  }

  _button(label, title, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini";
    btn.textContent = label;
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.addEventListener("click", onClick);
    return btn;
  }

  /* `ha-switch` quand le frontend l'a deja enregistre, case a cocher sinon :
     l'editeur reste utilisable meme si l'element n'est pas encore charge. */
  _switch(checked, title, onChange) {
    const useHa = !!customElements.get("ha-switch");
    const el = document.createElement(useHa ? "ha-switch" : "input");
    if (!useHa) el.type = "checkbox";
    el.className = "sw";
    el.checked = !!checked;
    el.title = title;
    el.setAttribute("aria-label", title);
    el.addEventListener("change", function () {
      onChange(!!el.checked);
    });
    return el;
  }

  /* Un interrupteur verrouille sans explication est un bug percu : on dit
     pourquoi il ne bouge pas. */
  _lockSwitch(el, why) {
    el.disabled = true;
    el.title = why;
    el.setAttribute("aria-label", why);
    return el;
  }

  /* Champ texte : on ne commet la valeur qu'au blur / Entree, sinon chaque
     frappe declencherait un config-changed et un re-rendu de l'editeur. */
  _textField(value, placeholder, onCommit) {
    const input = document.createElement("input");
    input.className = "txt";
    input.type = "text";
    input.value = value || "";
    input.placeholder = placeholder || "";
    input.addEventListener("change", function () {
      onCommit(input.value.trim());
    });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") input.blur();
    });
    return input;
  }

  /* ---------- panneau "colonnes" ---------- */

  /* Toutes les colonnes possibles sont listees : actives d'abord, dans l'ordre
     d'affichage, inactives ensuite. Le switch active / desactive, les fleches ne
     servent qu'a ordonner la partie active. */
  _renderColumns() {
    const body = this._panelColumns._body;
    const cfg = this._config;
    const fuels = PrixCarburantCard.discoverFuels(this._hass);
    const available = Object.keys(META).concat(fuels);
    const used = cfg.columns.map(columnKeyOf);
    /* Une colonne configuree mais inconnue du hass (carburant plus remonte)
       reste listee : sinon l'utilisateur ne pourrait plus la desactiver. */
    used.forEach(function (key) {
      if (key && available.indexOf(key) === -1) available.push(key);
    });
    const signature = JSON.stringify(cfg.columns) + "|" + available.join(",");
    if (signature === this._sigColumns) return;
    this._sigColumns = signature;
    body.innerHTML = "";

    const self = this;
    const inactive = available.filter(function (key) {
      return used.indexOf(key) === -1;
    });
    const entries = cfg.columns
      .map(function (entry, index) {
        return { key: columnKeyOf(entry), entry: entry, index: index };
      })
      .concat(
        inactive.map(function (key) {
          return { key: key, entry: null, index: -1 };
        })
      );

    let separated = false;
    entries.forEach(function (item) {
      const active = item.index !== -1;
      if (!active && !separated) {
        separated = true;
        if (cfg.columns.length) body.appendChild(self._separator("Masquées"));
      }
      const custom =
        isPlainObject(item.entry) && item.entry.name !== undefined ? item.entry.name : null;
      const isFuel = !META[item.key];
      const row = document.createElement("div");
      row.className = active ? "row" : "row off";

      const toggle = self._switch(
        active,
        (active ? "Masquer" : "Afficher") + " la colonne " + columnLabelOf(item.key),
        function () {
          self._toggleColumn(item.key, !active);
        }
      );
      /* La derniere colonne active ne peut pas etre retiree : une liste vide
         serait reinterpretee comme "colonnes par defaut". */
      if (active && cfg.columns.length === 1) {
        self._lockSwitch(toggle, "Au moins une colonne doit rester affichée");
      }
      row.appendChild(toggle);

      row.appendChild(
        self._label(
          custom !== null ? String(custom) : columnLabelOf(item.key),
          custom !== null ? item.key : isFuel ? "prix " + item.key : null
        )
      );

      const up = self._button("▲", "Monter " + columnLabelOf(item.key), function () {
        self._moveColumn(item.index, -1);
      });
      up.disabled = !active || item.index === 0;
      const down = self._button("▼", "Descendre " + columnLabelOf(item.key), function () {
        self._moveColumn(item.index, 1);
      });
      down.disabled = !active || item.index === cfg.columns.length - 1;

      row.appendChild(up);
      row.appendChild(down);
      body.appendChild(row);
    });
  }

  /* Libelle principal + precision discrete (identifiant YAML, ville, distance) :
     l'utilisateur reconnait la ligne sans avoir a survoler pour lire un title. */
  _label(main, sub) {
    const box = document.createElement("div");
    box.className = "label grow";
    const strong = document.createElement("span");
    strong.className = "main";
    strong.textContent = main;
    box.appendChild(strong);
    if (sub) {
      const small = document.createElement("span");
      small.className = "sub";
      small.textContent = sub;
      box.appendChild(small);
    }
    box.title = sub ? main + " — " + sub : main;
    return box;
  }

  /* `ha-switch` et `ha-expansion-panel` peuvent n'etre enregistres qu'apres le
     premier rendu : on reconstruit l'editeur une fois, avec les vrais elements
     plutot qu'avec les solutions de repli. */
  _awaitUpgrade() {
    if (this._upgradeWaiting) return;
    const missing = ["ha-switch", "ha-expansion-panel"].filter(function (tag) {
      return !customElements.get(tag);
    });
    if (!missing.length) return;
    this._upgradeWaiting = true;
    const self = this;
    /* `race` et non `all` : chaque element enregistre declenche une seule
       reconstruction, et l'attente repart pour ceux qui manquent encore. */
    Promise.race(
      missing.map(function (tag) {
        return customElements.whenDefined(tag);
      })
    ).then(function () {
      self._upgradeWaiting = false;
      self._rebuild();
    });
  }

  _rebuild() {
    if (!this._built) return;
    this.shadowRoot.innerHTML = "";
    this._built = false;
    this._forms = [];
    this._sigStations = null;
    this._sigColumns = null;
    this._sigNames = null;
    this._sigLogos = null;
    this._render();
  }

  _toggleColumn(key, enable) {
    const columns = this._config.columns.slice();
    if (enable) {
      columns.push(key);
    } else {
      for (let i = columns.length - 1; i >= 0; i--) {
        if (columnKeyOf(columns[i]) === key) columns.splice(i, 1);
      }
    }
    this._emit({ columns: columns });
  }

  _moveColumn(index, delta) {
    const columns = this._config.columns.slice();
    const target = index + delta;
    if (target < 0 || target >= columns.length) return;
    const moved = columns.splice(index, 1)[0];
    columns.splice(target, 0, moved);
    this._emit({ columns: columns });
  }

  /* ---------- panneau "stations" ---------- */

  /* Meme logique que les colonnes : toutes les stations connues sont listees,
     les affichees d'abord. `stations: []` en configuration signifie "toutes, y
     compris celles que l'integration ajoutera plus tard" : c'est l'interrupteur
     de tete, et il verrouille les autres. */
  _renderStations() {
    const body = this._panelStations._body;
    const cfg = this._config;
    const known = PrixCarburantCard.discoverStations(this._hass);
    const all = !cfg.stations.length;
    const filter = (this._stationFilter || "").toLowerCase();
    const signature =
      JSON.stringify(cfg.stations) +
      "|" +
      filter +
      "|" +
      known
        .map(function (s) {
          return s.sid + ":" + s.name + ":" + s.city;
        })
        .join(",");
    if (signature === this._sigStations) return;
    this._sigStations = signature;
    body.innerHTML = "";

    /* Le filtre n'apparait que quand la liste devient difficile a parcourir. */
    this._filterField.style.display = known.length > 8 || filter ? "" : "none";

    const self = this;

    const head = document.createElement("div");
    head.className = "row head-row";
    head.appendChild(
      this._switch(all, "Suivre automatiquement toutes les stations", function (checked) {
        self._emit({
          stations: checked
            ? []
            : known.map(function (s) {
                return s.sid;
              })
        });
      })
    );
    head.appendChild(
      this._label(
        "Toutes les stations",
        all ? "les futures stations seront ajoutées" : "liste figée ci-dessous"
      )
    );
    body.appendChild(head);

    if (!known.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Aucune station remontée par l'intégration.";
      body.appendChild(empty);
      return;
    }

    /* Ordre affiche : celui de la configuration, puis les stations exclues. */
    const active = all
      ? []
      : cfg.stations.filter(function (sid) {
          return known.some(function (s) {
            return s.sid === sid;
          });
        });
    const entries = active
      .map(function (sid, index) {
        const found = known.filter(function (s) {
          return s.sid === sid;
        })[0];
        return { station: found, index: index };
      })
      .concat(
        known
          .filter(function (s) {
            return active.indexOf(s.sid) === -1;
          })
          .map(function (s) {
            return { station: s, index: -1 };
          })
      );

    const matching = entries.filter(function (item) {
      if (!filter) return true;
      const s = item.station;
      return (s.name + " " + s.city + " " + s.brand + " " + s.sid).toLowerCase().indexOf(filter) !== -1;
    });

    if (!matching.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Aucune station ne correspond à « " + this._stationFilter + " ».";
      body.appendChild(empty);
      return;
    }

    let separated = false;
    matching.forEach(function (item) {
      const station = item.station;
      const on = all || item.index !== -1;
      if (!on && !separated) {
        separated = true;
        if (active.length) body.appendChild(self._separator("Masquées"));
      }
      const row = document.createElement("div");
      row.className = on ? "row" : "row off";

      const toggle = self._switch(
        on,
        (on ? "Masquer" : "Afficher") + " " + station.name,
        function () {
          self._toggleStation(station.sid, !on, known);
        }
      );
      /* Tout desactiver reviendrait a `stations: []`, soit "toutes" : on garde
         au moins une station active. */
      if (all) {
        self._lockSwitch(toggle, "Mode automatique : coupe « Toutes les stations » d'abord");
      } else if (on && active.length === 1) {
        self._lockSwitch(toggle, "Au moins une station doit rester affichée");
      }
      row.appendChild(toggle);

      const details = [];
      if (station.city) details.push(station.city);
      if (isFinite(station.distance)) details.push(station.distance.toFixed(1) + " km");
      details.push(station.sid);
      row.appendChild(self._label(station.name, details.join(" · ")));

      const up = self._button("▲", "Monter " + station.name, function () {
        self._moveStation(item.index, -1);
      });
      up.disabled = all || !on || item.index === 0 || !!filter;
      const down = self._button("▼", "Descendre " + station.name, function () {
        self._moveStation(item.index, 1);
      });
      down.disabled = all || !on || item.index === active.length - 1 || !!filter;

      row.appendChild(up);
      row.appendChild(down);
      body.appendChild(row);
    });
  }

  /* Champ de recherche, place hors du corps reconstruit a chaque frappe : sinon
     il serait detruit et le focus perdu des le premier caractere. */
  _stationFilterField() {
    const self = this;
    const input = document.createElement("input");
    input.className = "txt filter";
    input.type = "search";
    input.placeholder = "Filtrer les stations…";
    input.setAttribute("aria-label", "Filtrer les stations");
    input.addEventListener("input", function () {
      self._stationFilter = input.value.trim();
      self._sigStations = null;
      self._renderStations();
    });
    return input;
  }

  _toggleStation(sid, enable, known) {
    const cfg = this._config;
    /* Premiere exclusion depuis "toutes" : on materialise la liste. */
    const current = cfg.stations.length
      ? cfg.stations.slice()
      : known.map(function (s) {
          return s.sid;
        });
    let next;
    if (enable) {
      next = current.indexOf(sid) === -1 ? current.concat([sid]) : current;
    } else {
      next = current.filter(function (item) {
        return item !== sid;
      });
      if (!next.length) return;
    }
    this._emit({ stations: next });
  }

  _moveStation(index, delta) {
    const stations = this._config.stations.slice();
    const target = index + delta;
    if (index < 0 || target < 0 || target >= stations.length) return;
    const moved = stations.splice(index, 1)[0];
    stations.splice(target, 0, moved);
    this._emit({ stations: stations });
  }

  /* ---------- panneau "noms des stations" ---------- */

  _renderNames() {
    const body = this._panelNames._body;
    const cfg = this._config;
    const all = PrixCarburantCard.discoverStations(this._hass);
    /* On ne propose que les stations effectivement affichees, plus celles deja
       renommees (une surcharge orpheline doit rester modifiable). */
    const shown = all.filter(function (s) {
      return !cfg.stations.length || cfg.stations.indexOf(s.sid) !== -1;
    });
    Object.keys(cfg.station_names)
      .concat(Object.keys(cfg.station_cities))
      .forEach(function (sid) {
        const known = shown.some(function (s) {
          return s.sid === sid;
        });
        if (!known) shown.push({ sid: sid, name: sid, brand: "", city: "" });
      });

    const signature = shown
      .map(function (s) {
        return (
          s.sid + "=" + (cfg.station_names[s.sid] || "") + "/" + (cfg.station_cities[s.sid] || "")
        );
      })
      .join(";");
    if (signature === this._sigNames) return;
    this._sigNames = signature;
    body.innerHTML = "";

    if (!shown.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Aucune station remontée par l'intégration.";
      body.appendChild(empty);
      return;
    }

    const self = this;
    const legend = document.createElement("div");
    legend.className = "row head-row";
    legend.appendChild(this._label("Station", null));
    ["Nom affiché", "Ville affichée"].forEach(function (text) {
      const cell = document.createElement("div");
      cell.className = "col-head";
      cell.textContent = text;
      legend.appendChild(cell);
    });
    body.appendChild(legend);

    shown.forEach(function (station) {
      const row = document.createElement("div");
      row.className = "row";
      row.appendChild(self._label(station.name, station.sid));
      row.appendChild(
        self._textField(cfg.station_names[station.sid], station.name, function (value) {
          self._emitTable("station_names", station.sid, value);
        })
      );
      row.appendChild(
        self._textField(cfg.station_cities[station.sid], station.city || "Ville", function (value) {
          self._emitTable("station_cities", station.sid, value);
        })
      );
      body.appendChild(row);
    });
  }

  /* ---------- panneau "logos" ---------- */

  _renderLogos() {
    const body = this._panelLogos._body;
    const cfg = this._config;
    const brands = PrixCarburantCard.discoverBrands(this._hass);
    /* Clefs configurees a la main (station_id ou enseigne inconnue). */
    Object.keys(cfg.logos).forEach(function (key) {
      const known = brands.some(function (b) {
        return b.key === key;
      });
      if (!known) brands.push({ key: key, label: key });
    });

    const signature =
      brands
        .map(function (b) {
          return b.key + "=" + (cfg.logos[b.key] || "");
        })
        .join(";") +
      "|" +
      cfg.logo_path;
    if (signature === this._sigLogos) return;
    this._sigLogos = signature;
    body.innerHTML = "";

    if (!brands.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Aucune enseigne remontée par l'intégration.";
      body.appendChild(empty);
      return;
    }

    const self = this;
    brands.forEach(function (brand) {
      const row = document.createElement("div");
      row.className = cfg.logos[brand.key] ? "row" : "row off";

      /* Cadre toujours present : la colonne d'apercus reste alignee, et une URL
         cassee se voit tout de suite (fond rouge) au lieu d'un blanc ambigu. */
      const box = document.createElement("div");
      box.className = "logo-box";
      let src = cfg.logos[brand.key] || "";
      if (src && cfg.logo_path && !isAbsoluteUrl(src)) src = cfg.logo_path + src;
      if (src) {
        const preview = document.createElement("img");
        preview.src = src;
        preview.alt = "";
        preview.addEventListener("error", function () {
          box.classList.add("broken");
          box.title = "Image introuvable : " + src;
          preview.remove();
        });
        box.appendChild(preview);
      }
      row.appendChild(box);

      row.appendChild(self._label(brand.label, brand.key));

      row.appendChild(
        self._textField(cfg.logos[brand.key], "fichier.png ou URL", function (value) {
          self._emitTable("logos", brand.key, value);
        })
      );
      body.appendChild(row);
    });
  }

  /* ---------- assemblage ---------- */

  /* Un `ha-form` par section. Chacun recoit la configuration complete en `data`
     et ne declare qu'une partie du schema : l'evenement `value-changed` renvoie
     l'objet entier, les clefs des autres sections sont donc preservees. */
  _form(schemaName) {
    const form = document.createElement("ha-form");
    form.computeLabel = function (schema) {
      return EDITOR_LABELS[schema.name] || schema.name;
    };
    const self = this;
    form.addEventListener("value-changed", function (ev) {
      ev.stopPropagation();
      self._emit(ev.detail.value);
    });
    form._schemaName = schemaName;
    this._forms.push(form);
    return form;
  }

  _build() {
    const style = document.createElement("style");
    style.textContent = EDITOR_STYLE;
    this.shadowRoot.appendChild(style);
    this._forms = [];

    /* 1. Quelles stations. Seule section ouverte d'emblee : c'est la premiere
       decision, les autres ont toutes une valeur par defaut acceptable. */
    this._panelStations = this._section(
      "Stations",
      "Interrupteur pour afficher ou masquer, ▲ / ▼ pour ordonner (tri « Ordre de la " +
        "liste des stations »).",
      true
    );
    this._filterField = this._stationFilterField();
    this._panelStations._inner.insertBefore(this._filterField, this._panelStations._body);

    /* 2. Dans quel ordre. */
    this._panelSort = this._section("Tri", "Ordre de départ du tableau et tri au clic.", false);
    this._panelSort._body.appendChild(this._form("sort"));

    /* 3. Quelles colonnes, dans quel ordre. */
    this._panelColumns = this._section(
      "Colonnes",
      "Interrupteur pour afficher ou masquer, ▲ / ▼ pour ordonner. Les colonnes " +
        "affichées sont regroupées en tête de liste, dans leur ordre d'affichage.",
      false
    );

    /* 4. Habillage. */
    this._panelDisplay = this._section("Affichage", null, false);
    this._panelDisplay._body.appendChild(this._form("display"));

    this._panelNames = this._section(
      "Noms et villes",
      "Laisser vide pour garder la valeur fournie par l'intégration.",
      false
    );

    this._panelLogos = this._section(
      "Logos des enseignes",
      "Fichier relatif au préfixe ci-dessous, ou URL / chemin absolu.",
      false
    );
    /* Le prefixe est insere avant le corps du panneau, que `_renderLogos` vide. */
    this._panelLogos._inner.insertBefore(this._form("logoPath"), this._panelLogos._body);

    [
      this._panelStations,
      this._panelSort,
      this._panelColumns,
      this._panelDisplay,
      this._panelNames,
      this._panelLogos
    ].forEach(
      function (panel) {
        this.shadowRoot.appendChild(panel);
      }.bind(this)
    );
    this._built = true;
    this._awaitUpgrade();
  }

  /* Chaque section replie affiche son etat : l'utilisateur sait ce qu'il y a
     dedans sans l'ouvrir, et voit l'effet de ses reglages precedents. */
  _summaries() {
    const cfg = this._config;
    const known = PrixCarburantCard.discoverStations(this._hass);
    const fuels = PrixCarburantCard.discoverFuels(this._hass);
    const total = Object.keys(META).length + fuels.length;

    this._panelStations._setSummary(
      !known.length
        ? "aucune station détectée"
        : cfg.stations.length
          ? cfg.stations.length + " sur " + known.length
          : "toutes (" + known.length + ")"
    );

    const sorts = this._schemaSort()[0].selector.select.options;
    let sortLabel = cfg.sort;
    sorts.forEach(function (option) {
      if (option.value === cfg.sort) sortLabel = option.label;
    });
    this._panelSort._setSummary(
      sortLabel +
        (cfg.sort_desc ? " ↓" : " ↑") +
        (cfg.sortable ? "" : " · en-têtes non cliquables")
    );

    this._panelColumns._setSummary(cfg.columns.length + " sur " + total);

    const titleState = cfg.show_title === false || !cfg.title ? "sans titre" : cfg.title;
    this._panelDisplay._setSummary(titleState + " · " + cfg.decimals + " décimales");

    const overrides =
      Object.keys(cfg.station_names).length + Object.keys(cfg.station_cities).length;
    this._panelNames._setSummary(
      overrides ? overrides + (overrides > 1 ? " surcharges" : " surcharge") : "aucune surcharge"
    );

    const logos = Object.keys(cfg.logos).length;
    this._panelLogos._setSummary(
      logos ? logos + (logos > 1 ? " logos définis" : " logo défini") : "aucun logo"
    );
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._built) this._build();

    this._watched = PrixCarburantCard.readings(this._hass).map(function (r) {
      return r.id;
    });
    this._stateCount = statesCount(this._hass);

    const self = this;
    this._forms.forEach(function (form) {
      form.hass = self._hass;
      if (form._schemaName === "sort") form.schema = self._schemaSort();
      else if (form._schemaName === "display") form.schema = self._schemaDisplay();
      else form.schema = self._schemaLogoPath();
      form.data = self._config;
    });

    this._renderStations();
    this._renderColumns();
    this._renderNames();
    this._renderLogos();
    this._summaries();
  }
}

if (!customElements.get("prix-carburant-card")) {
  customElements.define("prix-carburant-card", PrixCarburantCard);
}
if (!customElements.get("prix-carburant-card-editor")) {
  customElements.define("prix-carburant-card-editor", PrixCarburantCardEditor);
}

/* Selecteur de carte "par entite" (HA 2026.6+) : quand l'utilisateur clique sur
   un sensor de l'integration, on propose deux mises en page pretes a l'emploi.
   Renvoyer `null` pour toute autre entite est une obligation du contrat. */
const entitySuggestion = function (hass, entityId) {
  const state = hass && hass.states ? hass.states[entityId] : null;
  const attrs = state ? state.attributes : null;
  if (!attrs) return null;
  if (attrs.station_id === undefined || attrs.station_id === null) return null;
  if (!attrs.fuel_type) return null;

  const sid = String(attrs.station_id);
  const fuel = String(attrs.fuel_type);
  const fuelLabel = FUEL_LABELS[fuel] || fuel;
  const allFuels = PrixCarburantCard.discoverFuels(hass);
  const stationName = stationLabel(attrs, sid);

  return [
    {
      label: "Comparer les stations — " + fuelLabel,
      config: {
        type: "custom:prix-carburant-card",
        title: "Prix " + fuelLabel,
        columns: ["logo", "name", "distance", fuel, "updated"],
        sort: fuel
      }
    },
    {
      label: "Cette station, tous carburants",
      config: {
        type: "custom:prix-carburant-card",
        title: stationName,
        stations: [sid],
        columns: ["logo", "name"].concat(allFuels).concat(["updated"])
      }
    }
  ];
};

window.customCards = window.customCards || [];
/* Le fichier peut etre declare deux fois en ressources (migration manuelle puis
   HACS) : sans ce garde-fou, la carte apparaitrait en double dans le selecteur. */
const alreadyRegistered = window.customCards.some(function (entry) {
  return entry && entry.type === "prix-carburant-card";
});
if (!alreadyRegistered) {
  window.customCards.push({
    type: "prix-carburant-card",
    name: "Prix Carburant",
    preview: true,
    description: "Tableau des prix des carburants : choix des stations et des colonnes.",
    getEntitySuggestion: entitySuggestion
  });
}
