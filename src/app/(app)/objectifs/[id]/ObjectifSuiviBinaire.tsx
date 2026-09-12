"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changerStatutObjectif, type ObjectifDetail } from "@/app/actions/objectifs";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import type { Enums, Tables } from "@/lib/supabase/types";
import { card, primaryButton, secondaryButton } from "@/lib/ui";
import { vibrate } from "@/lib/haptics";

// Action équivalente à toggleEtape pour ce type de suivi (bascule fréquente,
// un seul tap) : même mécanisme optimiste (setQueryData + rollback) que
// TaskCard/HabitudeCard/ObjectifSuiviEtapes, sur le cache combiné
// {objectif, etapes, entries} de la page détail (queryKeys.objectif).
export function ObjectifSuiviBinaire({ objectif }: { objectif: Tables<"objectifs"> }) {
  const queryClient = useQueryClient();
  const atteint = objectif.statut === "atteint";

  const toggleMutation = useMutation({
    mutationFn: (nouveauStatut: Enums<"statut_objectif">) => {
      vibrate();
      return changerStatutObjectif(objectif.id, nouveauStatut);
    },
    onMutate: async (nouveauStatut) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.objectif(objectif.id) });
      const previous = queryClient.getQueryData<ObjectifDetail>(queryKeys.objectif(objectif.id));
      queryClient.setQueryData<ObjectifDetail>(queryKeys.objectif(objectif.id), (old) =>
        old ? { ...old, objectif: { ...old.objectif, statut: nouveauStatut } } : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.objectif(objectif.id), context.previous);
      showToast("Impossible de mettre à jour l'objectif.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.objectif(objectif.id) }),
  });

  return (
    <div className={`${card} flex flex-col items-center gap-3 text-center`}>
      <p className="text-[15px] text-ink">
        {atteint ? "Objectif marqué comme atteint 🎉" : "Pas encore marqué comme atteint."}
      </p>
      <button
        type="button"
        disabled={toggleMutation.isPending}
        onClick={() => toggleMutation.mutate(atteint ? "en_cours" : "atteint")}
        className={atteint ? secondaryButton : primaryButton}
      >
        {atteint ? "Remettre en cours" : "Marquer comme atteint"}
      </button>
    </div>
  );
}
