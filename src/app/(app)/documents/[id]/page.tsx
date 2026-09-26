import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getDocument, getEtiquettes } from "@/app/actions/documents";
import { DocumentDetail } from "./DocumentDetail";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Voir le commentaire de /budget/comptes.
  await connection();
  const { id } = await params;
  const [document, etiquettes] = await Promise.all([getDocument(id), getEtiquettes()]);

  if (!document) {
    notFound();
  }

  return <DocumentDetail document={document} etiquettes={etiquettes} />;
}
