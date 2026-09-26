"use client";

import { compareAsc, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { TacheAvecRelations } from "@/app/actions/taches";
import type { Tables } from "@/lib/supabase/types";
import { TaskCard } from "../taches/TasksList";
import { sectionTitle } from "@/lib/ui";
import { ArchivedTasksSection } from "./ArchivedTasksSection";
import { parseISODate } from "@/lib/date/iso";
import { sortByHeure } from "./date-utils";

export function ListView({
  taches,
  listes,
  tags,
}: {
  taches: TacheAvecRelations[];
  listes: Tables<"listes_taches">[];
  tags: Tables<"tags">[];
}) {
  const actives = taches.filter((t) => !t.fait);
  const archivees = taches
    .filter((t) => t.fait)
    .sort((a, b) => {
      const dateCompare = (b.echeance ?? "").localeCompare(a.echeance ?? "");
      if (dateCompare !== 0) return dateCompare;
      return (b.heure ?? "").localeCompare(a.heure ?? "");
    });

  const withDate = actives.filter((t) => t.echeance);
  const withoutDate = actives.filter((t) => !t.echeance);

  const groups = new Map<string, TacheAvecRelations[]>();
  for (const t of withDate) {
    const list = groups.get(t.echeance!) ?? [];
    list.push(t);
    groups.set(t.echeance!, list);
  }

  const sortedDates = Array.from(groups.keys()).sort((a, b) =>
    compareAsc(parseISODate(a), parseISODate(b))
  );

  if (sortedDates.length === 0 && withoutDate.length === 0 && archivees.length === 0) {
    return <p className="text-ink-2">Aucune tâche pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {sortedDates.map((iso) => {
        const dayTaches = groups.get(iso)!.sort(sortByHeure);
        return (
          <div key={iso} className="flex flex-col gap-2">
            <h2 className={sectionTitle}>
              {format(parseISODate(iso), "EEEE d MMMM yyyy", { locale: fr })}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {dayTaches.map((tache) => (
                <TaskCard key={tache.id} tache={tache} listes={listes} tags={tags} colorByListe />
              ))}
            </ul>
          </div>
        );
      })}

      {withoutDate.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className={sectionTitle}>Sans date</h2>
          <ul className="flex flex-col gap-2.5">
            {withoutDate.map((tache) => (
              <TaskCard key={tache.id} tache={tache} listes={listes} tags={tags} colorByListe />
            ))}
          </ul>
        </div>
      )}

      <ArchivedTasksSection taches={archivees} listes={listes} tags={tags} />
    </div>
  );
}
