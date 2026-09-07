"use server";

const LATITUDE = 43.2965;
const LONGITUDE = 5.3698;
const NB_JOURS = 8; // aujourd'hui + les 7 jours suivants
const NB_PREVISIONS_HORAIRES_AUJOURDHUI = 8;
// Échantillonnage toutes les 3h pour un jour futur (pas de notion
// d'"heure actuelle" au-delà d'aujourd'hui).
const HEURES_ECHANTILLON_JOUR_FUTUR = [0, 3, 6, 9, 12, 15, 18, 21];

export type PrevisionHoraire = { heure: string; temp: number; code: number };

export type MeteoJournee = {
  date: string;
  codeMeteo: number;
  tempMin: number;
  tempMax: number;
  ressentiMin: number;
  ressentiMax: number;
  vent: number;
  humidite: number;
  previsionsHoraires: PrevisionHoraire[];
};

export type MeteoJour = {
  codeMeteoActuel: number;
  tempActuelle: number;
  ventActuel: number;
  humiditeActuelle: number;
  /** `NB_JOURS` entrées : aujourd'hui (index 0) puis les 7 jours suivants. */
  journees: MeteoJournee[];
};

type OpenMeteoResponse = {
  current_weather: { temperature: number; windspeed: number; weathercode: number; time: string };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    weathercode: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    windspeed_10m: number[];
    relative_humidity_2m: number[];
  };
};

function heureLabel(offsetHeure: number): string {
  return `${String(offsetHeure).padStart(2, "0")}:00`;
}

/** Lecture externe pure (pas d'écriture en base) : renvoie `null` en cas
 * d'échec pour ne jamais faire planter le dashboard. */
export async function getMeteoJour(): Promise<MeteoJour | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
      `&current_weather=true` +
      `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weathercode` +
      `&hourly=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m` +
      `&timezone=Europe%2FParis&forecast_days=${NB_JOURS}`;

    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = (await res.json()) as OpenMeteoResponse;

    // On recalcule l'heure actuelle à Paris nous-mêmes plutôt que de comparer
    // à `current_weather.time` (champ déprécié côté Open-Meteo, pas toujours
    // aligné avec la grille horaire de `hourly`) : on cherche dans `hourly.time`
    // l'entrée "YYYY-MM-DDTHH:00" correspondant à l'heure actuelle arrondie.
    const maintenantParis = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});
    // `hour12: false` peut renvoyer "24" pour minuit selon l'environnement JS.
    const heureActuelle = maintenantParis.hour === "24" ? "00" : maintenantParis.hour;
    const heureActuelleISO = `${maintenantParis.year}-${maintenantParis.month}-${maintenantParis.day}T${heureActuelle}:00`;

    const indexHeureActuelle = data.hourly.time.indexOf(heureActuelleISO);
    const debutAujourdhui = indexHeureActuelle === -1 ? 0 : indexHeureActuelle;

    // `hourly` couvre les `NB_JOURS` jours en continu à partir de minuit :
    // l'heure `h` du jour `d` est donc toujours à l'index `d * 24 + h`.
    const journees: MeteoJournee[] = data.daily.time.map((date, d) => {
      const previsionsHoraires: PrevisionHoraire[] =
        d === 0
          ? data.hourly.time.slice(debutAujourdhui, debutAujourdhui + NB_PREVISIONS_HORAIRES_AUJOURDHUI).map((time, i) => ({
              heure: time.slice(11, 16),
              temp: Math.round(data.hourly.temperature_2m[debutAujourdhui + i]),
              code: data.hourly.weathercode[debutAujourdhui + i],
            }))
          : HEURES_ECHANTILLON_JOUR_FUTUR.map((h) => {
              const index = d * 24 + h;
              return {
                heure: heureLabel(h),
                temp: Math.round(data.hourly.temperature_2m[index]),
                code: data.hourly.weathercode[index],
              };
            });

      const indexMidi = d * 24 + 12;

      return {
        date,
        codeMeteo: data.daily.weathercode[d],
        tempMin: Math.round(data.daily.temperature_2m_min[d]),
        tempMax: Math.round(data.daily.temperature_2m_max[d]),
        ressentiMin: Math.round(data.daily.apparent_temperature_min[d]),
        ressentiMax: Math.round(data.daily.apparent_temperature_max[d]),
        vent: Math.round(data.hourly.windspeed_10m[indexMidi]),
        humidite: Math.round(data.hourly.relative_humidity_2m[indexMidi]),
        previsionsHoraires,
      };
    });

    return {
      codeMeteoActuel: data.current_weather.weathercode,
      tempActuelle: Math.round(data.current_weather.temperature),
      ventActuel: Math.round(data.current_weather.windspeed),
      humiditeActuelle: Math.round(data.hourly.relative_humidity_2m[debutAujourdhui]),
      journees,
    };
  } catch {
    return null;
  }
}
