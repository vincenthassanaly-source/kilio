"use client";

import { useState } from "react";
import type { TransactionAvecRelations } from "@/app/actions/transactions";
import type { CompteAvecSolde } from "@/app/actions/comptes";
import type { Tables } from "@/lib/supabase/types";
import { TransactionForm } from "./TransactionForm";
import { VirementForm } from "./VirementForm";
import { SegmentedControl } from "@/components/SegmentedControl";

type Mode = "depense" | "revenu" | "virement";

const TABS: { value: Mode; label: string }[] = [
  { value: "depense", label: "Dépense" },
  { value: "revenu", label: "Revenu" },
  { value: "virement", label: "Virement" },
];

export function TransactionModeForm({
  transaction,
  comptes,
  categories,
  onDone,
}: {
  transaction?: TransactionAvecRelations;
  comptes: CompteAvecSolde[];
  categories: Tables<"categories_budget">[];
  onDone?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(transaction?.type ?? "depense");

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        ariaLabel="Type de transaction"
        taille="sm"
        options={TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
        value={mode}
        onChange={setMode}
      />

      {mode === "virement" ? (
        <VirementForm
          transaction={transaction?.type === "virement" ? transaction : undefined}
          comptes={comptes}
          onDone={onDone}
        />
      ) : (
        <TransactionForm
          key={mode}
          transaction={transaction?.type === mode ? transaction : undefined}
          typeMouvement={mode}
          comptes={comptes}
          categories={categories}
          onDone={onDone}
        />
      )}
    </div>
  );
}
