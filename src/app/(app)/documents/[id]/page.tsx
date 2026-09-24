import { notFound } from "next/navigation";
import { getDocument, getEtiquettes } from "@/app/actions/documents";
import { DocumentDetail } from "./DocumentDetail";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, etiquettes] = await Promise.all([getDocument(id), getEtiquettes()]);

  if (!document) {
    notFound();
  }

  return <DocumentDetail document={document} etiquettes={etiquettes} />;
}
