// @vitest-environment jsdom
/**
 * ThemeBuilder — three seed inputs (accent dark/light + signal) and seed-only save.
 * Colour-picker half lifted from closed PR #125; iframe preview belongs to #907.
 * Also covers save-time rejection when the brand seed cannot yield a palette (#1256).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeBuilder, ThemeEditorModal } from './index';

const mutateSpy = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./MiniChatPreview', () => ({
    MiniChatPreview: () => <div data-testid="theme-preview" />,
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

const usableInitialValues = {
    theming: {
        primaryColor: '#a5000a',
        accent: '#ffe2de',
        signal: '#b1005e',
    },
};

const unusableInitialValues = {
    theming: {
        primaryColor: '#000000',
        accent: '#ffe2de',
        signal: '#b1005e',
    },
};

const locks = { accentDark: false, accentLight: false, signal: false };

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
            },
        });
    });
});

describe('ThemeEditorModal', () => {
    it('tells the admin at save time when the seed cannot yield a palette', async () => {
        const user = userEvent.setup({ delay: null });
        const onSubmit = vi.fn();

        render(
            <ThemeEditorModal
                open
                initialValues={unusableInitialValues}
                storedSeeds={{ accentDark: '#000000', accentLight: '#ffe2de', signal: '#b1005e' }}
                locks={locks}
                onCancel={() => undefined}
                onSubmit={onSubmit}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        // Field error + dialog Alert both use the same key.
        expect((await screen.findAllByText('theme.builder.seedUnusable')).length).toBeGreaterThan(0);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('saves a chromatic brand seed', async () => {
        const user = userEvent.setup({ delay: null });
        const onSubmit = vi.fn();

        render(
            <ThemeEditorModal
                open
                initialValues={usableInitialValues}
                storedSeeds={{ accentDark: '#a5000a', accentLight: '#ffe2de', signal: '#b1005e' }}
                locks={locks}
                onCancel={() => undefined}
                onSubmit={onSubmit}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });
        expect(screen.queryByText('theme.builder.seedUnusable')).not.toBeInTheDocument();
    });
});
