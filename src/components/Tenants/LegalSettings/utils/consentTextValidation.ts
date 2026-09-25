import { listPlaceholders } from '../../../PlaceholderTemplate/placeholderTokens';

/**
 * The one token a consent sentence may not be published without (ADR-021
 * decision 2). A Träger text REPLACES the platform sentence, so nothing legally
 * guarantees the platform's mandatory disclosures survive except this technical
 * rule: without `{{legal_links}}` the help-seeker would tick a box with no way
 * to reach the documents being agreed to.
 */
export const MANDATORY_CONSENT_TOKEN = 'legal_links';

/** Whether a sentence carries the mandatory token (whitespace inside the braces is tolerated). */
export const hasMandatoryConsentToken = (text: string | undefined): boolean =>
    listPlaceholders(text ?? '').includes(`{{${MANDATORY_CONSENT_TOKEN}}}`);

/** Blank text, i.e. nothing authored at this level. */
export const isBlankConsentText = (text: string | undefined): boolean => !text || text.trim() === '';

/**
 * The languages whose authored consent sentence would be rejected on publish.
 *
 * The server validates this too (ADR-021 decision 2); mirroring it client-side
 * exists so the admin is told BEFORE the request instead of hitting a 400 with
 * a finished text on screen.
 */
export const consentPublicationBlockers = (consentByLanguage: Record<string, string> | undefined): string[] =>
    Object.entries(consentByLanguage ?? {})
        .filter(([, text]) => !hasMandatoryConsentToken(text))
        .map(([language]) => language)
        .sort();

/** Languages whose consent sentence is empty — the editor pre-fills the template, so this is a gap. */
export const blankConsentLanguages = (consentByLanguage: Record<string, string> | undefined): string[] =>
    Object.entries(consentByLanguage ?? {})
        .filter(([, text]) => isBlankConsentText(text))
        .map(([language]) => language)
        .sort();

/** Convenience predicate for the publish action. */
export const canPublishConsentText = (consentByLanguage: Record<string, string> | undefined): boolean =>
    consentPublicationBlockers(consentByLanguage).length === 0;
