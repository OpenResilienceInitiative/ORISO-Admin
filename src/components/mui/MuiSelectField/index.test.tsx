import { Form } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MuiSelectField } from './index';

// t() is identity so labels/messages are predictable and no i18n init is needed.
// react-i18next's hook returns an array [t, i18n, ready] that also exposes { t },
// so support both `const [t] = …` and `const { t } = …` call sites.
vi.mock('react-i18next', () => {
    const t = (key?: string) => key ?? '';
    return { useTranslation: () => Object.assign([t, {}, true], { t }) };
});

const OPTIONS = [
    { label: 'Alpha', value: 'a' },
    { label: 'Beta', value: 'b' },
];

/**
 * Data-parity contract, ported unchanged from the antd `SelectFormField` this
 * component replaces (#340). These assertions pin the read path (initialValue →
 * display) and the write path (selection → form value shape), including the
 * value-shape-changing options `isMulti` and `labelInValue`. They held for the
 * antd select and must keep holding for the MUI one.
 */
const Harness = ({
    onValues,
    initialValues,
    ...props
}: {
    onValues: (all: Record<string, unknown>) => void;
    initialValues?: Record<string, unknown>;
    isMulti?: boolean;
    labelInValue?: boolean;
}) => (
    <Form initialValues={initialValues} onValuesChange={(_, all) => onValues(all)}>
        <MuiSelectField name="topic" label="Topic" options={OPTIONS} {...props} />
    </Form>
);

describe('MuiSelectField data parity', () => {
    it('reads: initialValue is displayed', () => {
        render(<Harness onValues={() => undefined} initialValues={{ topic: 'a' }} />);
        expect(screen.getByRole('combobox')).toHaveValue('Alpha');
    });

    it('reads: a labelInValue initial value is displayed', () => {
        render(
            <Harness
                onValues={() => undefined}
                labelInValue
                initialValues={{ topic: { value: 'a', label: 'Alpha' } }}
            />,
        );
        expect(screen.getByRole('combobox')).toHaveValue('Alpha');
    });

    it('writes: selecting an option sets the plain value', async () => {
        const onValues = vi.fn();
        const user = userEvent.setup();
        render(<Harness onValues={onValues} />);

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByRole('option', { name: 'Beta' }));

        expect(onValues).toHaveBeenCalledWith(expect.objectContaining({ topic: 'b' }));
    });

    it('writes: labelInValue keeps the {value,label} shape', async () => {
        const onValues = vi.fn();
        const user = userEvent.setup();
        render(<Harness onValues={onValues} labelInValue />);

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByRole('option', { name: 'Beta' }));

        expect(onValues).toHaveBeenCalledWith(
            expect.objectContaining({ topic: expect.objectContaining({ value: 'b', label: 'Beta' }) }),
        );
    });

    it('writes: isMulti accumulates values into an array', async () => {
        const onValues = vi.fn();
        const user = userEvent.setup();
        render(<Harness onValues={onValues} isMulti />);

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByRole('option', { name: 'Alpha' }));
        await user.click(await screen.findByRole('option', { name: 'Beta' }));

        expect(onValues).toHaveBeenLastCalledWith(expect.objectContaining({ topic: ['a', 'b'] }));
    });

    it('filters options by a case-insensitive substring of the label', async () => {
        const user = userEvent.setup();
        render(<Harness onValues={() => undefined} />);

        await user.click(screen.getByRole('combobox'));
        await user.keyboard('bet');

        expect(await screen.findByRole('option', { name: 'Beta' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Alpha' })).not.toBeInTheDocument();
    });

    it('supports the .Option child API used instead of `options`', async () => {
        const user = userEvent.setup();
        const onValues = vi.fn();
        render(
            <Form onValuesChange={(_, all) => onValues(all)}>
                <MuiSelectField name="language" label="Languages">
                    <MuiSelectField.Option value="de">Deutsch</MuiSelectField.Option>
                    <MuiSelectField.Option value="en">English</MuiSelectField.Option>
                </MuiSelectField>
            </Form>,
        );

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByRole('option', { name: 'English' }));

        expect(onValues).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }));
    });

    it('surfaces the required-rule message as the field error', async () => {
        const user = userEvent.setup();
        const onFinishFailed = vi.fn();
        render(
            <Form onFinishFailed={onFinishFailed}>
                <MuiSelectField name="topic" label="Topic" options={OPTIONS} required />
                <button type="submit">submit</button>
            </Form>,
        );

        await user.click(screen.getByRole('button', { name: 'submit' }));

        expect(await screen.findByText('form.errors.required')).toBeInTheDocument();
    });
});
