"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type DocumentFormState = { error: string | null };

const DOCUMENTS_FICHIERS_BUCKET = "documents-fichiers";
const DOCUMENT_IMAGE_MAX_DIMENSION = 1600;
const DOCUMENT_IMAGE_JPEG_QUALITY = 75;

const CATEGORIES = ["Identité", "Véhicule", "Logement", "Santé", "Assurance", "Autre"] as const;
export type DocumentCategorie = (typeof CATEGORIES)[number];

function revalidateDocumentsPaths(id?: string) {
  revalidatePath("/documents");
  if (id) revalidatePath(`/documents/${id}`);
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Chemin de stockage attendu : `${uuid}.jpg` ou `${uuid}.pdf`, sous
// `/storage/v1/object/public/documents-fichiers/`. Même logique que
// extraireCheminStorage dans src/app/actions/collections.ts.
function extraireCheminStorage(url: string): string | null {
  const marqueur = `/${DOCUMENTS_FICHIERS_BUCKET}/`;
  const index = url.indexOf(marqueur);
  if (index === -1) return null;
  return url.slice(index + marqueur.length);
}

type FichierUploade = { url: string; fichier_type: "image" | "pdf" };

// Compresse les images (même pattern que compresserEtUploaderPhoto dans
// collections.ts) ; les PDF sont uploadés tels quels, sharp ne les
// supportant pas.
async function uploaderFichier(supabase: SupabaseClient, fichier: File): Promise<FichierUploade> {
  const estImage = fichier.type.startsWith("image/");

  if (estImage) {
    const buffer = Buffer.from(await fichier.arrayBuffer());
    const compresse = await sharp(buffer)
      .rotate()
      .resize(DOCUMENT_IMAGE_MAX_DIMENSION, DOCUMENT_IMAGE_MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: DOCUMENT_IMAGE_JPEG_QUALITY })
      .toBuffer();

    const chemin = `${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_FICHIERS_BUCKET)
      .upload(chemin, compresse, { contentType: "image/jpeg" });
    if (uploadError) throw new Error(uploadError.message);

    const {
      data: { publicUrl },
    } = supabase.storage.from(DOCUMENTS_FICHIERS_BUCKET).getPublicUrl(chemin);

    return { url: publicUrl, fichier_type: "image" };
  }

  if (fichier.type !== "application/pdf") {
    throw new Error("Format de fichier non supporté (image ou PDF uniquement).");
  }

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const chemin = `${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_FICHIERS_BUCKET)
    .upload(chemin, buffer, { contentType: "application/pdf" });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(DOCUMENTS_FICHIERS_BUCKET).getPublicUrl(chemin);

  return { url: publicUrl, fichier_type: "pdf" };
}

// Upload un ou plusieurs fichiers (recto/verso d'une pièce d'identité, par
// exemple) sous la clé "fichiers" du formData et insère une ligne
// document_fichiers par fichier — même pattern que uploadTacheImages dans
// src/app/actions/taches.ts. Ne fait rien si aucun fichier n'est fourni (cas
// normal en édition, la plupart des soumissions n'ajoutent pas de fichier).
export async function uploadDocumentFichiers(documentId: string, formData: FormData) {
  const fichiers = formData.getAll("fichiers").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) return;

  const supabase = await createClient();

  const { data: derniere } = await supabase
    .from("document_fichiers")
    .select("ordre")
    .eq("document_id", documentId)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  let ordre = (derniere?.ordre ?? -1) + 1;

  for (const fichier of fichiers) {
    const uploade = await uploaderFichier(supabase, fichier);

    const { error: insertError } = await supabase.from("document_fichiers").insert({
      document_id: documentId,
      url: uploade.url,
      fichier_type: uploade.fichier_type,
      ordre,
    });
    if (insertError) throw new Error(insertError.message);

    ordre++;
  }

  revalidateDocumentsPaths(documentId);
}

export async function deleteDocumentFichier(fichierId: string) {
  const supabase = await createClient();

  const { data: fichier, error: fetchError } = await supabase
    .from("document_fichiers")
    .select("url, document_id")
    .eq("id", fichierId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const chemin = extraireCheminStorage(fichier.url);
  if (chemin) {
    const { error: removeError } = await supabase.storage
      .from(DOCUMENTS_FICHIERS_BUCKET)
      .remove([chemin]);
    if (removeError) throw new Error(removeError.message);
  }

  const { error } = await supabase.from("document_fichiers").delete().eq("id", fichierId);
  if (error) throw new Error(error.message);

  revalidateDocumentsPaths(fichier.document_id);
}

// --- Dossiers ---

export type DossierFormState = { error: string | null };

function revalidateDossiersPaths() {
  revalidatePath("/documents");
  revalidatePath("/documents/dossiers");
}

export async function getDossiers(): Promise<Tables<"dossiers">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dossiers").select("*");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDossier(
  _prevState: DossierFormState,
  formData: FormData
): Promise<DossierFormState> {
  const nom = String(formData.get("nom") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim();
  if (!nom) return { error: "Le nom est requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("dossiers").insert({ nom, parent_id: parentId || null });

  if (error) return { error: error.message };

  revalidateDossiersPaths();
  return { error: null };
}

export async function renameDossier(id: string, nom: string) {
  const trimmed = nom.trim();
  if (!trimmed) throw new Error("Le nom est requis.");

  const supabase = await createClient();
  const { error } = await supabase.from("dossiers").update({ nom: trimmed }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidateDossiersPaths();
}

// Supprime le dossier et, en cascade (contrainte FK), ses sous-dossiers et
// les affectations documents_dossiers correspondantes. Les documents
// eux-mêmes ne sont jamais supprimés, juste "dérangés" de ce dossier.
export async function deleteDossier(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("dossiers").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidateDossiersPaths();
}

// Sync par delete+insert, même pattern que syncTachesTags/syncNotesTags :
// un document peut appartenir à plusieurs dossiers (étiquettes), pas un
// rangement exclusif.
async function syncDocumentDossiers(
  supabase: SupabaseClient,
  documentId: string,
  dossierIds: string[]
) {
  const { error: deleteError } = await supabase
    .from("documents_dossiers")
    .delete()
    .eq("document_id", documentId);
  if (deleteError) throw new Error(deleteError.message);

  if (dossierIds.length > 0) {
    const { error: insertError } = await supabase
      .from("documents_dossiers")
      .insert(dossierIds.map((dossier_id) => ({ document_id: documentId, dossier_id })));
    if (insertError) throw new Error(insertError.message);
  }
}

function parseDossierIds(formData: FormData): string[] {
  return formData.getAll("dossier_ids").map(String).filter(Boolean);
}

type DocumentInput = {
  nom: string;
  categorie: DocumentCategorie | null;
  date_echeance: string | null;
  notes: string | null;
};

type ParseResult = { ok: true; value: DocumentInput } | { ok: false; error: string };

function parseDocumentInput(formData: FormData): ParseResult {
  const nom = String(formData.get("nom") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "").trim();
  const date_echeance = String(formData.get("date_echeance") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!nom) return { ok: false, error: "Le nom est requis." };
  if (categorie && !CATEGORIES.includes(categorie as DocumentCategorie)) {
    return { ok: false, error: "Catégorie invalide." };
  }

  return {
    ok: true,
    value: {
      nom,
      categorie: categorie ? (categorie as DocumentCategorie) : null,
      date_echeance: date_echeance || null,
      notes: notes || null,
    },
  };
}

export async function createDocument(
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const parsed = parseDocumentInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const fichiers = formData.getAll("fichiers").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) {
    return { error: "Au moins un fichier (photo ou PDF) est requis." };
  }

  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("documents")
    .insert(parsed.value)
    .select("id")
    .single();

  if (error) return { error: error.message };

  try {
    await syncDocumentDossiers(supabase, document.id, parseDossierIds(formData));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur lors de l'affectation aux dossiers." };
  }

  try {
    await uploadDocumentFichiers(document.id, formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur lors de l'envoi des fichiers." };
  }

  revalidateDocumentsPaths();
  return { error: null };
}

export async function updateDocument(
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Document introuvable." };

  const parsed = parseDocumentInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();

  const { data: existant, error: fetchError } = await supabase
    .from("documents")
    .select("date_echeance")
    .eq("id", id)
    .single();
  if (fetchError) return { error: fetchError.message };

  // Une échéance déplacée invalide une alerte déjà "acquise" pour l'ancien
  // seuil : sans ça, un document repoussé ne renverrait plus jamais
  // d'alerte (même logique que rappelObsolete dans src/app/actions/taches.ts).
  const echeanceChangee = existant.date_echeance !== parsed.value.date_echeance;

  const { error } = await supabase
    .from("documents")
    .update({
      ...parsed.value,
      ...(echeanceChangee ? { derniere_alerte_envoyee_le: null } : {}),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  try {
    await syncDocumentDossiers(supabase, id, parseDossierIds(formData));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur lors de l'affectation aux dossiers." };
  }

  try {
    await uploadDocumentFichiers(id, formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur lors de l'envoi des fichiers." };
  }

  revalidateDocumentsPaths(id);
  return { error: null };
}

export async function deleteDocument(id: string) {
  const supabase = await createClient();

  const { data: fichiers, error: fetchError } = await supabase
    .from("document_fichiers")
    .select("url")
    .eq("document_id", id);
  if (fetchError) throw new Error(fetchError.message);

  const chemins = (fichiers ?? [])
    .map((f) => extraireCheminStorage(f.url))
    .filter((c): c is string => c !== null);
  if (chemins.length > 0) {
    const { error: removeError } = await supabase.storage.from(DOCUMENTS_FICHIERS_BUCKET).remove(chemins);
    if (removeError) throw new Error(removeError.message);
  }

  // document_fichiers est supprimé en cascade par la contrainte
  // `on delete cascade` (migration-documents-fichiers-multiples-2026-09-11.sql).
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Même pattern que supprimerObjectif dans src/app/actions/objectifs.ts :
  // redirige vers /documents dans les deux cas d'appel (depuis la liste, où
  // c'est un no-op, et depuis le détail, où ça ramène à la liste).
  revalidateDocumentsPaths();
  redirect("/documents");
}

export type DocumentAvecFichiers = Tables<"documents"> & {
  fichiers: Tables<"document_fichiers">[];
  dossiers: Tables<"dossiers">[];
};

const SELECT_DOCUMENT_AVEC_RELATIONS =
  "*, document_fichiers(*), documents_dossiers(dossier:dossiers(*))";

function mapDocumentAvecRelations(
  row: Tables<"documents"> & {
    document_fichiers: Tables<"document_fichiers">[];
    documents_dossiers: { dossier: Tables<"dossiers"> | null }[];
  }
): DocumentAvecFichiers {
  const { document_fichiers, documents_dossiers, ...document } = row;
  return {
    ...document,
    fichiers: document_fichiers,
    dossiers: documents_dossiers.map((dd) => dd.dossier).filter((d): d is Tables<"dossiers"> => d !== null),
  };
}

export async function getDocuments(): Promise<DocumentAvecFichiers[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(SELECT_DOCUMENT_AVEC_RELATIONS)
    .order("date_echeance", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("ordre", { referencedTable: "document_fichiers", ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(mapDocumentAvecRelations);
}

export async function getDocument(id: string): Promise<DocumentAvecFichiers | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(SELECT_DOCUMENT_AVEC_RELATIONS)
    .eq("id", id)
    .order("ordre", { referencedTable: "document_fichiers", ascending: true })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapDocumentAvecRelations(data);
}
