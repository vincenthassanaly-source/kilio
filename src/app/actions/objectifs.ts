"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums, Tables } from "@/lib/supabase/types";

export type ObjectifFormState = { error: string | null };

const CATEGORIES: readonly Enums<"categorie_objectif">[] = ["perso", "pro"];
const TYPES_SUIVI: readonly Enums<"type_suivi_objectif">[] = ["valeur", "etapes", "binaire"];
const STATUTS: readonly Enums<"statut_objectif">[] = ["en_cours", "atteint", "abandonne"];

type ObjectifInput = {
  titre: string;
  description: string | null;
  categorie: Enums<"categorie_objectif">;
  type_suivi: Enums<"type_suivi_objectif">;
  date_echeance: string | null;
  valeur_cible: number | null;
  unite: string | null;
};

type ParseResult =
  | { ok: true; value: ObjectifInput }
  | { ok: false; error: string };

function parseObjectifInput(formData: FormData): ParseResult {
  const titre = String(formData.get("titre") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "");
  const type_suivi = String(formData.get("type_suivi") ?? "");
  const date_echeance = String(formData.get("date_echeance") ?? "").trim();
  const valeurCibleRaw = String(formData.get("valeur_cible") ?? "").trim();
  const unite = String(formData.get("unite") ?? "").trim();

  if (!titre) return { ok: false, error: "Le titre est requis." };
  if (!CATEGORIES.includes(categorie as Enums<"categorie_objectif">)) {
    return { ok: false, error: "Catégorie invalide." };
  }
  if (!TYPES_SUIVI.includes(type_suivi as Enums<"type_suivi_objectif">)) {
    return { ok: false, error: "Type de suivi invalide." };
  }

  const estValeur = type_suivi === "valeur";

  let valeur_cible: number | null = null;
  if (estValeur && valeurCibleRaw) {
    valeur_cible = Number(valeurCibleRaw);
    if (!Number.isFinite(valeur_cible) || valeur_cible <= 0) {
      return { ok: false, error: "La valeur cible doit être un nombre positif." };
    }
  }

  return {
    ok: true,
    value: {
      titre,
      description: description || null,
      categorie: categorie as Enums<"categorie_objectif">,
      type_suivi: type_suivi as Enums<"type_suivi_objectif">,
      date_echeance: date_echeance || null,
      valeur_cible,
      unite: estValeur && unite ? unite : null,
    },
  };
}

export async function creerObjectif(
  _prevState: ObjectifFormState,
  formData: FormData
): Promise<ObjectifFormState> {
  const parsed = parseObjectifInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = createAdminClient();

  const { data: dernier } = await supabase
    .from("objectifs")
    .select("ordre")
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("objectifs").insert({
    ...parsed.value,
    ordre: (dernier?.ordre ?? -1) + 1,
  });

  if (error) return { error: error.message };

  revalidatePath("/objectifs");
  return { error: null };
}

export async function modifierObjectif(
  _prevState: ObjectifFormState,
  formData: FormData
): Promise<ObjectifFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Objectif introuvable." };

  const parsed = parseObjectifInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("objectifs").update(parsed.value).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/objectifs");
  revalidatePath(`/objectifs/${id}`);
  return { error: null };
}

export async function changerStatutObjectif(id: string, statut: Enums<"statut_objectif">) {
  if (!STATUTS.includes(statut)) throw new Error("Statut invalide.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("objectifs").update({ statut }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/objectifs");
  revalidatePath(`/objectifs/${id}`);
}

export async function supprimerObjectif(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("objectifs").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/objectifs");
  redirect("/objectifs");
}

export async function getObjectifs(): Promise<Tables<"objectifs">[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("objectifs")
    .select("*")
    .order("ordre", { ascending: true });

  if (error) throw new Error(error.message);

  return data ?? [];
}

export type ObjectifDetail = {
  objectif: Tables<"objectifs">;
  etapes: Tables<"objectif_etapes">[];
  entries: Tables<"objectif_entries">[];
};

export async function getObjectif(id: string): Promise<ObjectifDetail | null> {
  const supabase = createAdminClient();

  const { data: objectif, error: objectifError } = await supabase
    .from("objectifs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (objectifError) throw new Error(objectifError.message);
  if (!objectif) return null;

  const [{ data: etapes, error: etapesError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase
        .from("objectif_etapes")
        .select("*")
        .eq("objectif_id", id)
        .order("ordre", { ascending: true }),
      supabase
        .from("objectif_entries")
        .select("*")
        .eq("objectif_id", id)
        .order("date", { ascending: true }),
    ]);

  if (etapesError) throw new Error(etapesError.message);
  if (entriesError) throw new Error(entriesError.message);

  return { objectif, etapes: etapes ?? [], entries: entries ?? [] };
}

// --- Étapes (type de suivi "etapes") ---

export async function ajouterEtape(objectifId: string, titre: string) {
  const trimmed = titre.trim();
  if (!trimmed) throw new Error("Le titre de l'étape est requis.");

  const supabase = createAdminClient();

  const { data: derniere } = await supabase
    .from("objectif_etapes")
    .select("ordre")
    .eq("objectif_id", objectifId)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("objectif_etapes").insert({
    objectif_id: objectifId,
    titre: trimmed,
    ordre: (derniere?.ordre ?? -1) + 1,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/objectifs/${objectifId}`);
}

export async function toggleEtape(objectifId: string, etapeId: string, fait: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("objectif_etapes")
    .update({ fait })
    .eq("id", etapeId);

  if (error) throw new Error(error.message);

  revalidatePath(`/objectifs/${objectifId}`);
}

export async function supprimerEtape(objectifId: string, etapeId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("objectif_etapes").delete().eq("id", etapeId);

  if (error) throw new Error(error.message);

  revalidatePath(`/objectifs/${objectifId}`);
}

// Réordonnance simple par échange avec l'étape voisine (pas de drag & drop
// dans le codebase) : déplace l'étape d'un cran vers le haut ou le bas en
// permutant sa colonne `ordre` avec celle de la voisine.
export async function deplacerEtape(
  objectifId: string,
  etapeId: string,
  direction: "haut" | "bas"
) {
  const supabase = createAdminClient();

  const { data: etapes, error } = await supabase
    .from("objectif_etapes")
    .select("id, ordre")
    .eq("objectif_id", objectifId)
    .order("ordre", { ascending: true });

  if (error) throw new Error(error.message);
  if (!etapes) return;

  const index = etapes.findIndex((e) => e.id === etapeId);
  if (index === -1) return;

  const voisinIndex = direction === "haut" ? index - 1 : index + 1;
  if (voisinIndex < 0 || voisinIndex >= etapes.length) return;

  const courante = etapes[index];
  const voisine = etapes[voisinIndex];

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from("objectif_etapes").update({ ordre: voisine.ordre }).eq("id", courante.id),
    supabase.from("objectif_etapes").update({ ordre: courante.ordre }).eq("id", voisine.id),
  ]);

  if (err1) throw new Error(err1.message);
  if (err2) throw new Error(err2.message);

  revalidatePath(`/objectifs/${objectifId}`);
}

// --- Entrées (type de suivi "valeur") ---

export async function enregistrerEntreeObjectif(
  objectifId: string,
  date: string,
  valeur: number
) {
  if (!Number.isFinite(valeur)) {
    throw new Error("Valeur invalide.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("objectif_entries")
    .upsert({ objectif_id: objectifId, date, valeur }, { onConflict: "objectif_id,date" });

  if (error) throw new Error(error.message);

  revalidatePath(`/objectifs/${objectifId}`);
}
