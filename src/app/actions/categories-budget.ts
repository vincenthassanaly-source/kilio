"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums, Tables } from "@/lib/supabase/types";

export type CategorieFormState = { error: string | null };

const TYPES_MOUVEMENT: readonly Enums<"type_mouvement">[] = ["depense", "revenu"];

type CategorieInput = {
  nom: string;
  type: Enums<"type_mouvement">;
  icone: string | null;
};

type ParseResult = { ok: true; value: CategorieInput } | { ok: false; error: string };

function parseCategorieInput(formData: FormData): ParseResult {
  const nom = String(formData.get("nom") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const icone = String(formData.get("icone") ?? "").trim();

  if (!nom) return { ok: false, error: "Le nom est requis." };
  if (!TYPES_MOUVEMENT.includes(type as Enums<"type_mouvement">)) {
    return { ok: false, error: "Type invalide." };
  }

  return { ok: true, value: { nom, type: type as Enums<"type_mouvement">, icone: icone || null } };
}

export async function creerCategorie(
  _prevState: CategorieFormState,
  formData: FormData
): Promise<CategorieFormState> {
  const parsed = parseCategorieInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("categories_budget")
    .insert({ ...parsed.value, is_predefinie: false });

  if (error) return { error: error.message };

  revalidatePath("/budget/categories");
  return { error: null };
}

export async function modifierCategorie(
  _prevState: CategorieFormState,
  formData: FormData
): Promise<CategorieFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Catégorie introuvable." };

  const parsed = parseCategorieInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("categories_budget").update(parsed.value).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/budget/categories");
  return { error: null };
}

// Les catégories prédéfinies (is_predefinie = true) ne sont pas supprimables,
// seulement celles ajoutées par l'utilisateur — cf. prompt Phase 3.
export async function supprimerCategorie(id: string) {
  const supabase = createAdminClient();

  const { data: existante, error: fetchError } = await supabase
    .from("categories_budget")
    .select("is_predefinie")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existante) return;
  if (existante.is_predefinie) {
    throw new Error("Les catégories prédéfinies ne sont pas supprimables.");
  }

  const { error } = await supabase.from("categories_budget").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/budget/categories");
}

/**
 * Crée une sous-catégorie (1 seul niveau de profondeur) : le type est
 * toujours hérité de la catégorie parente, jamais lu depuis le formulaire,
 * et une catégorie qui est déjà elle-même une sous-catégorie ne peut pas
 * servir de parent (cf. prompt Phase 2).
 */
export async function creerSousCategorie(
  _prevState: CategorieFormState,
  formData: FormData
): Promise<CategorieFormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const icone = String(formData.get("icone") ?? "").trim();
  const categorie_parent_id = String(formData.get("categorie_parent_id") ?? "").trim();

  if (!nom) return { error: "Le nom est requis." };
  if (!categorie_parent_id) return { error: "Catégorie parente introuvable." };

  const supabase = createAdminClient();
  const { data: parent, error: parentError } = await supabase
    .from("categories_budget")
    .select("type, categorie_parent_id")
    .eq("id", categorie_parent_id)
    .maybeSingle();

  if (parentError) return { error: parentError.message };
  if (!parent) return { error: "Catégorie parente introuvable." };
  if (parent.categorie_parent_id) {
    return { error: "Une sous-catégorie ne peut pas avoir sa propre sous-catégorie." };
  }

  const { error } = await supabase.from("categories_budget").insert({
    nom,
    type: parent.type,
    icone: icone || null,
    categorie_parent_id,
    is_predefinie: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/budget/categories");
  return { error: null };
}

export async function getCategories(): Promise<Tables<"categories_budget">[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories_budget")
    .select("*")
    .order("type", { ascending: true })
    .order("nom", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
