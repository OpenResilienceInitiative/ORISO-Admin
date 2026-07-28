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
            return typeof fallback === 'string' ? fallback : _key;
        },
    }),
}));

const departments = [
    { id: 3, name: 'U25 Suizidprävention' },
    { id: 12, name: 'Schwangerschaft', hasOwnText: true },
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

    it('marks departments that already left the inherited text', async () => {
        // An admin editing the agency-wide text must see at a glance who will NOT receive it.
        render(<DepartmentSelect departments={departments} value={ALL_DEPARTMENTS} onChange={vi.fn()} />);
        await openMenu();

        expect(await screen.findByText('Schwangerschaft (eigener Text)')).toBeInTheDocument();
        expect(screen.getByText('U25 Suizidprävention')).toBeInTheDocument();
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
