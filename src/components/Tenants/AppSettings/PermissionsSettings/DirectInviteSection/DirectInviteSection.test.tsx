import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DirectInviteSection } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

const CHAT = 'featureDirectInviteChatEnabled';
const AUDIO = 'featureDirectInviteAudioEnabled';
const VIDEO = 'featureDirectInviteVideoEnabled';

const renderCard = (props: Partial<React.ComponentProps<typeof DirectInviteSection>> = {}) =>
    render(<DirectInviteSection restrictedFields={new Set()} {...props} />);

const row = (field: string) => document.querySelector(`[data-feature-policy="${field}"]`) as HTMLElement;
const P = 'tenants.permissions.policy';
const LABEL = 'tenants.permissions.directInvite';
// A locked row has a disabled round button whose name carries only the state, no action.
const readOnlyButton = (labelKey: string) =>
    screen.queryByRole('button', { name: new RegExp(`^${LABEL}\\.${labelKey}: ${P}\\.(activated|deactivated)$`) });
const roundButton = (labelKey: string, state: 'activated' | 'deactivated') =>
    screen.getByRole('button', {
        name: `${LABEL}.${labelKey}: ${P}.${state} – ${P}.${state === 'activated' ? 'deactivate' : 'activate'}`,
    });
const lockButton = (labelKey: string, mode: 'suggestion' | 'enforced') =>
    screen.getByRole('button', {
        name: `${LABEL}.${labelKey}: ${P}.${mode} – ${P}.${mode === 'suggestion' ? 'makeRequired' : 'makeAdjustable'}`,
    });

describe('DirectInviteSection', () => {
    it('renders one policy control per chat type, all allowed by default', () => {
        renderCard();

        [CHAT, AUDIO, VIDEO].forEach((field) => expect(row(field)).toBeTruthy());
        expect(screen.getAllByText('tenants.permissions.policy.suggestion')).toHaveLength(3);
        expect(screen.getByText('tenants.permissions.directInvite.callsNote')).toBeTruthy();
    });

    it('offers force-allow and force-deny on the platform level', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        const { unmount } = renderCard({ policyLevel: 'platform', onPolicyChange });

        // Allowed by default: the lock turns that into a force-allow.
        await user.click(lockButton('video', 'suggestion'));
        expect(onPolicyChange).toHaveBeenLastCalledWith(VIDEO, { value: true, mode: 'ENFORCED' });
        unmount();

        // Switched off first: the lock turns that into a force-deny.
        renderCard({
            policyLevel: 'platform',
            permissionPolicies: { [VIDEO]: { value: false, mode: 'SUGGESTED' } },
            onPolicyChange,
        });
        await user.click(lockButton('video', 'suggestion'));
        expect(onPolicyChange).toHaveBeenLastCalledWith(VIDEO, { value: false, mode: 'ENFORCED' });
    });

    it('locks a row on the Träger page when the platform forces it', () => {
        renderCard({
            policyLevel: 'tenant',
            permissionPolicies: { [VIDEO]: { value: false, mode: 'ENFORCED', inherited: true } },
        });

        expect(readOnlyButton('video')).toBeTruthy();
        expect(readOnlyButton('chat')).toBeNull();
    });

    it('lets a Träger switch one chat type off for itself', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderCard({ policyLevel: 'tenant', onPolicyChange });

        await user.click(roundButton('audio', 'activated'));
        expect(onPolicyChange).toHaveBeenCalledTimes(1);
        expect(onPolicyChange).toHaveBeenCalledWith(AUDIO, { value: false, mode: 'SUGGESTED' });
    });

    it('locks a Beratungsstelle row the Träger switched off, with the reason', () => {
        renderCard({
            policyLevel: 'agency',
            fallbackValues: { [CHAT]: true },
            traegerPolicies: { [CHAT]: { value: false, mode: 'SUGGESTED' } },
        });

        expect(readOnlyButton('chat')).toBeTruthy();
        expect(screen.getByText('tenants.permissions.directInvite.offOnTraeger')).toBeTruthy();
    });

    it('lets an unset Beratungsstelle value follow the Träger', () => {
        renderCard({
            policyLevel: 'agency',
            fallbackValues: {},
            traegerPolicies: { [AUDIO]: { value: true, mode: 'SUGGESTED' } },
        });

        expect(row(AUDIO).querySelector('[data-testid="CheckIcon"]')).toBeTruthy();
        expect(readOnlyButton('audio')).toBeNull();
    });

    it('keeps the Beratungsstelle own "off" where the Träger allows it', () => {
        renderCard({
            policyLevel: 'agency',
            fallbackValues: { [CHAT]: false },
            traegerPolicies: { [CHAT]: { value: true, mode: 'SUGGESTED' } },
        });

        expect(row(CHAT).querySelector('[data-testid="BlockIcon"]')).toBeTruthy();
        expect(readOnlyButton('chat')).toBeNull();
    });

    it('limits a Beratungsstelle to switching: no lock, only suggestions are written', async () => {
        const user = userEvent.setup();
        const onPolicyChange = vi.fn();
        renderCard({ policyLevel: 'agency', onPolicyChange });

        expect(screen.queryByRole('button', { name: /makeRequired|makeAdjustable/ })).toBeNull();
        await user.click(roundButton('chat', 'activated'));
        expect(onPolicyChange).toHaveBeenCalledWith(CHAT, { value: false, mode: 'SUGGESTED' });
    });

    it('locks a Beratungsstelle row the Träger enforces on, so it cannot be restricted', () => {
        renderCard({
            policyLevel: 'agency',
            fallbackValues: { [VIDEO]: false },
            traegerPolicies: { [VIDEO]: { value: true, mode: 'ENFORCED' } },
        });

        expect(readOnlyButton('video')).toBeTruthy();
        expect(row(VIDEO).querySelector('[data-testid="CheckIcon"]')).toBeTruthy();
        expect(screen.getByText('tenants.permissions.directInvite.enforcedOnTraeger')).toBeTruthy();
    });

    it('shows no Beratungsstelle rows while the Träger policies are loading', () => {
        renderCard({ policyLevel: 'agency', traegerPoliciesStatus: 'pending' });

        expect(screen.getByTestId('direct-invite-traeger-loading')).toBeTruthy();
        [CHAT, AUDIO, VIDEO].forEach((field) => expect(row(field)).toBeNull());
    });

    it('says the Träger setting could not be loaded instead of editable defaults', () => {
        renderCard({ policyLevel: 'agency', traegerPoliciesStatus: 'error' });

        expect(screen.getByRole('status').textContent).toBe('tenants.permissions.directInvite.traegerUnavailable');
        [CHAT, AUDIO, VIDEO].forEach((field) => expect(row(field)).toBeNull());
    });

    it('ignores the Träger status outside the Beratungsstelle page', () => {
        renderCard({ policyLevel: 'tenant', traegerPoliciesStatus: 'error' });

        [CHAT, AUDIO, VIDEO].forEach((field) => expect(row(field)).toBeTruthy());
    });
});
