// ─────────────────────────────────────────────────────────────────────────────
// Session locale (mode hors ligne / PWA installée).
//
// supabase.auth.getUser() interroge TOUJOURS le serveur, et getSession() tente
// un rafraîchissement réseau dès que le jeton d'accès est périmé (1 h). Sans
// réseau, ces appels échouent : l'utilisateur était alors renvoyé vers l'écran
// de connexion à chaque ouverture de l'app, alors que sa session est bien
// enregistrée sur l'appareil.
//
// On lit donc directement la session persistée par supabase-js dans
// localStorage (clé « sb-<ref>-auth-token »). Cela ne contourne aucune
// sécurité : le serveur valide de toute façon le jeton à chaque requête, et le
// jeton de rafraîchissement redevient valide dès le retour du réseau.
// ─────────────────────────────────────────────────────────────────────────────

export type LocalUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type StoredSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user?: LocalUser;
};

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      // supabase-js stocke soit la session directement, soit { currentSession }.
      const session = parsed?.currentSession ?? parsed;
      if (session?.user?.id) return session as StoredSession;
    }
  } catch {
    // localStorage indisponible : on considère qu'il n'y a pas de session.
  }
  return null;
}

// Utilisateur enregistré sur cet appareil, sans aucun appel réseau.
export function getLocalUser(): LocalUser | null {
  return readStoredSession()?.user ?? null;
}

export function hasLocalSession(): boolean {
  return !!getLocalUser();
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

// Utilisateur courant « résilient » : le réseau est tenté brièvement, mais on
// retombe toujours sur la session locale plutôt que de déconnecter l'usager.
export async function getResilientUser(timeoutMs = 2500): Promise<LocalUser | null> {
  const local = getLocalUser();
  if (isOffline()) return local;

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("auth-timeout")), timeoutMs)
      ),
    ]);
    const user = (result as any)?.data?.session?.user as LocalUser | undefined;
    return user ?? local;
  } catch {
    return local;
  }
}
