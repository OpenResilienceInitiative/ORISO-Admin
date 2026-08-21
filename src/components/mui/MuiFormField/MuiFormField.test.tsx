import React from 'react';
import { Form } from 'antd';
import antdResetCss from 'antd/dist/reset.css?inline';
import InputAdornment from '@mui/material/InputAdornment';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MuiSelectField } from '../MuiSelectField';
import { MuiFormField, MuiNumberFormField, MuiPasswordFormField } from './index';

const renderWithForm = (children: React.ReactNode) => render(<Form>{children}</Form>);

describe('MuiFormField', () => {
    it('neutralizes the global Ant legend width without overriding MUI notch expansion', () => {
        const resetStyle = document.createElement('style');
        resetStyle.textContent = antdResetCss;
        document.head.prepend(resetStyle);

        // The reset is global: if a render or an assertion throws, an un-removed <style> leaks the
        // Ant legend rule into every later test in this file and turns one failure into several.
        try {
            render(
                <Form component={false}>
                    <MuiFormField name="title" label="Title" />
                    <MuiSelectField
                        name="category"
                        label="Category"
                        options={[{ value: 'general', label: 'General' }]}
                    />
                </Form>,
            );

            const legends = document.querySelectorAll<HTMLLegendElement>('.MuiOutlinedInput-notchedOutline legend');

            expect(legends).toHaveLength(2);
            expect(Array.from(legends, (legend) => getComputedStyle(legend).width)).toEqual(['auto', 'auto']);
        } finally {
            resetStyle.remove();
        }
    });

    it('floats an empty native date label before the field receives focus', () => {
        renderWithForm(<MuiFormField name="reviewDate" label="Review date" type="date" />);

        const input = screen.getByLabelText<HTMLInputElement>('Review date');
        expect(input.labels?.[0]).toHaveAttribute('data-shrink', 'true');
    });

    // Design review 2026-08-21: outlined fields carry the admin field surface too.
    // They used to be transparent (#606), which reads fine on a light page but makes
    // every field vanish inside a card — card and field then share one flat grey.
    // `Foundations/Field Tokens` prescribes the opposite: a field surface one step
    // lighter than the workspace, so inputs read as raised instead of muddy.
    it('paints both field variants on the admin field surface, never transparent', () => {
        render(
            <div
                style={
                    {
                        '--input-bg': 'rgb(252, 249, 249)',
                        '--admin-field-surface': 'rgb(252, 249, 249)',
                    } as React.CSSProperties
                }
            >
                <Form>
                    <MuiFormField name="outlined" label="Outlined" />
                    <MuiFormField name="filled" label="Filled" variant="filled" />
                </Form>
            </div>,
        );

        const outlinedRoot = screen.getByLabelText('Outlined').closest('.MuiInputBase-root');
        const filledRoot = screen.getByLabelText('Filled').closest('.MuiInputBase-root');

        expect(getComputedStyle(outlinedRoot!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
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
