"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";

export async function getPlanningTravail(): Promise<Tables<"horaires_travail_creneaux">[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("horaires_travail_creneaux")
    .select("*")
    .order("jour_semaine", { ascending: true })
    .order("heure_debut", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPlanningTravailExceptions(): Promise<
  Tables<"horaires_travail_exceptions">[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("horaires_travail_exceptions")
    .select("*")
    .order("date", { ascending: true })
    .order("heure_debut", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function ajouterExceptionPlanningTravail(
  date: string,
  heure_debut: string,
  heure_fin: string
) {
  if (heure_fin <= heure_debut) {
    throw new Error("L'heure de fin doit être après l'heure de début.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("horaires_travail_exceptions")
    .insert({ date, heure_debut, heure_fin });

  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}
