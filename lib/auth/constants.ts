/** Allowed login emails must use this domain suffix (validated on login + middleware assumptions). */
export const ALLOWED_EMAIL_DOMAIN = "@trivoxhq.com";

/** HttpOnly auth cookie name */
export const AUTH_COOKIE_NAME = "token";

/** JWT lifetime (matches cookie max-age) */
export const AUTH_TOKEN_MAX_AGE_SEC = 8 * 60 * 60; // 8 hours
