"use client";

import { useState } from "react";
import { HabitudeForm } from "./HabitudeForm";
import { AnimatedAddCard } from "@/components/AnimatedAddCard";
import { addCard, addCardIcon, card } from "@/lib/ui";

export function AddHabitudeToggle({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);

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
        <span className="font-display text-[14.5px] font-bold tracking-tight text-ink">Ajouter une habitude</span>
        <span className="text-xs font-medium text-ink-3">Nouveau suivi quotidien</span>
      </div>
    </button>
  );

  return (
    <AnimatedAddCard open={open} trigger={trigger}>
      <div className={card}>
        <HabitudeForm
          onDone={() => {
            setOpen(false);
            onSaved?.();
          }}
        />
        <button type="button" onClick={() => setOpen(false)} className="mt-2 text-sm text-ink-2 underline">
          Annuler
        </button>
      </div>
    </AnimatedAddCard>
  );
}
