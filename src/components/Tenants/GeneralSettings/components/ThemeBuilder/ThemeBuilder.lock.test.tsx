// @vitest-environment jsdom
/**
 * Theme page guard rails (THB-04): the too-pale warning never blocks
 * saving, a centrally locked colour renders disabled-not-hidden, and a
 * missing main colour blocks submission.
 *
 * Traces: UAT-F, UAT-G (Tests #15, #16 in THB — Test Logic).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeBuilder } from '.';

const mutateSpy = vi.fn();

// Mutable fixtures the mocked hooks serve per test.
const fixtures = {
    theming: {} as Record<string, string | null>,
    serverSettingsMeta: undefined as Record<string, { readOnly?: boolean }> | undefined,
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: { theming: fixtures.theming }, isLoading: false }),
}));

vi.mock('../../../../../hooks/usePublicTenantData.hook', () => ({
    usePublicTenantData: () => ({ data: undefined }),
}));

vi.mock('../../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: mutateSpy }),
}));

vi.mock('../../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { serverSettingsMeta: fixtures.serverSettingsMeta } }),
}));

const enterEditMode = (container: HTMLElement) => {
    const pencil = container.querySelector('button');
    fireEvent.click(pencil);
};

describe('too-pale warning (Test #15, UAT-F)', () => {
    it('shows the warning for a near-grey main colour and still allows saving', async () => {
        mutateSpy.mockClear();
        fixtures.theming = { primaryColor: '#7f7f7f' };
        fixtures.serverSettingsMeta = undefined;
        const { container } = render(<ThemeBuilder tenantId="1" />);
        expect(screen.getByText('theme.builder.tooPale')).toBeInTheDocument();
        enterEditMode(container);
        fireEvent.click(screen.getByText('card.edit.save'));
        await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
        expect(mutateSpy.mock.calls[0][0].theming.primaryColor).toBe('#7f7f7f');
    });

    it('shows no warning for a saturated main colour', () => {
        fixtures.theming = { primaryColor: '#a5000a' };
        fixtures.serverSettingsMeta = undefined;
        render(<ThemeBuilder tenantId="1" />);
        expect(screen.queryByText('theme.builder.tooPale')).not.toBeInTheDocument();
    });
});

describe('central lock (Test #16, UAT-G)', () => {
    it('renders a locked main colour disabled — visible, never hidden', () => {
        fixtures.theming = { primaryColor: '#a5000a' };
        fixtures.serverSettingsMeta = { 'theming.primaryColor': { readOnly: true } };
        const { container } = render(<ThemeBuilder tenantId="1" />);
        const indicators = container.querySelectorAll('button.colorIndicator');
        expect(indicators).toHaveLength(3);
        // Main colour locked…
        expect(indicators[0]).toBeDisabled();
        // …while the label and value stay visible.
        expect(screen.getByText('theme.builder.primaryColor')).toBeInTheDocument();
    });

    it('locks only the flagged colour, not the whole page', () => {
        fixtures.theming = { primaryColor: '#a5000a' };
        fixtures.serverSettingsMeta = { 'theming.accent': { readOnly: true } };
        const { container } = render(<ThemeBuilder tenantId="1" />);
        enterEditMode(container);
        const indicators = container.querySelectorAll('button.colorIndicator');
        expect(indicators[0]).not.toBeDisabled();
        expect(indicators[1]).toBeDisabled();
        expect(indicators[2]).not.toBeDisabled();
    });
});

describe('required main colour', () => {
    it('does not submit without a main colour', async () => {
        mutateSpy.mockClear();
        fixtures.theming = {};
        fixtures.serverSettingsMeta = undefined;
        const { container } = render(<ThemeBuilder tenantId="1" />);
        enterEditMode(container);
        fireEvent.click(screen.getByText('card.edit.save'));
        // antd validation rejects the submit; the mutation must not fire.
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
        expect(mutateSpy).not.toHaveBeenCalled();
    });
});
