import { notFound } from "next/navigation";
import { getDocument, getEtiquettes } from "@/app/actions/documents";
import { DocumentDetail } from "./DocumentDetail";

// TODO(per-link-prefetch): assess with the user whether URL data should resolve before click.
// See: https://nextjs.org/docs/app/guides/optimizing-prefetching
// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching
export const prefetch = 'partial'

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
