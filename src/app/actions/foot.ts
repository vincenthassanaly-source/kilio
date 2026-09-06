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

// Espacement entre deux appels API-Football successifs (voir le
// commentaire de `getResultatsFootFenetre` ci-dessous : plan gratuit limité
// à 10 requêtes/minute en plus des 100/jour).
const DELAI_ENTRE_APPELS_MS = 350;

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Réduit un corps de réponse (JSON ou texte brut) à un extrait exploitable
 * dans un message d'erreur affiché à l'écran, pour diagnostiquer sans accès
 * aux logs serveur — voir reports/2026-09-07-module-foot-logos-calendrier.md,
 * addendum du 2026-09-07 (bis) : le premier correctif, supposant un simple
 * dépassement du taux de 10 req/min, n'a pas suffi, d'où ce diagnostic
 * détaillé renvoyé directement dans `erreursPartielles`. */
function extraireExtrait(texte: string): string {
  const extrait = texte.trim().slice(0, 200);
  return extrait.length > 0 ? extrait : "(réponse vide)";
}

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

    const corpsBrut = await res.text();

    if (res.status === 429) {
      return { fixtures: [], erreur: `${competitionNom} : quota/débit dépassé (429) — ${extraireExtrait(corpsBrut)}` };
    }
    if (!res.ok) {
      return {
        fixtures: [],
        erreur: `${competitionNom} : erreur API (code ${res.status}) — ${extraireExtrait(corpsBrut)}`,
      };
    }

    let data: FixturesApiFootballResponse;
    try {
      data = JSON.parse(corpsBrut) as FixturesApiFootballResponse;
    } catch {
      return { fixtures: [], erreur: `${competitionNom} : réponse non-JSON — ${extraireExtrait(corpsBrut)}` };
    }

    if (aDesErreurs(data.errors)) {
      return { fixtures: [], erreur: `${competitionNom} : ${extraireExtrait(JSON.stringify(data.errors))}` };
    }

    return { fixtures: data.response ?? [], erreur: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { fixtures: [], erreur: `${competitionNom} : exception réseau — ${message}` };
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
 * `league=<id>&season=<saison>&from=<J-7>&to=<J+7>`), plutôt qu'un appel par
 * date (15 requêtes `date=<jour>` non filtrables par compétition côté API,
 * qui auraient aussi nécessité un filtrage manuel de bien plus de fixtures).
 * Coût : 13 requêtes par chargement/rafraîchissement ⇒ ~7 rafraîchissements/
 * jour max sur le plan gratuit (100 req/jour). Ces 13 appels sont
 * **séquentiels et espacés** (voir `DELAI_ENTRE_APPELS_MS` plus bas) : le
 * plan gratuit limite aussi à 10 requêtes/minute, et une rafale de 13 appels
 * en parallèle dépasse cette limite et fait échouer la quasi-totalité des
 * appels (429) même très loin du quota journalier — observé en conditions
 * réelles. Une compétition en erreur (429, réseau, ID invalide) ne fait pas
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

  const resultats: ResultatCompetition[] = [];
  for (const [index, competition] of COMPETITIONS_FOOT.entries()) {
    if (index > 0) await attendre(DELAI_ENTRE_APPELS_MS);
    resultats.push(await chargerFixturesCompetition(competition.id, competition.nom, cle, saison, from, to));
  }

  const erreursPartielles = resultats.map((r) => r.erreur).filter((e): e is string => e !== null);

  if (erreursPartielles.length === COMPETITIONS_FOOT.length) {
    // Affiche le détail de la première erreur directement à l'écran (plutôt
    // qu'un message générique) : sans accès aux logs serveur depuis cette
    // session, c'est le seul moyen de diagnostiquer une panne totale.
    return { ok: false, erreur: `Toutes les compétitions ont échoué. Détail : ${erreursPartielles[0]}` };
  }

  const toutesFixtures = resultats.flatMap((r) => r.fixtures);
  return { ok: true, jours: grouperFixturesParJour(toutesFixtures, dates), erreursPartielles };
}
