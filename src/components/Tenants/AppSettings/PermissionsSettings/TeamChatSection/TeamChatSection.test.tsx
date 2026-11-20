import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { TeamChatSection } from './index';
import type { EffectivePolicy } from '../permissionsSettingsUtils';

vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return { useTranslation: () => Object.assign([t, { language: 'de' }, true], { t, i18n: { language: 'de' } }) };
});

beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

const VIDEO = 'featureVideoCallsTeamDiscussionsEnabled';
const ON: EffectivePolicy = { value: true, mode: 'SUGGESTED' };

/**
 * Once TenantService stores a Team-Chat feature (it is then marked `stored`), the dialog switches it and
 * "Speichern" hands the change on like the supervision dialog (Frank, 2026-11-20).
 */
describe('TeamChatSection with a stored feature', () => {
    it('opens, changes, saves the change, and a second opening starts from the saved values', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <TeamChatSection
                level="tenant"
                settings={{ source: 'own', values: { featureTeamDiscussionEnabled: true }, onChange: vi.fn() }}
                policyOf={() => ON}
                pending={() => false}
                onChange={onChange}
                features={[{ labelKey: 'tenants.permissions.feature.videoCalls', field: VIDEO }]}
            />,
        );
        const dialog = () => screen.queryByTestId('team-chat-dialog');
        const videoSwitch = () =>
            within(dialog()?.querySelector<HTMLElement>(`[data-feature-policy="${VIDEO}"]`) as HTMLElement).getByRole(
                'button',
                { name: /tenants.permissions.policy.(activated|deactivated)/ },
            );

        await user.click(screen.getByRole('button', { name: 'tenants.permissions.teamChat.configure' }));
        await user.click(videoSwitch());
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.teamChat.save' }));

        expect(onChange).toHaveBeenCalledWith({ [VIDEO]: { value: false, mode: 'SUGGESTED', inherited: false } });
        await waitFor(() => expect(dialog()).toBeNull());

        await user.click(screen.getByRole('button', { name: 'tenants.permissions.teamChat.configure' }));
        expect(videoSwitch()).toHaveAccessibleName(/: tenants.permissions.policy.activated/);
        await user.click(videoSwitch());
        await user.click(screen.getByRole('button', { name: 'tenants.permissions.teamChat.cancel' }));
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});
