import { connection } from "next/server";
import type { Enums } from "@/lib/supabase/types";
import { getJourTypeJournal } from "@/app/actions/journal";
import { aujourdhuiParis } from "@/lib/date/paris";

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
 *
 * Type de jour : `?jour=` ne sert plus que de surcharge immédiate (juste
 * après un tap sur la bascule, avant que la mémorisation soit relue) ; sans
 * lui, c'est le type mémorisé pour la date (table journal_jours) qui
 * s'applique — plus de retour à « repos » à chaque visite (J-P1-1).
 */
export async function lireJourJournal(searchParams: JournalSearchParams): Promise<JourJournal> {
  const { date: dateParam, jour } = await searchParams;
  if (!dateParam) await connection();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : aujourdhuiParis();
  const jourType =
    jour === "entrainement" || jour === "repos" ? jour : await getJourTypeJournal(date);
  return { date, jourType };
}
