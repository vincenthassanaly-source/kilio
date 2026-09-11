"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addNutrition,
  hasNutritionOverride,
  nutritionAliment,
  nutritionFromOverride,
  nutritionRecette,
  zeroNutrition,
  type Nutrition,
} from "@/lib/nutrition/compute";
import type { Enums } from "@/lib/supabase/types";

export type JournalFormState = { error: string | null };

// Résumé nutritionnel du jour (consommé + objectif), utilisé par la carte
// Nutrition du dashboard (src/app/(app)/DashboardNutritionCard.tsx) via
// TanStack Query — même calcul que celui fait en Server Component dans
// src/app/(app)/nutrition/journal/page.tsx, exposé ici en lecture
// côté client.
export type ResumeNutritionJour = {
  consomme: Nutrition;
  kcalGoal: number;
  macroGoals: { proteines: number; glucides: number; lipides: number };
};

export async function getResumeNutritionJour(
  date: string,
  jourType: Enums<"jour_type_ppl"> = "repos"
): Promise<ResumeNutritionJour> {
  const supabase = createAdminClient();

  const [{ data: objectif }, { data: entries }] = await Promise.all([
    supabase.from("objectifs_nutritionnels").select("*").eq("jour_type", jourType).maybeSingle(),
    supabase
      .from("journal_repas")
      .select(
        "*, aliment:aliments(*), recette:recettes(id, nom, portions, kcal_portion, proteines_portion, glucides_portion, lipides_portion, recette_ingredients(quantite, aliment:aliments(kcal_100g, proteines_100g, glucides_100g, lipides_100g)))"
      )
      .eq("date", date),
  ]);

  const consomme = (entries ?? []).reduce((acc, entry) => {
    if (entry.aliment) return addNutrition(acc, nutritionAliment(entry.aliment, entry.quantite));
    const recette = entry.recette!;
    return addNutrition(
      acc,
      hasNutritionOverride(recette)
        ? nutritionFromOverride(recette, entry.quantite)
        : nutritionRecette(recette.recette_ingredients, recette.portions, entry.quantite)
    );
  }, zeroNutrition());

  return {
    consomme,
    kcalGoal: objectif?.kcal_cible ?? 2100,
    macroGoals: {
      proteines: objectif?.proteines_cible_g ?? 120,
      glucides: objectif?.glucides_cible_g ?? 230,
      lipides: objectif?.lipides_cible_g ?? 70,
    },
  };
}

const MOMENTS: readonly Enums<"moment_repas">[] = [
  "petit_dej",
  "dejeuner",
  "diner",
  "collation",
];

export async function addJournalEntry(
  _prevState: JournalFormState,
  formData: FormData
): Promise<JournalFormState> {
  const type = String(formData.get("type") ?? "");
  const aliment_id = String(formData.get("aliment_id") ?? "").trim();
  const recette_id = String(formData.get("recette_id") ?? "").trim();
  const quantiteSaisie = Number(formData.get("quantite"));
  const saisieMode = String(formData.get("saisie_mode") ?? "grammes");
  const date = String(formData.get("date") ?? "").trim();
  const moment = String(formData.get("moment") ?? "");

  if (type !== "aliment" && type !== "recette") {
    return { error: "Type d'entrée invalide." };
  }
  if (!date) return { error: "Date requise." };
  if (!MOMENTS.includes(moment as Enums<"moment_repas">)) {
    return { error: "Moment du repas invalide." };
  }
  if (!Number.isFinite(quantiteSaisie) || quantiteSaisie <= 0) {
    return { error: "La quantité doit être un nombre positif." };
  }
  if (type === "aliment" && !aliment_id) return { error: "Aliment requis." };
  if (type === "recette" && !recette_id) return { error: "Recette requise." };
  if (saisieMode !== "grammes" && saisieMode !== "piece") {
    return { error: "Mode de saisie invalide." };
  }

  const supabase = createAdminClient();

  let quantite = quantiteSaisie;
  if (type === "aliment" && saisieMode === "piece") {
    const { data: aliment, error: alimentError } = await supabase
      .from("aliments")
      .select("poids_unite_g")
      .eq("id", aliment_id)
      .single();

    if (alimentError || !aliment) return { error: "Aliment introuvable." };
    if (aliment.poids_unite_g === null) {
      return {
        error: "Cet aliment n'a pas de poids par pièce défini : saisis une quantité en grammes.",
      };
    }
    quantite = quantiteSaisie * aliment.poids_unite_g;
  }

  const { error } = await supabase.from("journal_repas").insert({
    aliment_id: type === "aliment" ? aliment_id : null,
    recette_id: type === "recette" ? recette_id : null,
    quantite,
    date,
    moment: moment as Enums<"moment_repas">,
  });

  if (error) return { error: error.message };

  revalidatePath("/nutrition/journal");
  return { error: null };
}

export async function removeJournalEntry(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("journal_repas").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/nutrition/journal");
}
