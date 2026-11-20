import { describe, expect, it, vi } from 'vite-plus/test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountStep } from './AccountStep';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

const INVITE = { recipientEmail: 'admin@tenant.example', joinsExistingTenant: false };
const FIFTEEN = 'Abcdefghij1234!';

const renderStep = (props: Partial<React.ComponentProps<typeof AccountStep>> = {}) => {
    const onSubmit = vi.fn();
    render(<AccountStep invite={INVITE} busy={false} showRegistrationError={false} onSubmit={onSubmit} {...props} />);
    return onSubmit;
};

describe('AccountStep (#1273)', () => {
    it('shows one heading, the invited address once and the five rule chips', () => {
        renderStep({ existingAccountSetup: true });

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('accountSetup.title');
        expect(screen.getAllByText('admin@tenant.example')).toHaveLength(1);
        expect(screen.getByRole('list', { name: 'onboarding.password.ruleList' })).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(5);
    });

    it('keeps the length chip open at 15 characters and collapses it at 16', async () => {
        const user = userEvent.setup();
        renderStep();
        const password = screen.getByLabelText('tenantOnboarding.account.password');

        await user.type(password, FIFTEEN);
        expect(screen.getByLabelText('onboarding.password.rule.length: onboarding.password.open')).toBeInTheDocument();

        await user.type(password, '5');
        expect(screen.getByLabelText('onboarding.password.rule.length: onboarding.password.met')).toBeInTheDocument();
    });

    it('rejects 15 characters on submit and accepts 16', async () => {
        const user = userEvent.setup();
        const onSubmit = renderStep();

        await user.type(screen.getByLabelText('tenantOnboarding.account.password'), FIFTEEN);
        await user.type(screen.getByLabelText('tenantOnboarding.account.repeatPassword'), FIFTEEN);
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.account.register' }));
        expect(await screen.findByText('passwordReset.passwordInvalid')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();

        await user.type(screen.getByLabelText('tenantOnboarding.account.password'), '5');
        await user.type(screen.getByLabelText('tenantOnboarding.account.repeatPassword'), '5');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.account.register' }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(`${FIFTEEN}5`));
    });

    it('announces the flow position for a multi-step invite', () => {
        renderStep({
            flow: {
                steps: [
                    { label: 'a', state: 'done' },
                    { label: 'b', state: 'current' },
                    { label: 'c', state: 'upcoming' },
                ],
                eta: 'eta',
                summary: 'Schritt 2 von 3',
            },
        });

        expect(screen.getByRole('status', { name: 'Schritt 2 von 3' })).toBeInTheDocument();
    });
});
