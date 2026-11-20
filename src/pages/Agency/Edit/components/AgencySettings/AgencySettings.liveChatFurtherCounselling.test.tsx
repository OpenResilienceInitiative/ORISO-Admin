import React from 'react';
import { Form } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AgencySettings } from './index';

// ORISO-Frontend#2251: "Weitere Beratung im Live-Chat empfehlen" per counselling centre,
// off by default, only for Träger and platform admins.

const roles = vi.hoisted(() => ({ isSuperAdmin: false, isTenantScopedAdmin: false }));

vi.mock('react-i18next', () => ({
    useTranslation: () => {
        const t = (key: string) => key;
        return Object.assign([t], { t });
    },
}));

vi.mock('../../../../../context/FeatureContext', () => ({
    useFeatureContext: () => ({ isEnabled: () => false }),
}));

vi.mock('../../../../../hooks/useReleasesToggle.hook', () => ({
    useReleasesToggle: () => ({ isEnabled: () => false }),
}));

vi.mock('../../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => roles,
}));

vi.mock('../../../../../hooks/useTenantTopics', () => ({
    useTenantTopics: () => ({ data: [], isLoading: false }),
}));

vi.mock('../../../../../api/tenant/searchTenantData', () => ({
    searchTenantData: () => Promise.resolve({ data: [] }),
}));

const SWITCH_NAME = 'agency.form.settings.liveChatFurtherCounselling.title';

const FormValue = () => {
    const value = Form.useWatch(['settings', 'featureLiveChatFurtherCounsellingEnabled']);
    return <span data-testid="form-value">{String(value)}</span>;
};

const renderSettings = (initialValues: Record<string, unknown>, isEditMode = true) =>
    render(
        <Form initialValues={initialValues}>
            <AgencySettings isEditMode={isEditMode} asFields />
            <FormValue />
        </Form>,
    );

describe('AgencySettings live-chat further counselling switch', () => {
    beforeEach(() => {
        roles.isSuperAdmin = false;
        roles.isTenantScopedAdmin = false;
    });

    it('is hidden for a restricted counselling-centre admin', () => {
        renderSettings({ settings: { featureLiveChatFurtherCounsellingEnabled: true } });

        expect(screen.queryByRole('switch', { name: SWITCH_NAME })).not.toBeInTheDocument();
    });

    it('is off by default for a Träger admin when the centre never set it', () => {
        roles.isTenantScopedAdmin = true;
        renderSettings({ settings: {} });

        expect(screen.getByRole('switch', { name: SWITCH_NAME })).not.toBeChecked();
        expect(screen.getByText('agency.form.settings.liveChatFurtherCounselling.help')).toBeInTheDocument();
    });

    it('lets a Träger admin switch it on', async () => {
        roles.isTenantScopedAdmin = true;
        const user = userEvent.setup();
        renderSettings({ settings: { featureLiveChatFurtherCounsellingEnabled: false } });

        await user.click(screen.getByRole('switch', { name: SWITCH_NAME }));

        expect(screen.getByRole('switch', { name: SWITCH_NAME })).toBeChecked();
        expect(screen.getByTestId('form-value')).toHaveTextContent('true');
    });

    it('shows the stored value to a platform admin', () => {
        roles.isSuperAdmin = true;
        renderSettings({ settings: { featureLiveChatFurtherCounsellingEnabled: true } });

        expect(screen.getByRole('switch', { name: SWITCH_NAME })).toBeChecked();
    });

    it('is not offered while a centre is being created', () => {
        roles.isTenantScopedAdmin = true;
        renderSettings({}, false);

        expect(screen.queryByRole('switch', { name: SWITCH_NAME })).not.toBeInTheDocument();
    });
});
