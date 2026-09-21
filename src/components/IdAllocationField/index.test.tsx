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
    selectExisting: vi.fn(),
    peekNextFree: vi.fn().mockResolvedValue(21),
    ...overrides,
});

describe('IdAllocationField', () => {
    it('starts visibly on "Neu" (the former Auto) and NO supporting text', () => {
        render(<IdAllocationField label="Träger-ID" allocation={allocationState()} />);

        expect(screen.getByRole('combobox', { name: 'Träger-ID' })).toHaveValue('Neu');
        // Owner call: the supporting line states a problem, never an expectation.
        expect(screen.queryByText('Die nächste freie ID wird automatisch vergeben.')).not.toBeInTheDocument();
        // The Auto chip is gone — "＋ Neu anlegen" lives in the type-ahead now (#1026).
        expect(screen.queryByRole('button', { name: 'Automatische ID-Vergabe' })).not.toBeInTheDocument();
    });

    /*
     * The row must COLLAPSE, not render an empty one: an empty string still
     * occupies the 16px supporting-text line and keeps the control 76px tall,
     * which is what put the toolbar's field boxes on different baselines.
     */
    it('renders no supporting-text element at all in the quiet states', () => {
        const { rerender } = render(<IdAllocationField label="Träger-ID" allocation={allocationState()} />);
        const supportingTextOf = () => {
            const input = screen.getByRole('combobox', { name: 'Träger-ID' });
            const id = input.getAttribute('aria-describedby');
            return id ? document.getElementById(id) : null;
        };

        expect(supportingTextOf()).toBeNull();

        rerender(
            <IdAllocationField
                label="Träger-ID"
                allocation={allocationState({ mode: 'manual', value: 21, validation: 'available' })}
            />,
        );
        expect(supportingTextOf()).toBeNull();

        // …but a real problem still gets its line.
        rerender(
            <IdAllocationField
                label="Träger-ID"
                allocation={allocationState({ mode: 'manual', value: 21, validation: 'assigned' })}
            />,
        );
        expect(supportingTextOf()).toHaveTextContent('Diese ID ist bereits vergeben.');
    });

    it('routes typing into manual mode via setManualValue', async () => {
        const allocation = allocationState();
        const user = userEvent.setup();
        render(<IdAllocationField label="Träger-ID" allocation={allocation} />);

        await user.type(screen.getByRole('combobox', { name: 'Träger-ID' }), '3');
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

        const input = screen.getByRole('combobox', { name: 'Träger-ID' });
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
        expect(screen.queryByText('ID 21 ist frei.')).not.toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Träger-ID' })).not.toHaveAttribute('aria-invalid');
    });

    it('resets to Auto via the "Neu anlegen" entry, which previews the next free number', async () => {
        const allocation = allocationState({ mode: 'manual', value: 21, validation: 'available' });
        const user = userEvent.setup();
        render(<IdAllocationField label="Träger-ID" allocation={allocation} />);

        await user.click(screen.getByRole('combobox', { name: 'Träger-ID' }));
        const createEntry = await screen.findByRole('option', { name: '＋ Neu anlegen (nächste freie Nummer: 21)' });
        await user.click(createEntry);
        expect(allocation.resetToAuto).toHaveBeenCalled();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('finds existing units by name or topic and picks one (#1026)', async () => {
        const allocation = allocationState();
        const searchUnits = vi.fn((query: string) =>
            [
                { id: 12, name: 'Caritas Freiburg', topics: ['Sucht'] },
                { id: 14, name: 'Diakonie Lahr', topics: ['Schulden'] },
            ].filter((unit) => `${unit.name} ${unit.topics.join(' ')}`.toLowerCase().includes(query.toLowerCase())),
        );
        const user = userEvent.setup();
        render(<IdAllocationField label="Beratungsstelle" allocation={allocation} searchUnits={searchUnits} />);

        const input = screen.getByRole('combobox', { name: 'Beratungsstelle' });
        await user.click(input);
        expect(input).toHaveAttribute('aria-expanded', 'true');
        await user.type(input, 'schul');
        const option = await screen.findByRole('option', { name: /Diakonie Lahr/ });
        expect(screen.queryByRole('option', { name: /Caritas Freiburg/ })).not.toBeInTheDocument();
        expect(option).toHaveTextContent('Nr. 14 · Schulden');

        await user.click(option);
        expect(allocation.selectExisting).toHaveBeenCalledWith({ id: 14, name: 'Diakonie Lahr', topics: ['Schulden'] });
    });

    it('selects the active entry with the keyboard', async () => {
        const allocation = allocationState({ mode: 'manual', value: 21, validation: 'available' });
        const user = userEvent.setup();
        render(<IdAllocationField label="Träger-ID" allocation={allocation} />);

        await user.click(screen.getByRole('combobox', { name: 'Träger-ID' }));
        await screen.findByRole('option', { name: /Neu anlegen/ });
        // Typed "21" is in the query, so the list is [Neu anlegen, Nummer 21 verwenden].
        await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
        expect(allocation.resetToAuto).toHaveBeenCalled();
        // The arrows moved through the menu, they did not step the number.
        expect(allocation.step).not.toHaveBeenCalled();
    });

    it('shows an existing unit by name and number, filled like a confirmed id', () => {
        render(
            <IdAllocationField
                label="Träger"
                allocation={allocationState({
                    mode: 'existing',
                    value: 7,
                    unit: { id: 7, name: 'Caritas Südbaden' },
                    validation: 'existing',
                })}
            />,
        );

        expect(screen.getByRole('combobox', { name: 'Träger' })).toHaveValue('Caritas Südbaden · 7');
    });

    it('locks the field for a scoped viewer: value visible, nothing editable', () => {
        render(
            <IdAllocationField
                label="Träger"
                locked
                allocation={allocationState({
                    mode: 'existing',
                    value: 7,
                    unit: { id: 7, name: 'Caritas Südbaden' },
                    validation: 'existing',
                })}
            />,
        );

        expect(screen.getByRole('combobox', { name: 'Träger' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Wert erhöhen' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Wert verringern' })).toBeDisabled();
    });

    it('treats a typed number as an existing unit when creating is not allowed', async () => {
        const allocation = allocationState();
        const user = userEvent.setup();
        render(<IdAllocationField label="Träger" allowCreate={false} allocation={allocation} />);

        const input = screen.getByRole('combobox', { name: 'Träger' });
        expect(input).toHaveValue('');
        await user.type(input, '9');
        expect(allocation.selectExisting).toHaveBeenLastCalledWith({ id: 9 });
        expect(allocation.setManualValue).not.toHaveBeenCalled();
        expect(screen.queryByRole('option', { name: /Neu anlegen/ })).not.toBeInTheDocument();
    });
});
