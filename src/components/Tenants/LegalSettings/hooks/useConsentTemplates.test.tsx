import { renderHook } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import translationDe from '../../../../locales/de/translation.json';
import translationEn from '../../../../locales/en/translation.json';
import { useConsentTemplates } from './useConsentTemplates';

const createI18n = async (uiLanguage: 'de' | 'en') => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({
        lng: uiLanguage,
        fallbackLng: 'de',
        keySeparator: false,
        ns: ['translations'],
        defaultNS: 'translations',
        resources: {
            de: { translations: translationDe },
            en: { translations: translationEn },
        },
    });
    return i18n;
};

describe('useConsentTemplates', () => {
    it('inserts the content-language sentence, not the UI-locale sentence', async () => {
        const i18n = await createI18n('de');
        const wrapper = ({ children }: { children: ReactNode }) => (
            <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        );

        const { result } = renderHook(() => useConsentTemplates('en'), { wrapper });

        expect(result.current[0].name).toBe(translationDe['legal.consent.template.platform.name']);
        expect(result.current[0].values.text).toBe(translationEn['legal.consent.template.platform.text']);
        expect(result.current[0].values.text).not.toBe(translationDe['legal.consent.template.platform.text']);
    });
});
