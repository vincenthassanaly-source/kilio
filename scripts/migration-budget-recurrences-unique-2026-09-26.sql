-- Empêche la génération en double d'une occurrence de récurrence budgétaire
-- (genererOccurrencesDues fait un read puis un insert sans verrou : deux
-- rendus concurrents de /budget ou /budget/transactions peuvent sinon générer
-- deux fois la même transaction pour la même date). L'action passe désormais
-- par un upsert qui ignore le conflit sur cet index.
create unique index if not exists transactions_recurrence_date_unique
  on public.transactions (transaction_recurrente_id, date_operation)
  where transaction_recurrente_id is not null;
