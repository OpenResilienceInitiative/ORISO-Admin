// @vitest-environment jsdom
/**
 * Theme page (THB-04): live preview wired to the OrisoScheme engine and
 * seed-only persistence.
 *
 * Traces: UAT-C, UAT-A (Tests #14, #17 in THB — Test Logic).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
    it('opens the sandboxed app preview with the draft seeds (Test #14)', () => {
        render(<ThemeBuilder tenantId="1" />);
        fireEvent.click(screen.getByText('theme.builder.preview.open'));
        const frame = screen.getByTitle('theme.builder.preview.frameTitle') as HTMLIFrameElement;
        // the form's draft seeds travel into the REAL app's preview mode —
        // engine parity is guaranteed because the app itself computes the
        // palette through the same engine (THB-05 preview mode).
        expect(frame.src).toContain('themePreviewPrimary=a5000a');
        expect(frame.src).toContain('themePreviewAccent=646d78');
        expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
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
