import { describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-i18next', () => {
    // react-i18next returns a hybrid: an array [t, i18n, ready] that also carries
    // t/i18n as properties, so both `const { t } =` and `const [t] =` work.
    const t = (key: string) => key;
    const i18n = { language: 'en' };
    const result: any = [t, i18n, true];
    result.t = t;
    result.i18n = i18n;
    result.ready = true;
    return { useTranslation: () => result };
});

vi.mock('../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: { settings: {} }, isLoading: false }),
}));

const mutate = vi.fn();
vi.mock('../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate }),
}));

// ORISO-TenantService#363: the effective value comes from the Träger's permission policies.
const policies: Record<string, { value: boolean; mode: 'SUGGESTED' | 'ENFORCED'; inherited?: boolean }> = {
    featureSupervisionEnabled: { value: false, mode: 'SUGGESTED', inherited: true },
};
const savePolicies = vi.fn(async (next: unknown) => next);
vi.mock('../../../../hooks/useTenantPermissionPolicies', () => ({
    useTenantPermissionPolicies: () => ({ data: { tenantId: 1, policies }, isLoading: false }),
    useTenantPermissionPoliciesMutation: () => ({ mutateAsync: savePolicies }),
}));

vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: false } }),
}));

import { OtherFunctionsSettings } from './index';

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('OtherFunctionsSettings', () => {
    it('renders the Team-Chat toggle bound to featureTeamDiscussionEnabled', () => {
        render(<OtherFunctionsSettings tenantId="1" />);

        expect(screen.getByRole('switch', { name: 'teamFunctions.chat.name' })).toBeInTheDocument();
        expect(screen.getByText('teamFunctions.chat.description')).toBeInTheDocument();
    });

    /**
     * ORISO-Admin#988 / Frank 2026-09-16: supervision is a feature inside conversation types, not a
     * conversation type of its own. Its master and seven feature toggles used to be wired to the
     * "groupInternal" chat-type card (Functionality access) — they now live here, next to "Allow
     * group chat".
     */
    it('renders the Supervision block with its master and all seven feature toggles', () => {
        render(<OtherFunctionsSettings tenantId="1" />);

        expect(screen.getByText('tenants.appSettings.otherFunctions.supervision.title')).toBeInTheDocument();
        expect(screen.getByText('tenants.appSettings.otherFunctions.supervision.description')).toBeInTheDocument();

        [
            'tenants.permissions.feature.videoCalls',
            'tenants.permissions.feature.audioCalls',
            'tenants.permissions.feature.voiceMessages',
            'tenants.permissions.feature.threads',
            'tenants.permissions.feature.mediaUpload',
            'tenants.permissions.feature.mediaInlineDisplay',
            'tenants.permissions.feature.mediaAiScan',
        ].forEach((labelKey) => expect(screen.getByText(labelKey)).toBeInTheDocument());
    });

    it('places the "Allow group chat" switch next to the Supervision block', () => {
        render(<OtherFunctionsSettings tenantId="1" />);

        const groupChatLabel = screen.getByText('tenants.appSettings.otherFunctions.groupChat.title');
        const supervisionLabel = screen.getByText('tenants.appSettings.otherFunctions.supervision.title');
        const comparison = groupChatLabel.compareDocumentPosition(supervisionLabel);
        // DOCUMENT_POSITION_FOLLOWING (4): supervision comes right after the group chat switch.
        // eslint-disable-next-line no-bitwise
        const supervisionFollowsGroupChat = comparison & Node.DOCUMENT_POSITION_FOLLOWING;
        expect(supervisionFollowsGroupChat).toBeTruthy();
    });

    // OBP 2.1 #107: a supervisor reads along, so switching supervision on for the Träger reminds
    // the admin that it must be named in the privacy policy.
    it('asks about the privacy policy before supervision is switched on', async () => {
        const user = userEvent.setup();
        render(<OtherFunctionsSettings tenantId="1" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const master = screen.getByRole('switch', { name: 'tenants.appSettings.otherFunctions.supervision.title' });
        await user.click(master);

        expect(await screen.findByText('supervision.privacyConfirm.title')).toBeInTheDocument();
        expect(master).not.toBeChecked();
    });

    // Single writer: a supervision switch saved here becomes the Träger's own policy, never a raw setting.
    it('saves a feature switch as an own permission policy, not as a raw setting', async () => {
        policies.featureSupervisionEnabled = { value: true, mode: 'SUGGESTED', inherited: true };
        const user = userEvent.setup();
        render(<OtherFunctionsSettings tenantId="1" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const master = screen.getByRole('switch', { name: 'tenants.appSettings.otherFunctions.supervision.title' });
        expect(master).toBeChecked();
        await user.click(master);
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await vi.waitFor(() => expect(mutate).toHaveBeenCalled());
        expect(savePolicies).toHaveBeenCalledWith({
            tenantId: 1,
            policies: { featureSupervisionEnabled: { value: false, mode: 'SUGGESTED', inherited: false } },
        });
        expect(mutate.mock.calls[0][0].settings).not.toHaveProperty('featureSupervisionEnabled');
        policies.featureSupervisionEnabled = { value: false, mode: 'SUGGESTED', inherited: true };
    });

    it('writes the settings only after the policy save succeeded, and reopens on failure', async () => {
        policies.featureSupervisionEnabled = { value: true, mode: 'SUGGESTED', inherited: true };
        mutate.mockClear();
        let reject: (error: Error) => void = () => undefined;
        savePolicies.mockImplementationOnce(
            () =>
                new Promise((_resolve, rejectPromise) => {
                    reject = rejectPromise;
                }),
        );
        const user = userEvent.setup();
        render(<OtherFunctionsSettings tenantId="1" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: 'tenants.appSettings.otherFunctions.supervision.title' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        await vi.waitFor(() => expect(savePolicies).toHaveBeenCalled());
        expect(mutate).not.toHaveBeenCalled();

        reject(new Error('rejected'));
        expect(await screen.findByRole('button', { name: 'card.edit.save' })).toBeInTheDocument();
        expect(mutate).not.toHaveBeenCalled();
        policies.featureSupervisionEnabled = { value: false, mode: 'SUGGESTED', inherited: true };
    });
});
