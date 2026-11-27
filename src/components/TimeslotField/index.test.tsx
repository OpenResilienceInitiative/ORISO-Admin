import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TimeslotField } from './index';
import type { OpeningHoursSlot } from '../../utils/openingHours';

vi.mock('react-i18next', () => {
    const translations: Record<string, string> = {
        'openingHours.section': 'Reguläre Öffnungszeiten',
        'openingHours.slot': 'Zeitfenster',
        'openingHours.starts': 'Beginn',
        'openingHours.ends': 'Ende',
        'openingHours.weekday': 'Wochentag',
        'openingHours.time': 'Uhrzeit',
        'openingHours.add': 'Neues Zeitfenster anlegen',
        'openingHours.remove': 'Zeitfenster entfernen',
        'openingHours.empty': 'Noch keine Öffnungszeiten hinterlegt.',
        'openingHours.legacyLabel': 'Bisher als Text hinterlegt',
        'weekday.monday': 'Montag',
        'weekday.tuesday': 'Dienstag',
    };
    const t = (key: string) => translations[key] ?? key;
    return { useTranslation: () => Object.assign([t], { t, i18n: { language: 'de' } }) };
});

const slot: OpeningHoursSlot = { fromDay: 'MONDAY', from: '10:00', untilDay: 'MONDAY', until: '11:00' };

describe('TimeslotField', () => {
    it('renders one editable row per slot', () => {
        render(
            <TimeslotField
                value={[slot, { fromDay: 'TUESDAY', from: '14:00', untilDay: 'TUESDAY', until: '16:00' }]}
                onChange={vi.fn()}
            />,
        );

        const rows = screen.getAllByRole('group');
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByLabelText('Beginn — Uhrzeit')).toHaveValue('10:00');
        expect(within(rows[0]).getByLabelText('Ende — Uhrzeit')).toHaveValue('11:00');
        // Figma 295-6112: a weekday on both rows, so a slot may cross midnight.
        expect(within(rows[0]).getByLabelText('Beginn — Wochentag')).toBeInTheDocument();
        expect(within(rows[0]).getByLabelText('Ende — Wochentag')).toBeInTheDocument();
    });

    it('adds a slot with the add action', () => {
        const onChange = vi.fn();
        render(<TimeslotField value={[]} onChange={onChange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Neues Zeitfenster anlegen' }));

        expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ fromDay: 'MONDAY', untilDay: 'MONDAY' })]);
    });

    it('removes exactly the slot whose remove action was used', () => {
        const onChange = vi.fn();
        const second: OpeningHoursSlot = { fromDay: 'TUESDAY', from: '14:00', untilDay: 'TUESDAY', until: '16:00' };
        render(<TimeslotField value={[slot, second]} onChange={onChange} />);

        fireEvent.click(screen.getAllByRole('button', { name: /Zeitfenster entfernen/ })[1]);

        expect(onChange).toHaveBeenCalledWith([slot]);
    });

    it('edits a time without touching its siblings', () => {
        const onChange = vi.fn();
        const second: OpeningHoursSlot = { fromDay: 'TUESDAY', from: '14:00', untilDay: 'TUESDAY', until: '16:00' };
        render(<TimeslotField value={[slot, second]} onChange={onChange} />);

        fireEvent.change(within(screen.getAllByRole('group')[0]).getByLabelText('Ende — Uhrzeit'), {
            target: { value: '12:30' },
        });

        expect(onChange).toHaveBeenCalledWith([{ ...slot, until: '12:30' }, second]);
    });

    it('shows an empty state instead of a bare add button', () => {
        render(<TimeslotField value={[]} onChange={vi.fn()} />);

        expect(screen.getByText('Noch keine Öffnungszeiten hinterlegt.')).toBeInTheDocument();
    });

    it('surfaces legacy free text read-only so it can be transferred, never silently dropped', () => {
        render(<TimeslotField value={[]} legacyText="Mo-Fr 9-17 Uhr" onChange={vi.fn()} />);

        expect(screen.getByText('Mo-Fr 9-17 Uhr')).toBeInTheDocument();
        expect(screen.getByText('Bisher als Text hinterlegt')).toBeInTheDocument();
    });

    it('disables every control in read-only mode', () => {
        render(<TimeslotField value={[slot]} onChange={vi.fn()} disabled />);

        expect(screen.getByRole('button', { name: 'Neues Zeitfenster anlegen' })).toBeDisabled();
        expect(screen.getByLabelText('Beginn — Uhrzeit')).toBeDisabled();
    });
});
