"use server";

const LATITUDE = 43.2965;
const LONGITUDE = 5.3698;
const NB_PREVISIONS_HORAIRES = 8;

export type PrevisionHoraire = { heure: string; temp: number; code: number };

export type MeteoJour = {
  tempActuelle: number;
  tempMin: number;
  tempMax: number;
  ressentiMin: number;
  ressentiMax: number;
  codeMeteo: number;
  vent: number;
  humidite: number;
  previsionsHoraires: PrevisionHoraire[];
};

type OpenMeteoResponse = {
  current_weather: { temperature: number; windspeed: number; weathercode: number; time: string };
  daily: {
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

/** Lecture externe pure (pas d'écriture en base) : renvoie `null` en cas
 * d'échec pour ne jamais faire planter le dashboard. */
export async function getMeteoJour(): Promise<MeteoJour | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
      `&current_weather=true` +
      `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weathercode` +
      `&hourly=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m` +
      `&timezone=Europe%2FParis&forecast_days=1`;

    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = (await res.json()) as OpenMeteoResponse;

    const indexActuel = data.hourly.time.findIndex((t) => t === data.current_weather.time);
    const debut = indexActuel === -1 ? 0 : indexActuel;
    const previsionsHoraires: PrevisionHoraire[] = data.hourly.time
      .slice(debut, debut + NB_PREVISIONS_HORAIRES)
      .map((time, i) => ({
        heure: time.slice(11, 16),
        temp: Math.round(data.hourly.temperature_2m[debut + i]),
        code: data.hourly.weathercode[debut + i],
      }));

    const humiditeActuelle =
      indexActuel === -1 ? data.hourly.relative_humidity_2m[0] : data.hourly.relative_humidity_2m[indexActuel];

    return {
      tempActuelle: Math.round(data.current_weather.temperature),
      tempMin: Math.round(data.daily.temperature_2m_min[0]),
      tempMax: Math.round(data.daily.temperature_2m_max[0]),
      ressentiMin: Math.round(data.daily.apparent_temperature_min[0]),
      ressentiMax: Math.round(data.daily.apparent_temperature_max[0]),
      codeMeteo: data.current_weather.weathercode,
      vent: Math.round(data.current_weather.windspeed),
      humidite: Math.round(humiditeActuelle),
      previsionsHoraires,
    };
  } catch {
    return null;
  }
}
