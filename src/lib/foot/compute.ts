export type Competition = { id: number; nom: string; pays: string };

// IDs API-Football (v3.football.api-sports.io) confirmés par recoupement de
// sources publiques indépendantes (voir reports/2026-09-06-module-foot.md et
// reports/2026-09-07-module-foot-logos-calendrier.md : l'environnement de
// dev n'a toujours pas d'accès réseau sortant vers api-sports.io ni de clé
// API, l'appel /leagues en direct n'a donc pas pu être fait depuis cette
// session — à revérifier par Vincent via /leagues?search=... une fois
// API_FOOTBALL_KEY renseignée, en particulier pour la Conference League,
// seul ID non recoupé par une deuxième source indépendante).
export const COMPETITIONS_FOOT: readonly Competition[] = [
  { id: 61, nom: "Ligue 1", pays: "France" },
  { id: 39, nom: "Premier League", pays: "Angleterre" },
  { id: 140, nom: "Liga", pays: "Espagne" },
  { id: 78, nom: "Bundesliga", pays: "Allemagne" },
  { id: 135, nom: "Serie A", pays: "Italie" },
  { id: 66, nom: "Coupe de France", pays: "France" },
  { id: 45, nom: "FA Cup", pays: "Angleterre" },
  { id: 143, nom: "Copa del Rey", pays: "Espagne" },
  { id: 81, nom: "DFB-Pokal", pays: "Allemagne" },
  { id: 137, nom: "Coppa Italia", pays: "Italie" },
  { id: 2, nom: "Ligue des Champions", pays: "Europe" },
  { id: 3, nom: "Europa League", pays: "Europe" },
  { id: 848, nom: "Conference League", pays: "Europe" },
];

// IDs des 5 coupes nationales suivies, pour lesquelles Vincent ne veut voir
// les matchs qu'à partir des 16èmes de finale (seizièmes de finale, soit
// l'équivalent de "Round of 32" : 32 équipes encore en lice) — pas les
// tours antérieurs entre clubs amateurs/divisions inférieures.
export const IDS_COUPES_NATIONALES: ReadonlySet<number> = new Set([66, 45, 143, 81, 137]);

/** Ordre canonique (le plus précoce en premier) des libellés de manche que
 * renvoie API-Football (`fixture.league.round`) pour une coupe à
 * élimination directe. Vocabulaire non vérifié en direct (voir
 * reports/2026-09-07-module-foot-logos-calendrier.md) : `coupeAffichable`
 * ci-dessous est conçue pour ne rien masquer si un libellé réel ne
 * correspond à aucune entrée connue, plutôt que de risquer de cacher des
 * matchs indéfiniment sur la base d'une supposition erronée. */
const ORDRE_RONDES_COUPE = [
  "Qualifying Round",
  "Preliminary Round",
  "1st Round",
  "2nd Round",
  "3rd Round",
  "4th Round",
  "5th Round",
  "6th Round",
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Final",
];

/** Manche à partir de laquelle chaque coupe nationale suivie est affichée :
 * les 16èmes de finale (seizièmes de finale, 32 équipes encore en lice —
 * demande explicite de Vincent le 2026-09-07), traduite dans le vocabulaire
 * de manche propre à chaque compétition puisqu'API-Football ne semble pas
 * utiliser un nom de manche uniforme d'une compétition à l'autre (numéroté
 * "1st Round", "2nd Round", ... pour certaines, "Round of 64/32/16" pour
 * d'autres). Seuils estimés à partir du format connu de chaque compétition,
 * **pas vérifiés en direct** — à corriger si les libellés réels observés
 * dans l'app diffèrent (affichés en sous-titre de section pour les
 * compétitions de `IDS_COUPES_NATIONALES`). `null` = pas de filtrage. */
const RONDE_MINIMALE_COUPES_NATIONALES: Partial<Record<number, string | null>> = {
  66: "Round of 32", // Coupe de France : 16èmes de finale
  45: "4th Round", // FA Cup : équivalent des 16èmes (32 équipes) dans sa numérotation par tour
  143: "Round of 32", // Copa del Rey : 16èmes de finale
  81: "2nd Round", // DFB-Pokal : équivalent des 16èmes (32 équipes) dans sa numérotation par tour
  137: "Round of 32", // Coppa Italia : 16èmes de finale
};

/** true si ce match de coupe nationale doit être affiché compte tenu de sa
 * manche — toujours true pour une compétition non listée dans
 * `RONDE_MINIMALE_COUPES_NATIONALES`, ou si le seuil ou le libellé de
 * manche ne sont pas reconnus (fail-open : mieux vaut montrer un tour
 * amateur en trop que risquer de masquer des matchs indéfiniment). */
export function coupeAffichable(competitionId: number, round: string): boolean {
  const rondeMinimale = RONDE_MINIMALE_COUPES_NATIONALES[competitionId];
  if (rondeMinimale === undefined || rondeMinimale === null) return true;
  const indexMinimal = ORDRE_RONDES_COUPE.indexOf(rondeMinimale);
  const indexRonde = ORDRE_RONDES_COUPE.indexOf(round);
  if (indexMinimal === -1 || indexRonde === -1) return true;
  return indexRonde >= indexMinimal;
}

/** Traduit les codes `status.short` d'API-Football en libellé français. */
export function interpreterStatutFixture(
  statusShort: string,
  elapsed: number | null
): { label: string; enDirect: boolean } {
  switch (statusShort) {
    case "TBD":
      return { label: "Horaire à confirmer", enDirect: false };
    case "NS":
      return { label: "À venir", enDirect: false };
    case "1H":
      return { label: "1ère mi-temps", enDirect: true };
    case "HT":
      return { label: "Mi-temps", enDirect: true };
    case "2H":
      return { label: "2ème mi-temps", enDirect: true };
    case "ET":
      return { label: "Prolongations", enDirect: true };
    case "BT":
      return { label: "Pause prolongations", enDirect: true };
    case "P":
      return { label: "Tirs au but", enDirect: true };
    case "LIVE":
      return { label: elapsed != null ? `${elapsed}'` : "En direct", enDirect: true };
    case "SUSP":
      return { label: "Suspendu", enDirect: false };
    case "INT":
      return { label: "Interrompu", enDirect: false };
    case "FT":
      return { label: "Terminé", enDirect: false };
    case "AET":
      return { label: "Terminé (a.p.)", enDirect: false };
    case "PEN":
      return { label: "Terminé (t.a.b.)", enDirect: false };
    case "PST":
      return { label: "Reporté", enDirect: false };
    case "CANC":
      return { label: "Annulé", enDirect: false };
    case "ABD":
      return { label: "Abandonné", enDirect: false };
    case "AWD":
      return { label: "Match arrêté (forfait)", enDirect: false };
    case "WO":
      return { label: "Forfait", enDirect: false };
    default:
      return { label: statusShort, enDirect: false };
  }
}

export type FixtureApiFootball = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
  };
  league: { id: number; round: string };
  teams: {
    home: { name: string; logo: string | null };
    away: { name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
};

export type MatchFoot = {
  id: number;
  dateISO: string;
  heureLabel: string;
  statutShort: string;
  round: string;
  equipeDomicile: string;
  equipeExterieur: string;
  logoDomicile: string | null;
  logoExterieur: string | null;
  butsDomicile: number | null;
  butsExterieur: number | null;
  elapsed: number | null;
  statut: { label: string; enDirect: boolean };
};

export type CompetitionAvecMatchs = {
  competition: Competition;
  matchs: MatchFoot[];
};

export type JourFoot = {
  dateISO: string;
  competitions: CompetitionAvecMatchs[];
};

/** Formate une date en "YYYY-MM-DD", en fuseau Europe/Paris quel que soit le
 * fuseau du serveur d'exécution (Vercel tourne en UTC). Le format de sortie
 * de la locale "en-CA" est directement "YYYY-MM-DD". */
export function formatDateParis(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Heure de coup d'envoi affichée en fuseau Europe/Paris. */
export function formatHeureParis(dateISO: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateISO));
}

/** Libellé court d'un jour de la bande de navigation, ex. "lun. 7". Ancre
 * à midi UTC avant formatage : quel que soit le DST, midi UTC tombe
 * toujours dans le même jour calendaire Europe/Paris que `dateISO`. */
export function formatEtiquetteJour(dateISO: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "numeric",
  }).format(new Date(`${dateISO}T12:00:00Z`));
}

/** Date du jour au format ISO ("YYYY-MM-DD"), en fuseau Europe/Paris. */
export function dateDuJourParis(): string {
  return formatDateParis(new Date());
}

/** Fenêtre de jours réellement consultables sur le plan gratuit
 * API-Football (`nbJours` de chaque côté d'aujourd'hui, 1 par défaut ⇒
 * hier/aujourd'hui/demain). Ancrée sur le jour **UTC**, pas Europe/Paris :
 * le message d'erreur observé en conditions réelles pour `date=` hors
 * fenêtre ("try from 2026-09-05 to 2026-09-07") correspond au jour UTC du
 * serveur API-Football, pas au jour Europe/Paris — voir
 * reports/2026-09-07-module-foot-logos-calendrier.md, addendum 3. Paris
 * étant toujours en avance ou égal à UTC (jamais en retard), le jour
 * affiché comme "Aujourd'hui" (calculé en Europe/Paris pour l'affichage)
 * tombe toujours dans cette fenêtre. */
export function genererFenetreJoursAccessibles(reference: Date = new Date(), nbJours: number = 1): string[] {
  const dates: string[] = [];
  for (let offset = -nbJours; offset <= nbJours; offset++) {
    const d = new Date(reference);
    d.setUTCDate(d.getUTCDate() + offset);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Regroupe les fixtures par compétition (dans l'ordre de `COMPETITIONS_FOOT`)
 * puis trie les matchs de chaque compétition par heure de coup d'envoi. Les
 * compétitions sans aucun match aujourd'hui sont omises du résultat. */
export function grouperFixturesParCompetition(fixtures: FixtureApiFootball[]): CompetitionAvecMatchs[] {
  const matchsParCompetition = new Map<number, MatchFoot[]>();

  for (const f of fixtures) {
    const matchs = matchsParCompetition.get(f.league.id) ?? [];
    matchs.push({
      id: f.fixture.id,
      dateISO: f.fixture.date,
      heureLabel: formatHeureParis(f.fixture.date),
      statutShort: f.fixture.status.short,
      round: f.league.round,
      equipeDomicile: f.teams.home.name,
      equipeExterieur: f.teams.away.name,
      logoDomicile: f.teams.home.logo ?? null,
      logoExterieur: f.teams.away.logo ?? null,
      butsDomicile: f.goals.home,
      butsExterieur: f.goals.away,
      elapsed: f.fixture.status.elapsed,
      statut: interpreterStatutFixture(f.fixture.status.short, f.fixture.status.elapsed),
    });
    matchsParCompetition.set(f.league.id, matchs);
  }

  return COMPETITIONS_FOOT.map((competition) => ({
    competition,
    matchs: (matchsParCompetition.get(competition.id) ?? []).sort((a, b) =>
      a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0
    ),
  })).filter((c) => c.matchs.length > 0);
}

/** Regroupe les fixtures de toute la fenêtre par jour (dans l'ordre de
 * `dates`) puis par compétition au sein de chaque jour. Le filtrage par
 * date se fait sur le jour calendaire Europe/Paris du coup d'envoi, pas sur
 * la date UTC brute renvoyée par l'API. Un jour sans aucun match dans les
 * compétitions suivies apparaît quand même dans le résultat (avec
 * `competitions: []`) pour que la bande de dates reste complète. */
export function grouperFixturesParJour(fixtures: FixtureApiFootball[], dates: readonly string[]): JourFoot[] {
  return dates.map((dateISO) => ({
    dateISO,
    competitions: grouperFixturesParCompetition(
      fixtures.filter((f) => formatDateParis(new Date(f.fixture.date)) === dateISO)
    ),
  }));
}
