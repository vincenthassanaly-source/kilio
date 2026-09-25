"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import type { Tables } from "@/lib/supabase/types";

// Table singleton : une seule ligne, id fixé à 1 (voir
// migration-nettoyage-auto-2026-09-11.sql).
const REGLAGES_ID = 1;

export type ReglagesNettoyage = Tables<"reglages_nettoyage">;

export async function getReglagesNettoyage(): Promise<ReglagesNettoyage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reglages_nettoyage")
    .select("*")
    .eq("id", REGLAGES_ID)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Contrat `ActionResult` (T1).
export async function updateReglagesNettoyage(actif: boolean, delaiJours: number): Promise<ActionResult> {
  if (!Number.isInteger(delaiJours) || delaiJours < 1) {
    return fail("Le délai doit être un nombre entier de jours supérieur ou égal à 1.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reglages_nettoyage")
    .update({ actif, delai_jours: delaiJours })
    .eq("id", REGLAGES_ID);

  if (error) return fail("Le réglage n'a pas pu être enregistré. Réessaie.");

  revalidatePath("/reglages");
  return ok();
}
