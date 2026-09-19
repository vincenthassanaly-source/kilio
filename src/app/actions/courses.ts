"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";

export async function getCoursesItems(): Promise<Tables<"courses_items">[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("courses_items")
    .select("*")
    .order("coche", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCourseItem(libelle: string) {
  const trimmed = libelle.trim();
  if (!trimmed) throw new Error("Le libellé est requis.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("courses_items").insert({ libelle: trimmed });

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}

export async function toggleCourseItem(id: string, coche: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("courses_items").update({ coche }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}

export async function deleteCourseItem(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("courses_items").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}

export async function updateCourseItem(id: string, libelle: string) {
  const trimmed = libelle.trim();
  if (!trimmed) throw new Error("Le libellé est requis.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("courses_items").update({ libelle: trimmed }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}

// Suppression groupée par ids exacts (jamais `where coche = true`) : pour
// que « Annuler » (restoreCourseItems ci-dessous) restaure précisément
// l'ensemble d'articles vu par l'utilisateur au moment du tap, même si un
// autre article a été coché entre-temps.
export async function deleteCourseItems(ids: string[]) {
  if (ids.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("courses_items").delete().in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CourseItemARestaurer = Pick<
  Tables<"courses_items">,
  "id" | "libelle" | "coche" | "created_at" | "termine_le"
>;

// Réinsère des articles complets (id, libelle, coche, created_at, termine_le
// d'origine — jamais updated_at, qui doit refléter la restauration elle-même,
// pas la création d'origine) pour annuler une suppression unitaire ou
// groupée : l'article revient au même id et à la même place dans la liste.
// `upsert(..., { ignoreDuplicates: true })` sur la clé primaire `id` rend
// l'opération idempotente (rejouer deux fois la même annulation, ex. double
// tap ou rejeu de file après un flush partiel, n'échoue pas et ne duplique
// rien). `set_termine_le()` ne réagit qu'aux UPDATE (voir trigger en base),
// donc un INSERT avec `coche`/`termine_le` explicites n'est jamais réécrit.
export async function restoreCourseItems(items: CourseItemARestaurer[]) {
  if (items.length === 0) return;

  const lignes = items.map((item) => {
    const libelle = item.libelle.trim();
    if (!libelle) throw new Error("Le libellé est requis.");
    if (!UUID_RE.test(item.id)) throw new Error("Identifiant d'article invalide.");
    return {
      id: item.id,
      libelle,
      coche: item.coche,
      created_at: item.created_at,
      termine_le: item.termine_le,
    };
  });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("courses_items")
    .upsert(lignes, { onConflict: "id", ignoreDuplicates: true });

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}
