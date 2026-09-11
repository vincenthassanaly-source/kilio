"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type IngredientLibreFormState = { error: string | null };

function revalidateRecette(recette_id: string) {
  revalidatePath("/nutrition/recettes");
  revalidatePath(`/nutrition/recettes/${recette_id}`);
}

export async function addIngredientLibre(
  _prevState: IngredientLibreFormState,
  formData: FormData
): Promise<IngredientLibreFormState> {
  const recette_id = String(formData.get("recette_id") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();
  const quantiteRaw = String(formData.get("quantite") ?? "").trim();
  const ordre = Number(formData.get("ordre") ?? 0);

  if (!recette_id || !nom) {
    return { error: "Nom requis." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recette_ingredients_libres")
    .insert({ recette_id, nom, quantite: quantiteRaw || null, ordre });

  if (error) return { error: error.message };

  revalidateRecette(recette_id);
  return { error: null };
}

export async function updateIngredientLibre(
  id: string,
  recette_id: string,
  nom: string,
  quantite: string
) {
  const trimmedNom = nom.trim();
  if (!trimmedNom) {
    throw new Error("Le nom est requis.");
  }

  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("recette_ingredients_libres")
    .update({ nom: trimmedNom, quantite: quantite.trim() || null }, { count: "exact" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  if (!count) {
    throw new Error("Modification impossible : cet ingrédient est introuvable.");
  }

  revalidateRecette(recette_id);
}

export async function removeIngredientLibre(id: string, recette_id: string) {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("recette_ingredients_libres")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  if (!count) {
    throw new Error("Suppression impossible : cet ingrédient est introuvable.");
  }

  revalidateRecette(recette_id);
}

export async function reorderIngredientsLibres(
  recette_id: string,
  orderedIds: string[]
) {
  const supabase = createAdminClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("recette_ingredients_libres").update({ ordre: index }).eq("id", id)
    )
  );

  revalidateRecette(recette_id);
}
