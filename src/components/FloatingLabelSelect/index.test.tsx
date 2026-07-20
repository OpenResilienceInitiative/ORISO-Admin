import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Form } from 'antd';
import { FloatingLabelSelect } from './index';
import styles from './floatingLabelSelect.module.scss';

const options = [
    { label: 'Berlin', value: 'berlin' },
    { label: 'Hamburg', value: 'hamburg' },
];

const getField = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement;

describe('FloatingLabelSelect', () => {
    it('floats the label on focus and rests it again on blur while empty', async () => {
        const user = userEvent.setup();
        const { container } = render(<FloatingLabelSelect label="Stadt" options={options} />);
        const field = getField(container);

        expect(field).not.toHaveClass(styles.labelFloating);

        await user.click(screen.getByLabelText('Stadt'));
        expect(field).toHaveClass(styles.labelFloating);
        expect(field).toHaveClass(styles.fieldFocused);

        await user.tab();
        expect(field).not.toHaveClass(styles.labelFloating);
        expect(field).not.toHaveClass(styles.fieldFocused);
    });

    it('keeps the label floating once a value is selected', async () => {
        const user = userEvent.setup();
        const { container } = render(<FloatingLabelSelect label="Stadt" options={options} />);
        const field = getField(container);

        await user.click(screen.getByLabelText('Stadt'));
        await user.click(await screen.findByTitle('Berlin'));

        expect(field).toHaveClass(styles.labelFloating);
        expect(container.querySelector('.ant-select-selection-item')).toHaveTextContent('Berlin');
    });

    it('floats the label for a pre-filled value and marks the error state', () => {
        const { container } = render(
            <FloatingLabelSelect
                defaultValue="berlin"
                error
                label="Stadt"
                options={options}
                supportingText="Bitte prüfen"
            />,
        );
        const field = getField(container);

        expect(field).toHaveClass(styles.labelFloating);
        expect(field).toHaveClass(styles.fieldError);
        expect(screen.getByLabelText('Stadt')).toHaveAttribute('aria-invalid', 'true');
    });

    it('reflects the surrounding Form.Item error status without an explicit error prop', () => {
        const { container } = render(
            <Form>
                <Form.Item name="city" validateStatus="error">
                    <FloatingLabelSelect label="Stadt" options={options} />
                </Form.Item>
            </Form>,
        );
        const field = container.querySelector(`.${styles.field}`);

        expect(field).toHaveClass(styles.fieldError);
    });

    it('grows to fit selected tags in multiple mode and keeps the label floated', async () => {
        const user = userEvent.setup();
        const { container } = render(<FloatingLabelSelect label="Städte" options={options} mode="multiple" />);
        const field = getField(container);

        await user.click(screen.getByLabelText('Städte'));
        await user.click(await screen.findByTitle('Berlin'));
        await user.tab();

        expect(field).toHaveClass(styles.labelFloating);
        expect(container.querySelector('.ant-select-selection-item-content')).toHaveTextContent('Berlin');
    });
});
