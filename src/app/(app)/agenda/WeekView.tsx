"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Tables } from "@/lib/supabase/types";
import { getCreneauxDuJour } from "@/lib/agenda/planning-travail";
import { ghostButton } from "@/lib/ui";
import { parseISODate } from "./date-utils";
import {
  computeInitialScrollMinutes,
  getTacheBlockStyle,
  gridHeight,
  HourLines,
  TimeGutter,
  UNSCHEDULED_BAND_HEIGHT,
  useInitialScroll,
  WorkHoursBand,
} from "./TimeGrid";
import {
  BASE_DAY_COLUMN_WIDTH,
  computeMinZoomForWeekWidth,
  GUTTER_WIDTH,
  MIN_ZOOM_FALLBACK,
  useAgendaZoom,
} from "./useAgendaZoom";

// useLayoutEffect ne fait rien côté serveur et logge un warning React si
// utilisé tel quel dans un composant serveur-rendu ; cet alias bascule sur
// useEffect côté serveur (mesure de toute façon impossible sans DOM).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Tache = Tables<"taches">;

const PRIORITE_BLOCK_CLASS: Record<Tache["priorite"], string> = {
  aucune: "bg-surface-alt text-ink",
  basse: "bg-agenda/15 text-agenda",
  moyenne: "bg-carbs/15 text-carbs",
  haute: "bg-alert/15 text-alert",
};

function TacheBlock({ tache, zoom }: { tache: Tache; zoom: number }) {
  const style = getTacheBlockStyle(tache, zoom);
  if (!style) return null;

  return (
    <div
      className={`absolute inset-x-0.5 overflow-hidden rounded-md px-1 py-0.5 text-[10px] leading-tight font-semibold ${PRIORITE_BLOCK_CLASS[tache.priorite]}`}
      style={{ top: style.top, height: style.height }}
    >
      <span className="block truncate">{tache.heure?.slice(0, 5)} {tache.titre}</span>
    </div>
  );
}

export function WeekView({
  taches,
  creneaux,
  exceptions,
  selectedDate,
  onChangeDate,
  onSelectDay,
}: {
  taches: Tache[];
  creneaux: Tables<"horaires_travail_creneaux">[];
  exceptions: Tables<"horaires_travail_exceptions">[];
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  onSelectDay: (date: Date) => void;
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const today = new Date();
  const weekContainsToday = days.some((d) => isSameDay(d, today));

  const scrollRef = useRef<HTMLDivElement>(null);
  // Zoom minimal dynamique : le plancher de dézoom est fixé au niveau
  // exact où les 7 colonnes remplissent la largeur visible du conteneur
  // (mesurée via ResizeObserver), pour ne jamais laisser d'espace vide à
  // droite. `containerWidth` vaut `null` tant que la mesure n'a pas eu
  // lieu (premier rendu) : on retombe alors sur le plancher par défaut.
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  useIsomorphicLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const minZoom =
    containerWidth !== null ? computeMinZoomForWeekWidth(containerWidth) : MIN_ZOOM_FALLBACK;

  const { zoom, touchHandlers } = useAgendaZoom({ minZoom });
  const dayColumnWidth = BASE_DAY_COLUMN_WIDTH * zoom;

  const creneauxSelectedJour = getCreneauxDuJour(creneaux, selectedDate, exceptions);
  useInitialScroll(
    scrollRef,
    computeInitialScrollMinutes({ showCurrentTime: weekContainsToday, creneaux: creneauxSelectedJour }),
    zoom
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChangeDate(subWeeks(selectedDate, 1))}
          className={ghostButton}
          aria-label="Semaine précédente"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-ink">
          {format(weekStart, "d MMM", { locale: fr })} – {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </span>
        <button
          type="button"
          onClick={() => onChangeDate(addWeeks(selectedDate, 1))}
          className={ghostButton}
          aria-label="Semaine suivante"
        >
          →
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div
          ref={scrollRef}
          className="max-h-[65vh] overflow-auto"
          style={{ touchAction: "pan-x pan-y" }}
          data-swipe-ignore
          {...touchHandlers}
        >
          <div className="flex" style={{ width: GUTTER_WIDTH + days.length * dayColumnWidth }}>
            <div className="sticky left-0 z-20 bg-surface">
              <div className="h-11 border-b border-line" />
              <div className="border-b border-line/60" style={{ height: UNSCHEDULED_BAND_HEIGHT }} />
              <TimeGutter zoom={zoom} />
            </div>

            {days.map((day) => {
              const creneauxJour = getCreneauxDuJour(creneaux, day, exceptions);
              const dayTachesAvecHeure = taches.filter(
                (t) => !t.fait && t.echeance && isSameDay(parseISODate(t.echeance), day) && t.heure
              );
              const dayTachesSansHeure = taches.filter(
                (t) => !t.fait && t.echeance && isSameDay(parseISODate(t.echeance), day) && !t.heure
              );

              return (
                <div
                  key={day.toISOString()}
                  className="flex shrink-0 flex-col border-l border-line"
                  style={{ width: dayColumnWidth }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className={`sticky top-0 z-10 flex h-11 flex-col items-center justify-center gap-0 border-b border-line bg-surface text-center ${
                      isToday(day) ? "text-agenda" : "text-ink"
                    }`}
                  >
                    <span className="text-[11px] font-semibold">{format(day, "EEE", { locale: fr })}</span>
                    <span className="text-[10px] text-ink-2">{format(day, "d MMM", { locale: fr })}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="flex flex-wrap items-center gap-0.5 overflow-hidden border-b border-line/60 px-0.5 py-0.5"
                    style={{ height: UNSCHEDULED_BAND_HEIGHT }}
                  >
                    {dayTachesSansHeure.slice(0, 2).map((t) => (
                      <span
                        key={t.id}
                        className="truncate rounded bg-surface-alt px-1 py-0.5 text-[9.5px] font-medium text-ink-2"
                      >
                        {t.titre}
                      </span>
                    ))}
                    {dayTachesSansHeure.length > 2 && (
                      <span className="text-[9.5px] text-ink-2">+{dayTachesSansHeure.length - 2}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="relative block w-full text-left"
                    style={{ height: gridHeight(zoom) }}
                    aria-label={`Voir le ${format(day, "EEEE d MMMM", { locale: fr })}`}
                  >
                    <HourLines zoom={zoom} />
                    <WorkHoursBand creneaux={creneauxJour} zoom={zoom} />
                    {dayTachesAvecHeure.map((t) => (
                      <TacheBlock key={t.id} tache={t} zoom={zoom} />
                    ))}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
