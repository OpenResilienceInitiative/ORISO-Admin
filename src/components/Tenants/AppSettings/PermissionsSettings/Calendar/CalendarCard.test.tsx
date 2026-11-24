import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import i18n from '../../../../../i18n';
import type { CalendarPolicies } from '../../../../../types/permissionPolicy';
import { CalendarCard } from './CalendarCard';

// Seam 2: what an admin sees and can do on the "Calendar" tile (ADR-032) — the reach with three
// scopes, the username switch (off by default), the platform's Requirement/Adjustable choice, the
// locked Träger view, and a failed save that keeps the edit.

afterEach(cleanup);

beforeAll(async () => {
    await i18n.changeLanguage('en');
});

/** What TenantService#365 serves to a Träger while nothing is set anywhere. */
const SERVED_DEFAULT: CalendarPolicies = {
    visibilityScope: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true },
    showAskerUsernames: { value: false, mode: 'SUGGESTED', inherited: true },
};

const setup = (
    props: {
        level?: 'platform' | 'tenant';
        policies?: CalendarPolicies | null;
        onSave?: () => Promise<unknown>;
    } = {},
) => {
    const onSave = vi.fn(props.onSave ?? (() => Promise.resolve()));
    const user = userEvent.setup();
    render(
        <CalendarCard
            level={props.level ?? 'tenant'}
            policies={'policies' in props ? props.policies : SERVED_DEFAULT}
            onSave={onSave}
        />,
    );
    const reach = within(screen.getByTestId('calendar-visibility-scope-control'));
    const usernames = within(screen.getByTestId('calendar-asker-usernames-control'));
    return { user, onSave, reach, usernames };
};

describe('reach', () => {
    it('offers centre, Träger and platform with one sentence each, and the help text', () => {
        const { reach } = setup();
        const group = reach.getByRole('radiogroup', { name: "Reach of colleagues' calendars" });
        expect(within(group).getAllByRole('radio')).toHaveLength(3);
        expect(reach.getByRole('radio', { name: /Counselling centre/ })).toBeChecked();
        expect(reach.getByRole('radio', { name: /Provider/ })).toHaveAccessibleDescription(
            'Counsellors can show the calendars of colleagues from all counselling centres of their provider.',
        );
        expect(reach.getByText(/Colleagues only see “busy” and the type of appointment\./)).toBeInTheDocument();
    });

    it('saves only the reach', async () => {
        const { user, onSave, reach } = setup();
        await user.click(reach.getByRole('radio', { name: /Platform/ }));
        await user.click(reach.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalledWith({ visibilityScope: { value: 'PLATFORM', mode: 'SUGGESTED' } });
    });
});

describe('usernames', () => {
    it('is off by default and says it never shows more than the username', () => {
        const { usernames } = setup();
        expect(usernames.getByRole('switch', { name: "Show advice seekers' usernames" })).not.toBeChecked();
        expect(
            usernames.getByText('When on, colleagues also see the username. Never the topic, notes or content.'),
        ).toBeInTheDocument();
    });

    it('saves only the switch', async () => {
        const { user, onSave, usernames } = setup();
        await user.click(usernames.getByRole('switch'));
        await user.click(usernames.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalledWith({ showAskerUsernames: { value: true, mode: 'SUGGESTED' } });
    });

    it('lets the platform admin make it a requirement', async () => {
        const { user, onSave, usernames } = setup({ level: 'platform' });
        await user.click(usernames.getByRole('switch'));
        await user.click(usernames.getByRole('button', { name: 'Requirement' }));
        await user.click(usernames.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalledWith({ showAskerUsernames: { value: true, mode: 'ENFORCED' } });
    });
});

describe('platform requirement on a Träger', () => {
    it('locks both settings with the lock hint and offers no save', () => {
        const { reach, usernames } = setup({
            policies: {
                visibilityScope: { value: 'TENANT', mode: 'ENFORCED', inherited: true },
                showAskerUsernames: { value: true, mode: 'ENFORCED', inherited: true },
            },
        });
        reach.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        expect(reach.getByRole('radio', { name: /Provider/ })).toBeChecked();
        expect(usernames.getByRole('switch')).toBeDisabled();
        expect(usernames.getByRole('switch')).toBeChecked();
        expect(usernames.getByText(/The platform sets this as a requirement\./)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    it('locks only the enforced one', () => {
        const { reach, usernames } = setup({
            policies: {
                visibilityScope: { value: 'AGENCY', mode: 'SUGGESTED', inherited: true },
                showAskerUsernames: { value: false, mode: 'ENFORCED', inherited: true },
            },
        });
        expect(reach.getByRole('radio', { name: /Platform/ })).toBeEnabled();
        expect(usernames.getByRole('switch')).toBeDisabled();
    });
});

describe('save failure', () => {
    it('keeps the edit and offers Save again', async () => {
        const { user, usernames } = setup({ onSave: () => Promise.reject(new Error('400')) });
        await user.click(usernames.getByRole('switch'));
        await user.click(usernames.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(usernames.getByRole('button', { name: 'Save' })).toBeEnabled());
        expect(usernames.getByRole('switch')).toBeChecked();
    });
});

describe('backend without the block', () => {
    it('shows the defaults read-only with a note', () => {
        const { reach, usernames } = setup({ policies: undefined });
        reach.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
        expect(usernames.getByRole('switch')).toBeDisabled();
        expect(screen.getAllByText('This setting is not available yet.')).toHaveLength(2);
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });
});
