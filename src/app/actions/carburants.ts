"use server";

import {
  exclureSansPrixSansPlomb,
  meilleurPrixSansPlomb,
  trierParPrixCroissant,
  type TypeCarburantSansPlomb,
} from "@/lib/carburants/compute";

// Dataset officiel du Ministère de l'Économie (OpenDataSoft, Explore API
// v2.1), gratuit et sans clé.
//
// Cause racine du bug des distances aberrantes (ex. 671 km pour un rayon de
// 10 km) : l'appel utilisait `geofilter.distance=lat,lon,rayonMetres`, un
// paramètre de l'API Search v1 d'OpenDataSoft — inexistant sur l'Explore API
// v2.1 utilisée ici. Silencieusement ignoré par le serveur, il ne filtrait
// donc rien : l'API renvoyait ses `limit` premiers résultats dans un ordre
// non géographique. Confirmé par la doc officielle OpenDataSoft (changelog
// v2.0 → v2.1, help.opendatasoft.com/apis/ods-explore-v2/) : le filtre
// géographique passe désormais par le langage ODSQL, paramètre `where`, via
// `within_distance(<champ_geo>, geom'POINT(<lon> <lat>)', <distance>km)` —
// syntaxe utilisée ci-dessous.
//
// Le nom exact du champ géographique (`geom`, hypothèse retenue vu l'export
// GeoJSON du dataset) et les noms des champs de prix (`sp95_prix`, etc.)
// n'ont en revanche toujours pas pu être vérifiés par un appel de test réel :
// l'accès réseau sortant vers data.economie.gouv.fr est bloqué par la
// politique d'égress de la session Claude Code (403 confirmé à trois
// reprises désormais, sur trois sessions différentes — voir reports/). Le
// parsing reste donc volontairement tolérant (champs optionnels, plusieurs
// variantes de forme essayées) pour ne jamais planter si un nom diffère
// légèrement en prod, et le filtrage défensif par distance ci-dessous (voir
// `MARGE_DISTANCE`) reste en place comme garde-fou final : même si
// `within_distance` échouait à son tour ou visait le mauvais champ, aucune
// station hors du rayon demandé ne peut être affichée, la distance étant
// systématiquement recalculée nous-mêmes à partir du point géographique
// effectivement extrait par `extraireGeoPoint`.
const DATASET_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const LIMITE_RESULTATS = 50;
// Marge appliquée au filtrage défensif par distance, pour absorber les
// petits écarts entre notre calcul haversine et une éventuelle imprécision
// de géocodage de l'API (pas pour couvrir un `geofilter.distance` défaillant
// à grande échelle : une station à 671 km reste exclue quel que soit le rayon
// demandé).
const MARGE_DISTANCE = 1.1;

export type StationCarburant = {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  distanceMetres: number;
  meilleurPrix: number;
  typeCarburant: TypeCarburantSansPlomb;
  dateMaj: string | null;
  lat: number;
  lon: number;
};

export type ResultatStationsProches = { ok: true; stations: StationCarburant[] } | { ok: false; erreur: string };

type EnregistrementApi = Record<string, unknown>;

function versNombre(valeur: unknown): number | null {
  if (typeof valeur === "number" && Number.isFinite(valeur)) return valeur;
  if (typeof valeur === "string" && valeur.trim() !== "") {
    const n = Number(valeur.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function versChaine(valeur: unknown): string | null {
  return typeof valeur === "string" && valeur.trim() !== "" ? valeur.trim() : null;
}

/** Le champ géographique OpenDataSoft s'appelle en général `geom` (parfois
 * dupliqué en `geo_point_2d`) et peut prendre la forme `{lat, lon}` ou
 * GeoJSON `{type, coordinates: [lon, lat]}` — on tente les deux. */
function extraireGeoPoint(record: EnregistrementApi): { lat: number; lon: number } | null {
  for (const cle of ["geom", "geo_point_2d"]) {
    const valeur = record[cle];
    if (!valeur || typeof valeur !== "object") continue;
    const obj = valeur as EnregistrementApi;

    const lat = versNombre(obj.lat);
    const lon = versNombre(obj.lon);
    if (lat !== null && lon !== null) return { lat, lon };

    const coordinates = obj.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const lonC = versNombre(coordinates[0]);
      const latC = versNombre(coordinates[1]);
      if (lonC !== null && latC !== null) return { lat: latC, lon: lonC };
    }

    const geometry = obj.geometry as EnregistrementApi | undefined;
    const geometryCoords = geometry?.coordinates;
    if (Array.isArray(geometryCoords) && geometryCoords.length >= 2) {
      const lonC = versNombre(geometryCoords[0]);
      const latC = versNombre(geometryCoords[1]);
      if (lonC !== null && latC !== null) return { lat: latC, lon: lonC };
    }
  }
  return null;
}

function extrairePrixCarburant(record: EnregistrementApi, prefixe: string): { prix: number | null; maj: string | null } {
  return {
    prix: versNombre(record[`${prefixe}_prix`]),
    maj: versChaine(record[`${prefixe}_maj`]),
  };
}

/** Distance orthodromique (haversine), en mètres. */
function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const RAYON_TERRE_M = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return RAYON_TERRE_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Stations essence les moins chères en sans plomb (SP95/SP98/E10) dans un
 * rayon donné autour d'un point. Position variable à chaque appel (position
 * GPS de l'utilisateur) donc pas de cache pertinent. Ne lève jamais : les
 * échecs réseau ou de parsing renvoient `{ ok: false, erreur }`. */
export async function getStationsProches(lat: number, lon: number, rayonKm: number): Promise<ResultatStationsProches> {
  try {
    const rayonMetres = Math.round(rayonKm * 1000);
    // ODSQL (Explore API v2.1) : `geom'POINT(lon lat)'` — ordre lon/lat, pas
    // lat/lon. `encodeURIComponent` porte uniquement sur la clause `where`,
    // pas sur l'URL entière, pour ne pas casser `limit`.
    const where = `within_distance(geom, geom'POINT(${lon} ${lat})', ${rayonKm}km)`;
    const url = `${DATASET_URL}?limit=${LIMITE_RESULTATS}&where=${encodeURIComponent(where)}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, erreur: `L'API carburants a répondu avec le statut ${res.status}.` };
    }

    const data = (await res.json()) as { results?: EnregistrementApi[] };
    const records = Array.isArray(data.results) ? data.results : [];

    const brutes = records.map((record) => {
      const point = extraireGeoPoint(record);
      const sp95 = extrairePrixCarburant(record, "sp95");
      const sp98 = extrairePrixCarburant(record, "sp98");
      const e10 = extrairePrixCarburant(record, "e10");
      const meilleur = meilleurPrixSansPlomb({ sp95: sp95.prix, sp98: sp98.prix, e10: e10.prix });

      const dateMajParType: Record<TypeCarburantSansPlomb, string | null> = {
        SP95: sp95.maj,
        SP98: sp98.maj,
        E10: e10.maj,
      };

      const idBrut = record.id;
      const id = typeof idBrut === "string" ? idBrut : typeof idBrut === "number" ? String(idBrut) : null;

      return {
        id,
        nom: versChaine(record.nom) ?? versChaine(record.adresse) ?? "Station-service",
        adresse: versChaine(record.adresse) ?? "",
        ville: versChaine(record.ville) ?? "",
        point,
        meilleurPrix: meilleur,
        dateMajParType,
      };
    });

    const utilisables = brutes.filter(
      (station): station is typeof station & { id: string; point: { lat: number; lon: number } } =>
        station.id !== null && station.point !== null
    );

    // Exclusion des stations sans prix sans plomb, une seule fois, avant de
    // construire la forme finale (plate) exposée au client.
    const avecPrix = exclureSansPrixSansPlomb(utilisables);

    const stationsAvecDistance = avecPrix.map((station) => ({
      id: station.id,
      nom: station.nom,
      adresse: station.adresse,
      ville: station.ville,
      distanceMetres: distanceMetres(lat, lon, station.point.lat, station.point.lon),
      meilleurPrix: station.meilleurPrix.prix,
      typeCarburant: station.meilleurPrix.type,
      dateMaj: station.dateMajParType[station.meilleurPrix.type],
      lat: station.point.lat,
      lon: station.point.lon,
    }));

    // Filtrage défensif : `within_distance` n'a pas pu être vérifié en
    // conditions réelles (voir commentaire en tête de fichier — accès réseau
    // toujours bloqué). On exclut nous-mêmes toute station au-delà du rayon
    // demandé (+ marge), quel que soit ce que l'API a réellement renvoyé côté
    // serveur — c'est ce garde-fou, indépendant de la clause `where`, qui
    // évite d'afficher une station à 671 km pour un rayon de 10 km.
    const rayonMaxMetres = rayonMetres * MARGE_DISTANCE;
    const dansLeRayon = stationsAvecDistance.filter((station) => station.distanceMetres <= rayonMaxMetres);

    const stations: StationCarburant[] = trierParPrixCroissant(dansLeRayon);

    return { ok: true, stations };
  } catch {
    return { ok: false, erreur: "Impossible de contacter l'API carburants. Vérifiez votre connexion." };
  }
}
