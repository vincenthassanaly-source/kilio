"use client";

import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, isSameDay, isToday, startOfToday, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { TacheAvecRelations } from "@/app/actions/taches";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import { DUREE_TOAST_AVERTISSEMENT_MS } from "@/lib/taches/compute";
import type { Tables } from "@/lib/supabase/types";
import { getCreneauxDuJour } from "@/lib/agenda/planning-travail";
import { layoutChevauchements } from "@/lib/agenda/compute";
import { AddTaskToggle } from "../taches/AddTaskToggle";
import { TaskCard } from "../taches/TasksList";
import { ghostButton, sectionTitle } from "@/lib/ui";
import { ArchivedTasksSection } from "./ArchivedTasksSection";
import { parseISODate, sortByHeure, toISODate } from "./date-utils";
import { computeInitialScrollMinutes, gridHeight, HourLines, TimeGutter, useInitialScroll, WorkHoursBand } from "./TimeGrid";
import { TacheBlock } from "./TacheBlock";
import { useAgendaZoom } from "./useAgendaZoom";

export function DayView({
  taches,
  listes,
  tags,
  creneaux,
  exceptions,
  selectedDate,
  onChangeDate,
  tacheEnSurbrillanceId = null,
  onSelectTache,
}: {
  taches: TacheAvecRelations[];
  listes: Tables<"listes_taches">[];
  tags: Tables<"tags">[];
  creneaux: Tables<"horaires_travail_creneaux">[];
  exceptions: Tables<"horaires_travail_exceptions">[];
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  // Tâche visée par un deep-link de notification (cf. AgendaView) : mise en
  // surbrillance + scrollée en vue, qu'elle soit dans la liste active ou
  // archivée du jour. `null` en usage normal (aucune mise en surbrillance).
  tacheEnSurbrillanceId?: string | null;
  // Tap sur un bloc de la grille (cf. AgendaView) : surligne la tâche et la
  // scrolle en vue dans la liste ci-dessous.
  onSelectTache: (id: string) => void;
}) {
  // Les tâches sans heure sont regroupées après celles ayant une heure
  // (cohérent avec le tri "échéance nullsFirst: false" déjà utilisé par la
  // page Tâches).
  const dayTachesJour = taches.filter(
    (t) => t.echeance && isSameDay(parseISODate(t.echeance), selectedDate)
  );

  const dayTaches = dayTachesJour.filter((t) => !t.fait).sort(sortByHeure);
  const dayTachesArchivees = dayTachesJour.filter((t) => t.fait).sort(sortByHeure);

  const dayTachesAvecHeure = dayTaches.filter((t) => t.heure);
  const dayTachesSansHeure = dayTachesJour.filter((t) => !t.fait && !t.heure);
  const positions = layoutChevauchements(dayTachesAvecHeure);

  const creneauxJour = getCreneauxDuJour(creneaux, selectedDate, exceptions);
  const { zoom, touchHandlers } = useAgendaZoom();
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  useInitialScroll(
    scrollRef,
    computeInitialScrollMinutes({ showCurrentTime: isToday(selectedDate), creneaux: creneauxJour }),
    zoom
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChangeDate(subDays(selectedDate, 1))}
          className={ghostButton}
          aria-label="Jour précédent"
        >
          ←
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className={sectionTitle}>
            {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
          </span>
          {!isToday(selectedDate) && (
            <button
              type="button"
              onClick={() => onChangeDate(startOfToday())}
              className="text-xs font-semibold text-agenda underline"
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChangeDate(addDays(selectedDate, 1))}
          className={ghostButton}
          aria-label="Jour suivant"
        >
          →
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {dayTachesSansHeure.length > 0 && (
          <div className="flex flex-wrap gap-1 border-b border-line/60 px-3 py-2">
            {dayTachesSansHeure.map((t) => (
              <span
                key={t.id}
                className="max-w-[220px] truncate rounded bg-surface-alt px-2 py-1 text-xs text-ink-2"
              >
                {t.titre}
              </span>
            ))}
          </div>
        )}
        <div
          ref={scrollRef}
          className="max-h-[55vh] overflow-auto"
          style={{ touchAction: "pan-x pan-y" }}
          {...touchHandlers}
        >
          <div className="flex">
            <TimeGutter zoom={zoom} creneaux={creneauxJour} />
            <div className="relative flex-1" style={{ height: gridHeight(zoom) }}>
              <HourLines zoom={zoom} />
              <WorkHoursBand creneaux={creneauxJour} zoom={zoom} />
              {dayTachesAvecHeure.map((t) => (
                <TacheBlock
                  key={t.id}
                  tache={t}
                  zoom={zoom}
                  position={positions.get(t.id)}
                  onSelect={onSelectTache}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <AddTaskToggle
        listes={listes}
        tags={tags}
        defaultEcheance={toISODate(selectedDate)}
        label="+ Ajouter une tâche ce jour-là"
        onSaved={(_id, avertissement) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.taches });
          // Création réussie mais tags/image en échec : ne pas le taire.
          if (avertissement) showToast(avertissement, DUREE_TOAST_AVERTISSEMENT_MS);
        }}
      />

      {dayTaches.length === 0 && dayTachesArchivees.length === 0 ? (
        <p className="text-ink-2">Aucune tâche ce jour-là.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {dayTaches.map((tache) => (
            <TaskCard
              key={tache.id}
              tache={tache}
              listes={listes}
              tags={tags}
              colorByListe
              highlighted={tache.id === tacheEnSurbrillanceId}
            />
          ))}
        </ul>
      )}

      <ArchivedTasksSection
        taches={dayTachesArchivees}
        listes={listes}
        tags={tags}
        tacheEnSurbrillanceId={tacheEnSurbrillanceId}
      />
    </div>
  );
}
