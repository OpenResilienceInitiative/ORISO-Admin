// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../../i18n';
import { SUPPORTED_LANGUAGES } from '../../../../../utils/language';
import { ClosingAnimation } from './index';

// Real i18n on purpose: the card test answers every key with itself and cannot see a missing translation.
vi.mock('../../../../../hooks/useTenantAppearanceFormData', () => ({
    useTenantAppearanceFormData: () => ({
        data: { id: 1, name: 'Tenant one', theming: { primaryColor: '#a5000a' } },
        isLoading: false,
        isError: false,
        mutate: vi.fn(),
    }),
}));
vi.mock('../../../../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: { id: 1, theming: { closingAnimationDesktop: 'SLIDE_REVEAL' } } }),
}));
vi.mock('../../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { serverSettingsMeta: undefined } }),
}));

afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('en');
});

describe('closing animation card wording', () => {
    it.each([...SUPPORTED_LANGUAGES])('renders readable text in %s, never a raw translation key', async (language) => {
        await i18n.changeLanguage(language);
        const { container } = render(<ClosingAnimation tenantId="1" />);
        expect(container.innerHTML).not.toContain('settings.closingAnimation');
        expect(screen.getAllByRole('radiogroup')).toHaveLength(2);
        screen.getAllByRole('radio').forEach((radio) => {
            expect(radio).toHaveAccessibleName();
            expect(radio).toHaveAccessibleDescription();
        });
    });

    it('names the platform design in the platform-default option, in words', async () => {
        await i18n.changeLanguage('en');
        render(<ClosingAnimation tenantId="1" />);
        const desktop = screen.getByRole('radiogroup', { name: /desktop/i });
        expect(within(desktop).getByRole('radio', { name: 'Platform default' })).toHaveAccessibleDescription(
            /Slide reveal/,
        );
    });
});
