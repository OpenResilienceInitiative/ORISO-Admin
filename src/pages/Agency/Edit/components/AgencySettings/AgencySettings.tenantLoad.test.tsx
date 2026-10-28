import { Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgencySettings } from './index';

const mocks = vi.hoisted(() => ({ searchTenantData: vi.fn() }));

vi.mock('react-i18next', () => ({
    useTranslation: () => {
        const t = (key: string) => key;
        return Object.assign([t], { t });
    },
}));
vi.mock('../../../../../context/FeatureContext', () => ({ useFeatureContext: () => ({ isEnabled: () => false }) }));
vi.mock('../../../../../hooks/useReleasesToggle.hook', () => ({
    useReleasesToggle: () => ({ isEnabled: () => false }),
}));
vi.mock('../../../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: true }) }));
vi.mock('../../../../../hooks/useTenantTopics', () => ({ useTenantTopics: () => ({ data: [], isLoading: false }) }));
vi.mock('../../../../../api/tenant/searchTenantData', () => ({ searchTenantData: mocks.searchTenantData }));

const renderSettings = () =>
    render(
        <Form>
            <AgencySettings isEditMode={false} asFields />
        </Form>,
    );

describe('AgencySettings Träger list', () => {
    beforeEach(() => mocks.searchTenantData.mockReset());

    it('says so and offers a retry when the Träger list cannot be loaded, instead of an empty select', async () => {
        const user = userEvent.setup();
        mocks.searchTenantData.mockRejectedValueOnce(new Error('offline'));
        mocks.searchTenantData.mockResolvedValueOnce({ data: [{ id: 7, name: 'Caritas Augsburg' }] });
        renderSettings();

        expect(await screen.findByText('agency.edit.general.more_settings.tenant.loadError')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'agency.edit.general.more_settings.tenant.retry' }));

        await waitFor(() => expect(mocks.searchTenantData).toHaveBeenCalledTimes(2));
        await waitFor(() =>
            expect(screen.queryByText('agency.edit.general.more_settings.tenant.loadError')).not.toBeInTheDocument(),
        );
        // The successful answer reached the select, not just the error went away.
        await user.click(screen.getByRole('combobox', { name: /agency\.edit\.general\.more_settings\.tenant\.title/ }));
        expect(await screen.findByRole('option', { name: 'Caritas Augsburg' })).toBeInTheDocument();
    });
});
