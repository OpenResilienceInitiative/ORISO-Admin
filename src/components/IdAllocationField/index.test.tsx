import { act, render, screen, waitFor } from '@testing-library/react';
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
    it('starts visibly on "Neu" with no supporting text', () => {
        render(<IdAllocationField label="Träger-ID" allocation={allocationState()} />);

        expect(screen.getByRole('combobox', { name: 'Träger-ID' })).toHaveValue('Neu');
        // Owner call: the supporting line states a problem, never an expectation.
        expect(screen.queryByText('Die nächste freie ID wird automatisch vergeben.')).not.toBeInTheDocument();
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

    // An id the admin cleared again was never confirmed, so it must not stay pinned.
    it('leaves the typed number when the admin clears the field', async () => {
        const allocation = allocationState();
        const user = userEvent.setup();
        const { rerender } = render(<IdAllocationField label="Beratungsstelle" allocation={allocation} />);

        const input = screen.getByRole('combobox', { name: 'Beratungsstelle' });
        await user.click(input);
        await user.type(input, '3');
        expect(allocation.setManualValue).toHaveBeenLastCalledWith(3);

        const typed = { ...allocation, mode: 'manual' as const, value: 3, validation: 'available' as const };
        rerender(<IdAllocationField label="Beratungsstelle" allocation={typed} />);
        await user.clear(input);
        expect(allocation.setManualValue).toHaveBeenLastCalledWith(undefined);
    });

    it('finds existing units by name or topic and picks one', async () => {
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

    it('opens the menu on an arrow key while it is closed, and never steps over a pick', async () => {
        const allocation = allocationState({
            mode: 'existing',
            value: 101,
            unit: { id: 101, name: 'Caritas Freiburg' },
            validation: 'existing',
        });
        const user = userEvent.setup();
        render(<IdAllocationField label="Beratungsstelle" allocation={allocation} />);
        const input = screen.getByRole('combobox', { name: 'Beratungsstelle' });
        await user.click(input);
        await user.keyboard('{Escape}');
        expect(input).toHaveAttribute('aria-expanded', 'false');

        await user.keyboard('{ArrowDown}');
        expect(input).toHaveAttribute('aria-expanded', 'true');
        await user.keyboard('{Escape}{ArrowUp}');
        expect(input).toHaveAttribute('aria-expanded', 'true');
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

    it('discards a search reply for a query the admin has typed past', async () => {
        const replies: Record<string, (units: { id: number; name: string }[]) => void> = {};
        const searchUnits = vi.fn(
            (query: string) =>
                new Promise<{ id: number; name: string }[]>((resolve) => {
                    replies[query] = resolve;
                }),
        );
        const user = userEvent.setup();
        render(<IdAllocationField label="Beratungsstelle" allocation={allocationState()} searchUnits={searchUnits} />);

        const input = screen.getByRole('combobox', { name: 'Beratungsstelle' });
        await user.type(input, 'ca');
        await waitFor(() => expect(replies.ca).toBeDefined());
        await user.type(input, 'r');
        await waitFor(() => expect(replies.car).toBeDefined());
        await act(async () => replies.car([{ id: 12, name: 'Caritas Freiburg' }]));
        await act(async () => replies.ca([{ id: 99, name: 'Caravan Hilfe' }]));

        expect(screen.getByRole('option', { name: /Caritas Freiburg/ })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Caravan Hilfe/ })).not.toBeInTheDocument();
    });

    it('takes a typed number into an existing-only field once it resolves to a unit', async () => {
        const allocation = allocationState();
        const resolveUnit = vi.fn(async (id: number) => ({ id, name: 'Caritas Emmendingen' }));
        const user = userEvent.setup();
        render(
            <IdAllocationField label="Träger" allowCreate={false} allocation={allocation} resolveUnit={resolveUnit} />,
        );

        await user.type(screen.getByRole('combobox', { name: 'Träger' }), '9');

        await waitFor(() =>
            expect(allocation.selectExisting).toHaveBeenLastCalledWith({ id: 9, name: 'Caritas Emmendingen' }),
        );
        expect(allocation.setManualValue).not.toHaveBeenCalled();
        expect(screen.queryByRole('option', { name: /Neu anlegen/ })).not.toBeInTheDocument();
    });

    it('keeps a typed number when focus leaves before the lookup answers', async () => {
        const allocation = allocationState();
        const resolveUnit = vi.fn(async (id: number) => ({ id, name: 'Caritas Emmendingen' }));
        const user = userEvent.setup();
        render(
            <>
                <IdAllocationField
                    label="Träger"
                    allowCreate={false}
                    allocation={allocation}
                    resolveUnit={resolveUnit}
                />
                <button type="button">weiter</button>
            </>,
        );

        await user.type(screen.getByRole('combobox', { name: 'Träger' }), '40');
        await user.tab();

        await waitFor(() =>
            expect(allocation.selectExisting).toHaveBeenLastCalledWith({ id: 40, name: 'Caritas Emmendingen' }),
        );
    });

    it('refuses a typed number that belongs to no unit in an existing-only field', async () => {
        const allocation = allocationState();
        const resolveUnit = vi.fn(async () => null);
        const user = userEvent.setup();
        render(
            <IdAllocationField label="Träger" allowCreate={false} allocation={allocation} resolveUnit={resolveUnit} />,
        );

        await user.type(screen.getByRole('combobox', { name: 'Träger' }), '404');

        expect(await screen.findByText('Keine Einheit mit Nr. 404')).toBeInTheDocument();
        expect(allocation.selectExisting).not.toHaveBeenCalled();
    });

    it('offers the existing unit behind an assigned number', async () => {
        const allocation = allocationState({ mode: 'manual', value: 12, validation: 'assigned', canSubmit: false });
        const resolveUnit = vi.fn(async (id: number) => ({ id, name: 'Caritas Freiburg' }));
        const user = userEvent.setup();
        render(<IdAllocationField label="Beratungsstelle" allocation={allocation} resolveUnit={resolveUnit} />);

        expect(await screen.findByText(/Nr\. 12 ist „Caritas Freiburg“/)).toBeInTheDocument();
        await user.click(screen.getByRole('combobox', { name: 'Beratungsstelle' }));
        await user.click(await screen.findByRole('option', { name: /Caritas Freiburg/ }));

        expect(allocation.selectExisting).toHaveBeenCalledWith({ id: 12, name: 'Caritas Freiburg' });
    });
});
