"use client";

import { useEffect, useState } from "react";
import { getStationsProches } from "@/app/actions/carburants";
import type { ResultatStationsProches, StationCarburant } from "@/app/actions/carburants";
import { formaterDistance, trierParDistanceCroissante, trierParPrixCroissant } from "@/lib/carburants/compute";
import { card, screenTitle, secondaryButton, errorText, linkButton } from "@/lib/ui";
import { PullToRefresh } from "@/components/PullToRefresh";

const RAYON_DEFAUT_KM = 10;
const RAYONS_DISPONIBLES = [5, 10, 20, 50] as const;
type TriPar = "distance" | "prix";

// Persistance du rayon et du critère de tri choisis (survit entre sessions).
const CLE_RAYON = "kilio-carburants-rayon";
const CLE_TRI = "kilio-carburants-tri";

// Repli si la géolocalisation est refusée ou indisponible (voir consigne
// Kilio du module) : position de Marseille.
const MARSEILLE = { lat: 43.2965, lon: 5.3698 };

type Statut =
  | { phase: "chargement" }
  | { phase: "prete"; stations: StationCarburant[]; positionParDefaut: boolean }
  | { phase: "erreur"; message: string; positionParDefaut: boolean };

function lireRayonStocke(): number {
  try {
    const brut = window.localStorage.getItem(CLE_RAYON);
    const valeur = brut ? Number(brut) : NaN;
    return (RAYONS_DISPONIBLES as readonly number[]).includes(valeur) ? valeur : RAYON_DEFAUT_KM;
  } catch {
    return RAYON_DEFAUT_KM;
  }
}

function lireTriStocke(): TriPar {
  try {
    return window.localStorage.getItem(CLE_TRI) === "prix" ? "prix" : "distance";
  } catch {
    return "distance";
  }
}

/** "mis à jour il y a Xh" à partir de la date de MAJ du prix renvoyée par
 * l'API (peut être `null` si le champ n'a pas pu être lu). */
function formaterDelaiMaj(dateMaj: string | null): string | null {
  if (!dateMaj) return null;
  const date = new Date(dateMaj);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return "mis à jour à l'instant";
  if (diffH < 24) return `mis à jour il y a ${diffH} h`;
  return `mis à jour il y a ${Math.floor(diffH / 24)} j`;
}

export function CarburantsView() {
  const [statut, setStatut] = useState<Statut>({ phase: "chargement" });
  // Incrémenté par le bouton "Actualiser" pour redéclencher l'effet ci-dessous
  // (la géolocalisation elle-même n'est pas mémoïsable côté navigateur).
  const [declencheur, setDeclencheur] = useState(0);
  // Lecture localStorage dans l'initialiseur paresseux de useState (plutôt
  // que dans un effet) : `window` est indisponible côté serveur, d'où la
  // garde — au pire un rendu initial sur la valeur par défaut, corrigé dès
  // l'hydratation côté client.
  const [rayonKm, setRayonKm] = useState<number>(() => (typeof window === "undefined" ? RAYON_DEFAUT_KM : lireRayonStocke()));
  const [triPar, setTriPar] = useState<TriPar>(() => (typeof window === "undefined" ? "distance" : lireTriStocke()));

  useEffect(() => {
    let annule = false;

    function appliquerResultat(resultat: ResultatStationsProches, positionParDefaut: boolean) {
      if (annule) return;
      if (resultat.ok) {
        setStatut({ phase: "prete", stations: resultat.stations, positionParDefaut });
      } else {
        setStatut({ phase: "erreur", message: resultat.erreur, positionParDefaut });
      }
    }

    async function chercherStations(lat: number, lon: number, positionParDefaut: boolean) {
      const resultat = await getStationsProches(lat, lon, rayonKm);
      appliquerResultat(resultat, positionParDefaut);
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      void chercherStations(MARSEILLE.lat, MARSEILLE.lon, true);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => void chercherStations(position.coords.latitude, position.coords.longitude, false),
        () => void chercherStations(MARSEILLE.lat, MARSEILLE.lon, true),
        { timeout: 10_000 }
      );
    }

    return () => {
      annule = true;
    };
  }, [declencheur, rayonKm]);

  // Rafraîchissement manuel (bouton ou repli géoloc refusée) : repasse en
  // "chargement" puis redéclenche l'effet ci-dessus.
  function localiser() {
    setStatut({ phase: "chargement" });
    setDeclencheur((n) => n + 1);
  }

  function choisirRayon(km: number) {
    if (km === rayonKm) return;
    setStatut({ phase: "chargement" });
    setRayonKm(km);
    try {
      window.localStorage.setItem(CLE_RAYON, String(km));
    } catch {
      // localStorage indisponible (navigation privée stricte, etc.) : le
      // choix reste actif pour la session en cours, simplement pas persisté.
    }
  }

  function choisirTri(tri: TriPar) {
    if (tri === triPar) return;
    setTriPar(tri);
    try {
      window.localStorage.setItem(CLE_TRI, tri);
    } catch {
      // idem : persistance best-effort.
    }
  }

  const stationsTriees =
    statut.phase === "prete"
      ? triPar === "distance"
        ? trierParDistanceCroissante(statut.stations)
        : trierParPrixCroissant(statut.stations)
      : [];

  return (
    <PullToRefresh onRefresh={localiser}>
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className={screenTitle}>Carburants</h1>
        <button
          type="button"
          onClick={localiser}
          disabled={statut.phase === "chargement"}
          className={secondaryButton}
        >
          {statut.phase === "chargement" ? "Recherche…" : "Actualiser"}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex gap-1.5 rounded-2xl bg-surface-alt p-1">
          {RAYONS_DISPONIBLES.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => choisirRayon(km)}
              className={`flex-1 rounded-xl py-1.5 text-center text-[13px] font-semibold transition-colors ${
                rayonKm === km ? "bg-carburants text-white" : "text-ink-2"
              }`}
            >
              {km} km
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 rounded-2xl bg-surface-alt p-1">
          <button
            type="button"
            onClick={() => choisirTri("distance")}
            className={`flex-1 rounded-xl py-1.5 text-center text-[13px] font-semibold transition-colors ${
              triPar === "distance" ? "bg-carburants text-white" : "text-ink-2"
            }`}
          >
            Trier par distance
          </button>
          <button
            type="button"
            onClick={() => choisirTri("prix")}
            className={`flex-1 rounded-xl py-1.5 text-center text-[13px] font-semibold transition-colors ${
              triPar === "prix" ? "bg-carburants text-white" : "text-ink-2"
            }`}
          >
            Trier par prix
          </button>
        </div>
      </div>

      {statut.phase !== "chargement" && statut.positionParDefaut && (
        <div className={`${card} flex flex-col gap-1.5 text-sm text-ink-2`}>
          <p>Position non disponible — résultats autour de Marseille.</p>
          <button type="button" onClick={localiser} className={`${linkButton} self-start`}>
            Réessayer la géolocalisation
          </button>
        </div>
      )}

      {statut.phase === "chargement" && <p className="text-sm text-ink-2">Recherche des stations les plus proches…</p>}

      {statut.phase === "erreur" && <p className={errorText}>{statut.message}</p>}

      {statut.phase === "prete" && stationsTriees.length === 0 && (
        <p className="text-sm text-ink-2">Aucune station avec du sans plomb trouvée dans un rayon de {rayonKm} km.</p>
      )}

      {statut.phase === "prete" && stationsTriees.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {stationsTriees.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}

function StationCard({ station }: { station: StationCarburant }) {
  const lienMaps = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lon}`;
  const delaiMaj = formaterDelaiMaj(station.dateMaj);
  const adresseComplete = [station.adresse, station.ville].filter(Boolean).join(", ");

  return (
    <a href={lienMaps} target="_blank" rel="noopener noreferrer" className={`${card} flex items-center justify-between gap-3`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-[14.5px] font-semibold text-ink">{station.nom}</p>
        {adresseComplete && <p className="truncate text-xs text-ink-2">{adresseComplete}</p>}
        <p className="text-xs text-ink-3">
          {formaterDistance(station.distanceMetres)}
          {delaiMaj ? ` · ${delaiMaj}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p className="font-display text-[17px] font-bold text-ink">{station.meilleurPrix.toFixed(3)} €</p>
        <p className="text-[11px] font-semibold text-ink-2">{station.typeCarburant}</p>
      </div>
    </a>
  );
}
