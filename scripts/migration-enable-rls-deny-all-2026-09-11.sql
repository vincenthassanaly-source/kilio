-- Active RLS sur les 39 tables du schéma public, sans aucune policy
-- (deny-all volontaire). Convention Kilio : pas de user_id, pas de policy
-- à écrire/maintenir — le service_role (utilisé par les Server Actions
-- via src/lib/supabase/admin.ts) bypass RLS nativement, donc rien ne
-- change côté app. Seul l'accès direct avec la clé publique (anon/
-- publishable) est désormais bloqué.

ALTER TABLE "public"."aliments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recettes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recette_ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."objectifs_nutritionnels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."journal_repas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."taches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."courses_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."objectifs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."objectif_etapes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."objectif_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."comptes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."categories_budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions_recurrentes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."listes_taches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."taches_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sous_taches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."habitudes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."habitude_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recette_ingredients_libres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recette_etapes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tache_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."horaires_travail_creneaux" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."note_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notes_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collection_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."preferences_navigation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."horaires_travail_exceptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."document_fichiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."dossiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documents_dossiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."etiquettes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reglages_nettoyage" ENABLE ROW LEVEL SECURITY;
