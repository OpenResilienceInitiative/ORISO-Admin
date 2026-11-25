import type { InspectionContext } from './appliedTokenInspection';

/**
 * Frozen manifest of the applied-token reference matrix (ORISO-Admin#1229).
 *
 * It lists WHICH references run in WHICH contexts and which observations each must
 * report. It holds no colour or size values: expected values always come from
 * computeOrisoPalette / buildAdminAntdTheme and applied values from the browser.
 * Scope: red and blue branding, the existing light and inverted schemes, German and English.
 */
type Branding = { key: 'Red' | 'Blue'; primaryColor: string };
const brandings: Branding[] = [
    { key: 'Red', primaryColor: '#A5000A' },
    { key: 'Blue', primaryColor: '#1D4ED8' },
];
const schemes = [
    { key: 'Light', scheme: 'light' },
    { key: 'Inverted', scheme: 'inverted' },
] as const;
const languages = [
    { key: 'German', locale: 'de' },
    { key: 'English', locale: 'en' },
] as const;

export interface TokenReferenceCase {
    reference: 'field' | 'bridge';
    storyName: string;
    context: InspectionContext;
    /**
     * Bridge only. `mismatch` is the pre-existing product scheme: in the inverted scheme the
     * dark algorithm derives the primary button colour from the raw seed, not from --m3-primary.
     * The inspector must report it, never relabel it as a match. Null for the field reference.
     */
    expectedPrimaryButton: 'match' | 'mismatch' | null;
}

const BASELINE_MISMATCH_CONTEXTS = new Set(['#A5000A|inverted', '#1D4ED8|inverted']);

const expectedPrimaryButton = (
    reference: TokenReferenceCase['reference'],
    primaryColor: string,
    scheme: InspectionContext['scheme'],
): TokenReferenceCase['expectedPrimaryButton'] => {
    if (reference === 'field') return null;
    return BASELINE_MISMATCH_CONTEXTS.has(`${primaryColor}|${scheme}`) ? 'mismatch' : 'match';
};

export const tokenReferenceContexts: readonly Readonly<InspectionContext>[] = Object.freeze(
    brandings.flatMap(({ primaryColor }) =>
        schemes.flatMap(({ scheme }) =>
            languages.map(({ locale }) => Object.freeze({ primaryColor, scheme, locale }) as InspectionContext),
        ),
    ),
);

export const tokenReferenceCases: readonly Readonly<TokenReferenceCase>[] = Object.freeze(
    (['field', 'bridge'] as const).flatMap((reference) =>
        brandings.flatMap(({ key: brand, primaryColor }) =>
            schemes.flatMap(({ key: schemeKey, scheme }) =>
                languages.map(({ key: language, locale }) =>
                    Object.freeze({
                        reference,
                        storyName: `${reference === 'bridge' ? 'ThemeBridge' : ''}${brand}${schemeKey}${language}`,
                        context: Object.freeze({ primaryColor, scheme, locale }) as InspectionContext,
                        expectedPrimaryButton: expectedPrimaryButton(reference, primaryColor, scheme),
                    }),
                ),
            ),
        ),
    ),
);

/** Exact observation ids each reference must report; a silently dropped row is a failure. */
export const tokenReferenceObservationIds = Object.freeze({
    field: Object.freeze([
        'palette:--admin-field-surface',
        'palette:--admin-field-outline',
        'palette:--admin-field-surface-hover',
        'palette:--admin-field-selected-surface',
        'palette:--admin-field-selected-text',
        'component:field-input:background-color',
        'component:field-input:font-size',
        'component:field-input:font-family',
        'component:field-input:border-radius',
        'component:field-input:height',
        'component:field-workspace:gap',
    ]),
    bridge: Object.freeze(['palette:--m3-primary', 'component:bridge-primary-button:background-color']),
});
