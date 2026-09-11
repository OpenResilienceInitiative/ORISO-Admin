import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { LegalConsentTemplateValues, PlaceholderTemplateDefinition } from '../../../PlaceholderTemplate';

/** The wording the platform ships; a level that picks it starts from that text. */
export const PLATFORM_CONSENT_TEMPLATE_ID = 'platform';

/**
 * The consent-sentence templates on offer, in the one place that defines them.
 *
 * Two surfaces show the same chooser — the department card's editor function bar
 * and the consent module's own header (ADR-021 decision 4) — and a template list
 * that differed between them would let the same pick produce two sentences.
 */
export const useConsentTemplates = (
    contentLanguage?: string,
): PlaceholderTemplateDefinition<LegalConsentTemplateValues>[] => {
    const { t } = useTranslation();

    return useMemo(
        () => [
            {
                id: PLATFORM_CONSENT_TEMPLATE_ID,
                // The chooser label stays in the admin UI language. The sentence
                // that lands in the editor must follow the legal-content language
                // (owner review #864 / #874) — not the locale the admin is using.
                name: t('legal.consent.template.platform.name'),
                values: {
                    text: t(
                        'legal.consent.template.platform.text',
                        contentLanguage ? { lng: contentLanguage } : undefined,
                    ),
                } as LegalConsentTemplateValues,
            },
        ],
        [t, contentLanguage],
    );
};
