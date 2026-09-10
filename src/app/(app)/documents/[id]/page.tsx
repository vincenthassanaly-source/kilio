import { notFound } from "next/navigation";
import { getDocument, getDossiers } from "@/app/actions/documents";
import { DocumentDetail } from "./DocumentDetail";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, dossiers] = await Promise.all([getDocument(id), getDossiers()]);

  if (!document) {
    notFound();
  }

  return <DocumentDetail document={document} dossiers={dossiers} />;
}
