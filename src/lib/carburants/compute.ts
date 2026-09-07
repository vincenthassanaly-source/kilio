// Fonctions pures du module Carburants : aucun accès réseau ni base de
// données ici, uniquement du calcul sur des données déjà récupérées (voir
// src/app/actions/carburants.ts pour l'appel à l'API et le parsing).

export type TypeCarburantSansPlomb = "SP95" | "SP98" | "E10";

export type PrixParCarburant = {
  sp95: number | null;
  sp98: number | null;
  e10: number | null;
};

export type MeilleurPrix = {
  prix: number;
  type: TypeCarburantSansPlomb;
};

/** Une station peut ne proposer que certains des 3 carburants sans plomb ;
 * renvoie `null` si aucun des 3 n'a de prix connu. */
export function meilleurPrixSansPlomb(prix: PrixParCarburant): MeilleurPrix | null {
  const candidats: MeilleurPrix[] = [];
  if (prix.sp95 !== null) candidats.push({ prix: prix.sp95, type: "SP95" });
  if (prix.sp98 !== null) candidats.push({ prix: prix.sp98, type: "SP98" });
  if (prix.e10 !== null) candidats.push({ prix: prix.e10, type: "E10" });

  if (candidats.length === 0) return null;

  return candidats.reduce((min, candidat) => (candidat.prix < min.prix ? candidat : min));
}

/** Trie par prix croissant en excluant les stations sans aucun prix sans
 * plomb disponible (`meilleurPrix` nul). */
export function trierParPrixCroissant<T extends { meilleurPrix: MeilleurPrix | null }>(
  stations: T[]
): Array<T & { meilleurPrix: MeilleurPrix }> {
  return stations
    .filter((station): station is T & { meilleurPrix: MeilleurPrix } => station.meilleurPrix !== null)
    .sort((a, b) => a.meilleurPrix.prix - b.meilleurPrix.prix);
}

/** "800 m" en dessous d'1 km, "3,2 km" au-delà (une décimale, virgule française). */
export function formaterDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  const km = metres / 1000;
  return `${km.toFixed(1).replace(".", ",")} km`;
}
