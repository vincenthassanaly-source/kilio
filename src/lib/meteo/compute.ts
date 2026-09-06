export type MeteoInterpretation = { label: string; icone: string };

/** Mappe un code météo WMO (renvoyé par Open-Meteo) vers un libellé français
 * et une icône. Voir https://open-meteo.com/en/docs pour la table complète. */
export function interpreterCodeMeteo(code: number): MeteoInterpretation {
  if (code === 0) return { label: "Ciel dégagé", icone: "☀️" };
  if (code === 1 || code === 2) return { label: "Peu nuageux", icone: "🌤️" };
  if (code === 3) return { label: "Couvert", icone: "☁️" };
  if (code === 45 || code === 48) return { label: "Brouillard", icone: "🌫️" };
  if (code === 51 || code === 53 || code === 55) return { label: "Bruine", icone: "🌦️" };
  if (code === 61 || code === 63 || code === 65) return { label: "Pluie", icone: "🌧️" };
  if (code === 71 || code === 73 || code === 75 || code === 77) return { label: "Neige", icone: "🌨️" };
  if (code === 80 || code === 81 || code === 82) return { label: "Averses", icone: "🌦️" };
  if (code === 95 || code === 96 || code === 99) return { label: "Orage", icone: "⛈️" };
  return { label: "Météo indisponible", icone: "🌡️" };
}

/** Libellé du sélecteur de jour dans la modale de détail (index 0 =
 * aujourd'hui, jusqu'à 7 = dans une semaine). */
export function labelJournee(dateISO: string, index: number): string {
  if (index === 0) return "Aujourd'hui";
  if (index === 1) return "Demain";
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
