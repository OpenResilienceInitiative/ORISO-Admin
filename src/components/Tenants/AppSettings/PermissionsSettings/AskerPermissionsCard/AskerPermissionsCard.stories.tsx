import type { Meta, StoryObj } from '@storybook/react';
import { Form } from 'antd';
import { AskerPermissionsCard } from './index';

/**
 * **ORISO-Admin#602** — the first card under Einstellungen/Berechtigungen.
 *
 * These two settings govern the advice seeker's **own account**, which is why they come before the
 * per-chat-type feature cards rather than sitting among them.
 *
 * Two things to check in every story:
 *
 * - **The word "Nutzername" appears nowhere.** Switch 1 governs the *Anzeigename*
 *   (`displayName`). The *Anmeldename* (`userName`) is a different, immutable thing, and an admin
 *   who reads "Nutzername" would believe they are deciding about the login credential. A test
 *   asserts the word is absent.
 * - **Disable, never hide.** A setting the platform has not permitted renders as a *disabled*
 *   switch, so a Träger admin can see the choice exists and who holds it.
 */
const meta = {
    title: 'Tenants/Permissions/AskerPermissionsCard',
    component: AskerPermissionsCard,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    decorators: [
        (Story, context) => (
            <Form initialValues={{ settings: context.parameters.settings }}>
                <div style={{ maxWidth: 480 }}>
                    <Story />
                </div>
            </Form>
        ),
    ],
    args: { restrictedFields: new Set<string>() },
} satisfies Meta<typeof AskerPermissionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both permissions granted — the default for every tenant, since both settings are opt-out. */
export const BothEnabled: Story = {
    parameters: { settings: { featureDisplayNameEditable: true, featureAskerEmailEnabled: true } },
};

/**
 * **The U25 configuration.** Free name entry off and no e-mail invitation. Note what the e-mail
 * description then has to say: without an address there is no way back into a forgotten account,
 * which makes credential saving the only remaining safeguard rather than a nice-to-have.
 */
export const U25Configuration: Story = {
    parameters: { settings: { featureDisplayNameEditable: false, featureAskerEmailEnabled: false } },
};

/** Free name entry withheld, e-mail still offered. */
export const DisplayNameLocked: Story = {
    parameters: { settings: { featureDisplayNameEditable: false, featureAskerEmailEnabled: true } },
};

/**
 * **Restricted by the platform.** The e-mail switch is disabled rather than absent — the house
 * rule is *disable, never hide*, so the Träger admin can see that the decision exists and that
 * somebody above them holds it.
 */
export const RestrictedByPlatform: Story = {
    args: { restrictedFields: new Set(['featureAskerEmailEnabled']) },
    parameters: { settings: { featureDisplayNameEditable: true, featureAskerEmailEnabled: true } },
};
