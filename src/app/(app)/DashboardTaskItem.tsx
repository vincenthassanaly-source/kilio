"use client";

import { memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleTache, type TacheAvecRelations } from "@/app/actions/taches";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import { CheckToggle } from "@/components/CheckToggle";
import { vibrate } from "@/lib/haptics";
import { enqueueAction, isNetworkError } from "@/lib/offline/queue";

export const DashboardTaskItem = memo(function DashboardTaskItem({
  id,
  titre,
  heure,
  fait,
}: {
  id: string;
  titre: string;
  heure: string | null;
  fait: boolean;
}) {
  const queryClient = useQueryClient();

  // Même mutation optimiste que TaskCard (src/app/(app)/taches/TasksList.tsx),
  // sur la même query key : cocher une tâche depuis le dashboard ou depuis
  // /taches met à jour le même cache, dans les deux sens.
  const toggleMutation = useMutation({
    mutationFn: async () => {
      vibrate();
      try {
        await toggleTache(id);
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        await enqueueAction("taches", "toggleTache", [id]);
        showToast("Enregistré, sera synchronisé à la reconnexion");
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.taches });
      const previous = queryClient.getQueryData<TacheAvecRelations[]>(queryKeys.taches);
      queryClient.setQueryData<TacheAvecRelations[]>(queryKeys.taches, (old) =>
        old?.map((t) => (t.id === id ? { ...t, fait: !t.fait } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.taches, context.previous);
      showToast("Impossible de mettre à jour la tâche.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.taches }),
  });

  return (
    <div className="flex items-center gap-2.5">
      <CheckToggle
        checked={fait}
        disabled={toggleMutation.isPending}
        onToggle={() => toggleMutation.mutate()}
        label={fait ? "Marquer non fait" : "Marquer fait"}
        // Lignes empilées avec `gap-2.5` (10px, DashboardTachesSection) : hitSlop
        // réduit pour que deux zones de tap voisines ne se chevauchent pas (voir
        // reports/2026-09-16-fix-dashboard-audit-constats-1-2.md).
        hitSlop={4}
      />
      <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
        <span
          className="truncate text-[14px] font-medium"
          style={{
            color: fait ? "var(--ink-3)" : "var(--ink)",
            textDecoration: fait ? "line-through" : "none",
          }}
        >
          {titre}
        </span>
        {heure && <span className="shrink-0 text-[11.5px] font-medium tabular-nums text-ink-3">{heure.slice(0, 5)}</span>}
      </div>
    </div>
  );
});
