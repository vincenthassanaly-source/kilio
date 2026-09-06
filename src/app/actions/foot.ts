"use server";

import {
  COMPETITIONS_FOOT,
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

    const fixturesRetenues = (data.response ?? []).filter((f) => IDS_COMPETITIONS_RETENUES.has(f.league.id));
    return { fixtures: fixturesRetenues, erreur: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { fixtures: [], erreur: `${dateISO} : exception réseau — ${message}` };
  }
}

/** Ordre de récupération des 15 jours : "Aujourd'hui" d'abord, puis en
 * s'écartant progressivement (J+1, J-1, J+2, J-2, ...). Si le débit du plan
 * gratuit (10 req/min) limite malgré tout une partie des 15 appels
 * séquentiels, ce sont les jours les plus proches d'aujourd'hui qui
 * passent en premier et les jours extrêmes (J-7/J+7) qui ont le plus de
 * chances d'être sacrifiés — préférable à un ordre chronologique brut où
 * "Aujourd'hui" pourrait être parmi les derniers servis. */
function ordreRecuperation(nbJours: number): number[] {
  const centre = Math.floor(nbJours / 2);
  const ordre = [centre];
  for (let ecart = 1; ecart <= centre; ecart++) {
    if (centre + ecart < nbJours) ordre.push(centre + ecart);
    if (centre - ecart >= 0) ordre.push(centre - ecart);
  }
  return ordre;
}

/** Unique chargement de toute la fenêtre J-7 à J+7 par exécution de ce
 * Server Component (voir `cache: "no-store"` ci-dessous) : la contrainte de
 * quota (100 req/jour, plan gratuit) impose qu'aucun autre code du module ne
 * rappelle cette fonction en dehors d'un chargement/rafraîchissement manuel
 * de `/foot`. Le filtrage par date affiché à l'écran se fait ensuite
 * entièrement côté client, sans nouvel appel réseau.
 *
 * Stratégie retenue : un appel par jour (15 requêtes `date=<jour>`, sans
 * `league` ni `season`), filtré côté serveur sur les 13 compétitions
 * suivies. La stratégie initialement prévue (`league=<id>&season=<année>`,
 * un appel par compétition) s'est révélée indisponible sur le plan gratuit
 * : l'API renvoie explicitement "Free plans do not have access to this
 * season" dès qu'un `season` autre que 2022-2024 est demandé avec `league`
 * — voir reports/2026-09-07-module-foot-logos-calendrier.md. Coût : 15
 * requêtes par chargement/rafraîchissement ⇒ ~6 rafraîchissements/jour max
 * sur le plan gratuit (100 req/jour). Les appels sont séquentiels et
 * espacés (`DELAI_ENTRE_APPELS_MS`) pour respecter la limite de 10
 * requêtes/minute du plan gratuit. Un jour en erreur (429, réseau, etc.) ne
 * fait pas échouer la page entière : il est simplement absent des
 * résultats et son erreur remontée dans `erreursPartielles`.
 */
export async function getResultatsFootFenetre(): Promise<ResultatsFoot> {
  const cle = process.env.API_FOOTBALL_KEY;
  if (!cle) {
    return { ok: false, erreur: "Clé API-Football manquante (API_FOOTBALL_KEY)." };
  }

  const dates = genererFenetreDates();
  const resultatsParIndex = new Array<ResultatJour>(dates.length);

  const ordre = ordreRecuperation(dates.length);
  for (const [i, index] of ordre.entries()) {
    if (i > 0) await attendre(DELAI_ENTRE_APPELS_MS);
    resultatsParIndex[index] = await chargerFixturesJour(dates[index], cle);
  }

  const erreursPartielles = resultatsParIndex.map((r) => r.erreur).filter((e): e is string => e !== null);

  if (erreursPartielles.length === dates.length) {
    // Affiche le détail de la première erreur directement à l'écran (plutôt
    // qu'un message générique) : sans accès aux logs serveur depuis cette
    // session, c'est le seul moyen de diagnostiquer une panne totale.
    return { ok: false, erreur: `Toutes les journées ont échoué. Détail : ${erreursPartielles[0]}` };
  }

  const toutesFixtures = resultatsParIndex.flatMap((r) => r.fixtures);
  return { ok: true, jours: grouperFixturesParJour(toutesFixtures, dates), erreursPartielles };
}
