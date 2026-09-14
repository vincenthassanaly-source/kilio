"use client";

import { useEffect, useState } from "react";
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/subscribe";
import { errorText } from "@/lib/ui";

export function NotificationsRow() {
  // null tant que l'état de l'abonnement (async, dépend du service worker)
  // n'est pas connu, pour éviter d'afficher un toggle "off" trompeur le
  // temps du chargement.
  const [on, setOn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkEtatAbonnement() {
      if (!isPushSupported()) {
        if (!cancelled) {
          setSupported(false);
          setOn(false);
        }
        return;
      }

      if (Notification.permission !== "granted") {
        if (!cancelled) setOn(false);
        return;
      }

      try {
        const sub = await getExistingSubscription();
        if (!cancelled) setOn(sub !== null);
      } catch {
        if (!cancelled) setOn(false);
      }
    }

    checkEtatAbonnement();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (!supported) {
      setError("Les notifications ne sont pas supportées par ce navigateur.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      if (on) {
        await unsubscribeFromPush();
        setOn(false);
      } else {
        await subscribeToPush();
        setOn(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'activation des notifications.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-line py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-ink">Notifications</span>
        <button
          type="button"
          onClick={toggle}
          disabled={pending || on === null}
          aria-pressed={on ?? false}
          className="relative h-[26px] w-11 rounded-full transition-colors disabled:opacity-60"
          style={{ background: on ? "var(--accent-kcal)" : "var(--surface-alt)" }}
        >
          <span
            className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-[left]"
            style={{ left: on ? "20px" : "2px" }}
          />
        </button>
      </div>
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
