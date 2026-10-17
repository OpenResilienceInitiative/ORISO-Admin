import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../../i18n';
import type { RecipientScopePolicy } from '../../../../../types/permissionPolicy';
import { RecipientScopeControl } from './RecipientScopeControl';

// Seam 2: what an admin sees and can do on the "Internal group chats" tile — the three options with
// their sentence, the Requirement/Recommendation switch (platform only), the locked Träger view,
// and a failed save that keeps the edit. Strings are asserted as literals (DE + EN).

afterEach(cleanup);

beforeAll(async () => {
    await i18n.changeLanguage('en');
});

type Level = 'platform' | 'tenant';

/** What TenantService#321 serves while nothing is set anywhere. */
const SERVED_DEFAULT: RecipientScopePolicy = { value: 'AGENCY', mode: 'SUGGESTED', inherited: true };

const setup = (
    props: { level?: Level; policy?: RecipientScopePolicy; disabled?: boolean; onSave?: () => Promise<unknown> } = {},
) => {
    const onSave = vi.fn(props.onSave ?? (() => Promise.resolve()));
    const user = userEvent.setup();
    const view = render(
        <RecipientScopeControl
            level={props.level ?? 'platform'}
            policy={'policy' in props ? props.policy : SERVED_DEFAULT}
            disabled={props.disabled}
            onSave={onSave}
        />,
    );
    return { user, onSave, ...view };
};

const radio = (name: RegExp) => screen.getByRole('radio', { name });

describe('options', () => {
    it('offers the three scopes, each with one plain sentence', () => {
        setup();
        const group = screen.getByRole('radiogroup', { name: 'Recipients for internal group chats' });
        expect(within(group).getAllByRole('radio')).toHaveLength(3);
        expect(radio(/Platform-wide/)).toHaveAccessibleDescription(
            'Counsellors can pick any colleague on the platform.',
        );
        expect(radio(/Träger-wide/)).toHaveAccessibleDescription(
            'Counsellors can pick colleagues of their own Träger, from all of its counselling centres.',
        );
        expect(radio(/Counselling centre only/)).toHaveAccessibleDescription(
            'Counsellors can only pick colleagues from their own counselling centre.',
        );
    });

    it('says in one line that subset rooms stay members-only', () => {
        setup();
        expect(screen.getByText(/always for their members only/)).toBeInTheDocument();
    });

    it('shows the served default (counselling centre only) and offers Save only after a change', () => {
        setup();
        expect(radio(/Counselling centre only/)).toBeChecked();
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('marks the value as inherited from the platform on a Träger, and as the default on the platform', () => {
        const { unmount } = setup({ level: 'tenant', policy: { value: 'TENANT', mode: 'SUGGESTED', inherited: true } });
        expect(screen.getByText('Inherited from the platform')).toBeInTheDocument();
        unmount();
        setup({ level: 'platform', policy: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true } });
        expect(screen.getByText('Default – not changed yet')).toBeInTheDocument();
    });

    it('does not claim inheritance for a value the Träger set itself', () => {
        setup({ level: 'tenant', policy: { value: 'PLATFORM', mode: 'SUGGESTED', inherited: false } });
        expect(screen.queryByText('Inherited from the platform')).not.toBeInTheDocument();
        expect(screen.getByText('Set by this Träger')).toBeInTheDocument();
    });
});

describe('backend without the field', () => {
    // TenantService#321 not deployed: a save would be ignored and the page would snap back, silently.
    it.each(['platform', 'tenant'] as const)(
        'is read-only with a note on the %s page, no Save, no inherited claim',
        (level) => {
            setup({ level, policy: undefined });
            screen.getAllByRole('radio').forEach((option) => expect(option).toBeDisabled());
            expect(radio(/Counselling centre only/)).toBeChecked();
            expect(screen.getByText('Available after the next backend update.')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Requirement' })).not.toBeInTheDocument();
            expect(screen.queryByText('Inherited from the platform')).not.toBeInTheDocument();
            expect(screen.queryByText(/The platform recommends this/)).not.toBeInTheDocument();
        },
    );

    it('says so in German', async () => {
        await i18n.changeLanguage('de');
        try {
            setup({ policy: undefined });
            expect(screen.getByText('Verfügbar nach dem nächsten Backend-Update.')).toBeInTheDocument();
        } finally {
            await i18n.changeLanguage('en');
        }
    });
});

describe('platform admin', () => {
    it('saves the picked scope with the recommendation mode by default', async () => {
        const { user, onSave } = setup();
        await user.click(radio(/Platform-wide/));
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalledWith({ value: 'PLATFORM', mode: 'SUGGESTED' });
    });

    it('can make the scope a requirement through the Requirement/Recommendation switch', async () => {
        const { user, onSave } = setup({ policy: { value: 'TENANT', mode: 'SUGGESTED', inherited: false } });
        const recommendation = screen.getByRole('button', { name: 'Recommendation' });
        const requirement = screen.getByRole('button', { name: 'Requirement' });
        expect(recommendation).toHaveAttribute('aria-pressed', 'true');
        await user.click(requirement);
        expect(requirement).toHaveAttribute('aria-pressed', 'true');
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalledWith({ value: 'TENANT', mode: 'ENFORCED' });
    });

    it('is never locked, even for a stored requirement', async () => {
        setup({ policy: { value: 'TENANT', mode: 'ENFORCED', inherited: true } });
        expect(radio(/Platform-wide/)).toBeEnabled();
    });
});

describe('Träger admin', () => {
    it('has no Requirement/Recommendation switch and saves as a recommendation', async () => {
        const { user, onSave } = setup({
            level: 'tenant',
            policy: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true },
        });
        expect(screen.queryByRole('button', { name: 'Requirement' })).not.toBeInTheDocument();
        await user.click(radio(/Träger-wide/));
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalledWith({ value: 'TENANT', mode: 'SUGGESTED' });
    });

    it('sees the choice locked when the platform made it a requirement', () => {
        setup({ level: 'tenant', policy: { value: 'TENANT', mode: 'ENFORCED', inherited: true } });
        expect(radio(/Träger-wide/)).toBeChecked();
        screen.getAllByRole('radio').forEach((option) => expect(option).toBeDisabled());
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
        expect(
            screen.getByText('The platform sets this as a requirement. You can see it here but not change it.'),
        ).toBeInTheDocument();
    });
});

describe('while internal group chats are switched off', () => {
    it('stays visible but disabled, and says why', () => {
        setup({ disabled: true });
        screen.getAllByRole('radio').forEach((option) => expect(option).toBeDisabled());
        expect(screen.getByRole('button', { name: 'Requirement' })).toBeDisabled();
        expect(screen.getByText('Available only while the card is activated.')).toBeInTheDocument();
    });
});

describe('saving', () => {
    it('keeps the edit and says so when the save fails, and allows another try', async () => {
        const onSave = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
        const user = userEvent.setup();
        render(<RecipientScopeControl level="platform" policy={SERVED_DEFAULT} onSave={onSave} />);

        await user.click(radio(/Platform-wide/));
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Not saved. The previous setting still applies; your choice stays here until you try again or reload the page.',
        );
        expect(radio(/Platform-wide/)).toBeChecked();
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

        await user.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
        expect(onSave).toHaveBeenCalledTimes(2);
    });

    it('follows the saved value once the server answers', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn().mockResolvedValue(undefined);
        const { rerender } = render(<RecipientScopeControl level="platform" policy={SERVED_DEFAULT} onSave={onSave} />);
        await user.click(radio(/Träger-wide/));
        rerender(
            <RecipientScopeControl
                level="platform"
                policy={{ value: 'TENANT', mode: 'SUGGESTED', inherited: false }}
                onSave={onSave}
            />,
        );
        expect(radio(/Träger-wide/)).toBeChecked();
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
});

describe('German', () => {
    it('shows the options and sentences in German', async () => {
        await i18n.changeLanguage('de');
        try {
            setup({ level: 'tenant', policy: { value: 'TENANT', mode: 'SUGGESTED', inherited: true } });
            expect(
                screen.getByRole('radiogroup', { name: 'Empfänger:innen für interne Gruppenchats' }),
            ).toBeInTheDocument();
            expect(radio(/Plattformweit/)).toHaveAccessibleDescription(
                'Berater:innen können alle Kolleg:innen der Plattform auswählen.',
            );
            expect(radio(/Trägerweit/)).toHaveAccessibleDescription(
                'Berater:innen können Kolleg:innen ihres eigenen Trägers aus allen Beratungsstellen auswählen.',
            );
            expect(radio(/Auf die Beratungsstelle begrenzt/)).toHaveAccessibleDescription(
                'Berater:innen können nur Kolleg:innen ihrer eigenen Beratungsstelle auswählen.',
            );
            expect(screen.getByText('Von der Plattform geerbt')).toBeInTheDocument();
        } finally {
            await i18n.changeLanguage('en');
        }
    });
});
