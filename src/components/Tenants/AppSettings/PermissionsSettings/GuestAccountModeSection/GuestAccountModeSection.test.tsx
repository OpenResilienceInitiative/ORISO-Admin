import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { GUEST_ACCOUNT_MODE_FIELDS, GuestAccountModeSection } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

const P = 'tenants.permissions.policy';
const MODE = 'tenants.permissions.guestAccountModes.mode';
const DIRECT = 'tenants.permissions.directInvite';

const renderSection = (props: Partial<React.ComponentProps<typeof GuestAccountModeSection>> = {}) =>
    render(<GuestAccountModeSection restrictedFields={new Set()} {...props} />);

const medium = (name: 'chat' | 'audio' | 'video') => screen.getByRole('group', { name: `${DIRECT}.${name}` });
const roundButton = (group: HTMLElement, mode: string, state: 'activated' | 'deactivated') =>
    within(group).getByRole('button', {
        name: `${MODE}.${mode}: ${P}.${state} – ${P}.${state === 'activated' ? 'deactivate' : 'activate'}`,
    });

describe('GuestAccountModeSection', () => {
    it('names the nine TenantService fields, three modes per chat type', () => {
        expect(GUEST_ACCOUNT_MODE_FIELDS.flatMap((m) => m.modes.map((mode) => mode.field))).toEqual([
            'featureGuestAccountTemporaryChatEnabled',
            'featureGuestAccountGuestChoosesChatEnabled',
            'featureGuestAccountPermanentChatEnabled',
            'featureGuestAccountTemporaryAudioEnabled',
            'featureGuestAccountGuestChoosesAudioEnabled',
            'featureGuestAccountPermanentAudioEnabled',
            'featureGuestAccountTemporaryVideoEnabled',
            'featureGuestAccountGuestChoosesVideoEnabled',
            'featureGuestAccountPermanentVideoEnabled',
        ]);
    });

    it('offers every mode per chat type by default', () => {
        renderSection();

        (['chat', 'audio', 'video'] as const).forEach((name) => {
            const group = medium(name);
            ['temporary', 'guestChooses', 'permanent'].forEach((mode) =>
                expect(roundButton(group, mode, 'activated')).toBeTruthy(),
            );
        });
        expect(screen.queryByText('tenants.permissions.guestAccountModes.noneAllowed')).toBeNull();
    });

    it('lets a Träger switch one mode off for one chat type only', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderSection({ policyLevel: 'tenant', onPolicyChange });

        await user.click(roundButton(medium('video'), 'permanent', 'activated'));

        expect(onPolicyChange).toHaveBeenCalledTimes(1);
        expect(onPolicyChange).toHaveBeenCalledWith('featureGuestAccountPermanentVideoEnabled', {
            value: false,
            mode: 'SUGGESTED',
        });
    });

    it('locks a mode on the Träger page that the platform enforces', () => {
        renderSection({
            policyLevel: 'tenant',
            permissionPolicies: {
                featureGuestAccountTemporaryChatEnabled: { value: false, mode: 'ENFORCED', inherited: true },
            },
        });

        expect(
            within(medium('chat')).getByRole('button', { name: `${MODE}.temporary: ${P}.deactivated` }),
        ).toHaveProperty('disabled', true);
        expect(roundButton(medium('audio'), 'temporary', 'activated')).toBeTruthy();
    });

    it('lets the platform force a mode off for every Träger', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderSection({
            policyLevel: 'platform',
            permissionPolicies: { featureGuestAccountPermanentChatEnabled: { value: false, mode: 'SUGGESTED' } },
            onPolicyChange,
        });

        await user.click(
            within(medium('chat')).getByRole('button', {
                name: `${MODE}.permanent: ${P}.suggestion – ${P}.makeRequired`,
            }),
        );
        expect(onPolicyChange).toHaveBeenCalledWith('featureGuestAccountPermanentChatEnabled', {
            value: false,
            mode: 'ENFORCED',
        });
    });

    it('says guests get a permanent account when a chat type allows no mode at all', () => {
        renderSection({
            policyLevel: 'tenant',
            fallbackValues: {
                featureGuestAccountTemporaryAudioEnabled: false,
                featureGuestAccountGuestChoosesAudioEnabled: false,
                featureGuestAccountPermanentAudioEnabled: false,
            },
        });

        expect(within(medium('audio')).getByText('tenants.permissions.guestAccountModes.noneAllowed')).toBeTruthy();
        expect(within(medium('chat')).queryByText('tenants.permissions.guestAccountModes.noneAllowed')).toBeNull();
    });
});
