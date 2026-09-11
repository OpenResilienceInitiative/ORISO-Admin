/** Minimal shape of i18next's `t` — the dialog passes the real one. */
type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface ForwardMailPreviewInput {
    /** Raw content of the optional "name of the person" field. */
    recipientName: string;
    /** The minted sign link, or `null` while it is still being created. */
    signUrl: string | null;
}

export interface ForwardMailPreview {
    subject: string;
    body: string;
}

/**
 * Composes the DPA_FORWARD mail exactly as the recipient will read it.
 *
 * The preview is shown to a person, so it never renders an unresolved
 * `{{token}}`: an empty name field yields the neutral salutation instead of the
 * raw `{{recipientName}}`, and the link line says the link is still being
 * created rather than printing `{{link}}`. The salutation is therefore its own
 * i18n key — appending an empty name to the greeting would leave "Guten Tag ,"
 * behind, which is not an improvement over the token.
 */
export const buildForwardMailPreview = (
    t: Translate,
    { recipientName, signUrl }: ForwardMailPreviewInput,
): ForwardMailPreview => {
    const name = recipientName.trim();

    return {
        subject: t('dpaForward.mail.subject'),
        body: [
            name ? t('dpaForward.mail.salutation', { recipientName: name }) : t('dpaForward.mail.salutationNeutral'),
            t('dpaForward.mail.body', { link: signUrl ?? t('dpaForward.mail.linkPending') }),
        ].join('\n\n'),
    };
};
