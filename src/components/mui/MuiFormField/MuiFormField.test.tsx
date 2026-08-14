import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { Form } from 'antd';
import InputAdornment from '@mui/material/InputAdornment';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { focusFirstInvalidField } from '../../../utils/formErrorNavigation';
import { MuiFormField, MuiNumberFormField, MuiPasswordFormField } from './index';

const muiFormFieldSource = readFileSync(resolve(__dirname, './index.tsx'), 'utf8');
const sharedFieldSxSource = readFileSync(resolve(__dirname, '../fieldSx.ts'), 'utf8');

const renderWithForm = (children: React.ReactNode) => render(<Form>{children}</Form>);

describe('MuiFormField', () => {
    it('leaves outlined notch legend sizing to MUI', () => {
        const legendRule = (source: string) =>
            source.match(/'& \.MuiOutlinedInput-notchedOutline legend':\s*{([^}]*)}/s)?.[1] ?? '';

        expect(legendRule(muiFormFieldSource)).not.toMatch(/\bwidth\s*:/);
        expect(legendRule(sharedFieldSxSource)).not.toMatch(/\bwidth\s*:/);
    });

    it('uses the surrounding surface only for filled fields', () => {
        render(
            <div style={{ '--input-bg': 'rgb(252, 249, 249)' } as React.CSSProperties}>
                <Form>
                    <MuiFormField name="outlined" label="Outlined" />
                    <MuiFormField name="filled" label="Filled" variant="filled" />
                </Form>
            </div>,
        );

        const outlinedRoot = screen.getByLabelText('Outlined').closest('.MuiInputBase-root');
        const filledRoot = screen.getByLabelText('Filled').closest('.MuiInputBase-root');

        expect(getComputedStyle(outlinedRoot!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(filledRoot!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

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

    /**
     * #717 — a rejected username must keep sibling text values and name the
     * field. Save on the consultant form sits *outside* the <form> and calls
     * `form.submit()`, same as this harness.
     */
    it('keeps sibling text values and focuses username when the format rule fails', async () => {
        const FORM_NAME = 'consultantOrAdmin';
        const user = userEvent.setup();
        const onFinish = vi.fn();

        const Harness = () => {
            const [form] = Form.useForm();
            return (
                <>
                    <Form
                        form={form}
                        name={FORM_NAME}
                        onFinish={onFinish}
                        onFinishFailed={({ errorFields }) => focusFirstInvalidField(errorFields, FORM_NAME)}
                    >
                        <MuiFormField name="firstname" label="First name" />
                        <MuiFormField
                            name="username"
                            label="Username"
                            rules={[{ pattern: /^[a-z0-9_-]+$/, message: 'invalid username' }]}
                        />
                    </Form>
                    <button type="button" onClick={() => form.submit()}>
                        Save
                    </button>
                </>
            );
        };

        render(<Harness />);

        await user.type(screen.getByLabelText('First name'), 'Lisa');
        await user.type(screen.getByLabelText('Username'), 'lisa.simpson');
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('invalid username')).toBeVisible();
        expect(onFinish).not.toHaveBeenCalled();
        expect(screen.getByLabelText('First name')).toHaveValue('Lisa');
        expect(screen.getByLabelText('Username')).toHaveValue('lisa.simpson');
        expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Username')).toHaveFocus();
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
        expect(screen.getByTestId('mui-form-field-error-icon')).toBeVisible();
    });

    it('keeps the password visibility toggle when the field is in error', async () => {
        const user = userEvent.setup();
        renderWithForm(
            <>
                <MuiPasswordFormField
                    name="password"
                    label="Password"
                    rules={[{ required: true, message: 'Password is required' }]}
                />
                <button type="submit">Submit</button>
            </>,
        );

        await user.click(screen.getByRole('button', { name: 'Submit' }));

        expect(await screen.findByText('Password is required')).toBeVisible();
        expect(screen.getByTestId('mui-form-field-error-icon')).toBeVisible();

        const passwordInput = screen.getByLabelText('Password');
        const toggleButton = screen.getByRole('button', { name: 'toggle password visibility' });
        expect(toggleButton).toBeVisible();
        expect(passwordInput).toHaveAttribute('type', 'password');

        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
    });

    /**
     * antd injects the field id into the bound control and every
     * "jump to the invalid field" mechanism (`form.scrollToField`, and ours in
     * utils/formErrorNavigation) resolves it with `getElementById`. Dropping
     * the prop turned those jumps into silent no-ops (#594 review).
     */
    it('carries the antd field id onto the native input', () => {
        render(
            <Form name="onboarding">
                <MuiFormField name="address" label="Address" />
            </Form>,
        );

        expect(screen.getByLabelText('Address')).toHaveAttribute('id', 'onboarding_address');
    });

    it('honors antd Form disabled context (CardEditable view mode)', () => {
        render(
            <Form disabled>
                <MuiFormField name="name" label="Name" />
            </Form>,
        );

        expect(screen.getByLabelText('Name')).toBeDisabled();
    });

    it('keeps an explicitly passed id', () => {
        render(
            <Form name="onboarding">
                <MuiFormField name="address" label="Address" id="custom-address" />
            </Form>,
        );

        expect(screen.getByLabelText('Address')).toHaveAttribute('id', 'custom-address');
    });
});
