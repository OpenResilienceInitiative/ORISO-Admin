import { describe, expect, it, vi } from 'vitest';
import { Form } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AskerPermissionsCard } from './index';

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'de' } }),
    Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

const renderCard = (
    props: Partial<React.ComponentProps<typeof AskerPermissionsCard>> = {},
    initialValues: Record<string, unknown> = {
        settings: { featureDisplayNameEditable: true, featureAskerEmailEnabled: true },
    },
) =>
    render(
        <Form initialValues={initialValues}>
            <AskerPermissionsCard restrictedFields={new Set()} {...props} />
        </Form>,
    );

/**
 * ORISO-Admin#602. Two settings, and the naming of the first one is the point:
 * a Träger admin reading "Nutzername" decides about the login name, which is a
 * different and immutable thing.
 */
describe('AskerPermissionsCard', () => {
    it('offers both switches', () => {
        renderCard();

        expect(screen.getByLabelText('tenants.permissions.asker.displayName.label')).toBeTruthy();
        expect(screen.getByLabelText('tenants.permissions.asker.email.label')).toBeTruthy();
    });

    it('never labels the display-name switch "Nutzername"', () => {
        const { container } = renderCard();

        expect(container.textContent).not.toMatch(/nutzername/i);
        expect(container.textContent).not.toMatch(/username/i);
        // It must not talk about the login name at all on the switch itself.
        expect(container.textContent).not.toMatch(/anmeldename/i);
    });

    it('reflects the stored values rather than defaulting to on', async () => {
        renderCard(
            {},
            {
                settings: { featureDisplayNameEditable: false, featureAskerEmailEnabled: true },
            },
        );

        expect(screen.getByLabelText('tenants.permissions.asker.displayName.label').getAttribute('aria-checked')).toBe(
            'false',
        );
        expect(screen.getByLabelText('tenants.permissions.asker.email.label').getAttribute('aria-checked')).toBe(
            'true',
        );
    });

    it('toggles a switch through the form and reports the change for persistence', async () => {
        /* The local form value alone proves nothing about saving: a wrong field
           path or a dropped callback would still flip the switch on screen and
           persist nothing. */
        const onToggleUpdate = vi.fn();
        renderCard({ onToggleUpdate });
        const user = userEvent.setup();

        const emailSwitch = screen.getByLabelText('tenants.permissions.asker.email.label');
        await user.click(emailSwitch);

        expect(emailSwitch.getAttribute('aria-checked')).toBe('false');
        expect(onToggleUpdate).toHaveBeenCalledWith(['settings', 'featureAskerEmailEnabled'], false, expect.anything());
    });

    it('says why the display-name switch is disabled too, not only the e-mail one', () => {
        /* This was missing: `featureDisplayNameEditable` was disabled when
           restricted but carried no explanation, so a Träger admin saw a dead
           control and no reason for it. */
        renderCard({ restrictedFields: new Set(['featureDisplayNameEditable']) });

        expect(screen.getByLabelText('tenants.permissions.asker.displayName.label').hasAttribute('disabled')).toBe(
            true,
        );
        expect(screen.getByText('tenants.permissions.asker.restrictedReason')).toBeTruthy();
    });

    it('offers the enforce checkboxes for both fields in enforce mode', () => {
        /* Without these two settings in the enforcement contract they would be the
           only permissions on the page an upper role could not lock for the roles
           below — a hole in the model rather than a deliberate exemption. */
        const onEnforceChange = vi.fn();
        renderCard({
            enforceMode: true,
            enforcedFields: new Set(['featureAskerEmailEnabled']),
            onEnforceChange,
        });

        expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });

    it('shows no enforce checkboxes outside enforce mode', () => {
        renderCard();

        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('disables rather than hides a field the platform has not permitted', () => {
        /* House rule: disable, never hide. A setting the platform withheld shows
           as a disabled switch with a reason, not as an absent one. */
        renderCard({ restrictedFields: new Set(['featureAskerEmailEnabled']) });

        /* M3Switch renders a real <button disabled>, so the native attribute is
           the assertion — `aria-disabled` would be the wrong thing to look for. */
        const emailSwitch = screen.getByLabelText('tenants.permissions.asker.email.label');
        expect(emailSwitch.hasAttribute('disabled')).toBe(true);
        expect(screen.getByLabelText('tenants.permissions.asker.displayName.label')).toBeTruthy();
    });

    it('says why a restricted switch is disabled instead of just greying it out', () => {
        /* A greyed-out control with no explanation reads as "you did something
           wrong". The reason names who actually holds the decision. */
        renderCard({ restrictedFields: new Set(['featureAskerEmailEnabled']) });

        expect(screen.getByText('tenants.permissions.asker.restrictedReason')).toBeTruthy();
    });

    it('shows no restriction note when nothing is restricted', () => {
        renderCard();

        expect(screen.queryByText('tenants.permissions.asker.restrictedReason')).toBeNull();
    });

    it('explains what each switch actually governs', () => {
        const { container } = renderCard();

        expect(container.textContent).toContain('tenants.permissions.asker.displayName.description');
        expect(container.textContent).toContain('tenants.permissions.asker.email.description');
    });
});
