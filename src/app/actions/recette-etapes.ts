"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type EtapeFormState = { error: string | null };

function revalidateRecette(recette_id: string) {
  revalidatePath("/nutrition/recettes");
  revalidatePath(`/nutrition/recettes/${recette_id}`);
}

export async function addEtape(
  _prevState: EtapeFormState,
  formData: FormData
): Promise<EtapeFormState> {
  const recette_id = String(formData.get("recette_id") ?? "");
  const titre = String(formData.get("titre") ?? "").trim();
  const consigne = String(formData.get("consigne") ?? "").trim();
  const astuce = String(formData.get("astuce") ?? "").trim();
  const ordre = Number(formData.get("ordre") ?? 0);

  if (!recette_id || !consigne) {
    return { error: "La consigne est requise." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("recette_etapes").insert({
    recette_id,
    titre: titre || null,
    consigne,
    astuce: astuce || null,
    ordre,
  });

  if (error) return { error: error.message };

  revalidateRecette(recette_id);
  return { error: null };
}

export async function updateEtape(
  id: string,
  recette_id: string,
  titre: string,
  consigne: string,
  astuce: string
) {
  const trimmedConsigne = consigne.trim();
  if (!trimmedConsigne) {
    throw new Error("La consigne est requise.");
  }

  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("recette_etapes")
    .update(
      {
        titre: titre.trim() || null,
        consigne: trimmedConsigne,
        astuce: astuce.trim() || null,
      },
      { count: "exact" }
    )
    .eq("id", id);

  if (error) throw new Error(error.message);
  if (!count) {
    throw new Error("Modification impossible : cette étape est introuvable.");
  }

  revalidateRecette(recette_id);
}

export async function removeEtape(id: string, recette_id: string) {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("recette_etapes")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  if (!count) {
    throw new Error("Suppression impossible : cette étape est introuvable.");
  }

  revalidateRecette(recette_id);
}
