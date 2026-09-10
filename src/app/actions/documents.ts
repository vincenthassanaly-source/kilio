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

// Chemin de stockage attendu : `${uuid}.jpg` ou `${uuid}.pdf`, sous
// `/storage/v1/object/public/documents-fichiers/`. Même logique que
// extraireCheminStorage dans src/app/actions/collections.ts.
function extraireCheminStorage(url: string): string | null {
  const marqueur = `/${DOCUMENTS_FICHIERS_BUCKET}/`;
  const index = url.indexOf(marqueur);
  if (index === -1) return null;
  return url.slice(index + marqueur.length);
}

export type FichierUploade = { url: string; fichier_type: "image" | "pdf" };

// Compresse les images (même pattern que compresserEtUploaderPhoto dans
// collections.ts) ; les PDF sont uploadés tels quels, sharp ne les
// supportant pas.
export async function uploadDocumentFichier(fichier: File): Promise<FichierUploade> {
  const supabase = await createClient();
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

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { error: "Le fichier (photo ou PDF) est requis." };
  }

  let uploade: FichierUploade;
  try {
    uploade = await uploadDocumentFichier(fichier);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur lors de l'envoi du fichier." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    ...parsed.value,
    fichier_url: uploade.url,
    fichier_type: uploade.fichier_type,
  });

  if (error) return { error: error.message };

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

  const fichier = formData.get("fichier");
  const remplaceFichier = fichier instanceof File && fichier.size > 0;

  let fichierFields: { fichier_url: string; fichier_type: "image" | "pdf" } | null = null;
  if (remplaceFichier) {
    try {
      const uploade = await uploadDocumentFichier(fichier);
      fichierFields = { fichier_url: uploade.url, fichier_type: uploade.fichier_type };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erreur lors de l'envoi du fichier." };
    }
  }

  const { data: existant, error: fetchError } = await supabase
    .from("documents")
    .select("date_echeance, fichier_url")
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
      ...fichierFields,
      ...(echeanceChangee ? { derniere_alerte_envoyee_le: null } : {}),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  if (remplaceFichier) {
    const ancienChemin = extraireCheminStorage(existant.fichier_url);
    if (ancienChemin) {
      await supabase.storage.from(DOCUMENTS_FICHIERS_BUCKET).remove([ancienChemin]);
    }
  }

  revalidateDocumentsPaths(id);
  return { error: null };
}

export async function deleteDocument(id: string) {
  const supabase = await createClient();

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("fichier_url")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const chemin = extraireCheminStorage(document.fichier_url);
  if (chemin) {
    const { error: removeError } = await supabase.storage
      .from(DOCUMENTS_FICHIERS_BUCKET)
      .remove([chemin]);
    if (removeError) throw new Error(removeError.message);
  }

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Même pattern que supprimerObjectif dans src/app/actions/objectifs.ts :
  // redirige vers /documents dans les deux cas d'appel (depuis la liste, où
  // c'est un no-op, et depuis le détail, où ça ramène à la liste).
  revalidateDocumentsPaths();
  redirect("/documents");
}

export async function getDocuments(): Promise<Tables<"documents">[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("date_echeance", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDocument(id: string): Promise<Tables<"documents"> | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
