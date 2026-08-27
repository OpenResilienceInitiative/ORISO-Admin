import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CardEditable } from './index';
import { MuiFormField } from '../mui/MuiFormField';
import { MuiSwitchField } from '../mui/MuiSwitchField';

/**
 * Read-only guarantee (#689/#735): a CardEditable that is not in edit mode
 * disables its whole antd `<Form>`; MUI-backed fields must pick that up via
 * `ConfigProvider.useConfig().componentDisabled`. They used to read the
 * antd-internal `antd/es/config-provider/DisabledContext`, which resolves to a
 * second module instance under Vitest — the context value never arrived and
 * this exact assertion failed while the app looked fine in the browser.
 */
describe('CardEditable', () => {
    const renderCard = () =>
        render(
            <CardEditable titleKey="card.title" onSave={vi.fn()} initialValues={{ name: 'ACME', enabled: true }}>
                <MuiFormField name="name" label="Name" />
                <MuiSwitchField name="enabled" label="Enabled" />
            </CardEditable>,
        );

    it('renders MUI-backed fields disabled while not editing', () => {
        renderCard();

        expect(screen.getByLabelText('Name')).toBeDisabled();
        expect(screen.getByRole('switch', { name: 'Enabled' })).toBeDisabled();
    });

    it('re-enables the fields once editing starts', async () => {
        const user = userEvent.setup();
        renderCard();

        await user.click(screen.getByRole('button', { name: 'edit' }));

        expect(screen.getByLabelText('Name')).toBeEnabled();
        expect(screen.getByRole('switch', { name: 'Enabled' })).toBeEnabled();
    });

    it('submits a toggled-off switch as false so card patches keep the new value', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <CardEditable titleKey="card.title" onSave={onSave} initialValues={{ teamAgency: true }}>
                <MuiSwitchField name="teamAgency" label="Team" />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: 'Team' }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][0]).toEqual({ teamAgency: false });
    });

    it('keeps entered values editable when the save callback reports an error', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <CardEditable titleKey="card.title" onSave={onSave} initialValues={{ name: 'ACME' }}>
                <MuiFormField name="name" label="Name" />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        const nameField = screen.getByLabelText('Name');
        await user.clear(nameField);
        await user.type(nameField, 'Edited agency');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        onSave.mock.calls[0][1].onError();

        await waitFor(() => expect(screen.getByLabelText('Name')).toBeEnabled());
        expect(screen.getByLabelText('Name')).toHaveValue('Edited agency');
    });

    it('restores edit and unsaved-change state when save fails synchronously', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn((_formData, options) => options?.onError?.());
        render(
            <CardEditable allowUnsavedChanges titleKey="card.title" onSave={onSave} initialValues={{ name: 'ACME' }}>
                <MuiFormField name="name" label="Name" />
            </CardEditable>,
        );

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.clear(screen.getByLabelText('Name'));
        await user.type(screen.getByLabelText('Name'), 'Edited agency');
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));

        expect(screen.getByLabelText('Name')).toBeEnabled();
        await user.click(screen.getByRole('button', { name: 'card.edit.cancel' }));
        expect(await screen.findByText('overlay.unsaved.title')).toBeInTheDocument();
    });

    it('ignores a failure that arrives after a newer save was sent', async () => {
        const user = userEvent.setup();
        const deferredErrors: (() => void)[] = [];
        const onSave = vi.fn((_formData, options) => {
            if (options?.onError) {
                deferredErrors.push(options.onError);
            }
        });
        render(
            <CardEditable titleKey="card.title" onSave={onSave} initialValues={{ name: 'ACME' }}>
                <MuiFormField name="name" label="Name" />
            </CardEditable>,
        );

        const saveOnce = async (value: string) => {
            await user.click(screen.getByRole('button', { name: 'edit' }));
            await user.clear(screen.getByLabelText('Name'));
            await user.type(screen.getByLabelText('Name'), value);
            await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
        };

        await saveOnce('First edit');
        await saveOnce('Second edit');
        expect(deferredErrors).toHaveLength(2);

        // The first save fails late, after the second one has already been sent.
        deferredErrors[0]();

        await waitFor(() => expect(screen.getByLabelText('Name')).toBeDisabled());
    });
});
