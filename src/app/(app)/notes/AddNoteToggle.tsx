"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useBackClose } from "@/hooks/useBackClose";
import type { Tables } from "@/lib/supabase/types";
import { AnimatedAddCard } from "@/components/AnimatedAddCard";
import { addCard, addCardIcon, card } from "@/lib/ui";

const NoteForm = dynamic(() => import("./NoteForm").then((m) => m.NoteForm), { ssr: false });

export function AddNoteToggle({
  tags,
  defaultOpen = false,
  onSaved,
}: {
  tags: Tables<"tags">[];
  defaultOpen?: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useBackClose(open, () => setOpen(false));

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
        <span className="font-display text-[14.5px] font-bold tracking-tight text-ink">Ajouter une note</span>
        <span className="text-xs font-medium text-ink-3">Nouvelle note libre</span>
      </div>
    </button>
  );

  return (
    <AnimatedAddCard open={open} trigger={trigger}>
      <div className={card}>
        <NoteForm
          tags={tags}
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
