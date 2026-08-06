import React from 'react';
import Form from 'antd/es/form';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MuiSwitchField } from './index';

const renderWithForm = (
    children: React.ReactNode,
    options?: { initialValues?: Record<string, unknown>; disabled?: boolean },
) =>
    render(
        <Form initialValues={options?.initialValues} disabled={options?.disabled}>
            {children}
        </Form>,
    );

describe('MuiSwitchField', () => {
    it('binds checked state through antd Form and toggles on click', async () => {
        const user = userEvent.setup();
        renderWithForm(<MuiSwitchField name="enabled" label="Enabled" />, { initialValues: { enabled: false } });

        const toggle = screen.getByRole('switch', { name: 'Enabled' });
        expect(toggle).not.toBeChecked();

        await user.click(toggle);
        expect(toggle).toBeChecked();
    });

    it('uses switchLabel for accessibility when label is a complex node', () => {
        renderWithForm(
            <MuiSwitchField
                name="secure"
                switchLabel="SMTP secure"
                label={
                    <span>
                        <strong>Secure</strong>
                        <span>Use TLS</span>
                    </span>
                }
            />,
            { initialValues: { secure: true } },
        );

        expect(screen.getByRole('switch', { name: 'SMTP secure' })).toBeChecked();
    });

    it('honors antd Form disabled context (CardEditable view mode)', () => {
        renderWithForm(<MuiSwitchField name="enabled" label="Enabled" />, {
            initialValues: { enabled: true },
            disabled: true,
        });

        expect(screen.getByRole('switch', { name: 'Enabled' })).toBeDisabled();
    });
});
