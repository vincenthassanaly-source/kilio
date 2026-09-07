-- Étend les valeurs acceptées par rappel_minutes pour ajouter deux options
-- de rappel plus longues : 60 (1h avant) et 1440 (1 jour avant / la veille).
--
-- 1440 est aussi la seule valeur utilisable par une tâche "toute la
-- journée" (sans heure précise) : dans ce cas l'edge function
-- envoyer-rappels-taches ancre le calcul sur 18h00 (Paris) la veille de
-- l'échéance, faute d'heure précise sur la tâche. Ce n'est pas imposé par
-- la contrainte SQL (comme pour 5/15/30 avec heure, c'est le serveur —
-- taches.ts — qui fait respecter cette cohérence, pas la base).

alter table taches drop constraint taches_rappel_minutes_check;

alter table taches
  add constraint taches_rappel_minutes_check
  check (rappel_minutes is null or rappel_minutes in (5, 15, 30, 60, 1440));
