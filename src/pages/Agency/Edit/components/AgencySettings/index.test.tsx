import React from 'react';
import { Form } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

describe('AgencySettings team/single toggle', () => {
    it('renders a switch bound to teamAgency', async () => {
        const user = userEvent.setup();
        renderSettings({ teamAgency: true });

        const toggle = screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' });
        expect(toggle).toBeChecked();
        expect(screen.getByTestId('form-teamAgency')).toHaveTextContent('true');
        expect(screen.getByText('agency.form.settings.teamAdviceCenter.description')).toBeInTheDocument();

        await user.click(toggle);

        expect(toggle).not.toBeChecked();
        expect(screen.getByTestId('form-teamAgency')).toHaveTextContent('false');
    });

    it('renders the teamAgency switch unchecked when the field is absent', () => {
        renderSettings({});

        expect(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' })).not.toBeChecked();
        expect(screen.queryByText('agency.form.settings.teamAdviceCenter.changeWarning')).not.toBeInTheDocument();
    });

    it('warns when switching an existing team agency to single', async () => {
        const user = userEvent.setup();
        renderSettings({ teamAgency: true }, true);

        expect(screen.queryByText('agency.form.settings.teamAdviceCenter.changeWarning')).not.toBeInTheDocument();

        await user.click(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' }));

        expect(screen.getByText('agency.form.settings.teamAdviceCenter.changeWarning')).toBeInTheDocument();
    });

    it('does not warn when creating a new agency or leaving team counseling on', async () => {
        const user = userEvent.setup();
        const { unmount } = renderSettings({ teamAgency: false }, false);

        await user.click(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' }));
        await user.click(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' }));
        expect(screen.queryByText('agency.form.settings.teamAdviceCenter.changeWarning')).not.toBeInTheDocument();
        unmount();

        renderSettings({ teamAgency: true }, true);
        expect(screen.queryByText('agency.form.settings.teamAdviceCenter.changeWarning')).not.toBeInTheDocument();
    });

    it('submits teamAgency: false from the settings card so changetype can see the conversion', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <CardEditable titleKey="card.title" onSave={onSave} initialValues={{ teamAgency: true }}>
                <AgencySettings isEditMode asFields />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][0]).toEqual(expect.objectContaining({ teamAgency: false }));
    });
});
