-- Étiquettes de documents : liste gérable (ajout/renommage/suppression
-- depuis /documents/etiquettes), à choix UNIQUE par document et optionnelle
-- — complète la catégorie large existante (Identité/Véhicule/Logement/
-- Santé/Assurance/Autre) par un type précis (ex. "Permis de conduire")
-- choisi à la création. Contrairement aux dossiers (imbricables, affectation
-- multiple), une étiquette est un simple type exclusif, comme
-- listes_taches pour les tâches.
--
-- Schéma plat, pas de RLS, pas de user_id, même convention que le reste de
-- Kilio. updated_at géré par le trigger set_updated_at() existant.
-- `on delete set null` sur documents.etiquette_id : supprimer une étiquette
-- ne supprime jamais le document, il perd juste son étiquette.

create table etiquettes (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_etiquettes_updated_at
  before update on etiquettes
  for each row execute function set_updated_at();

alter table documents
  add column etiquette_id uuid references etiquettes(id) on delete set null;

create index idx_documents_etiquette_id on documents(etiquette_id);

-- Liste de départ : types de documents administratifs courants, à
-- compléter/renommer/supprimer librement ensuite depuis /documents/etiquettes.
insert into etiquettes (nom) values
  ('Carte d''identité'),
  ('Passeport'),
  ('Permis de conduire'),
  ('Carte vitale'),
  ('Carte grise'),
  ('Attestation d''assurance véhicule'),
  ('Contrôle technique'),
  ('Contrat de bail'),
  ('Attestation d''assurance habitation'),
  ('Quittance de loyer'),
  ('Facture d''électricité'),
  ('Facture de gaz'),
  ('Facture d''eau'),
  ('Facture internet / téléphone'),
  ('Bulletin de salaire'),
  ('Contrat de travail'),
  ('Avis d''imposition'),
  ('RIB'),
  ('Relevé bancaire'),
  ('Carte de mutuelle'),
  ('Ordonnance médicale'),
  ('Carnet de vaccination'),
  ('Diplôme'),
  ('Titre de séjour'),
  ('Livret de famille'),
  ('Acte de naissance');
