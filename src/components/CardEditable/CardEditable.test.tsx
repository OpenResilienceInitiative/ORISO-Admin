import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
