// @vitest-environment jsdom
/**
 * Theme page (THB-04): live preview wired to the OrisoScheme engine and
 * seed-only persistence.
 *
 * Traces: UAT-C, UAT-A (Tests #14, #17 in THB — Test Logic).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { computeOrisoPalette } from '../../../../../utils/theme/orisoScheme';
import { ThemeBuilder } from '.';

const mutateSpy = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({
        data: {
            theming: {
                primaryColor: '#a5000a',
                secondaryColor: '#a5000a',
                accent: '#646d78',
                signal: '#b1005e',
            },
        },
        isLoading: false,
    }),
}));

vi.mock('../../../../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: undefined }),
}));

vi.mock('../../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: mutateSpy }),
}));

vi.mock('../../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { serverSettingsMeta: undefined } }),
}));

const enterEditMode = (container: HTMLElement) => {
    // The edit pencil is the first button in the card title, rendered
    // before the colour indicators of the form body.
    const pencil = container.querySelector('button');
    fireEvent.click(pencil);
};

describe('ThemeBuilder page (Tests #14, #17)', () => {
    it('shows one large app preview with a current/new comparison toggle', () => {
        render(<ThemeBuilder tenantId="1" />);
        expect(screen.getAllByTestId('app-preview')).toHaveLength(1);
        expect(screen.getByText('theme.builder.preview.current')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.preview.new')).toBeInTheDocument();
    });

    it('paints the preview from the engine and flips with the toggle', () => {
        const { tokens } = computeOrisoPalette({ primary: '#a5000a', accent: '#646d78', signal: '#b1005e' }, 'light');
        render(<ThemeBuilder tenantId="1" />);
        const preview = screen.getByTestId('app-preview');
        // default view: the draft ("Neu") — equals stored seeds before editing
        expect(preview.style.getPropertyValue('--m3-primary')).toBe(tokens['--m3-primary']);
        fireEvent.click(screen.getByText('theme.builder.preview.current'));
        expect(screen.getByTestId('app-preview').style.getPropertyValue('--m3-primary')).toBe(tokens['--m3-primary']);
    });

    it('offers the three seed inputs: main, accent, signal', () => {
        render(<ThemeBuilder tenantId="1" />);
        expect(screen.getByText('theme.builder.primaryColor')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.accentColor')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.signalColor')).toBeInTheDocument();
    });

    it('saves seeds only — no mirrored secondaryColor, no computed palette (Test #17)', async () => {
        mutateSpy.mockClear();
        const { container } = render(<ThemeBuilder tenantId="1" />);
        enterEditMode(container);
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
        const payload = mutateSpy.mock.calls[0][0];
        expect(payload).toEqual({
            theming: {
                primaryColor: '#a5000a',
                accent: '#646d78',
                signal: '#b1005e',
                secondaryColor: null,
            },
        });
    });
});
