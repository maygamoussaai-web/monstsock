/**
 * src/lib/errors.ts
 * Module central de traduction des erreurs en messages français actionnables.
 * Usage : toast.error(describeError(e))
 */

interface PgError  { code?: string; message?: string; details?: string; hint?: string; }
interface AuthError { status?: number; message?: string; code?: string; error_description?: string; }
interface StorageError { statusCode?: string | number; message?: string; error?: string; }

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
function looksLikeNetworkError(msg: string): boolean {
  return /network|timeout|fetch|failed to fetch|load failed|networkerror|offline|aborted|net::/i.test(msg);
}

const PG_CODE_MESSAGES: Record<string, string> = {
  "23000": "Une contrainte d'intégrité a été violée. Vérifiez les données saisies.",
  "23001": "Impossible : cette donnée est encore liée à d'autres enregistrements.",
  "23502": "Un champ obligatoire est vide. Remplissez tous les champs requis avant de valider.",
  "23503": "Impossible : cette donnée est utilisée ailleurs dans l'application.",
  "23505": "Cette valeur existe déjà. Utilisez un nom ou un identifiant différent.",
  "23514": "La valeur saisie ne respecte pas les règles autorisées pour ce champ.",
  "28000": "Accès refusé. Votre session a peut-être expiré — reconnectez-vous.",
  "28P01": "Identifiants incorrects. Vérifiez l'e-mail et le mot de passe.",
  "42501": "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
  "40001": "Conflit de modification simultanée. Actualisez la page et réessayez.",
  "40P01": "Blocage détecté. Actualisez la page et réessayez.",
  "08000": "Connexion au serveur impossible. Vérifiez votre connexion internet.",
  "08003": "La connexion au serveur a été interrompue. Réessayez dans un instant.",
  "08006": "Échec de la connexion au serveur. Réessayez dans un instant.",
  "22001": "La valeur saisie est trop longue pour ce champ.",
  "22003": "Le nombre saisi dépasse la limite autorisée.",
  "22007": "Le format de la date est invalide.",
  "22P02": "Format de données invalide. Vérifiez les valeurs saisies.",
  "53300": "Trop de connexions simultanées. Réessayez dans quelques secondes.",
  "57014": "La requête a pris trop de temps et a été annulée. Réessayez.",
};

const POSTGREST_HTTP: Record<number, string> = {
  400: "Requête invalide. Vérifiez les données saisies.",
  401: "Votre session a expiré. Reconnectez-vous pour continuer.",
  403: "Vous n'avez pas les droits pour effectuer cette action.",
  404: "Données introuvables. Elles ont peut-être été supprimées.",
  409: "Conflit : cette donnée existe déjà ou a été modifiée entre-temps.",
  422: "Données non traitables. Vérifiez les valeurs saisies.",
  429: "Trop de requêtes envoyées. Patientez quelques secondes puis réessayez.",
  500: "Erreur interne du serveur. Réessayez dans un instant.",
  502: "Le serveur est temporairement indisponible. Réessayez dans un instant.",
  503: "Service indisponible. Réessayez dans quelques instants.",
  504: "Le serveur a mis trop de temps à répondre. Réessayez.",
};

const PG_MSG_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /new row violates row-level security/i,   message: "Accès refusé par la politique de sécurité. Vérifiez vos droits." },
  { pattern: /permission denied/i,                     message: "Permission refusée. Vous n'avez pas les droits pour cette action." },
  { pattern: /stock insuffisant|stock.+insuffisant/i,  message: "Stock insuffisant pour cette opération. Réapprovisionnez avant de continuer." },
  { pattern: /stock must be zero|stock doit être nul/i,message: "Le stock doit être nul pour archiver cet élément." },
  { pattern: /déjà utilisé|already used/i,             message: "Ce code a déjà été utilisé." },
  { pattern: /code.+invalide|invalid.+code/i,          message: "Code invalide. Vérifiez le code saisi." },
  { pattern: /essai gratuit.+déjà/i,                   message: "Un essai gratuit a déjà été activé pour cette adresse e-mail." },
  { pattern: /session.+déjà ouverte|already open/i,   message: "Une session de vente est déjà ouverte." },
  { pattern: /duplicate key.+name/i,                   message: "Ce nom est déjà utilisé. Choisissez un nom différent." },
  { pattern: /duplicate key.+email/i,                  message: "Cette adresse e-mail est déjà associée à un compte." },
  { pattern: /duplicate key value/i,                   message: "Cette valeur existe déjà. Utilisez une valeur différente." },
  { pattern: /foreign key|violates foreign key/i,      message: "Impossible : cette donnée est liée à d'autres enregistrements." },
  { pattern: /null value in column/i,                  message: "Un champ obligatoire est vide. Complétez tous les champs requis." },
  { pattern: /statement timeout|query timeout/i,       message: "La requête a pris trop de temps. Réessayez dans un instant." },
  { pattern: /could not connect|connection refused/i,  message: "Connexion au serveur impossible. Vérifiez votre connexion internet." },
];

function describePgError(err: PgError): string | null {
  const code = err.code ?? "";
  const msg  = err.message ?? "";
  if (code && PG_CODE_MESSAGES[code]) return PG_CODE_MESSAGES[code];
  for (const { pattern, message } of PG_MSG_PATTERNS) {
    if (pattern.test(msg)) return message;
  }
  return null;
}

const AUTH_CODE_MESSAGES: Record<string, string> = {
  invalid_credentials:           "E-mail ou mot de passe incorrect. Vérifiez vos identifiants.",
  email_not_confirmed:           "Votre adresse e-mail n'est pas encore confirmée. Consultez votre boîte mail.",
  user_not_found:                "Aucun compte associé à cette adresse. Vérifiez l'e-mail ou créez un compte.",
  email_exists:                  "Cette adresse e-mail est déjà associée à un compte.",
  user_already_exists:           "Un compte existe déjà avec ces informations.",
  session_not_found:             "Session introuvable. Reconnectez-vous.",
  refresh_token_not_found:       "Session expirée. Reconnectez-vous pour continuer.",
  flow_state_expired:            "Le lien a expiré. Faites une nouvelle demande.",
  otp_expired:                   "Le code a expiré. Demandez-en un nouveau.",
  over_email_send_rate_limit:    "Trop d'e-mails envoyés. Patientez quelques minutes avant de réessayer.",
  over_request_rate_limit:       "Trop de tentatives. Patientez quelques secondes avant de réessayer.",
  signup_disabled:               "Les nouvelles inscriptions sont temporairement désactivées.",
  password_too_short:            "Le mot de passe est trop court (8 caractères minimum).",
  weak_password:                 "Le mot de passe est trop simple. Choisissez un mot de passe plus sûr.",
  same_password:                 "Le nouveau mot de passe doit être différent de l'actuel.",
  token_has_been_used:           "Ce lien a déjà été utilisé. Faites une nouvelle demande.",
  bad_jwt:                       "Session invalide. Reconnectez-vous.",
};

const AUTH_HTTP_MESSAGES: Record<number, string> = {
  400: "Requête invalide. Vérifiez les informations saisies.",
  401: "Non authentifié. Reconnectez-vous.",
  403: "Accès refusé.",
  422: "Données invalides. Vérifiez les champs du formulaire.",
  429: "Trop de tentatives. Patientez quelques instants avant de réessayer.",
  500: "Erreur serveur. Réessayez dans un instant.",
};

function describeAuthError(err: AuthError): string | null {
  const code = err.code ?? "";
  if (code && AUTH_CODE_MESSAGES[code]) return AUTH_CODE_MESSAGES[code];
  if (err.status && AUTH_HTTP_MESSAGES[err.status]) return AUTH_HTTP_MESSAGES[err.status];
  const msg = (err.message ?? "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect. Vérifiez vos identifiants.";
  if (msg.includes("email not confirmed")) return "Votre adresse e-mail n'est pas encore confirmée. Consultez votre boîte mail.";
  if (msg.includes("user already registered")) return "Un compte existe déjà avec cette adresse e-mail.";
  if (msg.includes("password should be")) return "Le mot de passe ne respecte pas les règles de sécurité (8 caractères minimum).";
  if (msg.includes("token has expired") || msg.includes("otp expired")) return "Le lien a expiré. Faites une nouvelle demande.";
  if (msg.includes("rate limit")) return "Trop de tentatives. Patientez quelques instants avant de réessayer.";
  return null;
}

function describeStorageError(err: StorageError): string | null {
  const code   = String(err.statusCode ?? "");
  const msg    = (err.message ?? "").toLowerCase();
  const errStr = (err.error  ?? "").toLowerCase();
  if (code === "413" || msg.includes("too large") || errStr.includes("too large"))
    return "Le fichier est trop volumineux. La taille maximale autorisée est 50 Mo.";
  if (code === "415" || msg.includes("mime") || errStr.includes("content type"))
    return "Format de fichier non autorisé. Utilisez une image (JPEG, PNG, WebP) ou un PDF.";
  if (code === "404" || errStr.includes("not found")) return "Fichier introuvable. Il a peut-être été supprimé.";
  if (code === "403" || errStr.includes("unauthorized")) return "Vous n'avez pas les droits pour accéder à ce fichier.";
  if (code === "409" || errStr.includes("already exists")) return "Un fichier portant ce nom existe déjà.";
  if (code === "500") return "Erreur du serveur de stockage. Réessayez dans un instant.";
  return null;
}

const BUSINESS_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /stock doit être nul/i,   message: "Le stock doit être nul pour archiver cet élément." },
  { pattern: /stock insuffisant/i,     message: "Stock insuffisant pour cette opération." },
  { pattern: /non connecté/i,          message: "Vous n'êtes pas connecté. Reconnectez-vous." },
  { pattern: /session expirée/i,       message: "Votre session a expiré. Reconnectez-vous." },
  { pattern: /network-timeout/i,       message: "La requête a pris trop de temps. Vérifiez votre connexion internet." },
];

/**
 * Convertit n'importe quelle erreur en message français prêt pour toast.error().
 */
export function describeError(
  err: unknown,
  fallback = "Une erreur inattendue s'est produite. Réessayez ou contactez le support."
): string {
  if (!err) return fallback;
  const e = err as any;
  const rawMsg: string = typeof e?.message === "string" ? e.message : String(e ?? "");

  if (isOffline() || looksLikeNetworkError(rawMsg))
    return "Vous êtes hors ligne. L'action sera synchronisée dès le retour de la connexion.";

  if (e?.__isAuthError || e?.status != null || e?.code != null) {
    const m = describeAuthError(e as AuthError);
    if (m) return m;
  }

  if (e?.statusCode != null || e?.error != null) {
    const m = describeStorageError(e as StorageError);
    if (m) return m;
  }

  if (e?.code != null || e?.hint != null || e?.details != null) {
    const m = describePgError(e as PgError);
    if (m) return m;
  }

  if (typeof e?.status === "number" && POSTGREST_HTTP[e.status])
    return POSTGREST_HTTP[e.status];

  for (const { pattern, message } of BUSINESS_PATTERNS) {
    if (pattern.test(rawMsg)) return message;
  }

  const pgFallback = describePgError({ message: rawMsg });
  if (pgFallback) return pgFallback;

  if (looksLikeNetworkError(rawMsg))
    return "Problème de connexion. Vérifiez votre connexion internet et réessayez.";

  if (rawMsg && rawMsg.length < 200 && !/\b(error|Error|ERROR)\b.*:/.test(rawMsg))
    return rawMsg;

  return fallback;
}

export function describeSaveError(err: unknown): string {
  return describeError(err, "Impossible d'enregistrer. Vérifiez les données saisies et réessayez.");
}

export function describeDeleteError(err: unknown): string {
  return describeError(err, "Impossible de supprimer cet élément. Il est peut-être encore utilisé ailleurs.");
}

export function describeSyncError(err: unknown): string {
  return describeError(err, "La synchronisation a échoué. Vérifiez votre connexion et réessayez.");
}
