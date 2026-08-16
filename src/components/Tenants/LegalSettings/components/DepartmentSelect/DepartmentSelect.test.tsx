import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ALL_DEPARTMENTS, DepartmentSelect } from '.';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: any, options?: any) => {
            if (typeof fallback === 'string' && options?.name) {
                return fallback.replace('{{name}}', options.name);
            }
            // Counted form: t(key, { count, defaultValue }) — the switcher uses it for
            // "how many Fachbereiche will not receive this change".
            if (fallback && typeof fallback === 'object' && typeof fallback.defaultValue === 'string') {
                return fallback.defaultValue.replace('{{count}}', String(fallback.count));
            }
            return typeof fallback === 'string' ? fallback : _key;
        },
    }),
}));

const departments = [
    { id: 3, name: 'U25 Suizidprävention' },
    { id: 12, name: 'Schwangerschaft' },
];

const openMenu = async () => {
    await userEvent.click(screen.getByRole('button', { name: /Fachbereich wählen/i }));
};

describe('DepartmentSelect', () => {
    it('shows the agency-wide entry as the label when nothing is selected', () => {
        render(<DepartmentSelect departments={departments} value={ALL_DEPARTMENTS} onChange={vi.fn()} />);

        expect(screen.getByText('Alle Fachbereiche')).toBeInTheDocument();
    });

    it('shows the selected department name as the label', () => {
        render(<DepartmentSelect departments={departments} value={3} onChange={vi.fn()} />);

        expect(screen.getByText('U25 Suizidprävention')).toBeInTheDocument();
    });

    it('renders nothing when the agency has no departments', () => {
        // A switcher with a single possible value is noise, not a choice.
        const { container } = render(<DepartmentSelect departments={[]} value={ALL_DEPARTMENTS} onChange={vi.fn()} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('reports a chosen department as a numeric topic id', async () => {
        const onChange = vi.fn();
        render(<DepartmentSelect departments={departments} value={ALL_DEPARTMENTS} onChange={onChange} />);
        await openMenu();
        await userEvent.click(await screen.findByText('U25 Suizidprävention'));

        expect(onChange).toHaveBeenCalledWith(3);
    });

    it('reports the agency-wide entry as the sentinel, not as a number', async () => {
        const onChange = vi.fn();
        render(<DepartmentSelect departments={departments} value={3} onChange={onChange} />);
        await openMenu();
        await userEvent.click(await screen.findByText('Alle Fachbereiche'));

        expect(onChange).toHaveBeenCalledWith(ALL_DEPARTMENTS);
    });
});

/**
 * #583: an admin editing the agency-wide text has to see which Fachbereiche have left the
 * inherited text — they will NOT receive the correction being written.
 */
describe('DepartmentSelect — who still inherits', () => {
    it('marks the departments that carry their own published text', async () => {
        render(
            <DepartmentSelect
                departments={[
                    { id: 3, name: 'U25 Suizidprävention', hasOwnText: true },
                    { id: 12, name: 'Schwangerschaft', hasOwnText: false },
                ]}
                value={ALL_DEPARTMENTS}
                onChange={vi.fn()}
            />,
        );
        await openMenu();

        expect(await screen.findByTestId('own-text-3')).toBeInTheDocument();
        expect(screen.queryByTestId('own-text-12')).not.toBeInTheDocument();
    });

    it('says on the agency-wide entry how many will not receive the change', async () => {
        render(
            <DepartmentSelect
                departments={[
                    { id: 3, name: 'U25 Suizidprävention', hasOwnText: true },
                    { id: 12, name: 'Schwangerschaft', hasOwnText: true },
                    { id: 13, name: 'Schuldnerberatung', hasOwnText: false },
                ]}
                value={ALL_DEPARTMENTS}
                onChange={vi.fn()}
            />,
        );
        await openMenu();

        expect(await screen.findByTestId('departments-with-own-text')).toHaveTextContent('2 mit eigenem Text');
    });

    it('stays quiet when every department still inherits', async () => {
        render(<DepartmentSelect departments={departments} value={ALL_DEPARTMENTS} onChange={vi.fn()} />);
        await openMenu();

        expect(await screen.findByText('U25 Suizidprävention')).toBeInTheDocument();
        expect(screen.queryByTestId('departments-with-own-text')).not.toBeInTheDocument();
    });

    it('claims nothing when the backend does not report the state', async () => {
        // An older deployment sends no `departments[]`. A missing marker must not read as
        // "still inherits", so the entry carries no claim either way.
        render(
            <DepartmentSelect
                departments={[{ id: 3, name: 'U25 Suizidprävention' }]}
                value={ALL_DEPARTMENTS}
                onChange={vi.fn()}
            />,
        );
        await openMenu();

        expect(await screen.findByText('U25 Suizidprävention')).toBeInTheDocument();
        expect(screen.queryByTestId('own-text-3')).not.toBeInTheDocument();
    });

    it('still switches department when a marker is rendered', async () => {
        const onChange = vi.fn();
        render(
            <DepartmentSelect
                departments={[{ id: 3, name: 'U25 Suizidprävention', hasOwnText: true }]}
                value={ALL_DEPARTMENTS}
                onChange={onChange}
            />,
        );
        await openMenu();
        await userEvent.click(await screen.findByText('U25 Suizidprävention'));

        expect(onChange).toHaveBeenCalledWith(3);
    });
});
