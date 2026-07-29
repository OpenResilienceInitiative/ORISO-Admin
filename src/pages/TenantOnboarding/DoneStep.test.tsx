import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DoneStep } from './DoneStep';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: () => mocks.navigate };
});

const renderDone = (tenantId = 21) =>
    render(
        <MemoryRouter>
            <DoneStep tenantId={tenantId} />
        </MemoryRouter>,
    );

/**
 * #594.7 — the last screen of the onboarding is a success, not an error page.
 */
describe('DoneStep', () => {
    it('confirms the success with a status icon, not with bare body text', () => {
        renderDone();

        expect(screen.getByTestId('onboarding-done')).toBeInTheDocument();
        expect(screen.getByTestId('onboarding-done-success-icon')).toBeInTheDocument();
    });

    it('shows the assigned tenant ID as a labelled detail instead of inline in the prose', () => {
        renderDone(2);

        const detail = screen.getByTestId('onboarding-done-tenant-id');
        expect(detail).toHaveTextContent('tenantOnboarding.done.tenantIdLabel');
        expect(detail).toHaveTextContent('2');

        // The lead sentence must no longer carry the raw ID (it used to read
        // "Ihre Organisation (Tenant-ID 2) wurde angelegt …").
        expect(screen.getByTestId('onboarding-done-description')).not.toHaveTextContent('2');
    });

    it('spells out both next steps separately instead of one run-on sentence', () => {
        renderDone();

        const steps = screen.getAllByTestId('onboarding-done-next-step');
        expect(steps).toHaveLength(2);
        expect(steps[0]).toHaveTextContent('tenantOnboarding.done.next.activation');
        expect(steps[1]).toHaveTextContent('tenantOnboarding.done.next.login');
    });

    it('makes the single primary action a real M3 button that goes to the login', async () => {
        const user = userEvent.setup();
        renderDone();

        const action = screen.getByRole('button', { name: 'tenantOnboarding.done.toLogin' });
        // Not the bare `.forgotPW` text link the screen used to ship with.
        expect(screen.queryByRole('link', { name: 'tenantOnboarding.done.toLogin' })).not.toBeInTheDocument();

        await user.click(action);
        expect(mocks.navigate).toHaveBeenCalledWith('/admin/login');
    });
});
