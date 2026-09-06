"use client";

import { useTransition } from "react";
import { changerStatutObjectif } from "@/app/actions/objectifs";
import type { Tables } from "@/lib/supabase/types";
import { card, primaryButton, secondaryButton } from "@/lib/ui";
import { vibrate } from "@/lib/haptics";

export function ObjectifSuiviBinaire({ objectif }: { objectif: Tables<"objectifs"> }) {
  const [isPending, startTransition] = useTransition();
  const atteint = objectif.statut === "atteint";

  return (
    <div className={`${card} flex flex-col items-center gap-3 text-center`}>
      <p className="text-[15px] text-ink">
        {atteint ? "Objectif marqué comme atteint 🎉" : "Pas encore marqué comme atteint."}
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          vibrate();
          startTransition(() =>
            changerStatutObjectif(objectif.id, atteint ? "en_cours" : "atteint")
          );
        }}
        className={atteint ? secondaryButton : primaryButton}
      >
        {atteint ? "Remettre en cours" : "Marquer comme atteint"}
      </button>
    </div>
  );
}
