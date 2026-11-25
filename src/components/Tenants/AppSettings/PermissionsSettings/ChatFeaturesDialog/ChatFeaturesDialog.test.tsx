import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { ChatFeaturesDialog, type ChatFeature } from './index';
import type { EffectivePolicy } from '../permissionsSettingsUtils';

vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return { useTranslation: () => Object.assign([t, { language: 'de' }, true], { t, i18n: { language: 'de' } }) };
});

beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
});

const FEATURES: ChatFeature[] = [
    { labelKey: 'tenants.permissions.feature.videoCalls', field: 'video' },
    { labelKey: 'tenants.permissions.feature.threads', field: 'threads' },
    { labelKey: 'tenants.permissions.feature.mediaAiScan', field: 'scan' },
    { labelKey: 'tenants.permissions.feature.mediaUpload', field: 'upload', stored: false },
];

const ON: EffectivePolicy = { value: true, mode: 'SUGGESTED' };

const renderDialog = () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
        <ChatFeaturesDialog
            titleKey="title"
            descriptionKey="description"
            saveKey="save"
            cancelKey="cancel"
            icon={<span />}
            testId="features-dialog"
            features={FEATURES}
            level="tenant"
            policyOf={() => ON}
            pending={() => false}
            unavailableReason={(feature) => (feature.field === 'scan' ? 'not yet' : null)}
            onSave={onSave}
            onClose={onClose}
        />,
    );
    const dialog = () => screen.getByTestId('features-dialog');
    const switchOf = (field: string) =>
        within(dialog().querySelector<HTMLElement>(`[data-feature-policy="${field}"]`) as HTMLElement).getByRole(
            'button',
            { name: /tenants.permissions.policy.(activated|deactivated)/ },
        );
    return { onSave, onClose, dialog, switchOf };
};

/** The dialog behind "Konfigurieren" of supervision and Team-Chat (Frank, 2026-11-20). */
describe('ChatFeaturesDialog', () => {
    it('hands on only the changed features, together, on "Speichern"', async () => {
        const user = userEvent.setup();
        const { onSave, onClose, switchOf } = renderDialog();

        await user.click(switchOf('video'));
        await user.click(switchOf('threads'));
        await user.click(switchOf('threads'));
        expect(onSave).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'save' }));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith({ video: { value: false, mode: 'SUGGESTED', inherited: false } });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('saves nothing when nothing changed', async () => {
        const user = userEvent.setup();
        const { onSave, onClose } = renderDialog();

        await user.click(screen.getByRole('button', { name: 'save' }));

        expect(onSave).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('drops the drafts on "Abbrechen"', async () => {
        const user = userEvent.setup();
        const { onSave, onClose, switchOf } = renderDialog();

        await user.click(switchOf('video'));
        await user.click(screen.getByRole('button', { name: 'cancel' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(onSave).not.toHaveBeenCalled();
    });

    it('locks a feature that cannot be switched yet and says why', () => {
        const { switchOf, dialog } = renderDialog();

        expect(switchOf('scan')).toBeDisabled();
        expect(within(dialog()).getByText('not yet')).toBeVisible();
    });

    it('names a feature the server cannot store yet, without a switch', () => {
        const { dialog } = renderDialog();

        const planned = dialog().querySelector<HTMLElement>('[data-planned-feature="upload"]') as HTMLElement;
        expect(planned).not.toBeNull();
        expect(within(planned).getByText('tenants.permissions.feature.mediaUpload')).toBeVisible();
        expect(planned).toHaveTextContent('tenants.permissions.feature.planned');
        expect(planned).toHaveTextContent('tenants.permissions.feature.notStoredYet');
        expect(within(planned).queryByRole('button')).toBeNull();
        expect(dialog().querySelector('[data-feature-policy="upload"]')).toBeNull();
    });

    describe('confirmEnable (Team-Chat continues after acceptance, ORISO-Frontend#2491)', () => {
        const OFF: EffectivePolicy = { value: false, mode: 'SUGGESTED' };
        const renderConfirm = (policy: EffectivePolicy, confirm: (proceed: () => void) => void) => {
            const onSave = vi.fn();
            const props = {
                titleKey: 'title',
                descriptionKey: 'description',
                saveKey: 'save',
                cancelKey: 'cancel',
                icon: <span />,
                testId: 'features-dialog',
                features: [FEATURES[0]],
                level: 'tenant' as const,
                pending: () => false,
                confirmEnable: { video: confirm },
                onSave,
                onClose: vi.fn(),
            };
            const view = render(<ChatFeaturesDialog {...props} policyOf={() => policy} />);
            const rerender = (next: EffectivePolicy) =>
                view.rerender(<ChatFeaturesDialog {...props} policyOf={() => next} />);
            const lock = () =>
                within(
                    screen
                        .getByTestId('features-dialog')
                        .querySelector<HTMLElement>('[data-feature-policy="video"]') as HTMLElement,
                ).getByRole('button', { name: /tenants.permissions.policy.makeRequired/ });
            return { onSave, rerender, lock };
        };

        it('saves an enabling value that was confirmed', async () => {
            const user = userEvent.setup();
            const { onSave } = renderConfirm(OFF, (proceed) => proceed());

            await user.click(screen.getByRole('button', { name: /tenants.permissions.policy.deactivated/ }));
            await user.click(screen.getByRole('button', { name: 'save' }));

            expect(onSave).toHaveBeenCalledWith({ video: { value: true, mode: 'SUGGESTED', inherited: false } });
        });

        it('does not save an unconfirmed "on" after the policy turned off while the dialog was open', async () => {
            const user = userEvent.setup();
            const confirm = vi.fn();
            const { onSave, rerender, lock } = renderConfirm(ON, confirm);

            // A mode change while it is on needs no confirmation; it keeps the value on in the draft.
            await user.click(lock());
            rerender(OFF);
            await user.click(screen.getByRole('button', { name: 'save' }));

            expect(confirm).not.toHaveBeenCalled();
            expect(onSave).not.toHaveBeenCalled();
        });

        it('still saves the same mode change while the policy stays on', async () => {
            const user = userEvent.setup();
            const { onSave, lock } = renderConfirm(ON, vi.fn());

            await user.click(lock());
            await user.click(screen.getByRole('button', { name: 'save' }));

            expect(onSave).toHaveBeenCalledWith({ video: { value: true, mode: 'ENFORCED', inherited: false } });
        });
    });
});
