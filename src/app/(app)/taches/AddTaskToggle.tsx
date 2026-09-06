"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Tables } from "@/lib/supabase/types";
import { AnimatedAddCard } from "@/components/AnimatedAddCard";
import { addCard, addCardIcon, card } from "@/lib/ui";

const AddTaskForm = dynamic(() => import("./AddTaskForm").then((m) => m.AddTaskForm), { ssr: false });

export function AddTaskToggle({
  listes,
  tags,
  defaultListeId,
  defaultEcheance,
  defaultHeure,
  label = "+ Ajouter une tâche",
  onSaved,
}: {
  listes: Tables<"listes_taches">[];
  tags: Tables<"tags">[];
  defaultListeId?: string;
  defaultEcheance?: string;
  defaultHeure?: string;
  label?: string;
  onSaved?: () => void;
}) {
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
        <span className="font-display text-[14.5px] font-bold tracking-tight text-ink">
          {label.replace(/^\+\s*/, "")}
        </span>
        <span className="text-xs font-medium text-ink-3">Nouvelle entrée dans ta liste</span>
      </div>
    </button>
  );

  return (
    <AnimatedAddCard open={open} trigger={trigger}>
      <div className={card}>
        <AddTaskForm
          listes={listes}
          tags={tags}
          defaultListeId={defaultListeId}
          defaultEcheance={defaultEcheance}
          defaultHeure={defaultHeure}
          onDone={() => {
            setOpen(false);
            onSaved?.();
          }}
        />
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
