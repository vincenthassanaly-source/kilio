"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCollectionItem, type CollectionAvecPhotos } from "@/app/actions/collections";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import { FadeInImage } from "@/components/FadeInImage";
import { ImageLightbox } from "@/components/ImageLightbox";
import { TiktokLightbox } from "@/components/TiktokLightbox";
import type { Tables } from "@/lib/supabase/types";
import { vibrate } from "@/lib/haptics";

function TiktokBadge() {
  return (
    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 4v10.2a3.3 3.3 0 1 1-2.6-3.23" />
        <path d="M14 4c.3 2.2 1.9 3.8 4 4" />
      </svg>
      TikTok
    </span>
  );
}

export function PhotosGrid({
  photos,
  collectionId,
}: {
  photos: Tables<"collection_items">[];
  collectionId: string;
}) {
  const [lightboxItem, setLightboxItem] = useState<Tables<"collection_items"> | null>(null);
  const queryClient = useQueryClient();

  // Supprimer une photo est l'action la plus fréquente de cette vue : même
  // mécanisme optimiste (setQueryData + rollback) que TaskCard/HabitudeCard,
  // sur le cache de la collection (queryKeys.collection). `nb_photos`/
  // l'aperçu affichés sur /collection dépendant aussi de cette suppression,
  // la liste des collections est invalidée en plus au règlement.
  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => {
      vibrate();
      return deleteCollectionItem(photoId);
    },
    onMutate: async (photoId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.collection(collectionId) });
      const previous = queryClient.getQueryData<CollectionAvecPhotos>(queryKeys.collection(collectionId));
      queryClient.setQueryData<CollectionAvecPhotos>(queryKeys.collection(collectionId), (old) =>
        old ? { ...old, photos: old.photos.filter((p) => p.id !== photoId) } : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.collection(collectionId), context.previous);
      showToast("Impossible de supprimer la photo.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collection(collectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  if (photos.length === 0) {
    return <p className="text-ink-2">Aucune photo pour l&apos;instant.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2">
        <AnimatePresence initial={false}>
          {photos.map((photo, index) => {
            const estTiktok = photo.type === "tiktok";
            const src = estTiktok ? (photo.thumbnail_url ?? photo.url) : photo.url;

            return (
              <motion.li
                key={photo.id}
                layout
                className="relative aspect-square overflow-hidden rounded-2xl bg-surface-alt"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
              >
                <button
                  type="button"
                  onClick={() => setLightboxItem(photo)}
                  aria-label={estTiktok ? "Lire la vidéo TikTok" : "Agrandir la photo"}
                  className="relative block h-full w-full"
                >
                  <FadeInImage
                    src={src}
                    alt=""
                    fill
                    sizes="50vw"
                    unoptimized={estTiktok}
                    style={index === 0 ? { viewTransitionName: `collection-cover-${collectionId}` } : undefined}
                    className="object-cover"
                  />
                  {estTiktok && <TiktokBadge />}
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(photo.id)}
                  aria-label="Supprimer"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {lightboxItem &&
        (lightboxItem.type === "tiktok" ? (
          <TiktokLightbox url={lightboxItem.url} onClose={() => setLightboxItem(null)} />
        ) : (
          <ImageLightbox src={lightboxItem.url} onClose={() => setLightboxItem(null)} />
        ))}
    </>
  );
}
