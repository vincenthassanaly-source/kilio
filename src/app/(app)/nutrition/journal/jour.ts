import { connection } from "next/server";
import type { Enums } from "@/lib/supabase/types";

export type JourJournal = { date: string; jourType: Enums<"jour_type_ppl"> };
export type JournalSearchParams = Promise<{ date?: string; jour?: string }>;

/**
 * Jour affiché par le Journal, lu dans l'URL (`?date`, `?jour`). Appelé
 * uniquement sous `<Suspense>` : la coquille de la page (sous-navigation,
 * titre, cadre de navigation par jour) ne dépend ni de l'URL ni de la date.
 *
 * Sans `?date`, le jour affiché est aujourd'hui : une donnée de requête,
 * d'où `connection()` avant `new Date()` (rien ne fige « aujourd'hui » au
 * build ni dans un cache). Avec `?date` (liens ‹ ›, swipe, bascule
 * Repos/Entraînement), rien ne dépend de la requête.
 */
export async function lireJourJournal(searchParams: JournalSearchParams): Promise<JourJournal> {
  const { date: dateParam, jour } = await searchParams;
  if (!dateParam) await connection();
  return {
    date: dateParam || new Date().toISOString().slice(0, 10),
    jourType: jour === "entrainement" ? "entrainement" : "repos",
  };
}
