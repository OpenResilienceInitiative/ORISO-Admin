import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FloatingLabelInput } from './FloatingLabelInput';
import styles from './floatingLabelInput.module.scss';

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
});
