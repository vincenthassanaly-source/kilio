// Query keys TanStack Query centralisées : partagées entre les modules qui
// lisent la même donnée (ex. tâches du jour affichées à la fois sur le
// dashboard et dans /taches) pour que toggler une tâche depuis l'une
// invalide/actualise correctement le cache lu par l'autre.
export const queryKeys = {
  taches: ["taches"] as const,
  listes: ["listes"] as const,
  tags: ["tags"] as const,
  notes: ["notes"] as const,
  courses: ["courses"] as const,
  habitudes: (date: string) => ["habitudes", date] as const,
  journal: (date: string, jourType: string) => ["journal", date, jourType] as const,
  objectifNutritionnel: (jourType: string) => ["objectif-nutritionnel", jourType] as const,
  objectifs: ["objectifs"] as const,
  objectif: (id: string) => ["objectif", id] as const,
  collections: ["collections"] as const,
  collection: (id: string) => ["collection", id] as const,
  // Sans mutation côté app (écrites uniquement hors Server Action, cf.
  // skill kilio-planning-travail) : voir AgendaView pour le staleTime dédié.
  planningTravail: ["planning-travail"] as const,
  planningTravailExceptions: ["planning-travail-exceptions"] as const,
};
