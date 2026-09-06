export type Competition = { id: number; nom: string; pays: string };

// IDs API-Football (v3.football.api-sports.io) confirmés par recoupement de
// sources publiques indépendantes (voir reports/2026-09-06-module-foot.md :
// l'environnement de dev n'a pas d'accès réseau sortant vers api-sports.io
// ni de clé API, l'appel /leagues en direct n'a donc pas pu être fait
// depuis cette session — à revérifier par Vincent via /leagues?search=...
// une fois API_FOOTBALL_KEY renseignée, en particulier pour la Conference
// League, seul ID non recoupé par une deuxième source indépendante).
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
  league: { id: number };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  goals: { home: number | null; away: number | null };
};

export type MatchFoot = {
  id: number;
  dateISO: string;
  heureLabel: string;
  statutShort: string;
  equipeDomicile: string;
  equipeExterieur: string;
  butsDomicile: number | null;
  butsExterieur: number | null;
  elapsed: number | null;
  statut: { label: string; enDirect: boolean };
};

export type CompetitionAvecMatchs = {
  competition: Competition;
  matchs: MatchFoot[];
};

/** Heure de coup d'envoi affichée en fuseau Europe/Paris, quel que soit le
 * fuseau du serveur d'exécution (Vercel tourne en UTC). */
export function formatHeureParis(dateISO: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateISO));
}

/** Date du jour au format ISO ("YYYY-MM-DD"), en fuseau Europe/Paris. Le
 * format de sortie de la locale "en-CA" est directement "YYYY-MM-DD". */
export function dateDuJourParis(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
      equipeDomicile: f.teams.home.name,
      equipeExterieur: f.teams.away.name,
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
