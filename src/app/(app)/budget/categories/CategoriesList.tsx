"use client";

import { useTransition } from "react";
import { supprimerCategorie } from "@/app/actions/categories-budget";
import type { SuiviCategorie } from "@/app/actions/budgets";
import type { Enums, Tables } from "@/lib/supabase/types";
import { regrouperParCategorieParente } from "@/lib/budget/compute";
import { dangerButton, eyebrow, listCard, nameText, pillTag, sectionTitle } from "@/lib/ui";
import { confirmDelete } from "@/lib/confirm";
import { CategorieProgressCard } from "./CategorieProgressCard";
import { AddSousCategorieToggle } from "./AddSousCategorieToggle";
import { runAction } from "@/lib/actions/runAction";

function SousCategorieRow({ categorie }: { categorie: Tables<"categories_budget"> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-2 rounded-xl bg-surface-alt/60 px-3 py-2">
      <p className="text-[13.5px] font-medium text-ink">
        {categorie.icone && <span className="mr-1.5">{categorie.icone}</span>}
        {categorie.nom}
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirmDelete(`Supprimer la catégorie « ${categorie.nom} » ?`)) return;
          startTransition(async () => {
              // Contrat T1 : échec en toast, jamais error.tsx.
              await runAction(() => supprimerCategorie(categorie.id));
            });
        }}
        className={dangerButton}
      >
        Suppr.
      </button>
    </li>
  );
}

function CategorieRevenuRow({
  categorie,
  sousCategories,
}: {
  categorie: Tables<"categories_budget">;
  sousCategories: Tables<"categories_budget">[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className={`${listCard} gap-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <p className={nameText}>
          {categorie.icone && <span className="mr-1.5">{categorie.icone}</span>}
          {categorie.nom}
        </p>
        {categorie.is_predefinie ? (
          <span className={pillTag}>Prédéfinie</span>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!confirmDelete(`Supprimer la catégorie « ${categorie.nom} » ?`)) return;
              startTransition(async () => {
              // Contrat T1 : échec en toast, jamais error.tsx.
              await runAction(() => supprimerCategorie(categorie.id));
            });
            }}
            className={dangerButton}
          >
            Suppr.
          </button>
        )}
      </div>
      {sousCategories.length > 0 && (
        <ul className="flex flex-col gap-1.5 pl-1">
          {sousCategories.map((sc) => (
            <SousCategorieRow key={sc.id} categorie={sc} />
          ))}
        </ul>
      )}
      <AddSousCategorieToggle categorieParentId={categorie.id} />
    </li>
  );
}

export function CategoriesList({
  suiviDepenses,
  categories,
  periode,
  typePeriode,
}: {
  suiviDepenses: SuiviCategorie[];
  categories: Tables<"categories_budget">[];
  periode: string;
  typePeriode: Enums<"type_periode_budget">;
}) {
  const categoriesRevenu = regrouperParCategorieParente(
    categories.filter((c) => c.type === "revenu")
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <h2 className={sectionTitle}>Dépenses</h2>
        {suiviDepenses.length === 0 ? (
          <p className="text-ink-2">Aucune catégorie de dépense pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {suiviDepenses.map((suivi) => (
              <CategorieProgressCard
                // Le formulaire de budget utilise `defaultValue` (non
                // contrôlé) : sans remount, changer d'onglet semaine/mois/
                // année garderait affichée l'ancienne valeur du montant cible.
                key={`${suivi.categorie.id}-${typePeriode}-${periode}`}
                suivi={suivi}
                periode={periode}
                typePeriode={typePeriode}
                sousCategories={categories.filter(
                  (c) => c.categorie_parent_id === suivi.categorie.id
                )}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className={sectionTitle}>Revenus</h2>
        {categoriesRevenu.length === 0 ? (
          <p className={eyebrow}>Aucune catégorie de revenu pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {categoriesRevenu.map(({ parent, sousCategories }) => (
              <CategorieRevenuRow key={parent.id} categorie={parent} sousCategories={sousCategories} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
