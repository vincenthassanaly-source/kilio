"use client";

import { useState } from "react";
import { AddSousCategorieForm } from "./AddSousCategorieForm";
import { useBackClose } from "@/hooks/useBackClose";
import { AnimatedAddCard } from "@/components/AnimatedAddCard";
import { ghostButton } from "@/lib/ui";

export function AddSousCategorieToggle({ categorieParentId }: { categorieParentId: string }) {
  const [open, setOpen] = useState(false);
  useBackClose(open, () => setOpen(false));

  const trigger = (
    <button type="button" onClick={() => setOpen(true)} className={`${ghostButton} self-start`}>
      + Sous-catégorie
    </button>
  );

  return (
    <AnimatedAddCard open={open} trigger={trigger}>
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-2.5">
        <AddSousCategorieForm categorieParentId={categorieParentId} onDone={() => setOpen(false)} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink-2 underline"
        >
          Annuler
        </button>
      </div>
    </AnimatedAddCard>
  );
}
