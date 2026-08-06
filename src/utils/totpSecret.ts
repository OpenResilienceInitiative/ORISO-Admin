import { encode } from 'hi-base32';

/**
 * The user service stores the TOTP shared secret as raw characters and Keycloak
 * uses exactly those bytes as the HMAC key. An authenticator app, however, is
 * given the base32 form of the same bytes — so every screen that shows the key
 * to a human has to convert it. Showing the raw value hands out a key that
 * silently produces wrong codes, which reads as "2FA is broken".
 *
 * Both the profile overlay and the public tenant-admin onboarding go through
 * here so the two cannot drift apart again.
 */
export const toBase32Secret = (rawSecret: string | null | undefined): string =>
    rawSecret ? encode(rawSecret).replace(/={1,8}$/, '') : '';
