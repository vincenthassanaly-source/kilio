-- Module "Documents importants" : stockage des papiers/documents avec
-- échéance optionnelle (carte grise, passeport, assurance, etc.) et alerte
-- push à l'approche de l'échéance.
--
-- Schéma plat, pas de RLS, pas de user_id : même modèle mono-utilisateur que
-- le reste de Kilio depuis migration-suppression-auth-2026-08-29.sql.
-- updated_at géré par le trigger set_updated_at() existant (créé par
-- migration-budget-2026-08-30.sql), pas recréé ici.
--
-- Bucket documents-fichiers : public, comme collection-images et
-- tache-images (cf. migration-tache-images-2026-09-01.sql pour le pattern
-- de policies storage.objects — RLS activée par défaut chez Supabase sur ce
-- schéma, contrairement aux tables applicatives).

insert into storage.buckets (id, name, public)
values ('documents-fichiers', 'documents-fichiers', true);

create policy "documents_fichiers_select"
  on storage.objects for select
  using (bucket_id = 'documents-fichiers');

create policy "documents_fichiers_insert"
  on storage.objects for insert
  with check (bucket_id = 'documents-fichiers');

create policy "documents_fichiers_delete"
  on storage.objects for delete
  using (bucket_id = 'documents-fichiers');

create table documents (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text check (
    categorie is null
    or categorie in ('Identité', 'Véhicule', 'Logement', 'Santé', 'Assurance', 'Autre')
  ),
  fichier_url text not null,
  fichier_type text not null check (fichier_type in ('image', 'pdf')),
  date_echeance date null,
  notes text null,
  -- Évite de renvoyer la même alerte plusieurs fois pour le même seuil le
  -- même jour (cf. src/app/api/cron/echeances-documents/route.ts) : une
  -- seule date, pas un booléen par seuil, car un document ne peut franchir
  -- qu'un seuil par jour de toute façon (le cron tourne une fois par jour).
  derniere_alerte_envoyee_le date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

create index idx_documents_date_echeance on documents(date_echeance);
