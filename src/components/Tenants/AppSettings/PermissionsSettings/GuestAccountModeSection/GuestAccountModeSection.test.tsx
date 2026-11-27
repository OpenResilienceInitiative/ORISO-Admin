import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { GUEST_ACCOUNT_MODE_FIELDS, GuestAccountModeSection, chosenGuestAccountMode } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));

const K = 'tenants.permissions.guestAccountModes';
const DIRECT = 'tenants.permissions.directInvite';
const F = (mode: 'Temporary' | 'GuestChooses' | 'Permanent', medium: 'Chat' | 'Audio' | 'Video') =>
    `featureGuestAccount${mode}${medium}Enabled`;

const renderSection = (props: Partial<React.ComponentProps<typeof GuestAccountModeSection>> = {}) =>
    render(<GuestAccountModeSection restrictedFields={new Set()} {...props} />);

const medium = (name: 'chat' | 'audio' | 'video') => screen.getByRole('group', { name: `${DIRECT}.${name}` });
const openMenu = async (name: 'chat' | 'audio' | 'video') =>
    userEvent.click(within(medium(name)).getByRole('button', { name: /tenants\.permissions\.policy\.openMenu/ }));

// Frank 2026-11-18 (#1560): per medium ONE guest account type, not three switches.
describe('GuestAccountModeSection', () => {
    it('keeps the nine TenantService fields, three types per medium', () => {
        expect(GUEST_ACCOUNT_MODE_FIELDS.flatMap((m) => m.modes.map((mode) => mode.field))).toEqual([
            F('Temporary', 'Chat'),
            F('GuestChooses', 'Chat'),
            F('Permanent', 'Chat'),
            F('Temporary', 'Audio'),
            F('GuestChooses', 'Audio'),
            F('Permanent', 'Audio'),
            F('Temporary', 'Video'),
            F('GuestChooses', 'Video'),
            F('Permanent', 'Video'),
        ]);
    });

    it('shows one choice per medium, never three switches', () => {
        renderSection({
            fallbackValues: {
                [F('Temporary', 'Chat')]: true,
                [F('GuestChooses', 'Chat')]: false,
                [F('Permanent', 'Chat')]: false,
            },
        });

        ['chat', 'audio', 'video'].forEach((name) => {
            expect(within(medium(name as 'chat')).queryAllByRole('button', { pressed: true })).toHaveLength(0);
        });
        expect(within(medium('chat')).getByText(`${K}.mode.temporary`)).toBeInTheDocument();
    });

    it('offers the three types, adjustable or required, in the menu', async () => {
        renderSection({ policyLevel: 'platform' });
        await openMenu('chat');

        const names = within(screen.getByRole('list'))
            .getAllByRole('button')
            .map((button) => button.getAttribute('aria-label') ?? button.textContent);
        expect(names).toHaveLength(6);
    });

    it('saves the chosen type on and the two others off, with one mode, as one change', async () => {
        const onPoliciesChange = vi.fn();
        const onPolicyChange = vi.fn();
        renderSection({ policyLevel: 'tenant', onPoliciesChange, onPolicyChange });
        await openMenu('audio');

        await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${K}.choice.permanent.ENFORCED`) }));

        // Code review: three separate saves could fail half-way and leave two types allowed.
        expect(onPoliciesChange).toHaveBeenCalledTimes(1);
        expect(onPoliciesChange).toHaveBeenCalledWith({
            [F('Temporary', 'Audio')]: { value: false, mode: 'ENFORCED' },
            [F('GuestChooses', 'Audio')]: { value: false, mode: 'ENFORCED' },
            [F('Permanent', 'Audio')]: { value: true, mode: 'ENFORCED' },
        });
        expect(onPolicyChange).not.toHaveBeenCalled();
    });

    it('lets the Träger choose among the types the platform did not forbid', async () => {
        renderSection({
            policyLevel: 'tenant',
            permissionPolicies: {
                [F('Permanent', 'Chat')]: { value: false, mode: 'ENFORCED', inherited: true },
            },
        });

        await openMenu('chat');

        expect(screen.queryByRole('button', { name: new RegExp(`^${K}.choice.permanent`) })).toBeNull();
        expect(screen.getByRole('button', { name: new RegExp(`^${K}.choice.temporary.SUGGESTED`) })).toBeEnabled();
    });

    it('says why a medium is locked by a restriction', () => {
        renderSection({ restrictedFields: new Set([F('Temporary', 'Video')]) });

        expect(within(medium('video')).getByText('tenants.permissions.asker.restrictedReason')).toBeInTheDocument();
    });

    it('locks the choice on the Träger page when the platform requires it', () => {
        renderSection({
            policyLevel: 'tenant',
            permissionPolicies: {
                [F('Temporary', 'Video')]: { value: true, mode: 'ENFORCED', inherited: true },
                [F('GuestChooses', 'Video')]: { value: false, mode: 'ENFORCED', inherited: true },
                [F('Permanent', 'Video')]: { value: false, mode: 'ENFORCED', inherited: true },
            },
        });

        expect(within(medium('video')).queryByRole('button', { name: /openMenu/ })).toBeNull();
        expect(within(medium('video')).getByRole('button', { name: new RegExp(`${K}.mode.temporary`) })).toBeDisabled();
    });

    it('says so when several types were allowed before', () => {
        renderSection({
            fallbackValues: {
                [F('Temporary', 'Chat')]: true,
                [F('GuestChooses', 'Chat')]: false,
                [F('Permanent', 'Chat')]: true,
            },
        });

        expect(within(medium('chat')).getByRole('status')).toHaveTextContent(`${K}.legacySeveral`);
    });

    it('reads the shipped default (all three allowed) as "guest chooses", without a note', () => {
        renderSection();

        expect(within(medium('chat')).getByText(`${K}.mode.guestChooses`)).toBeInTheDocument();
        expect(within(medium('chat')).queryByRole('status')).toBeNull();
    });
});

describe('chosenGuestAccountMode', () => {
    it('reads the one allowed type', () => {
        expect(chosenGuestAccountMode([false, false, true])).toBe('permanent');
    });

    it('reads "guest chooses" when several were allowed (the guest could pick before)', () => {
        expect(chosenGuestAccountMode([true, true, true])).toBe('guestChooses');
        expect(chosenGuestAccountMode([true, false, true])).toBe('temporary');
    });

    it('reads "permanent" when none is allowed, as the UserService falls back', () => {
        expect(chosenGuestAccountMode([false, false, false])).toBe('permanent');
    });
});
