"use client";

import { useState, useTransition } from "react";
import { supprimerTransaction, type TransactionAvecRelations } from "@/app/actions/transactions";
import type { CompteAvecSolde } from "@/app/actions/comptes";
import type { Tables } from "@/lib/supabase/types";
import { formatMontant } from "@/lib/budget/compute";
import { card, dangerButton, ghostButton, listCard, metaText, pillTag } from "@/lib/ui";
import { confirmDelete } from "@/lib/confirm";
import { TransactionModeForm } from "./TransactionModeForm";
import { runAction } from "@/lib/actions/runAction";

function formatDateOperation(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function libelleVirement(transaction: TransactionAvecRelations, compteFiltre?: string) {
  const versDestination = transaction.compte_destination?.nom ?? "?";
  const depuisSource = transaction.compte?.nom ?? "?";

  // Vue filtrée sur un compte précis : on affiche le virement du point de vue
  // de ce compte (crédité ou débité). Vue globale : on montre les deux bouts.
  if (compteFiltre && transaction.compte_destination_id === compteFiltre) {
    return `Depuis ${depuisSource}`;
  }
  if (compteFiltre && transaction.compte_id === compteFiltre) {
    return `Vers ${versDestination}`;
  }
  return `${depuisSource} → ${versDestination}`;
}

function TransactionRow({
  transaction,
  comptes,
  categories,
  compteFiltre,
}: {
  transaction: TransactionAvecRelations;
  comptes: CompteAvecSolde[];
  categories: Tables<"categories_budget">[];
  compteFiltre?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className={card}>
        <TransactionModeForm
          transaction={transaction}
          comptes={comptes}
          categories={categories}
          onDone={() => setEditing(false)}
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-2 text-sm text-ink-2 underline"
        >
          Annuler
        </button>
      </li>
    );
  }

  const virement = transaction.type === "virement";
  const revenu = transaction.type === "revenu";

  return (
    <li className={listCard}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-[14.5px] font-semibold text-ink">
            {virement ? (
              <span className="mr-1.5">⇄</span>
            ) : (
              transaction.categorie?.icone && <span className="mr-1.5">{transaction.categorie.icone}</span>
            )}
            {virement
              ? transaction.libelle || libelleVirement(transaction, compteFiltre)
              : transaction.libelle || transaction.categorie?.nom || "Sans catégorie"}
            {transaction.transaction_recurrente_id && (
              <span className={`${pillTag} ml-2`}>🔁 récurrent</span>
            )}
          </p>
          <span className={metaText}>
            {formatDateOperation(transaction.date_operation)} ·{" "}
            {virement ? libelleVirement(transaction, compteFiltre) : transaction.compte?.nom ?? "?"}
            {!virement && transaction.libelle && transaction.categorie && ` · ${transaction.categorie.nom}`}
          </span>
        </div>
        <p
          className={`font-display text-[15px] font-semibold tabular-nums ${
            virement ? "text-ink-2" : revenu ? "text-kcal" : "text-ink"
          }`}
        >
          {virement ? "" : revenu ? "+" : "-"}
          {formatMontant(transaction.montant)}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
          Modifier
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirmDelete("Supprimer cette transaction ?")) return;
            startTransition(async () => {
              // Contrat T1 : échec en toast, jamais error.tsx.
              await runAction(() => supprimerTransaction(transaction.id));
            });
          }}
          className={dangerButton}
        >
          Suppr.
        </button>
      </div>
    </li>
  );
}

export function TransactionsList({
  transactions,
  comptes,
  categories,
  compteFiltre,
}: {
  transactions: TransactionAvecRelations[];
  comptes: CompteAvecSolde[];
  categories: Tables<"categories_budget">[];
  compteFiltre?: string;
}) {
  if (transactions.length === 0) {
    return <p className="text-ink-2">Aucune transaction pour cette sélection.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          comptes={comptes}
          categories={categories}
          compteFiltre={compteFiltre}
        />
      ))}
    </ul>
  );
}
