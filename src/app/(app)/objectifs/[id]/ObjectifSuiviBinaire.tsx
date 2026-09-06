"use client";

import { useOptimistic, useTransition } from "react";
import { changerStatutObjectif } from "@/app/actions/objectifs";
import { showToast } from "@/components/toast/toast-store";
import type { Enums, Tables } from "@/lib/supabase/types";
import { card, primaryButton, secondaryButton } from "@/lib/ui";
import { vibrate } from "@/lib/haptics";

// Bascule optimiste sans TanStack Query, même pattern que
// JournalEntriesList : le statut affiché change instantanément au tap,
// réconcilié par la nouvelle prop `objectif` une fois `changerStatutObjectif`
// (qui appelle revalidatePath) effectivement résolue. En cas d'échec, pas de
// rollback manuel : la prop re-synchronise l'état au prochain rendu serveur.
export function ObjectifSuiviBinaire({ objectif }: { objectif: Tables<"objectifs"> }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatut, setOptimisticStatut] = useOptimistic(
    objectif.statut,
    (_state, statut: Enums<"statut_objectif">) => statut
  );
  const atteint = optimisticStatut === "atteint";

  function handleClick() {
    vibrate();
    const nouveauStatut: Enums<"statut_objectif"> = atteint ? "en_cours" : "atteint";
    startTransition(async () => {
      setOptimisticStatut(nouveauStatut);
      try {
        await changerStatutObjectif(objectif.id, nouveauStatut);
      } catch {
        showToast("Impossible de mettre à jour l'objectif.");
      }
    });
  }

  return (
    <div className={`${card} flex flex-col items-center gap-3 text-center`}>
      <p className="text-[15px] text-ink">
        {atteint ? "Objectif marqué comme atteint 🎉" : "Pas encore marqué comme atteint."}
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className={atteint ? secondaryButton : primaryButton}
      >
        {atteint ? "Remettre en cours" : "Marquer comme atteint"}
      </button>
    </div>
  );
}
