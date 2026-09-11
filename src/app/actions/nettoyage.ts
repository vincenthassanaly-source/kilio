"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function updateReglagesNettoyage(actif: boolean, delaiJours: number): Promise<void> {
  if (!Number.isInteger(delaiJours) || delaiJours < 1) {
    throw new Error("Le délai doit être un nombre entier de jours supérieur ou égal à 1.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reglages_nettoyage")
    .update({ actif, delai_jours: delaiJours })
    .eq("id", REGLAGES_ID);

  if (error) throw new Error(error.message);

  revalidatePath("/reglages");
}
