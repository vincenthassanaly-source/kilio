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
