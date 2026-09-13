"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { dismissToast, getToasts, subscribeToasts } from "./toast-store";

// Référence stable : useSyncExternalStore compare par === entre deux
// rendus, une nouvelle référence à chaque appel (ex. `() => []`) déclenche
// une boucle de re-rendu infinie.
const EMPTY_TOASTS: never[] = [];
function getServerSnapshot() {
  return EMPTY_TOASTS;
}

/** Empile de courts toasts d'erreur discrets en bas d'écran (au-dessus de la
 * bottom nav), utilisés pour signaler le rollback silencieux d'une mutation
 * optimiste. Montée une seule fois dans src/app/providers.tsx. */
export function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getServerSnapshot);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
    >
      <AnimatePresence>
        {items.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={() => dismissToast(toast.id)}
            aria-label={`${toast.text} — appuyer pour masquer`}
            className="pointer-events-auto max-w-[90vw] rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink shadow-card"
          >
            {toast.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
