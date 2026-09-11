"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";

export async function getCoursesItems(): Promise<Tables<"courses_items">[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("courses_items")
    .select("*")
    .order("coche", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCourseItem(libelle: string) {
  const trimmed = libelle.trim();
  if (!trimmed) throw new Error("Le libellé est requis.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("courses_items").insert({ libelle: trimmed });

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}

export async function toggleCourseItem(id: string, coche: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("courses_items").update({ coche }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}

export async function deleteCourseItem(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("courses_items").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/courses");
}
