import { Form } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectFormField } from './index';

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
 * Data-parity contract for SelectFormField. These assertions must hold BOTH
 * before and after the FloatingLabelSelect migration — they pin the read path
 * (initialValue → display) and the write path (selection → form value shape),
 * including the value-shape-changing options `isMulti` and `labelInValue`.
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
        <SelectFormField name="topic" label="Topic" options={OPTIONS} {...props} />
    </Form>
);

describe('SelectFormField data parity', () => {
    it('reads: initialValue is displayed', () => {
        render(<Harness onValues={() => undefined} initialValues={{ topic: 'a' }} />);
        expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    it('writes: selecting an option sets the plain value', async () => {
        const onValues = vi.fn();
        const user = userEvent.setup();
        render(<Harness onValues={onValues} />);

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByText('Beta'));

        expect(onValues).toHaveBeenCalledWith(expect.objectContaining({ topic: 'b' }));
    });

    it('writes: labelInValue keeps the {value,label} shape', async () => {
        const onValues = vi.fn();
        const user = userEvent.setup();
        render(<Harness onValues={onValues} labelInValue />);

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByText('Beta'));

        expect(onValues).toHaveBeenCalledWith(
            expect.objectContaining({ topic: expect.objectContaining({ value: 'b', label: 'Beta' }) }),
        );
    });

    it('writes: isMulti accumulates values into an array', async () => {
        const onValues = vi.fn();
        const user = userEvent.setup();
        render(<Harness onValues={onValues} isMulti />);

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByText('Alpha'));
        await user.click(await screen.findByText('Beta'));

        expect(onValues).toHaveBeenLastCalledWith(expect.objectContaining({ topic: ['a', 'b'] }));
    });
});
