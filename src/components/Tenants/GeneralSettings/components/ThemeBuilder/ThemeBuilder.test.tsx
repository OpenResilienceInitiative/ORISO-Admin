// @vitest-environment oriso-jsdom
/**
 * ThemeBuilder — three seed inputs (accent dark/light + signal) and seed-only save.
 * Colour-picker half lifted from closed PR #125; iframe preview belongs to #907.
 * Also covers save-time rejection when the brand seed cannot yield a palette (#1256).
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
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

describe('ThemeBuilder colour summary (#1374)', () => {
    it('shows the hex code and a contrast badge for every colour, main colour included', () => {
        const { container } = render(<ThemeBuilder tenantId="1" />);

        expect(screen.getByText('#A5000A')).toBeInTheDocument();
        expect(screen.getByText('#FFE2DE')).toBeInTheDocument();
        expect(screen.getByText('#B1005E')).toBeInTheDocument();
        expect(container.querySelectorAll('[data-contrast-level]')).toHaveLength(3);
        // All three seeds reach 4.5 : 1 against the text drawn on them.
        expect(screen.queryByText('theme.contrast.notice')).not.toBeInTheDocument();
    });
});

describe('ThemeBuilder colour purposes (#1374)', () => {
    it('names each colour and says in one line what it is used for', () => {
        render(<ThemeBuilder tenantId="1" />);

        ['accentDark', 'accentLight', 'signal'].forEach((role) => {
            expect(screen.getByText(`theme.builder.purpose.${role}`)).toBeInTheDocument();
        });
        expect(screen.getByText('theme.builder.signalColor')).toBeInTheDocument();
    });
});

describe('ThemeEditorModal presets (#1374)', () => {
    const renderEditor = (props: Partial<React.ComponentProps<typeof ThemeEditorModal>> = {}) =>
        render(
            <ThemeEditorModal
                open
                initialValues={usableInitialValues}
                storedSeeds={{ accentDark: '#a5000a', accentLight: '#ffe2de', signal: '#b1005e' }}
                locks={locks}
                onCancel={() => undefined}
                onSubmit={() => undefined}
                {...props}
            />,
        );

    it('starts on Caritas-Rot without a warning for the shipped colours', () => {
        renderEditor();

        expect(screen.getByRole('radio', { name: 'theme.builder.presets.caritasRed' })).toBeChecked();
        expect(screen.queryByText('theme.builder.signalTooClose')).not.toBeInTheDocument();
        ['accentDark', 'accentLight', 'signal'].forEach((role) => {
            expect(screen.getByText(`theme.builder.purpose.${role}`)).toBeInTheDocument();
        });
    });

    it('sets only the dark accent when a preset is tapped', async () => {
        const user = userEvent.setup({ delay: null });
        const onSubmit = vi.fn();
        renderEditor({ onSubmit });

        await user.click(screen.getByRole('radio', { name: 'theme.builder.presets.blue' }));
        expect(screen.getByText('HEX #00639B')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit.mock.calls[0][0]).toEqual({
            theming: { primaryColor: '#00639b', accent: '#ffe2de', signal: '#b1005e' },
        });
    });

    it('clears the unusable-colour error when a preset replaces the own colour', async () => {
        const user = userEvent.setup({ delay: null });
        const onSubmit = vi.fn();
        renderEditor({
            onSubmit,
            initialValues: unusableInitialValues,
            storedSeeds: { accentDark: '#000000', accentLight: '#ffe2de', signal: '#b1005e' },
        });

        expect(screen.getByTestId('preset-status')).toHaveTextContent('theme.builder.presets.custom · #000000');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        expect((await screen.findAllByText('theme.builder.seedUnusable')).length).toBeGreaterThan(0);

        await user.click(screen.getByRole('radio', { name: 'theme.builder.presets.orange' }));
        await waitFor(() => expect(screen.queryByText('theme.builder.seedUnusable')).not.toBeInTheDocument());

        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit.mock.calls[0][0].theming.primaryColor).toBe('#c25e00');
    });

    it('locks the presets together with the dark accent', () => {
        renderEditor({ locks: { accentDark: true, accentLight: false, signal: false } });

        screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    });
});

describe('ThemeEditorModal', () => {
    it('shows a contrast badge next to each colour field and a notice for a weak colour', () => {
        render(
            <ThemeEditorModal
                open
                initialValues={{ theming: { primaryColor: '#a5000a', accent: '#ffe2de', signal: '#808080' } }}
                storedSeeds={{ accentDark: '#a5000a', accentLight: '#ffe2de', signal: '#808080' }}
                locks={locks}
                onCancel={() => undefined}
                onSubmit={() => undefined}
            />,
        );

        const dialog = screen.getByRole('dialog');
        const levels = [...dialog.querySelectorAll('.colorSelector [data-contrast-level]')].map((badge) =>
            badge.getAttribute('data-contrast-level'),
        );
        expect(levels).toEqual(['AAA', 'AAA', 'fail']);
        expect(within(dialog).getByRole('status')).toHaveTextContent('theme.contrast.notice');
    });

    it('opens without deprecated lifecycle warnings', () => {
        const error = vi.spyOn(console, 'error');
        try {
            render(
                <ThemeEditorModal
                    open
                    initialValues={usableInitialValues}
                    storedSeeds={{ accentDark: '#a5000a', accentLight: '#ffe2de', signal: '#b1005e' }}
                    locks={locks}
                    onCancel={() => undefined}
                    onSubmit={() => undefined}
                />,
            );
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(error).not.toHaveBeenCalled();
        } finally {
            error.mockRestore();
        }
    });
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
