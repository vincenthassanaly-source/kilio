"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { aujourdhuiISO } from "@/lib/budget/compute";
import { getListes, getTachesAvecRelations, getTags } from "@/app/actions/taches";
import { queryKeys } from "@/lib/query/keys";
import { AddTaskToggle } from "./AddTaskToggle";
import { TasksList } from "./TasksList";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { Skeleton } from "@/components/skeletons/Skeleton";
import { errorText, input } from "@/lib/ui";
import { PullToRefresh } from "@/components/PullToRefresh";

const LISTE_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </svg>
);

const SEARCH_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.5-4.5" />
  </svg>
);

const CLEAR_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

type VueKey = "aujourdhui" | "semaine" | "toutes";

const VUES: { key: VueKey; label: string }[] = [
  { key: "aujourdhui", label: "Aujourd'hui" },
  { key: "semaine", label: "7 jours" },
  { key: "toutes", label: "Toutes" },
];

export function TachesView() {
  const [vue, setVue] = useState<VueKey>("toutes");
  const [listeId, setListeId] = useState<string>("toutes");
  const [recherche, setRecherche] = useState("");
  const queryClient = useQueryClient();

  const { data: taches, isLoading: tachesLoading, isError: tachesError } = useQuery({
    queryKey: queryKeys.taches,
    queryFn: getTachesAvecRelations,
  });
  const { data: listes = [] } = useQuery({ queryKey: queryKeys.listes, queryFn: getListes });
  const { data: tags = [] } = useQuery({ queryKey: queryKeys.tags, queryFn: getTags });

  const filtered = useMemo(() => {
    if (!taches) return [];
    const today = aujourdhuiISO();
    const dansSeptJours = format(addDays(new Date(`${today}T00:00:00`), 7), "yyyy-MM-dd");
    const rechercheNormalisee = recherche.trim().toLowerCase();

    return taches.filter((tache) => {
      if (listeId !== "toutes" && tache.liste_id !== listeId) return false;
      if (vue === "aujourdhui" && tache.echeance !== today) return false;
      if (vue === "semaine") {
        if (!tache.echeance || tache.echeance < today || tache.echeance > dansSeptJours) return false;
      }
      if (rechercheNormalisee) {
        const titreMatch = tache.titre.toLowerCase().includes(rechercheNormalisee);
        const notesMatch = tache.notes?.toLowerCase().includes(rechercheNormalisee) ?? false;
        if (!titreMatch && !notesMatch) return false;
      }
      return true;
    });
  }, [taches, vue, listeId, recherche]);

  function invalidateTaches() {
    queryClient.invalidateQueries({ queryKey: queryKeys.taches });
  }

  async function handleRefresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.taches }),
      queryClient.invalidateQueries({ queryKey: queryKeys.listes }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
    ]);
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="flex flex-col gap-4">
      <div className="flex rounded-2xl border border-line bg-surface p-1">
        {VUES.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setVue(v.key)}
            className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${
              vue === v.key ? "bg-carbs text-white" : "text-ink-2"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1" data-swipe-ignore>
        <Link
          href="/taches/listes"
          aria-label="Gérer les listes"
          title="Gérer les listes"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-alt"
        >
          {LISTE_ICON}
        </Link>
        <button
          type="button"
          onClick={() => setListeId("toutes")}
          className={`flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-2xl border px-3.5 py-2.5 shadow-card transition-colors ${
            listeId === "toutes" ? "border-kcal bg-kcal-soft" : "border-line bg-surface"
          }`}
        >
          <span className="h-[9px] w-[9px] rounded-full" style={{ background: "var(--color-kcal)" }} />
          <span className="text-[13.5px] font-semibold text-ink">Toutes</span>
        </button>
        {listes.map((liste) => (
          <button
            key={liste.id}
            type="button"
            onClick={() => setListeId(liste.id)}
            className={`flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-2xl border px-3.5 py-2.5 shadow-card transition-colors ${
              listeId === liste.id ? "border-kcal bg-kcal-soft" : "border-line bg-surface"
            }`}
          >
            <span className="h-[9px] w-[9px] rounded-full" style={{ background: liste.couleur ?? "var(--color-kcal)" }} />
            <span className="text-[13.5px] font-semibold text-ink">{liste.nom}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">{SEARCH_ICON}</span>
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une tâche…"
          className={`${input} w-full pl-10 ${recherche ? "pr-9" : ""}`}
        />
        {recherche && (
          <button
            type="button"
            onClick={() => setRecherche("")}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-alt"
          >
            {CLEAR_ICON}
          </button>
        )}
      </div>

      <AddTaskToggle
        listes={listes}
        tags={tags}
        defaultListeId={listeId !== "toutes" ? listeId : undefined}
        onSaved={invalidateTaches}
      />
      {tachesLoading ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-3 w-24" />
          <ListItemSkeletonGroup count={5} />
        </div>
      ) : tachesError ? (
        <p className={errorText}>Erreur de chargement des tâches. Réessaie.</p>
      ) : recherche.trim() && filtered.length === 0 ? (
        <p className="py-6 text-center text-[13.5px] text-ink-2">
          Aucune tâche ne correspond à « {recherche.trim()} ».
        </p>
      ) : (
        <TasksList taches={filtered} listes={listes} tags={tags} reordonnable={vue === "toutes"} />
      )}
    </div>
    </PullToRefresh>
  );
}
