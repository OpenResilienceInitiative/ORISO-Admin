import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { CaseSharingSection } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

const K = 'tenants.permissions.caseSharing';
const settings = <div data-testid="handover-settings">reasons</div>;

describe('CaseSharingSection', () => {
    it('offers exactly three options as one choice', () => {
        render(<CaseSharingSection value="none" handoverSettings={settings} />);

        const group = screen.getByRole('radiogroup', { name: `${K}.title` });
        expect(group).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(3);
        expect(screen.getByRole('radio', { name: new RegExp(`^${K}.option.caseHandover.label`) })).toBeInTheDocument();
        // #1417: the team option uses the one shared team-function name.
        expect(screen.getByRole('radio', { name: /^teamFunctions\.counselling\.name/ })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: new RegExp(`^${K}.option.none.label`) })).toBeChecked();
    });

    it('opens the handover settings only when case handover is chosen', () => {
        const { rerender } = render(<CaseSharingSection value="teamCounselling" handoverSettings={settings} />);
        expect(screen.queryByTestId('handover-settings')).not.toBeInTheDocument();

        rerender(<CaseSharingSection value="caseHandover" handoverSettings={settings} />);
        expect(screen.getByTestId('handover-settings')).toBeInTheDocument();
        expect(screen.getByRole('group', { name: `${K}.handoverSettings` })).toContainElement(
            screen.getByTestId('handover-settings'),
        );
    });

    it('reports the chosen option', async () => {
        const onChange = vi.fn();
        render(<CaseSharingSection value="none" onChange={onChange} handoverSettings={settings} />);

        await userEvent.click(screen.getByRole('radio', { name: new RegExp(`^${K}.option.caseHandover.label`) }));

        expect(onChange).toHaveBeenCalledWith('caseHandover');
    });

    it('selects nothing while the value is unknown', () => {
        render(<CaseSharingSection value={undefined} handoverSettings={settings} />);

        screen.getAllByRole('radio').forEach((radio) => expect(radio).not.toBeChecked());
        expect(screen.queryByTestId('handover-settings')).not.toBeInTheDocument();
    });

    it('locks the choice and says why when it is set elsewhere', () => {
        render(<CaseSharingSection value="caseHandover" disabledReason="set on the Träger" />);

        screen.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        expect(screen.getByText('set on the Träger')).toBeInTheDocument();
    });

    it('says when both are on today', () => {
        render(<CaseSharingSection value="teamCounselling" bothActive />);

        expect(screen.getByRole('status')).toHaveTextContent(`${K}.bothActive`);
    });
});
