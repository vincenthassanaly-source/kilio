"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/lib/supabase/types";

export type ObjectifFormState = { error: string | null };

const JOUR_TYPES: readonly Enums<"jour_type_ppl">[] = ["entrainement", "repos"];

export async function upsertObjectif(
  _prevState: ObjectifFormState,
  formData: FormData
): Promise<ObjectifFormState> {
  const jour_type = String(formData.get("jour_type") ?? "");
  const kcal_cible = Number(formData.get("kcal_cible"));
  const proteines_cible_g = Number(formData.get("proteines_cible_g") ?? 0);
  const glucides_cible_g = Number(formData.get("glucides_cible_g") ?? 0);
  const lipides_cible_g = Number(formData.get("lipides_cible_g") ?? 0);

  if (!JOUR_TYPES.includes(jour_type as Enums<"jour_type_ppl">)) {
    return { error: "Type de jour invalide." };
  }
  if (
    [kcal_cible, proteines_cible_g, glucides_cible_g, lipides_cible_g].some(
      (n) => !Number.isFinite(n) || n < 0
    )
  ) {
    return { error: "Les objectifs doivent être des nombres positifs." };
  }
  // Bornes hautes permissives mais réelles : sans elles, un objectif kcal
  // aberrant (ex. faute de frappe à un zéro près) fait toujours lire
  // l'anneau de ResumeJour.tsx comme "dans les clous" (son pourcentage est
  // clampé à 100 %), masquant un vrai dépassement plutôt que de le signaler.
  if (kcal_cible > 10000) {
    return { error: "L'objectif calorique doit rester sous 10 000 kcal." };
  }
  if ([proteines_cible_g, glucides_cible_g, lipides_cible_g].some((n) => n > 1000)) {
    return { error: "Les objectifs de macros doivent rester sous 1000 g." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("objectifs_nutritionnels").upsert(
    {
      jour_type: jour_type as Enums<"jour_type_ppl">,
      kcal_cible,
      proteines_cible_g,
      glucides_cible_g,
      lipides_cible_g,
    },
    { onConflict: "jour_type" }
  );

  if (error) {
    // Ne jamais remonter le message brut du driver Postgres/Supabase en UI
    // (clarify.md : pas de code interne comme message principal) — loggé
    // côté serveur pour le diagnostic, mais l'utilisateur voit une phrase
    // actionnable.
    console.error("upsertObjectif: échec de l'upsert Supabase", error);
    return { error: "Impossible d'enregistrer l'objectif. Réessaie dans un instant." };
  }

  revalidatePath("/nutrition/journal");
  return { error: null };
}
