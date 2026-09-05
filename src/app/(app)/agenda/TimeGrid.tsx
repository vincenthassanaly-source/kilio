"use client";

import { useEffect, type RefObject } from "react";
import type { CreneauDuJour } from "@/lib/agenda/planning-travail";
import { heureToMinutes } from "./date-utils";
import { BASE_HOUR_HEIGHT, GUTTER_WIDTH } from "./useAgendaZoom";

// Grille horaire partagée entre WeekView et DayView : scroll vertical (pas
// de découpage en tranches de temps arbitraires), 1 minute =
// hourHeight(zoom)/60 px. Les heures 00h-06h ne sont jamais affichées (il
// ne s'y passe jamais rien côté usage réel) : la grille commence à 06h et
// finit à 24h, ce qui fait gagner de la place à tous les niveaux de zoom.
// Une tâche avec heure mais sans heure_fin reste visible comme un bloc
// plutôt qu'un simple repère ponctuel : 30 min par défaut, cohérent avec
// les pas de rappel existants (5/15/30 min).
export const DEFAULT_TASK_DURATION_MINUTES = 30;
export const MIN_BLOCK_HEIGHT = 18;
export const GRID_START_HOUR = 6;
// Hauteur réservée, identique pour toutes les colonnes (y compris la
// gouttière), pour la bande "tâches sans heure" de WeekView — qu'il y ait ou
// non des tâches ce jour-là. Sans cette réservation constante, un jour avec
// des tâches sans heure pousse son conteneur de grille plus bas que les
// autres colonnes et que le TimeGutter, désalignant heures et créneaux.
export const UNSCHEDULED_BAND_HEIGHT = 24;
const GRID_START_MINUTES = GRID_START_HOUR * 60;
const GRID_HOURS_COUNT = 24 - GRID_START_HOUR;
// Espace "d'amorce" au-dessus de la première heure affichée (06h), pour que
// l'écart entre le haut de la grille et la ligne 06h soit visuellement
// identique à l'écart entre deux lignes d'heure consécutives.
const GRID_LEAD_HOURS = 1;

const HOURS = Array.from({ length: GRID_HOURS_COUNT }, (_, i) => i + GRID_START_HOUR);

export function hourHeight(zoom: number): number {
  return BASE_HOUR_HEIGHT * zoom;
}

export function gridHeight(zoom: number): number {
  return hourHeight(zoom) * (GRID_HOURS_COUNT + GRID_LEAD_HOURS);
}

// Convertit une DURÉE (pas un instant) en hauteur px : à ne jamais utiliser
// pour un instant absolu (heure de la journée), voir minutesToPx ci-dessous.
export function durationToPx(durationMinutes: number, zoom: number): number {
  return (durationMinutes / 60) * hourHeight(zoom);
}

// `minutes` reste exprimé en minutes depuis minuit (échéances/créneaux non
// modifiés) ; la conversion en px est relative au début affiché de la
// grille (06h), décalée de l'espace d'amorce ci-dessus. Une valeur avant
// 06h donne un top négatif (hors-écran, ne s'affiche pas) — accepté, cette
// plage n'est jamais utilisée en pratique. Pour une DURÉE (pas un instant),
// utiliser durationToPx — soustraire GRID_START_MINUTES n'aurait aucun sens
// sur un écart entre deux heures.
export function minutesToPx(minutes: number, zoom: number): number {
  return durationToPx(minutes - GRID_START_MINUTES, zoom) + hourHeight(zoom) * GRID_LEAD_HOURS;
}

export function getTacheBlockStyle(
  tache: {
    heure: string | null;
    heure_fin: string | null;
  },
  zoom: number
): { top: number; height: number } | null {
  const start = heureToMinutes(tache.heure);
  if (start === null) return null;

  const endRaw = heureToMinutes(tache.heure_fin);
  const end = endRaw !== null && endRaw > start ? endRaw : start + DEFAULT_TASK_DURATION_MINUTES;

  return {
    top: minutesToPx(start, zoom),
    height: Math.max(durationToPx(end - start, zoom), MIN_BLOCK_HEIGHT),
  };
}

// Position du scroll initial : l'heure actuelle si le jour affiché (ou l'un
// des jours de la semaine affichée) est aujourd'hui, sinon le début du
// créneau de travail le plus tôt du jour de référence — pour éviter
// d'atterrir sur une grille vide à minuit. Repli sur 8h si aucun créneau
// n'est configuré ce jour-là.
export function computeInitialScrollMinutes({
  showCurrentTime,
  creneaux,
}: {
  showCurrentTime: boolean;
  creneaux: CreneauDuJour[];
}): number {
  if (showCurrentTime) {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
  const debuts = creneaux
    .map((c) => heureToMinutes(c.heure_debut))
    .filter((m): m is number => m !== null);
  return debuts.length > 0 ? Math.min(...debuts) : 8 * 60;
}

export function useInitialScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  targetMinutes: number,
  zoom: number
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = Math.max(minutesToPx(targetMinutes, zoom) - 80, 0);
    // Positionnement au montage uniquement : un re-scroll à chaque rendu
    // (ou à chaque pinch) écraserait le scroll manuel de l'utilisateur. Si
    // le zoom mémorisé (localStorage) diffère du zoom par défaut utilisé le
    // temps de l'hydratation, ce calcul initial peut être légèrement décalé
    // — limitation connue, voir le rapport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function TimeGutter({ zoom }: { zoom: number }) {
  return (
    <div className="relative shrink-0" style={{ width: GUTTER_WIDTH, height: gridHeight(zoom) }}>
      {HOURS.map((h) => (
        <span
          key={h}
          className="absolute right-1 -translate-y-1/2 text-[10px] font-medium text-ink-2"
          style={{ top: minutesToPx(h * 60, zoom) }}
        >
          {String(h).padStart(2, "0")}h
        </span>
      ))}
    </div>
  );
}

export function HourLines({ zoom }: { zoom: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: gridHeight(zoom) }}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute inset-x-0 border-t border-line/70"
          style={{ top: minutesToPx(h * 60, zoom) }}
        />
      ))}
    </div>
  );
}

// Bande "heures de travail" : un <div> par créneau du jour (pause déjeuner
// = deux créneaux disjoints), couleur dédiée --accent-planning-travail bien
// visible à ~30% d'opacité. Un jour sans créneau ne dessine aucune bande.
export function WorkHoursBand({
  creneaux,
  zoom,
}: {
  creneaux: CreneauDuJour[];
  zoom: number;
}) {
  return (
    <>
      {creneaux.map((creneau) => {
        const start = heureToMinutes(creneau.heure_debut);
        const end = heureToMinutes(creneau.heure_fin);
        if (start === null || end === null || end <= start) return null;

        return (
          <div
            key={creneau.id}
            className="pointer-events-none absolute inset-x-0 rounded-md"
            style={{
              top: minutesToPx(start, zoom),
              height: durationToPx(end - start, zoom),
              backgroundColor: "var(--accent-planning-travail)",
              opacity: 0.3,
            }}
          />
        );
      })}
    </>
  );
}
