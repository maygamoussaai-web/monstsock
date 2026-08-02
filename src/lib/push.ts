import { supabase } from "@/integrations/supabase/client";

// Clé publique VAPID — publique par nature, aucun risque à l'avoir dans le code front.
// (La clé privée correspondante ne quitte jamais la base / la fonction Edge.)
const VAPID_PUBLIC_KEY = "BNFC3fq3ne1T9AN8TPYjKRdhk37NyxK88G5h7KH-PQ_lYh23X9vjjn_F9EYaIJ-FZlyXEx9oxXJvT6DZLtffV68";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushPermissionState(): Promise<NotificationPermission | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

// Renvoie true si CET appareil a déjà un abonnement push actif enregistré.
export async function isSubscribedOnThisDevice(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

export async function subscribeToPush(bakeryId: string, userId: string) {
  if (!pushSupported()) throw new Error("Les notifications ne sont pas prises en charge sur cet appareil.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission refusée. Activez les notifications pour ce site dans les réglages du navigateur.");
  }

  const reg = await navigator.serviceWorker.register("/push-sw.js");
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions" as any).upsert(
    {
      bakery_id: bakeryId,
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth_key: json.keys?.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function unsubscribeFromPush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions" as any).delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function sendTestPush() {
  const { error } = await supabase.rpc("send_test_push" as any);
  if (error) throw error;
}
