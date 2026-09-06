"use server";

import {
  COMPETITIONS_FOOT,
  dateDuJourParis,
  grouperFixturesParCompetition,
  type CompetitionAvecMatchs,
  type FixtureApiFootball,
} from "@/lib/foot/compute";

export type ResultatsFoot =
  | { ok: true; competitions: CompetitionAvecMatchs[] }
  | { ok: false; erreur: string };

const IDS_COMPETITIONS_RETENUES = new Set(COMPETITIONS_FOOT.map((c) => c.id));

type FixturesApiFootballResponse = {
  response: FixtureApiFootball[];
  errors?: unknown;
};

function aDesErreurs(errors: unknown): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  return Object.keys(errors as Record<string, unknown>).length > 0;
}

/** Unique appel API-Football par exécution de ce Server Component (voir
 * `cache: "no-store"` ci-dessous) : la contrainte de quota (100 req/jour,
 * plan gratuit) impose qu'aucun autre code du module ne rappelle cette
 * fonction en dehors d'un chargement/rafraîchissement manuel de `/foot`. */
export async function getResultatsFootDuJour(): Promise<ResultatsFoot> {
  const cle = process.env.API_FOOTBALL_KEY;
  if (!cle) {
    return { ok: false, erreur: "Clé API-Football manquante (API_FOOTBALL_KEY)." };
  }

  try {
    const date = dateDuJourParis();
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
      headers: { "x-apisports-key": cle },
      // Impératif : garantit un vrai nouvel appel réseau à chaque exécution
      // de ce Server Component, jamais de réponse mise en cache par Next.js
      // qui contournerait la fraîcheur/le contrôle de quota attendu.
      cache: "no-store",
    });

    if (res.status === 429) {
      return { ok: false, erreur: "Quota API-Football dépassé pour aujourd'hui (plan gratuit : 100 requêtes/jour)." };
    }
    if (!res.ok) {
      return { ok: false, erreur: `Erreur API-Football (code ${res.status}).` };
    }

    const data = (await res.json()) as FixturesApiFootballResponse;
    if (aDesErreurs(data.errors)) {
      return { ok: false, erreur: "API-Football a renvoyé une erreur (quota ou requête invalide)." };
    }

    const fixturesRetenues = (data.response ?? []).filter((f) => IDS_COMPETITIONS_RETENUES.has(f.league.id));

    return { ok: true, competitions: grouperFixturesParCompetition(fixturesRetenues) };
  } catch {
    return { ok: false, erreur: "Impossible de contacter API-Football (problème réseau)." };
  }
}
