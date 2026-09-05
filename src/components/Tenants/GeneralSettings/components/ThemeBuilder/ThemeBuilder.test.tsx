// @vitest-environment jsdom
/**
 * ThemeBuilder — three seed inputs (accent dark/light + signal) and seed-only save.
 * Colour-picker half lifted from closed PR #125; iframe preview belongs to #907.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeBuilder } from '.';

const mutateSpy = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../../hooks/useTenantAppearanceFormData', () => ({
    useTenantAppearanceFormData: () => ({
        data: {
            theming: {
                primaryColor: '#a5000a',
                secondaryColor: null,
                accent: '#ffe2de',
                signal: '#b1005e',
            },
        },
        isLoading: false,
        mutate: mutateSpy,
    }),
}));

vi.mock('../../../../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: undefined }),
}));

vi.mock('../../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { serverSettingsMeta: undefined } }),
}));

describe('ThemeBuilder', () => {
    it('offers the three seed inputs: main, accent, signal', async () => {
        render(<ThemeBuilder tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));

        const dialog = await waitFor(() => {
            const modal = document.querySelector('.ant-modal-content');
            expect(modal).toBeTruthy();
            return modal as HTMLElement;
        });

        expect(within(dialog).getByLabelText('theme.builder.accentDarkColor')).toBeInTheDocument();
        expect(within(dialog).getByLabelText('theme.builder.accentLightColor')).toBeInTheDocument();
        expect(within(dialog).getByLabelText('theme.builder.signalColor')).toBeInTheDocument();
        expect(within(dialog).queryByText('theme.builder.summary.alertLabel')).not.toBeInTheDocument();
    });

    it('saves seeds including signal', async () => {
        mutateSpy.mockClear();
        render(<ThemeBuilder tenantId="1" />);
        fireEvent.click(screen.getByRole('button', { name: 'edit' }));

        const dialog = await waitFor(() => {
            const modal = document.querySelector('.ant-modal-content');
            expect(modal).toBeTruthy();
            return modal as HTMLElement;
        });

        fireEvent.click(within(dialog).getByText('card.edit.save'));
        await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
        expect(mutateSpy.mock.calls[0][0]).toEqual({
            theming: {
                primaryColor: '#a5000a',
                accent: '#ffe2de',
                signal: '#b1005e',
                secondaryColor: null,
            },
        });
    });
});
