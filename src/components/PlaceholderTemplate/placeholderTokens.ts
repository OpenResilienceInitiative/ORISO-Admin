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
 */
export const INVITE_EMAIL_TOKENS: PlaceholderTokenDef[] = [
    {
        key: 'inviteLink',
        labelKey: 'placeholderTemplate.token.inviteLink',
        labelFallback: 'Einladungslink',
        sample: 'https://beratung.example.org/einladung?token=1c9d',
    },
    {
        key: 'email',
        labelKey: 'placeholderTemplate.token.email',
        labelFallback: 'E-Mail-Adresse',
        sample: 'lisa.beispiel@example.org',
    },
    { key: 'firstName', labelKey: 'placeholderTemplate.token.firstName', labelFallback: 'Vorname', sample: 'Lisa' },
    { key: 'lastName', labelKey: 'placeholderTemplate.token.lastName', labelFallback: 'Nachname', sample: 'Beispiel' },
    { key: 'tenantId', labelKey: 'placeholderTemplate.token.tenantId', labelFallback: 'Träger-ID', sample: '4' },
];

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
