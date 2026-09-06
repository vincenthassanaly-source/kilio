import { notFound } from "next/navigation";
import { getCollectionAvecPhotos } from "@/app/actions/collections";
import { AddPhotoButton } from "./AddPhotoButton";
import { CollectionHeader } from "./CollectionHeader";
import { PhotosGrid } from "./PhotosGrid";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollectionAvecPhotos(id);

  if (!collection) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <CollectionHeader collection={collection} />
      <AddPhotoButton collectionId={id} />
      <PhotosGrid photos={collection.photos} collectionId={id} />
    </div>
  );
}
