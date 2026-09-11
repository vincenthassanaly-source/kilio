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

  if (error) return { error: error.message };

  revalidatePath("/nutrition/journal");
  return { error: null };
}
