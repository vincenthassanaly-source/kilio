"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getTachesAvecRelations } from "@/app/actions/taches";
import { queryKeys } from "@/lib/query/keys";
import { card } from "@/lib/ui";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { ListItemSkeletonGroup } from "@/components/skeletons/ListItemSkeleton";
import { Skeleton } from "@/components/skeletons/Skeleton";
import { DashboardTaskItem } from "./DashboardTaskItem";

// Regroupe "Aujourd'hui" (tâches du jour) et "Prochain événement" : les deux
// dérivent de la même query `taches`, un seul useQuery évite un double
// fetch (voir reports/2026-09-04-dashboard-streaming-par-section.md).
export function DashboardTachesSection({ today }: { today: string }) {
  const { data: taches, isLoading } = useQuery({
    queryKey: queryKeys.taches,
    queryFn: getTachesAvecRelations,
  });

  const tachesDuJour = (taches ?? []).filter((t) => t.echeance === today);
  const tachesDoneCount = tachesDuJour.filter((t) => t.fait).length;
  // Les tâches faites ne sont plus listées ici (cf.
  // reports/2026-09-06-dashboard-taches-disparition.md) : le compteur
  // ci-dessous reste dérivé de tachesDuJour au complet, pas de cette liste.
  const tachesAffichees = tachesDuJour.filter((t) => !t.fait).slice(0, 4);

  const now = new Date();
  const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const prochainEvenement = (taches ?? [])
    .filter((t) => !t.fait && t.heure && t.echeance && (t.echeance > today || (t.echeance === today && t.heure >= nowHM)))
    .sort((a, b) => (a.echeance! + a.heure! < b.echeance! + b.heure! ? -1 : 1))[0];

  return (
    <>
      <div className={`${card} flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-ink">Aujourd&apos;hui</span>
          {isLoading ? (
            <Skeleton className="h-3 w-14" />
          ) : (
            <span className="text-xs font-semibold text-ink-3">
              {tachesDoneCount}/{tachesDuJour.length} tâches
            </span>
          )}
        </div>
        {isLoading ? (
          <ListItemSkeletonGroup count={3} />
        ) : tachesAffichees.length === 0 ? (
          <p className="text-[13.5px] text-ink-2">Rien de prévu aujourd&apos;hui.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {tachesAffichees.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  <DashboardTaskItem id={t.id} titre={t.titre} heure={t.heure} fait={t.fait} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isLoading ? (
        <CardSkeleton withRing={false} />
      ) : (
        <motion.div whileTap={{ scale: 0.98 }}>
          <Link href="/taches" className={`${card} flex items-center gap-3.5`}>
            <div className="flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center rounded-2xl bg-kcal-soft">
              {prochainEvenement ? (
                <>
                  <span className="font-display text-[14px] font-bold leading-none text-kcal">
                    {prochainEvenement.heure!.slice(0, 2)}
                  </span>
                  <span className="text-[8.5px] font-semibold text-kcal">{prochainEvenement.heure!.slice(3, 5)}</span>
                </>
              ) : (
                <span className="font-display text-[14px] font-bold text-kcal">--</span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Prochain événement</span>
              <span className="truncate text-[14px] font-semibold text-ink">
                {prochainEvenement ? prochainEvenement.titre : "Aucun événement"}
              </span>
              {prochainEvenement?.liste && (
                <span className="truncate text-[12px] font-medium text-ink-2">{prochainEvenement.liste.nom}</span>
              )}
            </div>
          </Link>
        </motion.div>
      )}
    </>
  );
}
