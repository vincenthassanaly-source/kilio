"use client";

import { useRouter } from "next/navigation";
import { primaryButton } from "@/lib/ui";

// `router.refresh()` relance FootPage côté serveur, donc `getResultatsFootDuJour()`
// avec elle : un nouvel appel API-Football déclenché explicitement par Vincent,
// conforme à la contrainte "aucun appel automatique".
export function FootRetryButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className={primaryButton}>
      Réessayer
    </button>
  );
}
