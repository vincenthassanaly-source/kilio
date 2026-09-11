"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Mono-utilisateur, pas de user_id : une ligne par device/navigateur
// abonné. Upsert sur endpoint pour que se réabonner (permission déjà
// accordée, endpoint inchangé) mette juste à jour les clés au lieu de
// dupliquer la ligne.
export async function saveSubscription(subscription: PushSubscriptionInput) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) throw new Error(error.message);
}

export async function deleteSubscription(endpoint: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) throw new Error(error.message);
}
