// Fonctions pures du module Courses : aucun accès réseau ni base de données
// ici, uniquement du groupement sur les items déjà récupérés (voir
// src/app/actions/courses.ts pour la requête).

import type { Tables } from "@/lib/supabase/types";

/** Sépare les articles actifs (non cochés) des archivés (cochés), en
 * conservant l'ordre renvoyé par `getCoursesItems` (coche croissant, puis
 * created_at décroissant) au sein de chaque groupe. */
export function grouperItemsCourses(items: Tables<"courses_items">[]): {
  actifs: Tables<"courses_items">[];
  archives: Tables<"courses_items">[];
} {
  return {
    actifs: items.filter((item) => !item.coche),
    archives: items.filter((item) => item.coche),
  };
}

/** Un article créé hors ligne reçoit un id optimiste `temp-<uuid>`
 * (`AddCourseForm.onMutate`) tant que la création n'a pas été confirmée par
 * le serveur — `courses_items.id` étant une colonne `uuid`, aucune action
 * ciblant cet id ne peut jamais aboutir en base. Utilisé à la fois par le
 * garde-fou d'UI (`CourseItemRow`, désactive cocher/supprimer) et par la
 * politique de la file offline (`src/lib/offline/flush-policy.ts`, purge
 * immédiate sans appel serveur) — voir reports/2026-09-19-audit-module-courses.md
 * constats #13/#15. */
export function estIdTemporaire(id: unknown): boolean {
  return typeof id === "string" && id.startsWith("temp-");
}

/** Reproduit l'ordre exact renvoyé par `getCoursesItems` (coche croissant,
 * donc actifs avant archivés, puis created_at décroissant au sein de chaque
 * groupe) : sert à replacer un article restauré (« Annuler » d'une
 * suppression) au même endroit dans le cache optimiste, sans attendre le
 * refetch serveur. */
export function trierCommeServeur(a: Tables<"courses_items">, b: Tables<"courses_items">): number {
  if (a.coche !== b.coche) return a.coche ? 1 : -1;
  if (a.created_at === b.created_at) return 0;
  return a.created_at < b.created_at ? 1 : -1;
}

export type ProgressionCourses = {
  actifs: number;
  total: number;
  /** `true` seulement quand il y a eu des articles (au moins un archivé) et
   * qu'il n'en reste plus aucun d'actif : distingue « tout est coché » de
   * « aucun article n'a jamais existé », qui garde le message générique
   * existant de `CoursesList` (`items.length === 0`). */
  tousCoches: boolean;
};

/** Compte d'avancement affiché au-dessus de la liste active (« N article(s)
 * à prendre ») et détecte l'état positif « tout est dans le chariot ! ».
 * Fonction pure : ne fait que compter, `CoursesList` décide de l'affichage. */
export function compterProgression(items: Tables<"courses_items">[]): ProgressionCourses {
  const total = items.length;
  const actifs = items.filter((item) => !item.coche).length;
  return { actifs, total, tousCoches: total > 0 && actifs === 0 };
}
