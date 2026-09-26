// `T00:00:00` (sans `Z`) est interprété en heure locale du serveur : sur
// Vercel (UTC) ça ne bouge rien, mais en dev local (Paris) le
// `toISOString()` qui suit repart de minuit Paris converti en UTC et
// retombe donc sur la veille. On force UTC pour une arithmétique de date
// pure, indépendante du fuseau d'exécution (même pattern que
// `nutrition/journal/date-utils.ts:shiftDate`).
export function jourPrecedent(date: string): string {
  const curseur = new Date(`${date}T00:00:00Z`);
  curseur.setUTCDate(curseur.getUTCDate() - 1);
  return curseur.toISOString().slice(0, 10);
}

// Le streak se calcule côté serveur (JS, pas SQL récursif) : on remonte
// jour par jour depuis `date` tant que la valeur de l'entrée est > 0, et on
// s'arrête au premier jour manquant ou nul. Choix documenté dans le rapport.
export function calculerStreak(entriesParDate: Map<string, number>, date: string): number {
  let streak = 0;
  let jour = date;

  while (true) {
    const valeur = entriesParDate.get(jour);
    if (!valeur || valeur <= 0) break;
    streak += 1;
    jour = jourPrecedent(jour);
  }

  return streak;
}
