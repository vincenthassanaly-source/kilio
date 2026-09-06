"use server";

import {
  COMPETITIONS_FOOT,
  coupeAffichable,
  genererFenetreJoursAccessibles,
  grouperFixturesParJour,
  type FixtureApiFootball,
  type JourFoot,
} from "@/lib/foot/compute";

export type ResultatsFoot =
  | { ok: true; jours: JourFoot[]; erreursPartielles: string[] }
  | { ok: false; erreur: string };

const IDS_COMPETITIONS_RETENUES = new Set(COMPETITIONS_FOOT.map((c) => c.id));

function aDesErreurs(errors: unknown): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  return Object.keys(errors as Record<string, unknown>).length > 0;
}

type FixturesApiFootballResponse = {
  response: FixtureApiFootball[];
  errors?: unknown;
};

type ResultatJour = { fixtures: FixtureApiFootball[]; erreur: string | null };

// Le plan gratuit API-Football restreint `date=` à une fenêtre glissante
// étroite autour d'aujourd'hui : hors de cette fenêtre, l'API répond "Free
// plans do not have access to this date, try from 2026-09-05 to
// 2026-09-07" (soit hier/aujourd'hui/demain, pour un test fait le
// 2026-09-06) — voir reports/2026-09-07-module-foot-logos-calendrier.md,
// addendum 3. Vincent a confirmé (addendum 5) préférer ne montrer que ces
// jours-là plutôt qu'une bande de dates plus large dont la plupart des
// jours ne pourraient jamais afficher de contenu.
const JOURS_ACCESSIBLES_PLAN_GRATUIT = 1;

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
 * addendums du 2026-09-07 : c'est ce diagnostic qui a révélé que
 * `league=<id>&season=<année>` est un usage payant sur le plan gratuit
 * ("Free plans do not have access to this season"), d'où le retour à un
 * appel par jour via `date=` (sans `league` ni `season`), seul filtrage
 * réellement disponible sur le plan gratuit. */
function extraireExtrait(texte: string): string {
  const extrait = texte.trim().slice(0, 200);
  return extrait.length > 0 ? extrait : "(réponse vide)";
}

async function chargerFixturesJour(dateISO: string, cle: string): Promise<ResultatJour> {
  try {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateISO}`, {
      headers: { "x-apisports-key": cle },
      // Impératif : garantit un vrai nouvel appel réseau à chaque exécution
      // de ce Server Component, jamais de réponse mise en cache par Next.js.
      cache: "no-store",
    });

    const corpsBrut = await res.text();

    if (res.status === 429) {
      return { fixtures: [], erreur: `${dateISO} : quota/débit dépassé (429) — ${extraireExtrait(corpsBrut)}` };
    }
    if (!res.ok) {
      return { fixtures: [], erreur: `${dateISO} : erreur API (code ${res.status}) — ${extraireExtrait(corpsBrut)}` };
    }

    let data: FixturesApiFootballResponse;
    try {
      data = JSON.parse(corpsBrut) as FixturesApiFootballResponse;
    } catch {
      return { fixtures: [], erreur: `${dateISO} : réponse non-JSON — ${extraireExtrait(corpsBrut)}` };
    }

    if (aDesErreurs(data.errors)) {
      return { fixtures: [], erreur: `${dateISO} : ${extraireExtrait(JSON.stringify(data.errors))}` };
    }

    const fixturesRetenues = (data.response ?? [])
      .filter((f) => IDS_COMPETITIONS_RETENUES.has(f.league.id))
      .filter((f) => coupeAffichable(f.league.id, f.league.round));
    return { fixtures: fixturesRetenues, erreur: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { fixtures: [], erreur: `${dateISO} : exception réseau — ${message}` };
  }
}

/** Unique chargement par exécution de ce Server Component (voir
 * `cache: "no-store"` ci-dessous) : la contrainte de quota (100 req/jour,
 * plan gratuit) impose qu'aucun autre code du module ne rappelle cette
 * fonction en dehors d'un chargement/rafraîchissement manuel de `/foot`.
 * Le filtrage par date affiché à l'écran se fait ensuite entièrement côté
 * client, sans nouvel appel réseau.
 *
 * Stratégie retenue : un appel par jour (`date=<jour>`, sans `league` ni
 * `season`), filtré côté serveur sur les 13 compétitions suivies. Deux
 * restrictions du plan gratuit ont été découvertes en conditions réelles
 * (voir reports/2026-09-07-module-foot-logos-calendrier.md, addendums 2, 3
 * et 5) :
 * 1. `league=<id>&season=<année>` (stratégie initialement prévue en Phase
 *    2, un appel par compétition) est une fonctionnalité payante — rejeté
 *    avec "Free plans do not have access to this season".
 * 2. `date=<jour>` lui-même n'est autorisé que sur une fenêtre glissante
 *    étroite autour d'aujourd'hui (hier/aujourd'hui/demain) — les jours
 *    hors de cette fenêtre sont rejetés avec "Free plans do not have
 *    access to this date". La bande de navigation n'affiche donc plus que
 *    ces `JOURS_ACCESSIBLES_PLAN_GRATUIT` jours (3 requêtes par
 *    chargement) : Vincent a préféré ne pas montrer de jours qui ne
 *    pourront de toute façon jamais afficher de contenu sur ce plan.
 * Une compétition/jour en erreur malgré tout (429, réseau) ne fait pas
 * échouer la page entière : son erreur est remontée dans
 * `erreursPartielles`.
 */
export async function getResultatsFootFenetre(): Promise<ResultatsFoot> {
  const cle = process.env.API_FOOTBALL_KEY;
  if (!cle) {
    return { ok: false, erreur: "Clé API-Football manquante (API_FOOTBALL_KEY)." };
  }

  const dates = genererFenetreJoursAccessibles(new Date(), JOURS_ACCESSIBLES_PLAN_GRATUIT);

  const resultats: ResultatJour[] = [];
  for (const [index, dateISO] of dates.entries()) {
    if (index > 0) await attendre(DELAI_ENTRE_APPELS_MS);
    resultats.push(await chargerFixturesJour(dateISO, cle));
  }

  const erreursPartielles = resultats.map((r) => r.erreur).filter((e): e is string => e !== null);

  if (erreursPartielles.length === resultats.length) {
    // Affiche le détail de la première erreur directement à l'écran (plutôt
    // qu'un message générique) : sans accès aux logs serveur depuis cette
    // session, c'est le seul moyen de diagnostiquer une panne totale.
    return { ok: false, erreur: `Toutes les journées ont échoué. Détail : ${erreursPartielles[0]}` };
  }

  const toutesFixtures = resultats.flatMap((r) => r.fixtures);
  return { ok: true, jours: grouperFixturesParJour(toutesFixtures, dates), erreursPartielles };
}
