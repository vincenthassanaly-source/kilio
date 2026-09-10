import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

let vapidConfigured = false;

function configurerVapid() {
  if (vapidConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "Clés VAPID manquantes (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)."
    );
  }

  // Le sujet ("mailto:" ou URL) est requis par la spec Web Push mais jamais
  // affiché à l'utilisateur : une valeur fixe suffit pour une app
  // mono-utilisateur comme Kilio.
  webpush.setVapidDetails("mailto:kilio@example.com", publicKey, privateKey);
  vapidConfigured = true;
}

// Envoie une notification push à un abonnement donné. Si l'endpoint est
// expiré ou révoqué par le navigateur (410 Gone, ou 404 si le service push
// a purgé l'abonnement), supprime la ligne push_subscriptions correspondante
// plutôt que de re-tenter indéfiniment un endpoint mort.
export async function envoyerNotificationPush(
  subscription: Tables<"push_subscriptions">,
  payload: PushPayload
): Promise<void> {
  configurerVapid();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      const supabase = await createClient();
      await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
      return;
    }
    throw err;
  }
}
