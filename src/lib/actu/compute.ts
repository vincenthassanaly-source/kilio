export type Article = {
  titre: string;
  lien: string;
  source: string;
  datePublication: string;
  resume?: string;
};

/** Trie une liste d'articles par date de publication décroissante (plus
 * récent en premier). Dates invalides reléguées en fin de liste. */
export function trierParDateDesc(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const tempsA = new Date(a.datePublication).getTime();
    const tempsB = new Date(b.datePublication).getTime();
    if (Number.isNaN(tempsA)) return 1;
    if (Number.isNaN(tempsB)) return -1;
    return tempsB - tempsA;
  });
}

const RTF = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

/** Formate une date en "il y a Xh", "hier", "il y a 3j"… Renvoie une chaîne
 * vide si la date est invalide (article sans date exploitable). */
export function formaterDateRelative(date: string): string {
  const temps = new Date(date).getTime();
  if (Number.isNaN(temps)) return "";

  const diffSecondes = Math.round((temps - Date.now()) / 1000);
  const diffMinutes = Math.round(diffSecondes / 60);
  const diffHeures = Math.round(diffMinutes / 60);
  const diffJours = Math.round(diffHeures / 24);

  if (Math.abs(diffMinutes) < 60) return RTF.format(diffMinutes, "minute");
  if (Math.abs(diffHeures) < 24) return RTF.format(diffHeures, "hour");
  if (Math.abs(diffJours) < 7) return RTF.format(diffJours, "day");
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Tronque un résumé RSS (souvent du HTML brut déjà nettoyé en amont) à
 * `longueurMax` caractères, en coupant sur le dernier mot entier. */
export function tronquerResume(texte: string, longueurMax: number): string {
  const propre = texte.trim();
  if (propre.length <= longueurMax) return propre;
  const coupe = propre.slice(0, longueurMax);
  const dernierEspace = coupe.lastIndexOf(" ");
  return `${(dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe).trimEnd()}…`;
}
