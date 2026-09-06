"use server";

import {
  COMPETITIONS_FOOT,
  genererFenetreDates,
  grouperFixturesParJour,
  saisonCourante,
  type FixtureApiFootball,
  type JourFoot,
} from "@/lib/foot/compute";

export type ResultatsFoot =
  | { ok: true; jours: JourFoot[]; erreursPartielles: string[] }
  | { ok: false; erreur: string };

function aDesErreurs(errors: unknown): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  return Object.keys(errors as Record<string, unknown>).length > 0;
}

type FixturesApiFootballResponse = {
  response: FixtureApiFootball[];
  errors?: unknown;
};

type ResultatCompetition = { fixtures: FixtureApiFootball[]; erreur: string | null };

async function chargerFixturesCompetition(
  competitionId: number,
  competitionNom: string,
  cle: string,
  saison: number,
  from: string,
  to: string
): Promise<ResultatCompetition> {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=${competitionId}&season=${saison}&from=${from}&to=${to}`,
      {
        headers: { "x-apisports-key": cle },
        // Impératif : garantit un vrai nouvel appel réseau à chaque exécution
        // de ce Server Component, jamais de réponse mise en cache par Next.js.
        cache: "no-store",
      }
    );

    if (res.status === 429) {
      return { fixtures: [], erreur: `${competitionNom} : quota API-Football dépassé.` };
    }
    if (!res.ok) {
      return { fixtures: [], erreur: `${competitionNom} : erreur API (code ${res.status}).` };
    }

    const data = (await res.json()) as FixturesApiFootballResponse;
    if (aDesErreurs(data.errors)) {
      return { fixtures: [], erreur: `${competitionNom} : erreur API-Football (quota ou requête invalide).` };
    }

    return { fixtures: data.response ?? [], erreur: null };
  } catch {
    return { fixtures: [], erreur: `${competitionNom} : problème réseau.` };
  }
}

/** Unique chargement de toute la fenêtre J-7 à J+7 par exécution de ce
 * Server Component (voir `cache: "no-store"` ci-dessous) : la contrainte de
 * quota (100 req/jour, plan gratuit) impose qu'aucun autre code du module ne
 * rappelle cette fonction en dehors d'un chargement/rafraîchissement manuel
 * de `/foot`. Le filtrage par date affiché à l'écran se fait ensuite
 * entièrement côté client, sans nouvel appel réseau.
 *
 * Stratégie retenue : un appel par compétition suivie (13 requêtes
 * `league=<id>&season=<saison>&from=<J-7>&to=<J+7>` en parallèle), plutôt
 * qu'un appel par date (15 requêtes `date=<jour>` non filtrables par
 * compétition côté API, qui auraient aussi nécessité un filtrage manuel de
 * bien plus de fixtures). Coût : 13 requêtes par chargement/rafraîchissement
 * ⇒ ~7 rafraîchissements/jour max sur le plan gratuit (100 req/jour).
 * Une compétition en erreur (quota, réseau, ID invalide) ne fait pas
 * échouer la page entière : elle est simplement absente des résultats et
 * son erreur remontée dans `erreursPartielles`.
 */
export async function getResultatsFootFenetre(): Promise<ResultatsFoot> {
  const cle = process.env.API_FOOTBALL_KEY;
  if (!cle) {
    return { ok: false, erreur: "Clé API-Football manquante (API_FOOTBALL_KEY)." };
  }

  const dates = genererFenetreDates();
  const from = dates[0];
  const to = dates[dates.length - 1];
  const saison = saisonCourante();

  const resultats = await Promise.all(
    COMPETITIONS_FOOT.map((competition) =>
      chargerFixturesCompetition(competition.id, competition.nom, cle, saison, from, to)
    )
  );

  const erreursPartielles = resultats.map((r) => r.erreur).filter((e): e is string => e !== null);

  if (erreursPartielles.length === COMPETITIONS_FOOT.length) {
    return { ok: false, erreur: "Impossible de contacter API-Football (quota dépassé ou problème réseau)." };
  }

  const toutesFixtures = resultats.flatMap((r) => r.fixtures);
  return { ok: true, jours: grouperFixturesParJour(toutesFixtures, dates), erreursPartielles };
}
