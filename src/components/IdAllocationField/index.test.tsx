import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IdAllocationField } from './index';
import type { UseIdAllocationResult } from './useIdAllocation';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, defaultValue?: string, options?: Record<string, unknown>) => {
            let text = defaultValue ?? key;
            Object.entries(options ?? {}).forEach(([name, replacement]) => {
                text = text.replace(`{{${name}}}`, String(replacement));
            });
            return text;
        },
    }),
}));

const allocationState = (overrides: Partial<UseIdAllocationResult> = {}): UseIdAllocationResult => ({
    mode: 'auto',
    value: undefined,
    validation: 'auto',
    canSubmit: true,
    stepUpDisabled: false,
    stepDownDisabled: false,
    setManualValue: vi.fn(),
    step: vi.fn(),
    resetToAuto: vi.fn(),
    ...overrides,
});

describe('IdAllocationField', () => {
    it('starts visibly on Auto with the helper text and a pressed Auto toggle', () => {
        render(<IdAllocationField label="Träger-ID" allocation={allocationState()} />);

        expect(screen.getByRole('textbox', { name: 'Träger-ID' })).toHaveValue('Auto');
        expect(screen.getByText('Die nächste freie ID wird automatisch vergeben.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Automatische ID-Vergabe' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('routes typing into manual mode via setManualValue', async () => {
        const allocation = allocationState();
        const user = userEvent.setup();
        render(<IdAllocationField label="Träger-ID" allocation={allocation} />);

        await user.type(screen.getByRole('textbox', { name: 'Träger-ID' }), '3');
        expect(allocation.setManualValue).toHaveBeenCalledWith(3);
    });

    it('routes the arrows through the free-ID stepper', async () => {
        const allocation = allocationState();
        const user = userEvent.setup();
        render(<IdAllocationField label="Träger-ID" allocation={allocation} />);

        await user.click(screen.getByRole('button', { name: 'Wert erhöhen' }));
        expect(allocation.step).toHaveBeenLastCalledWith(1);
        await user.click(screen.getByRole('button', { name: 'Wert verringern' }));
        expect(allocation.step).toHaveBeenLastCalledWith(-1);
    });

    it('disables an exhausted stepping direction', () => {
        render(
            <IdAllocationField
                label="Träger-ID"
                allocation={allocationState({
                    mode: 'manual',
                    value: 21,
                    validation: 'available',
                    stepDownDisabled: true,
                })}
            />,
        );

        expect(screen.getByRole('button', { name: 'Wert verringern' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Wert erhöhen' })).toBeEnabled();
    });

    it('shows the reserved state as a blocking error', () => {
        render(
            <IdAllocationField
                label="Träger-ID"
                allocation={allocationState({ mode: 'manual', value: 30, validation: 'reserved', canSubmit: false })}
            />,
        );

        const input = screen.getByRole('textbox', { name: 'Träger-ID' });
        expect(input).toHaveValue('30');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText('Diese ID ist durch eine offene Einladung reserviert.')).toBeInTheDocument();
    });

    it('shows the assigned, checking, service-error and available states', () => {
        const { rerender } = render(
            <IdAllocationField
                label="Träger-ID"
                allocation={allocationState({ mode: 'manual', value: 5, validation: 'assigned', canSubmit: false })}
            />,
        );
        expect(screen.getByText('Diese ID ist bereits vergeben.')).toBeInTheDocument();

        rerender(
            <IdAllocationField
                label="Träger-ID"
                allocation={allocationState({ mode: 'manual', value: 21, validation: 'checking', canSubmit: false })}
            />,
        );
        expect(screen.getByText('Verfügbarkeit wird geprüft …')).toBeInTheDocument();

        rerender(
            <IdAllocationField
                label="Träger-ID"
                allocation={allocationState({ mode: 'manual', value: 21, validation: 'error', canSubmit: false })}
            />,
        );
        expect(screen.getByText('Verfügbarkeit konnte nicht geprüft werden.')).toBeInTheDocument();

        rerender(
            <IdAllocationField
                label="Träger-ID"
                allocation={allocationState({ mode: 'manual', value: 21, validation: 'available' })}
            />,
        );
        expect(screen.getByText('ID 21 ist frei.')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Träger-ID' })).not.toHaveAttribute('aria-invalid');
    });

    it('resets to Auto via the visible toggle', async () => {
        const allocation = allocationState({ mode: 'manual', value: 21, validation: 'available' });
        const user = userEvent.setup();
        render(<IdAllocationField label="Träger-ID" allocation={allocation} />);

        const toggle = screen.getByRole('button', { name: 'Automatische ID-Vergabe' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await user.click(toggle);
        expect(allocation.resetToAuto).toHaveBeenCalled();
    });
});
