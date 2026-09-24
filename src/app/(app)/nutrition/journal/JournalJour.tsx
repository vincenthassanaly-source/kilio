import { createAdminClient } from "@/lib/supabase/admin";
import {
  addNutrition,
  hasNutritionOverride,
  nutritionAliment,
  nutritionFromOverride,
  nutritionRecette,
  zeroNutrition,
} from "@/lib/nutrition/compute";
import { card, eyebrow, sectionTitle } from "@/lib/ui";
import { ObjectifForm } from "./ObjectifForm";
import { ResumeJour } from "./ResumeJour";
import { JournalEntriesList, type JournalEntryView } from "./JournalEntriesList";
import { JournalJourAnime } from "./JournalSwipeWrapper";
import { JourNavigation, JourTypeOnglets } from "./JournalNavigationJour";
import { lireJourJournal, type JournalSearchParams } from "./jour";

// Parties du Journal qui dépendent du jour affiché (URL ou date du jour),
// chacune rendue sous son propre <Suspense> par page.tsx.

export async function JournalDateLibelle({ searchParams }: { searchParams: JournalSearchParams }) {
  const { date } = await lireJourJournal(searchParams);
  const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return <p className={`${eyebrow} capitalize`}>{dateLabel}</p>;
}

export async function JournalJourNavigation({ searchParams }: { searchParams: JournalSearchParams }) {
  return <JourNavigation jour={await lireJourJournal(searchParams)} />;
}

export async function JournalJourOnglets({ searchParams }: { searchParams: JournalSearchParams }) {
  return <JourTypeOnglets jour={await lireJourJournal(searchParams)} />;
}

export async function JournalJour({ searchParams }: { searchParams: JournalSearchParams }) {
  const { date, jourType } = await lireJourJournal(searchParams);
  const supabase = createAdminClient();

  const [{ data: objectif }, { data: entries }] = await Promise.all([
    supabase
      .from("objectifs_nutritionnels")
      .select("*")
      .eq("jour_type", jourType)
      .maybeSingle(),
    supabase
      .from("journal_repas")
      .select(
        "*, aliment:aliments(*), recette:recettes(id, nom, portions, kcal_portion, proteines_portion, glucides_portion, lipides_portion, recette_ingredients(quantite, aliment:aliments(kcal_100g, proteines_100g, glucides_100g, lipides_100g)))"
      )
      .eq("date", date),
  ]);

  // Une entrée sans `aliment` ni `recette` est orpheline (référence supprimée
  // en base) : on l'ignore plutôt que de planter sur `entry.recette!` plus bas.
  const views: JournalEntryView[] = (entries ?? [])
    .filter((entry) => entry.aliment || entry.recette)
    .map((entry) => {
      if (entry.aliment) {
        const { quantite, aliment } = entry;
        // journal_repas.quantite est toujours en grammes/ml, y compris pour un
        // aliment "pièce" (converti avant l'insert via poids_unite_g) : on
        // affiche donc le poids réel, avec l'équivalent en pièces en rappel.
        const piecesEquivalent =
          aliment.unite === "piece" && aliment.poids_unite_g
            ? quantite / aliment.poids_unite_g
            : null;
        const detail =
          piecesEquivalent !== null
            ? `${quantite} g (≈ ${
                Number.isInteger(piecesEquivalent)
                  ? piecesEquivalent
                  : piecesEquivalent.toFixed(1)
              } pièce${piecesEquivalent > 1 ? "s" : ""})`
            : `${quantite} ${aliment.unite === "ml" ? "ml" : "g"}`;

        return {
          id: entry.id,
          moment: entry.moment,
          label: aliment.nom,
          detail,
          nutrition: nutritionAliment(aliment, quantite),
        };
      }

      const recette = entry.recette!;
      return {
        id: entry.id,
        moment: entry.moment,
        label: recette.nom,
        detail: `${entry.quantite} portion${entry.quantite > 1 ? "s" : ""}`,
        nutrition: hasNutritionOverride(recette)
          ? nutritionFromOverride(recette, entry.quantite)
          : nutritionRecette(recette.recette_ingredients, recette.portions, entry.quantite),
      };
    });

  const consomme = views.reduce((acc, v) => addNutrition(acc, v.nutrition), zeroNutrition());
  const cible = objectif
    ? {
        kcal: objectif.kcal_cible,
        proteines: objectif.proteines_cible_g,
        glucides: objectif.glucides_cible_g,
        lipides: objectif.lipides_cible_g,
      }
    : null;

  return (
    <JournalJourAnime key={date} date={date} jourType={jourType}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className={sectionTitle}>Objectif ({jourType === "repos" ? "repos" : "entraînement"})</h2>
          <ObjectifForm jourType={jourType} objectif={objectif} />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className={sectionTitle}>Résumé du jour</h2>
          <ResumeJour consomme={consomme} cible={cible} />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className={sectionTitle}>Repas du jour</h2>
          {views.length === 0 ? (
            <div className={`${card} flex flex-col items-center gap-2.5 py-8 text-center`}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.6">
                <line x1="5" y1="19" x2="5" y2="11" />
                <line x1="12" y1="19" x2="12" y2="5" />
                <line x1="19" y1="19" x2="19" y2="14" />
              </svg>
              <p className="text-[15px] font-bold text-ink">Aucun repas enregistré pour ce jour.</p>
            </div>
          ) : (
            <JournalEntriesList entries={views} />
          )}
        </div>
      </div>
    </JournalJourAnime>
  );
}
