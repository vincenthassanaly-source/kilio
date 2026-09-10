import { notFound } from "next/navigation";
import { getDocument, getDossiers, getEtiquettes } from "@/app/actions/documents";
import { DocumentDetail } from "./DocumentDetail";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, dossiers, etiquettes] = await Promise.all([
    getDocument(id),
    getDossiers(),
    getEtiquettes(),
  ]);

  if (!document) {
    notFound();
  }

  return <DocumentDetail document={document} dossiers={dossiers} etiquettes={etiquettes} />;
}
