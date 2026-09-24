"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCollectionAvecPhotos } from "@/app/actions/collections";
import { queryKeys } from "@/lib/query/keys";
import { AddPhotoButton } from "./AddPhotoButton";
import { CollectionHeader } from "./CollectionHeader";
import { PhotosGrid } from "./PhotosGrid";
import { TransitionLink } from "@/components/TransitionLink";
import { errorText, linkButton } from "@/lib/ui";
import { Skeleton } from "@/components/skeletons/Skeleton";
import { GridSkeleton } from "@/components/skeletons/GridSkeleton";

// Shell client (et non plus Server Component) : la collection est chargée
// via TanStack Query (voir /taches, même patron), pour partager le cache
// avec la mutation optimiste de PhotosGrid. `notFound()` de next/navigation
// n'est documenté que pour les Server Components/Server Functions/Route
// Handlers (cf. node_modules/next/dist/docs/.../not-found.md) : une
// collection introuvable affiche donc un message inline plutôt que la page
// 404 native.
export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: collection, isLoading, isError } = useQuery({
    queryKey: queryKeys.collection(id),
    queryFn: () => getCollectionAvecPhotos(id),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="mt-1 h-6 w-2/5" />
        </div>
        <Skeleton className="h-11 w-full rounded-2xl" />
        <GridSkeleton />
      </div>
    );
  }

  if (isError || !collection) {
    return (
      <div className="flex flex-col gap-3">
        <TransitionLink href="/collection" className={linkButton}>
          ‹ Collection
        </TransitionLink>
        <p className={errorText}>
          {isError ? "Erreur de chargement de la collection." : "Collection introuvable."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CollectionHeader collection={collection} />
      <AddPhotoButton collectionId={id} />
      <PhotosGrid photos={collection.photos} collectionId={id} />
    </div>
  );
}
