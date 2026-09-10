-- Organisation des documents en dossiers (ex. "Factures", "Bulletins de
-- salaire") : dossiers imbricables (sous-dossiers via parent_id) et
-- affectation multiple (un document peut appartenir à plusieurs dossiers,
-- comme les tags de Notes/Tâches) plutôt qu'un rangement exclusif façon
-- listes_taches.
--
-- Schéma plat, pas de RLS, pas de user_id, même convention que le reste de
-- Kilio. updated_at géré par le trigger set_updated_at() existant.
-- `on delete cascade` sur parent_id : supprimer un dossier supprime ses
-- sous-dossiers (à l'image d'un vrai système de fichiers) — la UI doit
-- avertir avant suppression d'un dossier non vide.

create table dossiers (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  parent_id uuid references dossiers(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_dossiers_updated_at
  before update on dossiers
  for each row execute function set_updated_at();

create index idx_dossiers_parent_id on dossiers(parent_id);

create table documents_dossiers (
  document_id uuid not null references documents(id) on delete cascade,
  dossier_id uuid not null references dossiers(id) on delete cascade,
  primary key (document_id, dossier_id)
);

create index idx_documents_dossiers_dossier_id on documents_dossiers(dossier_id);
