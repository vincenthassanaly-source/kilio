"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getHabitudesDuJour } from "@/app/actions/habitudes";
import { queryKeys } from "@/lib/query/keys";
import { AddHabitudeToggle } from "./AddHabitudeToggle";
import { HabitudeCard } from "./HabitudeCard";
import { HistoriqueView } from "./HistoriqueView";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { errorText } from "@/lib/ui";
import { PullToRefresh } from "@/components/PullToRefresh";

type ViewKey = "aujourdhui" | "historique";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "aujourdhui", label: "Aujourd'hui" },
  { key: "historique", label: "Historique" },
];

// Même pattern que AGENDA_VUE_ACTIVE_PILL (AgendaView.tsx) et
// ACTIVE_PILL_LAYOUT_ID (BottomNav.tsx) : id distinct, propre à ce
// sélecteur.
const HABITUDES_VUE_ACTIVE_PILL = "habitudes-vue-active-pill";
function vuePillTransition(reduceMotion: boolean) {
  return reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 500, damping: 40 };
}

export function HabitudesView({ today }: { today: string }) {
  const reduceMotion = useReducedMotion() ?? false;
  const [view, setView] = useState<ViewKey>("aujourdhui");
  const queryClient = useQueryClient();

  const { data: habitudes = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.habitudes(today),
    queryFn: () => getHabitudesDuJour(today),
  });

  return (
    <PullToRefresh
      onRefresh={() => queryClient.invalidateQueries({ queryKey: queryKeys.habitudes(today) })}
    >
    <div className="flex flex-col gap-4">
      <div className="flex rounded-2xl border border-line bg-surface p-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className="relative flex-1 rounded-xl py-2 text-[13px] font-semibold"
          >
            {view === v.key && (
              <motion.div
                layoutId={HABITUDES_VUE_ACTIVE_PILL}
                className="absolute inset-0 rounded-xl bg-habitudes"
                transition={vuePillTransition(reduceMotion)}
              />
            )}
            <span className={`relative transition-colors ${view === v.key ? "text-white" : "text-ink-2"}`}>
              {v.label}
            </span>
          </button>
        ))}
      </div>

      {view === "aujourdhui" && (
        <div className="flex flex-col gap-4">
          <AddHabitudeToggle
            onSaved={() => queryClient.invalidateQueries({ queryKey: queryKeys.habitudes(today) })}
          />
          {isLoading ? (
            <ListItemSkeletonGroup count={3} withSubtitle />
          ) : isError ? (
            <p className={errorText}>Erreur de chargement des habitudes. Réessaie.</p>
          ) : habitudes.length === 0 ? (
            <p className="text-ink-2">Aucune habitude pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              <AnimatePresence initial={false}>
                {habitudes.map((habitude) => (
                  <HabitudeCard key={habitude.id} habitude={habitude} date={today} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}

      {view === "historique" && <HistoriqueView habitudes={habitudes} />}
    </div>
    </PullToRefresh>
  );
}
