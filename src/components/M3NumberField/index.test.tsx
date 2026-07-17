import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { M3NumberField } from './index';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, defaultValue?: string) => defaultValue ?? key }),
}));

describe('M3NumberField', () => {
    it('increments via the chevron-up button', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3NumberField label="Tenant Id" value={4} onChange={onChange} min={0} max={10} />);
        await user.click(screen.getByRole('button', { name: 'Wert erhöhen' }));
        expect(onChange).toHaveBeenCalledWith(5);
    });

    it('decrements via the chevron-down button', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3NumberField label="Tenant Id" value={4} onChange={onChange} min={0} max={10} />);
        await user.click(screen.getByRole('button', { name: 'Wert verringern' }));
        expect(onChange).toHaveBeenCalledWith(3);
    });

    it('disables the steppers at min and max', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <M3NumberField label="Tenant Id" value={10} onChange={onChange} min={0} max={10} />,
        );
        expect(screen.getByRole('button', { name: 'Wert erhöhen' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Wert verringern' })).toBeEnabled();

        rerender(<M3NumberField label="Tenant Id" value={0} onChange={onChange} min={0} max={10} />);
        expect(screen.getByRole('button', { name: 'Wert verringern' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Wert erhöhen' })).toBeEnabled();
    });

    it('adjusts the value with the arrow keys and respects max', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3NumberField label="Tenant Id" value={9} onChange={onChange} min={0} max={10} />);
        const input = screen.getByRole('textbox', { name: 'Tenant Id' });
        await user.click(input);
        await user.keyboard('{ArrowUp}');
        expect(onChange).toHaveBeenLastCalledWith(10);
        await user.keyboard('{ArrowDown}');
        expect(onChange).toHaveBeenLastCalledWith(8);
    });

    it('fires onChange with numbers while typing', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3NumberField label="Tenant Id" onChange={onChange} />);
        await user.type(screen.getByRole('textbox', { name: 'Tenant Id' }), '12');
        expect(onChange).toHaveBeenLastCalledWith(12);
    });

    it('ignores non-numeric typing', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3NumberField label="Tenant Id" onChange={onChange} />);
        const input = screen.getByRole('textbox', { name: 'Tenant Id' });
        await user.type(input, 'abc');
        expect(onChange).not.toHaveBeenCalled();
        expect(input).toHaveValue('');
    });

    it('clamps a typed value into min/max on blur', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3NumberField label="Tenant Id" onChange={onChange} min={0} max={10} />);
        const input = screen.getByRole('textbox', { name: 'Tenant Id' });
        await user.type(input, '99');
        await user.tab();
        expect(onChange).toHaveBeenLastCalledWith(10);
        expect(input).toHaveValue('10');
    });

    it('does nothing when disabled', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<M3NumberField label="Tenant Id" value={4} onChange={onChange} disabled />);
        expect(screen.getByRole('textbox', { name: 'Tenant Id' })).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Wert erhöhen' }));
        expect(onChange).not.toHaveBeenCalled();
    });
});
