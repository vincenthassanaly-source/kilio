"use client";

import { useEffect, useRef, useState } from "react";
import { flushQueue } from "./queue";

// Écoute online/offline et rejoue la file d'attente au retour en ligne.
// Monté une seule fois dans src/app/providers.tsx (comme ToastHost) pour
// couvrir toute l'app, pas seulement l'écran actif.
//
// `onSynced` est appelé après un rejeu qui a synchronisé au moins une action.
// À la reconnexion, TanStack Query relance aussi les requêtes mises en pause
// hors ligne : ce refetch peut lire le serveur AVANT le rejeu et écraser le
// cache optimiste avec l'ancien état. Invalider les données une fois la file
// rejouée garantit que l'écran reflète l'état réel.
export function useOnlineSync(onSynced?: () => void) {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );
  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    onSyncedRef.current = onSynced;
  });

  useEffect(() => {
    async function rejouer() {
      const synced = await flushQueue();
      if (synced > 0) onSyncedRef.current?.();
    }

    // Au cas où l'app est rouverte alors que des actions étaient restées en
    // attente d'une session précédente déjà en ligne.
    if (navigator.onLine) rejouer();

    function handleOnline() {
      setIsOnline(true);
      rejouer();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
