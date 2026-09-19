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
