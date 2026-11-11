/**
 * Träger subdomains are not technically finished (no DNS, certificate or ingress per Träger yet), so
 * the admin does not ask for or show them where a person would rely on them:
 *  - the Träger list (expanded row, phone card) hides the subdomain,
 *  - the Träger create form has no subdomain field (an internal one is derived from the name),
 *  - the onboarding wizard shows the field greyed out with a hint and derives the same internal name,
 *    because the backend still needs a subdomain to create the Träger.
 *
 * Set to `true` once subdomains work to bring all three places back. The edit page is not governed by
 * this switch; it keeps its read-only field.
 */
export const SUBDOMAINS_TECHNICALLY_FINISHED = false;
