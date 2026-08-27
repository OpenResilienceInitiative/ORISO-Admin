/**
 * `{{key}}` placeholder-token helpers shared by the placeholder-template module.
 *
 * The token syntax and the two pure helpers (`fillPlaceholders`,
 * `listPlaceholders`) are ported 1:1 from the ORISO e-mail design system —
 * ORISO-Frontend `src/emails/index.ts` (`fillEmailPlaceholders` /
 * `listEmailPlaceholders`) — so admin previews behave exactly like the mails
 * the UserService sends. A cross-repo import is impossible, hence the copy;
 * keep both in sync when the regex ever changes.
 */

export interface PlaceholderTokenDef {
    /** Inserted into the text as `{{key}}` (must match the backend's token names 1:1). */
    key: string;
    /** i18n key of the human-readable label shown in the picker. */
    labelKey: string;
    /** Fallback label for the repo's `t(key, fallback)` convention. */
    labelFallback: string;
    /** Sample value the live preview substitutes for this token. */
    sample: string;
}

/**
 * Substitutes `{{placeholders}}`. Unknown keys are left in place on purpose —
 * a visible `{{foo}}` in a preview is a bug report, a silent blank is not.
 * (Ported from ORISO-Frontend `fillEmailPlaceholders`.)
 */
export const fillPlaceholders = (source: string, values: Record<string, string>): string =>
    source.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => (key in values ? values[key] : whole));

/**
 * Every distinct `{{placeholder}}` a template still contains, whitespace-normalised.
 * (Ported from ORISO-Frontend `listEmailPlaceholders`.)
 */
export const listPlaceholders = (source: string): string[] =>
    Array.from(new Set((source.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).map((token) => token.replace(/\s+/g, ''))));

/** Inserts `{{key}}` at (or over) the given selection and reports the caret after the token. */
export const insertPlaceholder = (
    value: string,
    selectionStart: number,
    selectionEnd: number,
    key: string,
): { value: string; cursor: number } => {
    const token = `{{${key}}}`;
    return {
        value: value.slice(0, selectionStart) + token + value.slice(selectionEnd),
        cursor: selectionStart + token.length,
    };
};

/** key -> sample map for feeding a token set into {@link fillPlaceholders}. */
export const sampleValues = (tokens: PlaceholderTokenDef[]): Record<string, string> =>
    Object.fromEntries(tokens.map((token) => [token.key, token.sample]));

/**
 * Invite-mail tokens — MUST mirror the placeholder set the UserService
 * `AccountInviteService` substitutes when it sends the invite. Sample values
 * are synthetic (Storybook/preview only), never live data.
 *
 * `inviteLink` is deliberately absent. The branded mail layout renders the
 * action link itself — a CTA button plus a visible copy-paste line, in the HTML
 * part and in the text/plain alternative alike — so a body that also inlined
 * the token produced the same URL twice in the received mail. The author cannot
 * insert it here, and `AccountInviteService.renderBody` strips one left over in
 * an older stored body, so neither half of the pair can reintroduce it.
 */
export const INVITE_EMAIL_TOKENS: PlaceholderTokenDef[] = [
    {
        key: 'email',
        labelKey: 'placeholderTemplate.token.email',
        labelFallback: 'E-Mail-Adresse',
        sample: 'maren.muster@example.org',
    },
    { key: 'firstName', labelKey: 'placeholderTemplate.token.firstName', labelFallback: 'Vorname', sample: 'Maren' },
    { key: 'lastName', labelKey: 'placeholderTemplate.token.lastName', labelFallback: 'Nachname', sample: 'Muster' },
    { key: 'tenantId', labelKey: 'placeholderTemplate.token.tenantId', labelFallback: 'Träger-ID', sample: '4' },
];

/**
 * The invite-template kinds the UserService knows. Kept as a string union
 * (mirroring `api/accountInvites` `InviteEmailTemplateKind`) so this module
 * stays importable outside the Links page without an API dependency.
 */
export type InviteEmailTokenKind = 'TENANT_INVITE' | 'COUNSELLOR_INVITE' | 'DPA_FORWARD';

/**
 * Token set per template kind (#746). `AccountInviteService.render` substitutes
 * ONE shared placeholder map for every kind today, so all three entries point
 * at {@link INVITE_EMAIL_TOKENS} — this map is the seam where per-kind extras
 * (e.g. Admin#723's DPA-forward fields) land without touching any caller.
 */
export const INVITE_EMAIL_TOKENS_BY_KIND: Record<InviteEmailTokenKind, PlaceholderTokenDef[]> = {
    TENANT_INVITE: INVITE_EMAIL_TOKENS,
    COUNSELLOR_INVITE: INVITE_EMAIL_TOKENS,
    DPA_FORWARD: INVITE_EMAIL_TOKENS,
};

/** Tokens the editor offers for a template of the given kind. */
export const inviteEmailTokensForKind = (kind: InviteEmailTokenKind): PlaceholderTokenDef[] =>
    INVITE_EMAIL_TOKENS_BY_KIND[kind];

/**
 * Tokens of the registration consent sentence ("Ich habe die
 * Datenschutzerklärung … zur Kenntnis genommen"). Keys follow the wording the
 * legal texts already use, so a template reads naturally while editing.
 */
export const LEGAL_CONSENT_TOKENS: PlaceholderTokenDef[] = [
    {
        key: 'Beratungsstelle',
        labelKey: 'placeholderTemplate.token.beratungsstelle',
        labelFallback: 'Beratungsstelle',
        sample: 'Beratungsstelle Mainz-Neustadt',
    },
    { key: 'Thema', labelKey: 'placeholderTemplate.token.thema', labelFallback: 'Thema', sample: 'Suchtberatung' },
    {
        key: 'legal_links',
        labelKey: 'placeholderTemplate.token.legalLinks',
        labelFallback: 'Rechtstexte-Links',
        sample: 'Datenschutzerklärung und Nutzungsbedingungen',
    },
];
