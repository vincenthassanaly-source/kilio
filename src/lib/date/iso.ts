import { format } from "date-fns";

// Une date métier (échéance, entrée d'habitude, valeur d'objectif...) est
// stockée en base comme une colonne `date` sans fuseau horaire : on la
// parse/formatte toujours en heure locale à minuit pour éviter les
// décalages de jour liés au fuseau du navigateur/serveur.
export function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// `T00:00:00Z` + setters UTC : arithmétique de date pure, indépendante du
// fuseau d'exécution (contrairement à parseISODate/toISODate ci-dessus,
// à ne jamais mélanger avec un `.toISOString()`, voir
// src/lib/habitudes/compute.ts pour le bug que ce mélange a causé).
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
