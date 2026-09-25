"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { RecurrenceAvecRelations } from "@/app/actions/transactions-recurrentes";
import type { CompteAvecSolde } from "@/app/actions/comptes";
import type { Tables } from "@/lib/supabase/types";
import { RecurrenceVirementForm } from "./RecurrenceVirementForm";
import { SegmentedControl } from "@/components/SegmentedControl";

const RecurrenceForm = dynamic(() => import("./RecurrenceForm").then((m) => m.RecurrenceForm), {
  ssr: false,
});

type Mode = "depense" | "revenu" | "virement";

const TABS: { value: Mode; label: string }[] = [
  { value: "depense", label: "Dépense" },
  { value: "revenu", label: "Revenu" },
  { value: "virement", label: "Virement" },
];

export function RecurrenceModeForm({
  recurrence,
  comptes,
  categories,
  onDone,
}: {
  recurrence?: RecurrenceAvecRelations;
  comptes: CompteAvecSolde[];
  categories: Tables<"categories_budget">[];
  onDone?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(recurrence?.type ?? "depense");

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        ariaLabel="Type de récurrence"
        taille="sm"
        options={TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
        value={mode}
        onChange={setMode}
      />

      {mode === "virement" ? (
        <RecurrenceVirementForm
          recurrence={recurrence?.type === "virement" ? recurrence : undefined}
          comptes={comptes}
          onDone={onDone}
        />
      ) : (
        <RecurrenceForm
          key={mode}
          recurrence={recurrence?.type === mode ? recurrence : undefined}
          typeMouvement={mode}
          comptes={comptes}
          categories={categories}
          onDone={onDone}
        />
      )}
    </div>
  );
}
