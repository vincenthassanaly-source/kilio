-- Ajoute le flag "tâche du jour" : une tâche ainsi marquée est supprimée
-- définitivement (pas archivée) si elle n'est pas cochée `fait` une fois son
-- échéance passée. Les tâches classiques (programme_jour = false) ne sont
-- pas concernées : comportement inchangé, elles continuent d'apparaître dans
-- l'onglet "En retard" existant.

alter table taches add column programme_jour boolean not null default false;

-- Suppression matérielle : les FK sous_taches.tache_id, taches_tags.tache_id
-- et tache_images.tache_id ont toutes `on delete cascade` (vérifié via
-- pg_constraint avant cette migration), donc un simple `delete from taches`
-- suffit à faire disparaître les lignes filles sans étape manuelle ni bloc
-- `do $$ ... $$`.
--
-- Limite connue (héritée de deleteTache(), non spécifique à ce cron) : les
-- fichiers du bucket Storage `tache-images` associés à une tâche supprimée
-- ne sont pas nettoyés ici (seule la ligne `tache_images` l'est, via
-- cascade) — un appel Storage n'est pas possible depuis du SQL pur. Un
-- nettoyage des objets orphelins resterait à faire séparément si besoin.
--
-- Horaire : 00h05 UTC (cron.timezone = GMT sur ce projet, vérifié avant
-- cette migration). Le fuseau France (Europe/Paris, UTC+1 ou +2 selon la
-- saison) place donc cette exécution vers 1h-2h du matin heure locale : pas
-- exactement minuit heure de Paris, mais bien en pleine nuit, ce qui suffit
-- à l'usage visé (les tâches du jour passées sont nettoyées avant le réveil
-- de Vincent). Choisi avant le job `nettoyage-auto` existant (5h UTC) et
-- sans collision avec `rappels-taches` (toutes les minutes).
select cron.schedule(
  'suppression-taches-programme-jour',
  '05 0 * * *',
  $$
  delete from taches
  where programme_jour = true
    and fait = false
    and echeance < current_date;
  $$
);
