import type { Tables } from "@/lib/supabase/types";

// Onglets de vue de /taches (TachesView) : défini ici, dans un module pur,
// pour que les règles qui en dépendent (échéance par défaut) restent
// testables sans importer de composant.
export type VueTache = "aujourdhui" | "en_retard" | "semaine" | "toutes";

/**
 * Échéance à pré-remplir dans le formulaire de création selon l'onglet de
 * vue actif. « Aujourd'hui » et « 7 jours » filtrent sur l'échéance : sans
 * date, la tâche créée serait aussitôt masquée par le filtre qui l'a vue
 * naître. « En retard » et « Toutes » n'imposent aucune date.
 *
 * `today` est fourni par l'appelant (`aujourdhuiISO()` de
 * `@/lib/budget/compute`) : cette fonction reste pure.
 */
export function echeanceParDefaut(vue: VueTache, today: string): string | undefined {
  return vue === "aujourdhui" || vue === "semaine" ? today : undefined;
}

export type ChampsAvancesTache = Pick<
  Tables<"taches">,
  | "heure"
  | "heure_fin"
  | "rappel_minutes"
  | "notes"
  | "programme_jour"
  | "priorite"
  | "toute_la_journee"
  | "recurrence_frequence"
  | "recurrence_fin"
> & {
  images: readonly unknown[];
  tags: readonly unknown[];
};

/**
 * Vrai si au moins un des champs rangés sous « Plus d'options » du
 * formulaire de tâche est renseigné. En édition, le bloc est alors déplié
 * d'office : on ne cache jamais une valeur existante derrière un repli.
 */
export function champsAvancesRenseignes(tache: ChampsAvancesTache): boolean {
  return (
    tache.heure !== null ||
    tache.heure_fin !== null ||
    tache.rappel_minutes !== null ||
    Boolean(tache.notes?.trim()) ||
    tache.programme_jour ||
    tache.images.length > 0 ||
    tache.priorite !== "aucune" ||
    tache.toute_la_journee ||
    tache.tags.length > 0 ||
    tache.recurrence_frequence !== null ||
    tache.recurrence_fin !== null
  );
}
