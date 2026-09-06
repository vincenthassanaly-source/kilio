"use server";

import {
  COMPETITIONS_FOOT,
  coupeAffichable,
  genererFenetreDates,
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

// Le plan gratuit API-Football restreint aussi `date=` à une fenêtre
// glissante étroite autour d'aujourd'hui : un premier test avec les 15
// jours de la bande de navigation a renvoyé, pour chaque jour hors de cette
// fenêtre, "Free plans do not have access to this date, try from
// 2026-09-05 to 2026-09-07" (soit hier/aujourd'hui/demain, pour un test
// fait le 2026-09-06) — voir reports/2026-09-07-module-foot-logos-calendrier.md,
// addendum 3. On ne tente donc l'appel réseau que pour ces jours-là ; les
// autres jours de la bande de navigation restent affichés (voir
// `JourFoot.disponible`) mais ne consomment aucun appel, contrairement à
// avant où les 12 jours hors fenêtre échouaient systématiquement.
const JOURS_ACCESSIBLES_PLAN_GRATUIT = 1;

/** Fenêtre de jours accessibles, ancrée sur le "aujourd'hui" du serveur
 * API-Football plutôt que sur Europe/Paris : le test réel (2026-09-06,
 * ~1h du matin heure de Paris) a renvoyé une fenêtre alignée sur le jour
 * UTC, pas sur le jour Paris — les deux ne coïncident pas entre minuit et
 * l'heure de bascule UTC. Paris étant toujours en avance sur UTC (UTC+1 ou
 * UTC+2, jamais en retard), le "aujourd'hui" Paris tombe toujours dans
 * cette fenêtre ancrée UTC (au pire sur son bord supérieur), donc ce choix
 * n'exclut jamais le jour affiché comme "Aujourd'hui" à l'écran. */
function genererFenetreAccessiblePlanGratuit(): string[] {
  const dates: string[] = [];
  for (let offset = -JOURS_ACCESSIBLES_PLAN_GRATUIT; offset <= JOURS_ACCESSIBLES_PLAN_GRATUIT; offset++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

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
 * (voir reports/2026-09-07-module-foot-logos-calendrier.md, addendums 2 et
 * 3) :
 * 1. `league=<id>&season=<année>` (stratégie initialement prévue en Phase
 *    2, un appel par compétition) est une fonctionnalité payante — rejeté
 *    avec "Free plans do not have access to this season".
 * 2. `date=<jour>` lui-même n'est autorisé que sur une fenêtre glissante
 *    étroite autour d'aujourd'hui (hier/aujourd'hui/demain au moment du
 *    test) — les jours hors de cette fenêtre sont rejetés avec "Free plans
 *    do not have access to this date".
 * Seuls les `JOURS_ACCESSIBLES_PLAN_GRATUIT` jours autour d'aujourd'hui
 * sont donc réellement interrogés (3 requêtes par chargement, plutôt que
 * 15) ; les autres jours de la bande de navigation restent affichés mais
 * marqués `disponible: false`, sans consommer d'appel ni afficher d'erreur
 * pour un échec qui serait de toute façon garanti. Une compétition/jour en
 * erreur malgré tout (429, réseau) ne fait pas échouer la page entière :
 * son erreur est remontée dans `erreursPartielles`.
 */
export async function getResultatsFootFenetre(): Promise<ResultatsFoot> {
  const cle = process.env.API_FOOTBALL_KEY;
  if (!cle) {
    return { ok: false, erreur: "Clé API-Football manquante (API_FOOTBALL_KEY)." };
  }

  const dates = genererFenetreDates();
  const datesAccessibles = genererFenetreAccessiblePlanGratuit();
  const ensembleDatesAccessibles = new Set(datesAccessibles);

  const resultats: ResultatJour[] = [];
  for (const [index, dateISO] of datesAccessibles.entries()) {
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
  return { ok: true, jours: grouperFixturesParJour(toutesFixtures, dates, ensembleDatesAccessibles), erreursPartielles };
}
