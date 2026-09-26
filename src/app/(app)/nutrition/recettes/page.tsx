import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddRecetteToggle } from "./AddRecetteToggle";
import { RecettesList } from "./RecettesList";
import {
  hasNutritionOverride,
  nutritionFromOverride,
  nutritionRecette,
} from "@/lib/nutrition/compute";
import { errorText, screenTitle } from "@/lib/ui";
import { NutritionSubNav } from "@/components/NutritionSubNav";
import { PullToRefresh } from "@/components/PullToRefresh";

export default async function RecettesPage() {
  // Sans `connection()` : createAdminClient() jette de façon synchrone
  // (pas une rejection async récupérable par Cache Components) dès que
  // SUPABASE_SERVICE_ROLE_KEY est absent au build — fait échouer tout
  // `next build`, pas seulement cette route (voir le crash de build
  // reproduit sur les déploiements preview Vercel, où cette clé n'est
  // configurée que pour Production). Même pattern que /agenda, /courses,
  // /habitudes, /objectifs, /taches : sort cette route de la prérender
  // statique, la requête part seulement à la requête.
  await connection();
  const supabase = createAdminClient();

  const { data: recettes, error } = await supabase
    .from("recettes")
    .select(
      "*, recette_ingredients(quantite, aliment:aliments(nom, kcal_100g, proteines_100g, glucides_100g, lipides_100g)), recette_ingredients_libres(nom)"
    )
    .order("nom", { ascending: true });

  if (error) {
    return <p className={errorText}>Erreur de chargement : {error.message}</p>;
  }

  const views = (recettes ?? []).map((recette) => {
    const { recette_ingredients, recette_ingredients_libres, ...rest } = recette;
    const kcalParPortion = hasNutritionOverride(recette)
      ? nutritionFromOverride(recette, 1).kcal
      : nutritionRecette(recette_ingredients, recette.portions, 1).kcal;

    const ingredientsText = [
      ...recette_ingredients.map((ri) => ri.aliment?.nom ?? ""),
      ...(recette_ingredients_libres ?? []).map((ril) => ril.nom),
    ]
      .join(" ")
      .toLowerCase();

    return {
      ...rest,
      kcalParPortion: Math.round(kcalParPortion),
      ingredientsText,
    };
  });

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <NutritionSubNav />
        <h1 className={screenTitle}>Recettes</h1>
        <AddRecetteToggle />
        <RecettesList recettes={views} />
      </div>
    </PullToRefresh>
  );
}
