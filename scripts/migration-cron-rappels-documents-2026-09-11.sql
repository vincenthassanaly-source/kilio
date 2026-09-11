-- Planifie l'appel de l'Edge Function envoyer-rappels-documents une fois par
-- jour via pg_cron + pg_net, en remplacement du cron GitHub Actions
-- (.github/workflows/echeances-documents.yml) qui appelait la route Next.js
-- /api/cron/echeances-documents.
--
-- pg_cron, pg_net et les secrets Vault (project_url, publishable_key) sont
-- déjà en place suite à migration-cron-rappels-taches-2026-09-01.sql : pas
-- besoin de les recréer, on ajoute simplement le nouveau job.

select cron.schedule(
  'rappels-documents',
  '0 6 * * *',
  $$
  select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/envoyer-rappels-documents',
      headers := jsonb_build_object(
        'Content-type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
      ),
      body := '{}'::jsonb
  ) as request_id;
  $$
);
