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
    useSingleTenantData: () => ({
        data: { settings: { featureTopicsEnabled: false, featureStatisticsEnabled: true } },
        isLoading: false,
    }),
}));

const mutate = vi.fn();
vi.mock('../../../../hooks/useTenantAdminDataMutation.hook', () => ({
    useTenantAdminDataMutation: () => ({ mutate }),
}));

const appConfig = { multitenancyWithSingleDomainEnabled: false };
vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: appConfig }),
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

const TOPICS = 'tenants.appSettings.otherFunctions.allowTopicCreation.title';
const STATISTICS = 'tenants.appSettings.otherFunctions.statistics.title';

/**
 * The tile of the Träger tab "Weitere" (ORISO-Admin#1577, Frank 2026-11-19): topics and counsellor
 * statistics only. Calls, group chats, Team-Chat and supervision moved to Funktionszugriff.
 */
describe('OtherFunctionsSettings ("Weitere")', () => {
    it('holds topics and statistics in one folding section, each with what it does', async () => {
        const user = userEvent.setup();
        render(<OtherFunctionsSettings tenantId="1" />);

        const section = screen.getByRole('group', { name: 'tileHelp.otherFunctions.general.title' });
        expect(section).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: TOPICS })).not.toBeChecked();
        expect(screen.getByRole('switch', { name: STATISTICS })).toBeChecked();
        expect(screen.getByText('tenants.appSettings.otherFunctions.allowTopicCreation.description')).toBeVisible();
        expect(screen.getByText('tenants.appSettings.otherFunctions.statistics.description')).toBeVisible();

        await user.click(screen.getByRole('button', { name: 'tileHelp.otherFunctions.general.title' }));
        expect(screen.getByText('tenants.appSettings.otherFunctions.statistics.description')).not.toBeVisible();
    });

    it('offers nothing that moved to Funktionszugriff', () => {
        render(<OtherFunctionsSettings tenantId="1" />);

        expect(screen.getAllByRole('switch')).toHaveLength(2);
        [
            'teamFunctions.chat.name',
            'tenants.appSettings.otherFunctions.supervision.title',
            'tenants.appSettings.otherFunctions.groupChat.title',
            'tenants.appSettings.communications.video.title',
        ].forEach((label) => expect(screen.queryByText(label)).toBeNull());
    });

    it('hides the statistics switch when the level does not offer it', () => {
        render(<OtherFunctionsSettings tenantId="1" hideStatistics />);

        expect(screen.getByRole('switch', { name: TOPICS })).toBeInTheDocument();
        expect(screen.queryByRole('switch', { name: STATISTICS })).toBeNull();
    });

    it('saves both as plain Träger settings, without any permission-policy write', async () => {
        const user = userEvent.setup();
        render(<OtherFunctionsSettings tenantId="1" />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: TOPICS }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await vi.waitFor(() => expect(mutate).toHaveBeenCalled());
        expect(mutate.mock.calls.at(-1)?.[0]).toMatchObject({
            settings: { featureTopicsEnabled: true, featureStatisticsEnabled: true },
        });
    });
});
