import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

vi.mock('../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate: vi.fn() }),
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
    it('renders the Team-Besprechung toggle bound to featureTeamDiscussionEnabled', () => {
        render(<OtherFunctionsSettings tenantId="1" />);

        expect(screen.getByText('tenants.appSettings.otherFunctions.teamDiscussion.title')).toBeInTheDocument();
        expect(screen.getByText('tenants.appSettings.otherFunctions.teamDiscussion.description')).toBeInTheDocument();
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
});
