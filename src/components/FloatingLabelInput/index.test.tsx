import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Form, Input } from 'antd';
import { FloatingLabelInput } from './index';
import styles from './floatingLabelInput.module.scss';

beforeAll(() => {
    // antd's Form relies on matchMedia (responsive observer), which jsdom lacks.
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

const getField = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement;

describe('FloatingLabelInput', () => {
    it('floats the label on focus and rests it again on blur while empty', async () => {
        const user = userEvent.setup();
        const { container } = render(<FloatingLabelInput label="Vorname" />);
        const field = getField(container);

        expect(field).not.toHaveClass(styles.labelFloating);

        await user.click(screen.getByLabelText('Vorname'));
        expect(field).toHaveClass(styles.labelFloating);
        expect(field).toHaveClass(styles.fieldFocused);

        await user.tab();
        expect(field).not.toHaveClass(styles.labelFloating);
        expect(field).not.toHaveClass(styles.fieldFocused);
    });

    it('keeps the label floating while the field holds a value', async () => {
        const user = userEvent.setup();
        const { container } = render(<FloatingLabelInput label="Vorname" />);
        const field = getField(container);

        await user.type(screen.getByLabelText('Vorname'), 'Konstanze');
        await user.tab();

        expect(screen.getByLabelText('Vorname')).toHaveValue('Konstanze');
        expect(field).toHaveClass(styles.labelFloating);
    });

    it('floats the label for a pre-filled value and marks the error state', () => {
        const { container } = render(
            <FloatingLabelInput defaultValue="Schanze" error label="Name" supportingText="Bitte prüfen" />,
        );
        const field = getField(container);

        expect(field).toHaveClass(styles.labelFloating);
        expect(field).toHaveClass(styles.fieldError);
        expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Bitte prüfen');
    });

    it('reflects the surrounding Form.Item error status without an explicit error prop', () => {
        const { container } = render(
            <Form>
                <Form.Item name="email" validateStatus="error">
                    <FloatingLabelInput label="E-Mail" />
                </Form.Item>
            </Form>,
        );
        const field = container.querySelector(`.${styles.field}`);

        expect(field).toHaveClass(styles.fieldError);
        expect(screen.getByLabelText('E-Mail')).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows the native placeholder only while focused', async () => {
        const user = userEvent.setup();
        render(<FloatingLabelInput label="Vorname" placeholder="z. B. Konstanze" />);
        const input = screen.getByLabelText('Vorname');

        expect(input).not.toHaveAttribute('placeholder');

        await user.click(input);
        expect(input).toHaveAttribute('placeholder', 'z. B. Konstanze');

        await user.tab();
        expect(input).not.toHaveAttribute('placeholder');
    });

    it('renders a textarea inside the outlined shell when component is Input.TextArea', () => {
        const { container } = render(<FloatingLabelInput component={Input.TextArea} label="Beschreibung" />);
        const field = container.querySelector(`.${styles.field}`);

        expect(field).toHaveClass(styles.fieldMultiline);
        expect(screen.getByLabelText('Beschreibung').tagName).toBe('TEXTAREA');
    });
});
