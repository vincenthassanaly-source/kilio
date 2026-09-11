"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MODULES_BARRE_BASSE, NAV_ITEMS } from "@/lib/navigation/registry";
import type { Tables } from "@/lib/supabase/types";

// Table singleton : une seule ligne, id fixé à 1 (voir
// migration-preferences-navigation-2026-09-04.sql).
const PREFERENCES_ID = 1;

export type PreferencesNavigation = Tables<"preferences_navigation">;

async function getPreferencesNavigation(): Promise<PreferencesNavigation> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("preferences_navigation")
    .select("*")
    .eq("id", PREFERENCES_ID)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// La grille "Plus" liste TOUJOURS tous les items du registre (y compris les
// 4 modules primaires épinglables en barre du bas) : un module reste
// accessible depuis /plus même quand il est aussi épinglé en barre du bas,
// et surtout même quand un module normalement épinglé par défaut (ex.
// Nutrition, Habitudes) en a été délogé par un autre. Toute entrée absente
// du tableau enregistré (nouveau module ajouté plus tard au registre, ou
// tableau enregistré avant ce changement) s'affiche en fin de grille.
function resolveOrdreGrillePlus(saved: string[]): string[] {
  const hrefsConnus = new Set(NAV_ITEMS.map((item) => item.href));
  const sauvegardeFiltree = saved.filter((href) => hrefsConnus.has(href));
  const manquants = NAV_ITEMS.map((item) => item.href).filter((href) => !sauvegardeFiltree.includes(href));
  return [...sauvegardeFiltree, ...manquants];
}

// Si un href enregistré ne correspond plus à un item connu du registre,
// retombe sur l'emplacement par défaut correspondant (évite un onglet vide).
function resolveModulesBarreBasse(saved: string[]): string[] {
  return DEFAULT_MODULES_BARRE_BASSE.map((defaultHref, index) => {
    const href = saved[index];
    return href && NAV_ITEMS.some((item) => item.href === href) ? href : defaultHref;
  });
}

export type PreferencesNavigationResolues = {
  ordreGrillePlus: string[];
  modulesBarreBasse: string[];
};

export async function getPreferencesNavigationResolues(): Promise<PreferencesNavigationResolues> {
  const prefs = await getPreferencesNavigation();
  return {
    ordreGrillePlus: resolveOrdreGrillePlus(prefs.ordre_grille_plus),
    modulesBarreBasse: resolveModulesBarreBasse(prefs.modules_barre_basse),
  };
}

export async function updateOrdreGrillePlus(hrefs: string[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("preferences_navigation")
    .update({ ordre_grille_plus: hrefs })
    .eq("id", PREFERENCES_ID);

  if (error) throw new Error(error.message);

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

  // BottomNav est monté dans src/app/(app)/layout.tsx, partagé par toutes
  // les pages de l'app : type "layout" (voir node_modules/next/dist/docs/
  // .../revalidatePath.md, section "Revalidating all data") pour invalider
  // ce layout et toutes les pages en dessous, pas seulement "/".
  revalidatePath("/", "layout");
}
