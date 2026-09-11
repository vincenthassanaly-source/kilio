"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums, Tables } from "@/lib/supabase/types";

export type CompteFormState = { error: string | null };

const TYPES_COMPTE: readonly Enums<"type_compte">[] = ["courant", "epargne", "autre"];

type CompteInput = {
  nom: string;
  type: Enums<"type_compte">;
  solde_initial: number;
};

type ParseResult = { ok: true; value: CompteInput } | { ok: false; error: string };

function parseCompteInput(formData: FormData): ParseResult {
  const nom = String(formData.get("nom") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const soldeRaw = String(formData.get("solde_initial") ?? "").trim();

  if (!nom) return { ok: false, error: "Le nom est requis." };
  if (!TYPES_COMPTE.includes(type as Enums<"type_compte">)) {
    return { ok: false, error: "Type de compte invalide." };
  }

  const solde_initial = soldeRaw === "" ? 0 : Number(soldeRaw);
  if (!Number.isFinite(solde_initial)) {
    return { ok: false, error: "Le solde initial doit être un nombre." };
  }

  return { ok: true, value: { nom, type: type as Enums<"type_compte">, solde_initial } };
}

export async function creerCompte(
  _prevState: CompteFormState,
  formData: FormData
): Promise<CompteFormState> {
  const parsed = parseCompteInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("comptes").insert(parsed.value);
  if (error) return { error: error.message };

  revalidatePath("/budget");
  revalidatePath("/budget/comptes");
  return { error: null };
}

export async function modifierCompte(
  _prevState: CompteFormState,
  formData: FormData
): Promise<CompteFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Compte introuvable." };

  const parsed = parseCompteInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = createAdminClient();
  const { error } = await supabase.from("comptes").update(parsed.value).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/budget");
  revalidatePath("/budget/comptes");
  return { error: null };
}

export async function supprimerCompte(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("comptes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/budget");
  revalidatePath("/budget/comptes");
  revalidatePath("/budget/transactions");
}

export type CompteAvecSolde = Tables<"comptes"> & { solde: number };

export async function getComptesAvecSolde(): Promise<CompteAvecSolde[]> {
  const supabase = createAdminClient();

  const [
    { data: comptes, error: comptesError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase.from("comptes").select("*").order("created_at", { ascending: true }),
    supabase.from("transactions").select("compte_id, compte_destination_id, montant, type"),
  ]);

  if (comptesError) throw new Error(comptesError.message);
  if (transactionsError) throw new Error(transactionsError.message);

  // Un virement ne passe pas par solde_initial : il diminue le compte source
  // et augmente le compte destination, en plus (et indépendamment) des
  // dépenses/revenus classiques.
  const mouvements = new Map<string, number>();
  function ajouter(compteId: string, delta: number) {
    mouvements.set(compteId, (mouvements.get(compteId) ?? 0) + delta);
  }
  for (const t of transactions ?? []) {
    if (t.type === "revenu") ajouter(t.compte_id, t.montant);
    else if (t.type === "depense") ajouter(t.compte_id, -t.montant);
    else if (t.type === "virement" && t.compte_destination_id) {
      ajouter(t.compte_id, -t.montant);
      ajouter(t.compte_destination_id, t.montant);
    }
  }

  return (comptes ?? []).map((compte) => ({
    ...compte,
    solde: compte.solde_initial + (mouvements.get(compte.id) ?? 0),
  }));
}
