-- Permet plusieurs fichiers par document (ex. recto/verso d'une pièce
-- d'identité) : remplace les colonnes documents.fichier_url/fichier_type
-- (un seul fichier) par une table enfant document_fichiers, même pattern
-- que tache_images (migration-tache-images-2026-09-01.sql) — pas de RLS,
-- pas de user_id, cascade sur suppression du document.
--
-- Migre les données existantes (documents déjà créés avec l'ancien schéma à
-- un seul fichier) vers la nouvelle table avant de supprimer les colonnes.

create table document_fichiers (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  url text not null,
  fichier_type text not null check (fichier_type in ('image', 'pdf')),
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_document_fichiers_document_id on document_fichiers(document_id, ordre);

insert into document_fichiers (document_id, url, fichier_type, ordre)
select id, fichier_url, fichier_type, 0
from documents
where fichier_url is not null;

alter table documents
  drop column fichier_url,
  drop column fichier_type;
