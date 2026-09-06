"use client";

import { useState } from "react";
import type { CompteAvecSolde } from "@/app/actions/comptes";
import type { Tables } from "@/lib/supabase/types";
import { AnimatedAddCard } from "@/components/AnimatedAddCard";
import { addCard, addCardIcon, card } from "@/lib/ui";
import { RecurrenceModeForm } from "./RecurrenceModeForm";

export function AddRecurrenceToggle({
  comptes,
  categories,
}: {
  comptes: CompteAvecSolde[];
  categories: Tables<"categories_budget">[];
}) {
  const [open, setOpen] = useState(false);

  if (comptes.length === 0 || categories.length === 0) {
    return null;
  }

  const trigger = (
    <button type="button" onClick={() => setOpen(true)} className={addCard}>
      <div
        className={addCardIcon}
        style={{
          background:
            "linear-gradient(150deg, color-mix(in oklch, var(--color-kcal) 85%, white 15%), var(--color-kcal))",
          boxShadow: "0 3px 8px color-mix(in oklch, var(--color-kcal) 45%, transparent)",
        }}
      >
        +
      </div>
      <div className="flex flex-col gap-[1px]">
        <span className="font-display text-[14.5px] font-bold tracking-tight text-ink">Ajouter une récurrence</span>
        <span className="text-xs font-medium text-ink-3">Nouvelle récurrence</span>
      </div>
    </button>
  );

  return (
    <AnimatedAddCard open={open} trigger={trigger}>
      <div className={card}>
        <RecurrenceModeForm comptes={comptes} categories={categories} onDone={() => setOpen(false)} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-2 text-sm text-ink-2 underline"
        >
          Annuler
        </button>
      </div>
    </AnimatedAddCard>
  );
}
