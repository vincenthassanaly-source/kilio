-- Nettoyage automatique : suppression définitive, chaque jour, des items
-- marqués « fait »/« coché » depuis plus de N jours, dans tous les modules
-- concernés (Tâches, Sous-tâches, Étapes d'objectifs, Liste de courses,
-- Checklists de notes).
--
-- Aucune de ces tables n'a de colonne dédiée au passage à « fait »/« coché »
-- aujourd'hui — updated_at n'est pas fiable comme proxy (il change à chaque
-- édition, pas seulement au passage à « fait »). On ajoute donc une colonne
-- termine_le, maintenue par trigger.

-- 1. Colonne termine_le sur les 5 tables concernées.
alter table taches add column termine_le timestamptz null;
alter table sous_taches add column termine_le timestamptz null;
alter table objectif_etapes add column termine_le timestamptz null;
alter table courses_items add column termine_le timestamptz null;
alter table note_items add column termine_le timestamptz null;

-- 2. Trigger générique : fixe termine_le = now() quand la colonne statut
-- (fait ou coche selon la table) passe de false/null à true, et la remet à
-- null si elle repasse à false. Ne touche pas à termine_le sur les autres
-- updates. Un seul trigger pour les 5 tables (au lieu d'un par table) car
-- seul le nom de la colonne statut diffère (fait vs coche) ; to_jsonb permet
-- de la lire dynamiquement selon tg_table_name.
create or replace function set_termine_le()
returns trigger
language plpgsql
as $$
declare
  colonne text := case when tg_table_name in ('courses_items', 'note_items') then 'coche' else 'fait' end;
  ancien boolean := coalesce((to_jsonb(old) ->> colonne)::boolean, false);
  nouveau boolean := coalesce((to_jsonb(new) ->> colonne)::boolean, false);
begin
  if nouveau and not ancien then
    new.termine_le := now();
  elsif ancien and not nouveau then
    new.termine_le := null;
  end if;

  return new;
end;
$$;

create trigger trg_taches_termine_le
  before update on taches
  for each row execute function set_termine_le();

create trigger trg_sous_taches_termine_le
  before update on sous_taches
  for each row execute function set_termine_le();

create trigger trg_objectif_etapes_termine_le
  before update on objectif_etapes
  for each row execute function set_termine_le();

create trigger trg_courses_items_termine_le
  before update on courses_items
  for each row execute function set_termine_le();

create trigger trg_note_items_termine_le
  before update on note_items
  for each row execute function set_termine_le();

-- 3. Réglages du nettoyage automatique. Table singleton (id fixé à 1,
-- contrainte check), sur le modèle exact de preferences_navigation (voir
-- migration-preferences-navigation-2026-09-04.sql). set_updated_at() déjà
-- créée dans migration-aliments-2026-08-27.sql, réutilisée ici sans
-- redéfinition.
create table reglages_nettoyage (
  id smallint primary key default 1,
  actif boolean not null default true,
  delai_jours integer not null default 30,
  derniere_execution timestamptz null,
  updated_at timestamptz not null default now(),
  constraint reglages_nettoyage_singleton check (id = 1)
);

create trigger trg_reglages_nettoyage_updated_at
  before update on reglages_nettoyage
  for each row execute function set_updated_at();

insert into reglages_nettoyage (id, actif, delai_jours)
values (1, true, 30);

-- 4. Planification : appelle l'Edge Function nettoyage-auto une fois par
-- jour à 5h UTC (avant les rappels de tâches/documents à 6h), en réutilisant
-- tel quel le pattern d'URL/headers des jobs rappels-taches/rappels-documents
-- (secrets Vault project_url et publishable_key, déjà en place — pas de
-- recréation).
select cron.schedule(
  'nettoyage-auto',
  '0 5 * * *',
  $$
  select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/nettoyage-auto',
      headers := jsonb_build_object(
        'Content-type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
      ),
      body := '{}'::jsonb
  ) as request_id;
  $$
);
