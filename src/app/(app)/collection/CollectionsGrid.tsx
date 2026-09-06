"use client";

import { motion } from "framer-motion";
import { CollectionMosaic } from "./CollectionMosaic";
import type { CollectionAvecApercu } from "@/app/actions/collections";
import { TransitionLink } from "@/components/TransitionLink";
import { nameText } from "@/lib/ui";

export function CollectionsGrid({ collections }: { collections: CollectionAvecApercu[] }) {
  if (collections.length === 0) {
    return <p className="text-ink-2">Aucune collection pour l&apos;instant.</p>;
  }

  return (
    <ul className="columns-2 gap-3">
      {collections.map((collection, index) => (
        <motion.li
          key={collection.id}
          className="mb-3 break-inside-avoid"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.35) }}
          whileTap={{ scale: 0.97 }}
        >
          <TransitionLink href={`/collection/${collection.id}`} className="flex flex-col gap-1.5">
            <CollectionMosaic
              photos={collection.photos_apercu}
              viewTransitionName={`collection-cover-${collection.id}`}
            />
            <p className={nameText} style={{ viewTransitionName: `collection-title-${collection.id}` }}>
              {collection.nom}
            </p>
            <p className="text-xs text-ink-3">
              {collection.nb_photos} photo{collection.nb_photos > 1 ? "s" : ""}
            </p>
          </TransitionLink>
        </motion.li>
      ))}
    </ul>
  );
}
