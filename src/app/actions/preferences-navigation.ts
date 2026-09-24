"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { PREFERENCES_ID, PREFERENCES_NAVIGATION_TAG } from "@/lib/navigation/preferences";

// La lecture (mise en cache) est dans src/lib/navigation/preferences.ts.
// Chaque écriture expire ce cache via updateTag : la requête suivante relit
// la base (lecture de ses propres écritures), et la coquille statique des
// routes (app) est régénérée avec le nouvel ordre.

export async function updateOrdreGrillePlus(hrefs: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("preferences_navigation")
    .update({ ordre_grille_plus: hrefs })
    .eq("id", PREFERENCES_ID);

  if (error) throw new Error(error.message);

  updateTag(PREFERENCES_NAVIGATION_TAG);
  revalidatePath("/plus");
}

export async function updateModulesBarreBasse(hrefs: string[]): Promise<void> {
  if (hrefs.length !== 4) throw new Error("La barre du bas doit contenir exactement 4 emplacements.");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("preferences_navigation")
    .update({ modules_barre_basse: hrefs })
    .eq("id", PREFERENCES_ID);

  if (error) throw new Error(error.message);

  updateTag(PREFERENCES_NAVIGATION_TAG);
  // BottomNav est monté dans src/app/(app)/layout.tsx, partagé par toutes
  // les pages de l'app : type "layout" (voir node_modules/next/dist/docs/
  // .../revalidatePath.md, section "Revalidating all data") pour invalider
  // ce layout et toutes les pages en dessous, pas seulement "/".
  revalidatePath("/", "layout");
}
