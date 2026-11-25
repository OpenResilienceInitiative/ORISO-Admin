import React from 'react';
import { Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { CardEditable } from '../../../../../components/CardEditable';
import { AgencySettings } from './index';

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
    useUserRoles: () => ({ isSuperAdmin: false }),
}));

vi.mock('../../../../../hooks/useTenantTopics', () => ({
    useTenantTopics: () => ({ data: [], isLoading: false }),
}));

const FormValue = ({ name }: { name: string }) => {
    const value = Form.useWatch(name);
    return <span data-testid={`form-${name}`}>{String(value)}</span>;
};

const renderSettings = (initialValues: Record<string, unknown>, isEditMode = true) =>
    render(
        <Form initialValues={initialValues}>
            <AgencySettings isEditMode={isEditMode} asFields />
            <FormValue name="teamAgency" />
        </Form>,
    );

// ORISO-Frontend#2494 (Frank, 2026-11-24): Teamberatung is chosen in Funktionszugriff only.
describe('AgencySettings without the Teamberatung switch', () => {
    it.each([true, false])('offers no team counselling switch in master data (edit mode %s)', (isEditMode) => {
        renderSettings({ teamAgency: true }, isEditMode);

        expect(screen.queryByRole('switch', { name: 'teamFunctions.counselling.name' })).not.toBeInTheDocument();
        expect(screen.queryByText('agency.form.settings.teamAdviceCenter.changeWarning')).not.toBeInTheDocument();
    });

    it('sends no teamAgency change from the settings card', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <CardEditable titleKey="card.title" onSave={onSave} initialValues={{ teamAgency: true }}>
                <AgencySettings isEditMode asFields />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        // No conversion: teamAgency is either left out or kept true. A falsy value ('false', 0, false) is a change.
        const { teamAgency } = onSave.mock.calls[0][0] as { teamAgency?: unknown };
        expect([undefined, null, true]).toContain(teamAgency);
    });
});

describe('AgencySettings counsellor topic permission default', () => {
    const TopicPermissionValue = () => {
        const value = Form.useWatch(['settings', 'counsellorTopicPermission']);
        return <span data-testid="form-topic-permission">{String(value)}</span>;
    };
    const renderWithPermission = (initialValues: Record<string, unknown>, isEditMode = true) =>
        render(
            <Form initialValues={initialValues}>
                <AgencySettings isEditMode={isEditMode} asFields />
                <TopicPermissionValue />
            </Form>,
        );

    it('shows the stored agency default and changes it', async () => {
        const user = userEvent.setup();
        renderWithPermission({ settings: { counsellorTopicPermission: 'CREATE' } });

        const field = screen.getByRole('combobox', { name: 'agency.form.settings.counsellorTopicPermission.title' });
        expect(field).toHaveValue('links.composer.topics.create');

        await user.click(field);
        await user.click(await screen.findByRole('option', { name: 'links.composer.topics.selectExisting' }));

        expect(screen.getByTestId('form-topic-permission')).toHaveTextContent('SELECT_EXISTING');
    });

    it('is not offered while creating an agency (new agencies start with NONE)', () => {
        renderWithPermission({}, false);

        expect(
            screen.queryByRole('combobox', { name: 'agency.form.settings.counsellorTopicPermission.title' }),
        ).not.toBeInTheDocument();
    });
});
