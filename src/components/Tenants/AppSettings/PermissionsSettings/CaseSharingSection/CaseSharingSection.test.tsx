import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { CaseSharingSection, type CaseSharingSectionProps } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
vi.mock('../../../../../resources/img/svg/permissions/case_handover.svg', () => ({ ReactComponent: () => null }));

const K = 'tenants.permissions.caseSharing';
const settings = <div data-testid="handover-settings">reasons</div>;

const renderSection = (props: Partial<CaseSharingSectionProps> = {}) =>
    render(
        <CaseSharingSection
            policy={{ value: 'none', mode: 'SUGGESTED' }}
            level="tenant"
            handoverSettings={settings}
            {...props}
        />,
    );

const option = (name: RegExp) => screen.getByRole('button', { name });
const handover = () => option(new RegExp(`^${K}\\.option\\.caseHandover\\.label`));
const team = () => option(/^teamFunctions\.counselling\.name/);
const none = () => option(new RegExp(`^${K}\\.option\\.none\\.label`));

// ORISO-Admin#1558, Frank 2026-11-18: one choice, cascading like every other setting.
describe('CaseSharingSection', () => {
    it('offers exactly three options as one choice, the chosen one pressed', () => {
        renderSection();

        const group = screen.getByRole('group', { name: `${K}.title` });
        expect(within(group).getAllByRole('button', { pressed: true })).toHaveLength(1);
        expect(none()).toHaveAttribute('aria-pressed', 'true');
        expect(handover()).toHaveAttribute('aria-pressed', 'false');
        // #1417: the team option uses the shared team-function name.
        expect(team()).toBeInTheDocument();
    });

    it('opens the handover settings only when case handover is chosen', () => {
        const { rerender } = renderSection({ policy: { value: 'teamCounselling', mode: 'SUGGESTED' } });
        expect(screen.queryByTestId('handover-settings')).not.toBeInTheDocument();

        rerender(
            <CaseSharingSection
                policy={{ value: 'caseHandover', mode: 'SUGGESTED' }}
                level="tenant"
                handoverSettings={settings}
            />,
        );
        expect(screen.getByRole('group', { name: `${K}.handoverSettings` })).toContainElement(
            screen.getByTestId('handover-settings'),
        );
    });

    it('reports the chosen option with the current mode', async () => {
        const onChange = vi.fn();
        renderSection({ policy: { value: 'none', mode: 'ENFORCED' }, onChange });

        await userEvent.click(handover());

        expect(onChange).toHaveBeenCalledWith({ value: 'caseHandover', mode: 'ENFORCED' });
    });

    it('lets the Träger make its choice a requirement for its centres', async () => {
        const onChange = vi.fn();
        renderSection({ policy: { value: 'caseHandover', mode: 'SUGGESTED' }, onChange });

        await userEvent.click(screen.getByRole('button', { name: /tenants\.permissions\.policy\.makeRequired/ }));

        expect(onChange).toHaveBeenCalledWith({ value: 'caseHandover', mode: 'ENFORCED' });
    });

    it('greys out the other options at a centre when the Träger requires one', () => {
        renderSection({ level: 'agency', policy: { value: 'caseHandover', mode: 'ENFORCED', inherited: true } });

        expect(team()).toBeDisabled();
        expect(none()).toBeDisabled();
        expect(handover()).toBeDisabled();
        expect(screen.getAllByText('tenants.permissions.policy.enforced').length).toBeGreaterThan(0);
        expect(screen.queryByRole('button', { name: /makeAdjustable|makeRequired/ })).toBeNull();
    });

    it('lets a centre choose while the Träger only suggests, without setting a requirement', async () => {
        const onChange = vi.fn();
        renderSection({
            level: 'agency',
            policy: { value: 'caseHandover', mode: 'SUGGESTED', inherited: true },
            onChange,
        });

        await userEvent.click(team());

        expect(onChange).toHaveBeenCalledWith({ value: 'teamCounselling', mode: 'SUGGESTED' });
        expect(screen.queryByRole('button', { name: /makeRequired/ })).toBeNull();
    });

    it('selects nothing while the value is unknown', () => {
        renderSection({ policy: undefined });

        expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
        expect(screen.queryByTestId('handover-settings')).not.toBeInTheDocument();
    });

    it('says when both are on today', () => {
        renderSection({ policy: { value: 'caseHandover', mode: 'SUGGESTED' }, bothActive: true });

        expect(screen.getByRole('status')).toHaveTextContent(`${K}.bothActive`);
    });
});
