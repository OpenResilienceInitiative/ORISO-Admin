import React from 'react';
import { Form } from 'antd';
import InputAdornment from '@mui/material/InputAdornment';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MuiFormField, MuiNumberFormField, MuiPasswordFormField } from './MuiFormField';

const renderWithForm = (children: React.ReactNode) => render(<Form>{children}</Form>);

describe('MuiFormField', () => {
    it('passes end adornments and native input props through the MUI v9 slot API', () => {
        renderWithForm(
            <MuiFormField
                name="subdomain"
                label="Subdomain"
                inputProps={{ minLength: 3, 'data-testid': 'subdomain-input' }}
                endAdornment={
                    <InputAdornment position="end">
                        <span data-testid="subdomain-suffix">.oriso.test</span>
                    </InputAdornment>
                }
            />,
        );

        expect(screen.getByTestId('subdomain-input')).toHaveAttribute('minLength', '3');
        expect(screen.getByTestId('subdomain-suffix')).toBeVisible();
    });

    it('keeps number field minimum attributes on the native input', () => {
        renderWithForm(<MuiNumberFormField name="allowedUsers" label="Allowed users" min={1} />);

        const input = screen.getByLabelText('Allowed users');
        expect(input).toHaveAttribute('type', 'number');
        expect(input).toHaveAttribute('min', '1');
    });

    it('toggles password visibility through the end adornment button', async () => {
        const user = userEvent.setup();
        renderWithForm(<MuiPasswordFormField name="password" label="Password" />);

        const passwordInput = screen.getByLabelText('Password');
        const toggleButton = screen.getByRole('button', { name: 'toggle password visibility' });
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(toggleButton).toHaveAttribute('data-testid', 'password-visibility-toggle');
        expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
        expect(toggleButton).not.toHaveAttribute('tabindex', '-1');

        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

        toggleButton.focus();
        await user.keyboard('{Enter}');
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

        await user.keyboard(' ');
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('keeps helper text and validation errors wired through MUI accessibility state', async () => {
        const user = userEvent.setup();
        renderWithForm(
            <>
                <MuiFormField
                    name="email"
                    label="Email"
                    helpText="Shown until validation fails"
                    rules={[{ required: true, message: 'Email is required' }]}
                />
                <button type="submit">Submit</button>
            </>,
        );

        const input = screen.getByLabelText('Email');
        expect(screen.getByText('Shown until validation fails')).toBeVisible();
        expect(input).toHaveAttribute('aria-invalid', 'false');

        await user.click(screen.getByRole('button', { name: 'Submit' }));

        expect(await screen.findByText('Email is required')).toBeVisible();
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });
});
