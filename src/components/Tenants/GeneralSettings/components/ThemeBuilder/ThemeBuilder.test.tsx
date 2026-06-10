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
import { MiniChatPreview } from './MiniChatPreview';
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

describe('MiniChatPreview recomputes from the engine (Test #14)', () => {
    it('paints the mock with the engine palette for the given seeds', () => {
        const { tokens } = computeOrisoPalette({ primary: '#a5000a' }, 'light');
        render(<MiniChatPreview seeds={{ primary: '#a5000a' }} labelKey="theme.builder.preview.new" />);
        const preview = screen.getByTestId('mini-chat-preview');
        expect(preview.style.getPropertyValue('--m3-primary')).toBe(tokens['--m3-primary']);
        expect(preview.style.getPropertyValue('--m3-surface')).toBe(tokens['--m3-surface']);
    });

    it('repaints when the seed changes (live recompute on drag)', () => {
        const { rerender } = render(
            <MiniChatPreview seeds={{ primary: '#a5000a' }} labelKey="theme.builder.preview.new" />,
        );
        const next = computeOrisoPalette({ primary: '#0061ff' }, 'light');
        rerender(<MiniChatPreview seeds={{ primary: '#0061ff' }} labelKey="theme.builder.preview.new" />);
        const preview = screen.getByTestId('mini-chat-preview');
        expect(preview.style.getPropertyValue('--m3-primary')).toBe(next.tokens['--m3-primary']);
    });

    it('renders a placeholder instead of crashing without a primary seed', () => {
        render(<MiniChatPreview seeds={{}} labelKey="theme.builder.preview.new" />);
        expect(screen.queryByTestId('mini-chat-preview')).not.toBeInTheDocument();
    });
});

describe('ThemeBuilder page (Tests #14, #17)', () => {
    it('shows the side-by-side previews: current vs new', () => {
        render(<ThemeBuilder tenantId="1" />);
        expect(screen.getAllByTestId('mini-chat-preview')).toHaveLength(2);
        expect(screen.getByText('theme.builder.preview.current')).toBeInTheDocument();
        expect(screen.getByText('theme.builder.preview.new')).toBeInTheDocument();
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
