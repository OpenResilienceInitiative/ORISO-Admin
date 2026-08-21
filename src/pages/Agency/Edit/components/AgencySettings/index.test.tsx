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
            <AgencySettings isEditMode={isEditMode} asFields persistedTeamAgency={Boolean(initialValues.teamAgency)} />
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
                <AgencySettings isEditMode asFields persistedTeamAgency />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][0]).toEqual(expect.objectContaining({ teamAgency: false }));
    });

    it('refreshes the warning baseline after a save instead of comparing against the pre-save value', async () => {
        // Regression test: persistedTeamAgency used to be captured once on mount and frozen from
        // then on. A second edit in the same page load (flip, save, flip again) then compared the
        // live value against that stale, pre-save baseline and could show the team-to-single
        // warning even though nothing had actually changed since the last save. The fix threads the
        // baseline in as a prop straight from the caller's fetched agency data, so a caller
        // re-rendering with a fresh value (as AgencyPageEdit does once its query cache updates after
        // a successful save) must immediately update what the warning compares against.
        const user = userEvent.setup();

        const { rerender } = render(
            <Form initialValues={{ teamAgency: true }}>
                <AgencySettings isEditMode asFields persistedTeamAgency />
                <FormValue name="teamAgency" />
            </Form>,
        );

        // First (real) conversion: team -> single. Warning correctly appears.
        await user.click(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' }));
        expect(screen.getByText('agency.form.settings.teamAdviceCenter.changeWarning')).toBeInTheDocument();

        // Simulate the save completing: the caller's fetched agency data now reflects
        // teamAgency: false, so it re-renders with the refreshed baseline prop.
        rerender(
            <Form initialValues={{ teamAgency: true }}>
                <AgencySettings isEditMode asFields persistedTeamAgency={false} />
                <FormValue name="teamAgency" />
            </Form>,
        );
        expect(screen.queryByText('agency.form.settings.teamAdviceCenter.changeWarning')).not.toBeInTheDocument();

        // Second edit in the same page load: flip on, then back off. This does not undo a
        // persisted team agency (the agency is already single), so no warning should appear.
        await user.click(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' }));
        await user.click(screen.getByRole('switch', { name: 'agency.form.settings.teamAdviceCenter.title' }));
        expect(screen.queryByText('agency.form.settings.teamAdviceCenter.changeWarning')).not.toBeInTheDocument();
    });
});
