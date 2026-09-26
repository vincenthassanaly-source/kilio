import { addDays, addMonths, addWeeks, addYears, subMonths, subWeeks, subYears } from "date-fns";
import type { Enums } from "@/lib/supabase/types";
import { aujourdhuiParis, dateDuJourParis } from "@/lib/date/paris";

export type StatutBudget = "ok" | "proche" | "depasse";

type CategorieBudgetLike = { id: string; categorie_parent_id: string | null };

/**
 * Regroupe une liste plate de catégories en arborescence à un seul niveau
 * (catégories principales + leurs sous-catégories), pour l'affichage imbriqué
 * dans /budget/categories et le regroupement du sélecteur de /budget/transactions.
 */
export function regrouperParCategorieParente<T extends CategorieBudgetLike>(
  categories: T[]
): { parent: T; sousCategories: T[] }[] {
  const parents = categories.filter((c) => !c.categorie_parent_id);
  return parents.map((parent) => ({
    parent,
    sousCategories: categories.filter((c) => c.categorie_parent_id === parent.id),
  }));
}

const SEUIL_PROCHE = 0.8;

/** cible <= 0 signifie "pas de budget défini" : toute dépense est alors considérée
 * comme un dépassement (rien n'était prévu), sans quoi la barre resterait toujours
 * verte pour une catégorie sans budget cible. */
export function statutBudget(consomme: number, cible: number): StatutBudget {
  if (cible <= 0) return consomme > 0 ? "depasse" : "ok";
  const pct = consomme / cible;
  if (pct > 1) return "depasse";
  if (pct >= SEUIL_PROCHE) return "proche";
  return "ok";
}

export function formatMontant(montant: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(montant);
}

export function premierJourDuMois(date: Date = dateDuJourParis()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Borne exclusive haute pour une requête `gte(periode) / lt(finDuMois)` sur une
 * colonne date, à partir d'une période au format "YYYY-MM-01". */
export function finDuMois(periode: string): string {
  const [annee, mois] = periode.split("-").map(Number);
  return new Date(Date.UTC(annee, mois, 1)).toISOString().slice(0, 10);
}

/** Premier jour de la semaine ISO (lundi — `date_trunc('week', ...)` de
 * Postgres confirme cette convention, cf. migration-budget-periodes-hebdo-annuel). */
export function premierJourDeLaSemaine(date: Date = dateDuJourParis()): string {
  const jour = date.getDay(); // 0 (dimanche) .. 6 (samedi)
  const decalage = jour === 0 ? 6 : jour - 1;
  const lundi = new Date(date.getFullYear(), date.getMonth(), date.getDate() - decalage);
  return `${lundi.getFullYear()}-${String(lundi.getMonth() + 1).padStart(2, "0")}-${String(lundi.getDate()).padStart(2, "0")}`;
}

/** Borne exclusive haute pour une requête `gte(periode) / lt(finDeLaSemaine)`,
 * à partir d'une période au format "YYYY-MM-DD" (un lundi). */
export function finDeLaSemaine(periode: string): string {
  const [annee, mois, jour] = periode.split("-").map(Number);
  const fin = new Date(annee, mois - 1, jour + 7);
  return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}-${String(fin.getDate()).padStart(2, "0")}`;
}

export function premierJourDeLAnnee(date: Date = dateDuJourParis()): string {
  return `${date.getFullYear()}-01-01`;
}

/** Borne exclusive haute pour une requête `gte(periode) / lt(finDeLAnnee)`,
 * à partir d'une période au format "YYYY-01-01". */
export function finDeLAnnee(periode: string): string {
  const annee = Number(periode.split("-")[0]);
  return `${annee + 1}-01-01`;
}

/** Premier jour de la période par défaut ("aujourd'hui") selon son type —
 * utilisé pour initialiser /budget/categories et au changement d'onglet
 * semaine/mois/année. */
export function periodeParDefaut(typePeriode: Enums<"type_periode_budget">): string {
  switch (typePeriode) {
    case "hebdomadaire":
      return premierJourDeLaSemaine();
    case "mensuel":
      return premierJourDuMois();
    case "annuel":
      return premierJourDeLAnnee();
  }
}

/** Bornes `{ debut, fin }` (fin exclusive) d'une période selon son type, pour
 * les requêtes `gte(debut) / lt(fin)` sur `transactions.date_operation` —
 * remplace `finDuMois` seul dans `getSuiviCategories` pour ne pas dupliquer
 * le branchement par type à chaque appelant. */
export function bornesPeriode(
  periode: string,
  typePeriode: Enums<"type_periode_budget">
): { debut: string; fin: string } {
  switch (typePeriode) {
    case "hebdomadaire":
      return { debut: periode, fin: finDeLaSemaine(periode) };
    case "mensuel":
      return { debut: periode, fin: finDuMois(periode) };
    case "annuel":
      return { debut: periode, fin: finDeLAnnee(periode) };
  }
}

const PERIODE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Valide et recale une période venue d'un paramètre de recherche (jamais
 * garantie calée ni même une date valide) sur le premier jour de
 * semaine/mois/année du type demandé — le même calage que celui appliqué à
 * l'écriture par `upsertBudget`, pour que la lecture (`getSuiviCategories`)
 * cible toujours la même ligne. Renvoie `null` si la valeur n'est pas une
 * date "YYYY-MM-DD" valide (au lieu de laisser `finDuMois`/`bornesPeriode`
 * lever une `RangeError` sur une date invalide).
 */
export function normaliserPeriode(
  periodeRaw: string,
  typePeriode: Enums<"type_periode_budget">
): string | null {
  const match = PERIODE_REGEX.exec(periodeRaw);
  if (!match) return null;

  const annee = Number(match[1]);
  const mois = Number(match[2]);
  const jour = Number(match[3]);
  const date = new Date(annee, mois - 1, jour);
  // `new Date` accepte silencieusement un mois/jour hors bornes en débordant
  // sur le mois suivant (ex. 2026-02-30 -> 2 mars) : on rejette plutôt que de
  // recaler sur une date que l'utilisateur n'a pas demandée.
  if (date.getFullYear() !== annee || date.getMonth() !== mois - 1 || date.getDate() !== jour) {
    return null;
  }

  switch (typePeriode) {
    case "hebdomadaire":
      return premierJourDeLaSemaine(date);
    case "annuel":
      return premierJourDeLAnnee(date);
    case "mensuel":
      return premierJourDuMois(date);
  }
}

/** Période précédente/suivante (même type), pour la navigation à flèches de
 * /budget/categories. La période d'entrée est toujours déjà calée (premier
 * jour de semaine/mois/année) : ajouter/retrancher une unité la garde calée
 * (pas de risque de calage fin de mois ici, contrairement aux récurrences). */
export function periodeAdjacente(
  periode: string,
  typePeriode: Enums<"type_periode_budget">,
  direction: 1 | -1
): string {
  const [annee, mois, jour] = periode.split("-").map(Number);
  const date = new Date(annee, mois - 1, jour);

  const resultat = (() => {
    switch (typePeriode) {
      case "hebdomadaire":
        return direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
      case "mensuel":
        return direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
      case "annuel":
        return direction === 1 ? addYears(date, 1) : subYears(date, 1);
    }
  })();

  return `${resultat.getFullYear()}-${String(resultat.getMonth() + 1).padStart(2, "0")}-${String(resultat.getDate()).padStart(2, "0")}`;
}

export function formatPeriode(
  periode: string,
  typePeriode: Enums<"type_periode_budget"> = "mensuel"
): string {
  if (typePeriode === "hebdomadaire") {
    const jour = new Date(`${periode}T00:00:00Z`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    return `Semaine du ${jour}`;
  }
  if (typePeriode === "annuel") {
    return `Année ${periode.slice(0, 4)}`;
  }
  return new Date(`${periode}T00:00:00Z`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type JourCalendrier = { date: string; horsMois: boolean };

/**
 * Grille calendrier d'un mois : semaines complètes (lundi en première
 * colonne), avec les jours de fin du mois précédent / début du mois suivant
 * nécessaires pour compléter la première et la dernière semaine
 * (`horsMois: true` pour ces jours de padding, à griser dans l'UI).
 *
 * @param periode Format "YYYY-MM-01" (premier jour du mois).
 */
export function grilleCalendrierMois(periode: string): JourCalendrier[][] {
  const [annee, mois] = periode.split("-").map(Number);

  const premierJourMoisDate = new Date(annee, mois - 1, 1);
  const decalageDebut = premierJourMoisDate.getDay() === 0 ? 6 : premierJourMoisDate.getDay() - 1;
  const debutGrille = new Date(annee, mois - 1, 1 - decalageDebut);

  const dernierJourMoisDate = new Date(annee, mois, 0);
  const finJourSemaine = dernierJourMoisDate.getDay();
  const decalageFin = finJourSemaine === 0 ? 0 : 7 - finJourSemaine;
  const finGrille = new Date(annee, mois - 1, dernierJourMoisDate.getDate() + decalageFin);

  const semaines: JourCalendrier[][] = [];
  let semaineCourante: JourCalendrier[] = [];
  const curseur = new Date(debutGrille);
  while (curseur <= finGrille) {
    const iso = `${curseur.getFullYear()}-${String(curseur.getMonth() + 1).padStart(2, "0")}-${String(curseur.getDate()).padStart(2, "0")}`;
    semaineCourante.push({ date: iso, horsMois: curseur.getMonth() !== mois - 1 });
    if (semaineCourante.length === 7) {
      semaines.push(semaineCourante);
      semaineCourante = [];
    }
    curseur.setDate(curseur.getDate() + 1);
  }
  return semaines;
}

export const FREQUENCE_LABELS: Record<Enums<"frequence_recurrence">, string> = {
  quotidien: "Quotidien",
  hebdomadaire: "Hebdomadaire",
  mensuel: "Mensuel",
  annuel: "Annuel",
};

// Date du jour à Paris (T3) : gardée sous ce nom pour ses nombreux appelants
// (Budget, Tâches), côté serveur comme côté client.
export function aujourdhuiISO(): string {
  return aujourdhuiParis();
}

/**
 * Calcule la prochaine occurrence d'une transaction récurrente à partir
 * d'une date ISO ("YYYY-MM-DD") et de sa fréquence.
 *
 * Décision de calage fin de mois / année (documentée plutôt que laissée
 * implicite) : on reprend tel quel le comportement de `date-fns`
 * (`addMonths`/`addYears`), qui cale sur le dernier jour du mois cible quand
 * le jour d'origine n'y existe pas — ex. 31 janvier + 1 mois → 28 (ou 29)
 * février, 29 février + 1 an → 28 février une année non bissextile.
 *
 * Les composants année/mois/jour sont extraits et reconstruits en date
 * locale (jamais via `toISOString`, qui convertit en UTC et peut décaler
 * la date d'un jour selon le fuseau du serveur) : le calcul de calendrier
 * reste correct quel que soit le fuseau du processus qui l'exécute.
 */
export function calculerProchaineOccurrence(
  dateISO: string,
  frequence: Enums<"frequence_recurrence">
): string {
  const [annee, mois, jour] = dateISO.split("-").map(Number);
  const date = new Date(annee, mois - 1, jour);

  const suivante = (() => {
    switch (frequence) {
      case "quotidien":
        return addDays(date, 1);
      case "hebdomadaire":
        return addWeeks(date, 1);
      case "mensuel":
        return addMonths(date, 1);
      case "annuel":
        return addYears(date, 1);
    }
  })();

  const anneeSuivante = suivante.getFullYear();
  const moisSuivant = String(suivante.getMonth() + 1).padStart(2, "0");
  const jourSuivant = String(suivante.getDate()).padStart(2, "0");
  return `${anneeSuivante}-${moisSuivant}-${jourSuivant}`;
}
