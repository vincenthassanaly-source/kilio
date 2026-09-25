-- Type de jour (repos / entraînement) mémorisé par date pour le Journal
-- Nutrition (vague 1 de l'audit impeccable du 2026-09-25, constat J-P1-1) :
-- sans cette table, le Journal repartait sur « repos » à chaque visite et le
-- dashboard comparait toujours à la cible repos.
--
-- Une ligne par date où Vincent a choisi un type ; absence de ligne = repos.
-- Schéma plat, sans user_id ni RLS (conventions Kilio). set_updated_at()
-- existe déjà (migration-aliments-2026-08-27.sql) : réutilisée, pas recréée.
-- L'enum jour_type_ppl existe déjà (objectifs_nutritionnels.jour_type).

create table if not exists journal_jours (
  date date primary key,
  jour_type jour_type_ppl not null default 'repos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists journal_jours_set_updated_at on journal_jours;
create trigger journal_jours_set_updated_at
  before update on journal_jours
  for each row execute function set_updated_at();
